/**
 * Database Connection Management
 * 
 * Provides a singleton database connection and initialization logic.
 * The database file is stored in the /data directory.
 * 
 * This module is separate from index.ts to avoid circular imports.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { SCHEMA_STATEMENTS } from './schema';

// Database file location
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'calendar.db');

// Singleton database instance
let db: Database.Database | null = null;

/**
 * Get or create the database connection
 * 
 * This function:
 * 1. Creates the /data directory if it doesn't exist
 * 2. Opens (or creates) the SQLite database file
 * 3. Runs schema migrations (idempotent)
 * 4. Returns the database instance
 */
export function getDatabase(): Database.Database {
    if (db) {
        return db;
    }

    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        console.log(`[DB] Created data directory: ${DATA_DIR}`);
    }

    // Open database connection
    db = new Database(DB_PATH);
    console.log(`[DB] Connected to database: ${DB_PATH}`);

    // Enable foreign keys and WAL mode for better performance
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Run schema migrations
    initializeSchema(db);

    return db;
}

/**
 * Initialize the database schema
 * 
 * Runs all schema statements. These are idempotent (use IF NOT EXISTS).
 */
function initializeSchema(database: Database.Database): void {
    console.log('[DB] Initializing schema...');

    for (const statement of SCHEMA_STATEMENTS) {
        database.exec(statement);
    }

    // Auto-migration for new columns (idempotent via try-catch)
    try {
        database.exec('ALTER TABLE events ADD COLUMN start_date TEXT');
        console.log('[DB] Migrated: Added start_date column');
    } catch (e: any) {
        // Ignore if column exists
    }

    try {
        database.exec('ALTER TABLE events ADD COLUMN end_date TEXT');
        console.log('[DB] Migrated: Added end_date column');
    } catch (e: any) {
        // Ignore if column exists
    }

    console.log('[DB] Schema initialization complete');
}

/**
 * Close the database connection
 * 
 * Should be called on application shutdown for clean exit.
 */
export function closeDatabase(): void {
    if (db) {
        db.close();
        db = null;
        console.log('[DB] Database connection closed');
    }
}

/**
 * Get the database file path
 * 
 * Useful for debugging or backup purposes.
 */
export function getDatabasePath(): string {
    return DB_PATH;
}
