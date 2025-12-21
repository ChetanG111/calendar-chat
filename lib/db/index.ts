/**
 * Database Module - Main Entry Point
 * 
 * Re-exports all database functionality for convenient imports.
 */

// Connection management
export { getDatabase, closeDatabase, getDatabasePath } from './connection';

// Types
export * from './types';

// Event CRUD operations
export * from './events';

// Recurrence expansion logic
export * from './recurrence';
