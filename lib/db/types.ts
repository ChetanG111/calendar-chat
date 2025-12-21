/**
 * Database Types for Event Storage
 * 
 * These types represent the data structures used in the SQLite database.
 * All timestamps are stored in UTC ISO-8601 format.
 */

/**
 * Raw event row as stored in the SQLite database
 */
export interface DbEvent {
    id: string;
    title: string;
    description: string | null;
    start_at: string;        // ISO 8601 UTC
    end_at: string;          // ISO 8601 UTC
    timezone: string;        // IANA timezone (e.g., "Asia/Kolkata")
    is_all_day: number;      // SQLite doesn't have boolean, 0 or 1
    rrule: string | null;    // RFC 5545 RRULE string
    exdates: string | null;  // JSON array of ISO dates to exclude
    metadata: string | null; // JSON blob for tags, color, source, etc.
    created_at: string;      // ISO 8601 UTC
    updated_at: string;      // ISO 8601 UTC
}

/**
 * Metadata stored in the JSON blob
 */
export interface EventMetadata {
    type?: 'business' | 'personal' | 'meetings' | 'holiday';
    color?: string;
    tags?: string[];
    source?: string;
    location?: string;
    guests?: string[];
    meetLink?: string;
    [key: string]: unknown; // Allow additional fields
}

/**
 * Input for creating a new event
 */
export interface CreateEventInput {
    id?: string;             // Optional - will be generated if not provided
    title: string;
    description?: string;
    startAt: Date;           // Will be converted to UTC
    endAt: Date;             // Will be converted to UTC
    timezone: string;        // IANA timezone
    isAllDay?: boolean;
    rrule?: string;          // RFC 5545 RRULE string
    exdates?: string[];      // ISO date strings to exclude
    metadata?: EventMetadata;
}

/**
 * Input for updating an existing event
 */
export interface UpdateEventInput {
    title?: string;
    description?: string | null;
    startAt?: Date;
    endAt?: Date;
    timezone?: string;
    isAllDay?: boolean;
    rrule?: string | null;
    exdates?: string[] | null;
    metadata?: EventMetadata | null;
}

/**
 * Application-level event representation (converted from DB)
 */
export interface StoredEvent {
    id: string;
    title: string;
    description: string | null;
    startAt: Date;
    endAt: Date;
    timezone: string;
    isAllDay: boolean;
    rrule: string | null;
    exdates: string[];
    metadata: EventMetadata;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * An expanded instance of a recurring event
 * Contains the original event data plus the specific occurrence times
 */
export interface ExpandedEventInstance {
    /** Original event ID */
    eventId: string;
    /** Unique instance identifier (eventId + occurrence date) */
    instanceId: string;
    title: string;
    description: string | null;
    /** Start time for THIS occurrence */
    startAt: Date;
    /** End time for THIS occurrence */
    endAt: Date;
    timezone: string;
    isAllDay: boolean;
    /** Whether this is a recurring event */
    isRecurring: boolean;
    /** The original RRULE if recurring */
    rrule: string | null;
    metadata: EventMetadata;
}

/**
 * Query options for fetching events in a range
 */
export interface EventQueryOptions {
    /** Start of the range (inclusive) */
    rangeStart: Date;
    /** End of the range (exclusive) */
    rangeEnd: Date;
    /** If true, expand recurring events into instances */
    expandRecurrence?: boolean;
}
