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

// Simple in-memory cache for expanded instances
// Key: "startMs-endMs-expandRecurrence"
// Value: Array of expanded instances
const queryCache = new Map<string, ExpandedEventInstance[]>();

/**
 * Invalidate and clear the in-memory cache of expanded event instances.
 *
 * Call after any database write (create, update, delete) so subsequent range queries return fresh data.
 */
function invalidateCache() {
    queryCache.clear();
    console.log('[Events] Cache invalidated');
}

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Converts a Date to a UTC ISO 8601 string.
 *
 * @returns The date formatted as an ISO 8601 string in UTC (ending with `Z`).
 */
function toUtcString(date: Date): string {
    return date.toISOString();
}

/**
 * Formats a Date to a YYYY-MM-DD string for a given IANA timezone.
 *
 * If the provided timezone is invalid, the function logs a warning and falls back to UTC.
 *
 * @param date - The Date to format.
 * @param timezone - The IANA timezone name to use (e.g., "America/New_York"); falls back to "UTC" when invalid.
 * @returns The date formatted as `YYYY-MM-DD` in the specified timezone.
 */
function toTimezoneDateString(date: Date, timezone: string): string {
    try {
        return date.toLocaleDateString('en-CA', { timeZone: timezone });
    } catch (e) {
        console.warn(`[Events] Invalid timezone '${timezone}', falling back to UTC`);
        return date.toLocaleDateString('en-CA', { timeZone: 'UTC' });
    }
}

/**
 * Map a database event row into a StoredEvent object.
 *
 * Parses JSON-encoded `exdates` and `metadata` when present (parsing failures log a warning and result in an empty array or object). Uses the stored `timezone` or `'UTC'` if missing, derives `startDate` and `endDate` using that timezone, converts timestamp fields to Date objects, and maps `is_all_day` (`1` means `true`) to `isAllDay`.
 *
 * @param row - The database row representing an event
 * @returns A StoredEvent with parsed `exdates` and `metadata`, `startAt`/`endAt`/`createdAt`/`updatedAt` as Date objects, `startDate`/`endDate` formatted for the event timezone, and `isAllDay` normalized
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

    const startAt = new Date(row.start_at);
    const endAt = new Date(row.end_at);
    // Use the stored timezone, or default to UTC if missing/invalid
    const timezone = row.timezone || 'UTC';

    return {
        id: row.id,
        title: row.title,
        description: row.description,
        startAt,
        endAt,
        startDate: toTimezoneDateString(startAt, timezone),
        endDate: toTimezoneDateString(endAt, timezone),
        timezone,
        isAllDay: row.is_all_day === 1,
        rrule: row.rrule,
        exdates,
        metadata,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

/**
 * Creates a new event in the database and returns the persisted record.
 *
 * This will generate an `id` if one is not provided, set creation and update
 * timestamps to the current UTC time, serialize `exdates` and `metadata` to JSON
 * when present, and invalidate the in-memory expanded-events query cache.
 *
 * @param input - Event creation input; if `input.id` is omitted a new id is generated.
 * @returns The newly created StoredEvent including generated `id`, `startDate`/`endDate` derived for the event timezone, and timestamps.
 */
export function createEvent(input: CreateEventInput): StoredEvent {
    const db = getDatabase();

    const id = input.id || generateEventId();
    const now = toUtcString(new Date());

    const stmt = db.prepare(`
    INSERT INTO events (
      id, title, description, start_at, end_at, timezone,
      is_all_day, rrule, exdates, metadata, created_at, updated_at
    ) VALUES (
      @id, @title, @description, @start_at, @end_at, @timezone,
      @is_all_day, @rrule, @exdates, @metadata, @created_at, @updated_at
    )
  `);

    stmt.run({
        id,
        title: input.title,
        description: input.description || null,
        start_at: toUtcString(input.startAt),
        end_at: toUtcString(input.endAt),
        timezone: input.timezone,
        is_all_day: input.isAllDay ? 1 : 0,
        rrule: input.rrule || null,
        exdates: input.exdates ? JSON.stringify(input.exdates) : null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        created_at: now,
        updated_at: now,
    });

    invalidateCache();
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
    }
    if (input.endAt !== undefined) {
        updates.push('end_at = @end_at');
        params.end_at = toUtcString(input.endAt);
    }
    // Note: startDate and endDate inputs are ignored as they are derived from startAt/endAt + timezone
    
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

    invalidateCache();
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
        invalidateCache();
        console.log(`[Events] Deleted event: ${id}`);
        return true;
    }

    console.warn(`[Events] Cannot delete: event ${id} not found`);
    return false;
}

/**
 * Retrieve event instances overlapping a time range, optionally expanding recurring events into individual instances.
 *
 * @param options - Query options containing:
 *   - rangeStart: start of the query range (inclusive)
 *   - rangeEnd: end of the query range (exclusive)
 *   - expandRecurrence: when true (default), expand recurring events into their matching instances; when false, return raw event records with an `isRecurring` flag
 * @returns An array of ExpandedEventInstance objects representing all matching instances within the specified range, sorted by instance start time
 */
export function queryEventsInRange(options: EventQueryOptions): ExpandedEventInstance[] {
    const { rangeStart, rangeEnd, expandRecurrence = true } = options;

    const cacheKey = `${rangeStart.getTime()}-${rangeEnd.getTime()}-${expandRecurrence}`;
    if (queryCache.has(cacheKey)) {
        console.log('[Events] Returning cached instances');
        return queryCache.get(cacheKey)!;
    }

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

    queryCache.set(cacheKey, instances);
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