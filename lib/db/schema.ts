/**
 * SQLite Schema Definitions
 * 
 * Contains the SQL statements for creating tables and indexes.
 * All statements use IF NOT EXISTS for idempotency.
 */

/**
 * Events table schema
 * 
 * Design decisions:
 * - TEXT for timestamps (ISO 8601 UTC) for Postgres compatibility
 * - INTEGER for booleans (SQLite doesn't have native boolean)
 * - TEXT for JSON fields (rrule, exdates, metadata)
 * - Indexes on start_at and end_at for efficient range queries
 */
export const CREATE_EVENTS_TABLE = `
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  timezone TEXT NOT NULL,
  is_all_day INTEGER DEFAULT 0,
  rrule TEXT,
  exdates TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`;

/**
 * Index on start_at for efficient range queries
 */
export const CREATE_START_AT_INDEX = `
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at)`;

/**
 * Index on end_at for efficient range queries
 */
export const CREATE_END_AT_INDEX = `
CREATE INDEX IF NOT EXISTS idx_events_end_at ON events(end_at)`;

/**
 * All schema statements in order of execution
 */
export const SCHEMA_STATEMENTS = [
    CREATE_EVENTS_TABLE,
    CREATE_START_AT_INDEX,
    CREATE_END_AT_INDEX,
];
