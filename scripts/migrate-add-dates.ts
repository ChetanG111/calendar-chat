
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'calendar.db');

console.log(`Migrating database at ${DB_PATH}...`);

try {
    const db = new Database(DB_PATH);

    try {
        db.exec(`ALTER TABLE events ADD COLUMN start_date TEXT`);
        console.log('Added start_date column.');
    } catch (err: any) {
        if (err.message.includes('duplicate column name')) {
            console.log('start_date column already exists.');
        } else {
            console.error('Error adding start_date:', err);
        }
    }

    try {
        db.exec(`ALTER TABLE events ADD COLUMN end_date TEXT`);
        console.log('Added end_date column.');
    } catch (err: any) {
        if (err.message.includes('duplicate column name')) {
            console.log('end_date column already exists.');
        } else {
            console.error('Error adding end_date:', err);
        }
    }

    db.close();
    console.log('Migration complete.');
} catch (error) {
    console.error('Failed to open database:', error);
}
