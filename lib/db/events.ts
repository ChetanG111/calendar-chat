/**
 * Event CRUD Operations
 * 
 * Provides all database operations for events.
 * Handles timezone conversion and JSON serialization.
 */

import { getDatabase } from './connection';
import { expandRecurringEvent } from './recurrence';
import type {
    DbEvent,
    StoredEvent,
    CreateEventInput,
    UpdateEventInput,
    ExpandedEventInstance,
    EventQueryOptions,
    EventMetadata,
} from './types';

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert a Date to UTC ISO 8601 string
 */
function toUtcString(date: Date): string {
    return date.toISOString();
}

/**
 * Format a Date object to a YYYY-MM-DD string in local time.
 * This is important for preserving the user's intended date when an event is marked as all-day.
 */
function toLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Convert a DbEvent row to a StoredEvent
 */
function dbEventToStoredEvent(row: DbEvent): StoredEvent {
    let exdates: string[] = [];
    if (row.exdates) {
        try {
            exdates = JSON.parse(row.exdates);
        } catch {
            console.warn(`[Events] Failed to parse exdates for event ${row.id}`);
        }
    }

    let metadata: EventMetadata = {};
    if (row.metadata) {
        try {
            metadata = JSON.parse(row.metadata);
        } catch {
            console.warn(`[Events] Failed to parse metadata for event ${row.id}`);
        }
    }

    return {
        id: row.id,
        title: row.title,
        description: row.description,
        startAt: new Date(row.start_at),
        endAt: new Date(row.end_at),
        startDate: row.start_date,
        endDate: row.end_date,
        timezone: row.timezone,
        isAllDay: row.is_all_day === 1,
        rrule: row.rrule,
        exdates,
        metadata,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

/**
 * Create a new event
 * 
 * @param input - Event creation input
 * @returns The created event
 */
export function createEvent(input: CreateEventInput): StoredEvent {
    const db = getDatabase();

    const id = input.id || generateEventId();
    const now = toUtcString(new Date());

    // Calculate date strings from startAt/endAt if not provided
    // Prefer using the passed startDate/endDate which preserve local date intent.
    // Fallback uses toISOString() which implies UTC date, which might differ from local.
    const startDate = input.startDate || toLocalDateString(input.startAt);
    const endDate = input.endDate || toLocalDateString(input.endAt);

    const stmt = db.prepare(`
    INSERT INTO events (
      id, title, description, start_at, end_at, start_date, end_date, timezone,
      is_all_day, rrule, exdates, metadata, created_at, updated_at
    ) VALUES (
      @id, @title, @description, @start_at, @end_at, @start_date, @end_date, @timezone,
      @is_all_day, @rrule, @exdates, @metadata, @created_at, @updated_at
    )
  `);

    stmt.run({
        id,
        title: input.title,
        description: input.description || null,
        start_at: toUtcString(input.startAt),
        end_at: toUtcString(input.endAt),
        start_date: startDate,
        end_date: endDate,
        timezone: input.timezone,
        is_all_day: input.isAllDay ? 1 : 0,
        rrule: input.rrule || null,
        exdates: input.exdates ? JSON.stringify(input.exdates) : null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        created_at: now,
        updated_at: now,
    });

    console.log(`[Events] Created event: ${id} - "${input.title}"`);

    // Fetch and return the created event
    return getEventById(id)!;
}

/**
 * Get an event by ID
 * 
 * @param id - Event ID
 * @returns The event or null if not found
 */
export function getEventById(id: string): StoredEvent | null {
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM events WHERE id = ?');
    const row = stmt.get(id) as DbEvent | undefined;

    if (!row) {
        return null;
    }

    return dbEventToStoredEvent(row);
}

/**
 * Update an existing event
 * 
 * @param id - Event ID to update
 * @param input - Fields to update
 * @returns The updated event or null if not found
 */
export function updateEvent(id: string, input: UpdateEventInput): StoredEvent | null {
    const db = getDatabase();

    // First check if event exists
    const existing = getEventById(id);
    if (!existing) {
        console.warn(`[Events] Cannot update: event ${id} not found`);
        return null;
    }

    // Build dynamic update query
    const updates: string[] = [];
    const params: Record<string, unknown> = { id };

    if (input.title !== undefined) {
        updates.push('title = @title');
        params.title = input.title;
    }
    if (input.description !== undefined) {
        updates.push('description = @description');
        params.description = input.description;
    }
    if (input.startAt !== undefined) {
        updates.push('start_at = @start_at');
        params.start_at = toUtcString(input.startAt);
        // Auto-update start_date if not explicitly provided
        if (input.startDate === undefined) {
            updates.push('start_date = @start_date');
            params.start_date = toLocalDateString(input.startAt);
        }
    }
    if (input.endAt !== undefined) {
        updates.push('end_at = @end_at');
        params.end_at = toUtcString(input.endAt);
        // Auto-update end_date if not explicitly provided
        if (input.endDate === undefined) {
            updates.push('end_date = @end_date');
            params.end_date = toLocalDateString(input.endAt);
        }
    }
    if (input.startDate !== undefined) {
        updates.push('start_date = @start_date');
        params.start_date = input.startDate;
    }
    if (input.endDate !== undefined) {
        updates.push('end_date = @end_date');
        params.end_date = input.endDate;
    }
    if (input.timezone !== undefined) {
        updates.push('timezone = @timezone');
        params.timezone = input.timezone;
    }
    if (input.isAllDay !== undefined) {
        updates.push('is_all_day = @is_all_day');
        params.is_all_day = input.isAllDay ? 1 : 0;
    }
    if (input.rrule !== undefined) {
        updates.push('rrule = @rrule');
        params.rrule = input.rrule;
    }
    if (input.exdates !== undefined) {
        updates.push('exdates = @exdates');
        params.exdates = input.exdates ? JSON.stringify(input.exdates) : null;
    }
    if (input.metadata !== undefined) {
        updates.push('metadata = @metadata');
        params.metadata = input.metadata ? JSON.stringify(input.metadata) : null;
    }

    if (updates.length === 0) {
        console.log(`[Events] No updates provided for event ${id}`);
        return existing;
    }

    // Always update updated_at
    updates.push('updated_at = @updated_at');
    params.updated_at = toUtcString(new Date());

    const sql = `UPDATE events SET ${updates.join(', ')} WHERE id = @id`;
    const stmt = db.prepare(sql);
    stmt.run(params);

    console.log(`[Events] Updated event: ${id}`);

    return getEventById(id);
}

/**
 * Delete an event
 * 
 * @param id - Event ID to delete
 * @returns true if deleted, false if not found
 */
export function deleteEvent(id: string): boolean {
    const db = getDatabase();

    const stmt = db.prepare('DELETE FROM events WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes > 0) {
        console.log(`[Events] Deleted event: ${id}`);
        return true;
    }

    console.warn(`[Events] Cannot delete: event ${id} not found`);
    return false;
}

/**
 * Query events within a time range
 * 
 * This function:
 * 1. Fetches all events that might overlap the range (including recurring)
 * 2. Expands recurring events into instances
 * 3. Returns all matching instances sorted by start time
 * 
 * @param options - Query options including range and expansion settings
 * @returns Array of expanded event instances
 */
export function queryEventsInRange(options: EventQueryOptions): ExpandedEventInstance[] {
    const { rangeStart, rangeEnd, expandRecurrence = true } = options;
    const db = getDatabase();

    const rangeStartStr = toUtcString(rangeStart);
    const rangeEndStr = toUtcString(rangeEnd);

    // Query for events that:
    // 1. Have start_at before range end AND end_at after range start (one-off events)
    // 2. OR have an rrule (recurring events need expansion)
    //
    // For recurring events, we can't filter by date in SQL because instances
    // are computed at read time. We fetch all recurring events and expand them.
    const stmt = db.prepare(`
    SELECT * FROM events
    WHERE 
      (start_at < @range_end AND end_at > @range_start)
      OR rrule IS NOT NULL
  `);

    const rows = stmt.all({
        range_start: rangeStartStr,
        range_end: rangeEndStr,
    }) as DbEvent[];

    const instances: ExpandedEventInstance[] = [];

    for (const row of rows) {
        const event = dbEventToStoredEvent(row);

        if (expandRecurrence) {
            // Expand recurring events (also handles non-recurring)
            const expanded = expandRecurringEvent(event, rangeStart, rangeEnd);
            instances.push(...expanded);
        } else {
            // Return raw events without expansion
            instances.push({
                eventId: event.id,
                instanceId: event.id,
                title: event.title,
                description: event.description,
                startAt: event.startAt,
                endAt: event.endAt,
                startDate: event.startDate,
                endDate: event.endDate,
                timezone: event.timezone,
                isAllDay: event.isAllDay,
                isRecurring: !!event.rrule,
                rrule: event.rrule,
                metadata: event.metadata,
            });
        }
    }

    // Sort by start time
    instances.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

    console.log(`[Events] Query returned ${instances.length} instances for range ${rangeStartStr} to ${rangeEndStr}`);

    return instances;
}

/**
 * Get all events (use with caution for large datasets)
 * 
 * @returns Array of all stored events
 */
export function getAllEvents(): StoredEvent[] {
    const db = getDatabase();

    const stmt = db.prepare('SELECT * FROM events ORDER BY start_at');
    const rows = stmt.all() as DbEvent[];

    return rows.map(dbEventToStoredEvent);
}

/**
 * Add an exception date to a recurring event
 * 
 * @param eventId - Event ID
 * @param exdate - ISO date string to exclude
 * @returns The updated event or null if not found
 */
export function addExceptionDate(eventId: string, exdate: string): StoredEvent | null {
    const event = getEventById(eventId);
    if (!event) {
        return null;
    }

    const exdates = [...event.exdates, exdate];
    return updateEvent(eventId, { exdates });
}

/**
 * Remove an exception date from a recurring event
 * 
 * @param eventId - Event ID
 * @param exdate - ISO date string to remove from exceptions
 * @returns The updated event or null if not found
 */
export function removeExceptionDate(eventId: string, exdate: string): StoredEvent | null {
    const event = getEventById(eventId);
    if (!event) {
        return null;
    }

    const exdates = event.exdates.filter(d => d !== exdate);
    return updateEvent(eventId, { exdates });
}

/**
 * Get events for today
 * 
 * Convenience function that queries events for the current day.
 * 
 * @param timezone - IANA timezone string for determining "today"
 * @returns Array of event instances for today
 */
export function getEventsForToday(timezone: string = 'UTC'): ExpandedEventInstance[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    return queryEventsInRange({
        rangeStart: today,
        rangeEnd: tomorrow,
    });
}

/**
 * Get events for this week
 * 
 * Convenience function that queries events for the current week (Sun-Sat).
 * 
 * @param timezone - IANA timezone string for determining the week
 * @returns Array of event instances for this week
 */
export function getEventsForThisWeek(timezone: string = 'UTC'): ExpandedEventInstance[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get start of week (Sunday)
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);

    // Get end of week (next Sunday)
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    return queryEventsInRange({
        rangeStart: weekStart,
        rangeEnd: weekEnd,
    });
}
