/**
 * Database Usage Example / CLI
 * 
 * Demonstrates all event storage operations.
 * Run with: npx ts-node scripts/db-example.ts
 */

import {
    getDatabase,
    closeDatabase,
    getDatabasePath,
    createEvent,
    getEventById,
    updateEvent,
    deleteEvent,
    queryEventsInRange,
    getEventsForToday,
    getEventsForThisWeek,
    RRulePatterns,
    describeRRule,
} from '../lib/db/index';
import { RRule } from 'rrule';

// Separator for cleaner output
const sep = () => console.log('\n' + '='.repeat(60) + '\n');

async function main() {
    console.log('📅 Calendar Event Storage System - Demo\n');

    // Initialize database
    console.log('1️⃣  Initializing Database...');
    const db = getDatabase();
    console.log(`   Database path: ${getDatabasePath()}`);
    sep();

    // Create a one-off event
    console.log('2️⃣  Creating a one-off event...');
    const oneOffEvent = createEvent({
        title: 'Team Meeting',
        description: 'Weekly sync with the team',
        startAt: new Date('2025-12-22T10:00:00'),
        endAt: new Date('2025-12-22T11:00:00'),
        timezone: 'Asia/Kolkata',
        metadata: {
            type: 'meetings',
            location: 'Conference Room A',
        },
    });
    console.log('   Created:', oneOffEvent);
    sep();

    // Create a recurring event (daily standup)
    console.log('3️⃣  Creating a recurring event (daily standup - weekdays only)...');
    const standupRRule = RRulePatterns.weekdays(); // Mon-Fri
    console.log(`   RRULE: ${standupRRule}`);
    console.log(`   Human readable: ${describeRRule(standupRRule)}`);

    const recurringEvent = createEvent({
        title: 'Daily Standup',
        description: '15-minute team standup',
        startAt: new Date('2025-12-22T09:00:00'),
        endAt: new Date('2025-12-22T09:15:00'),
        timezone: 'Asia/Kolkata',
        rrule: standupRRule,
        metadata: {
            type: 'business',
        },
    });
    console.log('   Created recurring event:', recurringEvent.id);
    sep();

    // Create a weekly recurring event
    console.log('4️⃣  Creating a weekly event (every Monday)...');
    const weeklyRRule = new RRule({
        freq: RRule.WEEKLY,
        byweekday: [RRule.MO],
        dtstart: new Date('2025-12-22T14:00:00'),
    }).toString();

    const weeklyEvent = createEvent({
        title: 'Monday Planning',
        description: 'Plan the week ahead',
        startAt: new Date('2025-12-22T14:00:00'),
        endAt: new Date('2025-12-22T15:00:00'),
        timezone: 'Asia/Kolkata',
        rrule: weeklyRRule,
        metadata: {
            type: 'business',
        },
    });
    console.log('   Created:', weeklyEvent.id);
    sep();

    // Query events for this week
    console.log('5️⃣  Querying events for this week...');
    const thisWeekEvents = getEventsForThisWeek('Asia/Kolkata');
    console.log(`   Found ${thisWeekEvents.length} event instances:`);
    for (const event of thisWeekEvents) {
        console.log(`   - ${event.title} @ ${event.startAt.toISOString()} (recurring: ${event.isRecurring})`);
    }
    sep();

    // Query events for a specific range
    console.log('6️⃣  Querying events for Dec 22-28, 2025...');
    const rangeEvents = queryEventsInRange({
        rangeStart: new Date('2025-12-22T00:00:00Z'),
        rangeEnd: new Date('2025-12-29T00:00:00Z'),
    });
    console.log(`   Found ${rangeEvents.length} event instances:`);
    for (const event of rangeEvents) {
        console.log(`   - [${event.instanceId}] ${event.title} @ ${event.startAt.toLocaleString()}`);
    }
    sep();

    // Update an event
    console.log('7️⃣  Updating the one-off event...');
    const updatedEvent = updateEvent(oneOffEvent.id, {
        title: 'Team Meeting (Updated)',
        description: 'Updated description - now includes product review',
    });
    console.log('   Updated event:', updatedEvent?.title);
    sep();

    // Get event by ID
    console.log('8️⃣  Fetching event by ID...');
    const fetchedEvent = getEventById(oneOffEvent.id);
    console.log('   Fetched:', fetchedEvent);
    sep();

    // Create an all-day event
    console.log('9️⃣  Creating an all-day event...');
    const allDayEvent = createEvent({
        title: 'Company Holiday',
        description: 'Office closed for holiday',
        startAt: new Date('2025-12-25T00:00:00'),
        endAt: new Date('2025-12-26T00:00:00'),
        timezone: 'Asia/Kolkata',
        isAllDay: true,
        metadata: {
            type: 'holiday',
        },
    });
    console.log('   Created all-day event:', allDayEvent.id);
    sep();

    // Query today's events
    console.log('🔟  Getting events for today...');
    const todayEvents = getEventsForToday('Asia/Kolkata');
    console.log(`   Found ${todayEvents.length} events for today`);
    for (const event of todayEvents) {
        console.log(`   - ${event.title} @ ${event.startAt.toLocaleString()}`);
    }
    sep();

    // Delete an event
    console.log('1️⃣1️⃣  Deleting the one-off event...');
    const deleted = deleteEvent(oneOffEvent.id);
    console.log(`   Deleted: ${deleted}`);

    // Verify deletion
    const verifyDeleted = getEventById(oneOffEvent.id);
    console.log(`   Verification (should be null): ${verifyDeleted}`);
    sep();

    // Summary
    console.log('✅ Demo Complete!\n');
    console.log('Summary:');
    console.log('- Database initialized and schema created');
    console.log('- Created one-off, recurring (daily), and all-day events');
    console.log('- Queried events by range with RRULE expansion');
    console.log('- Updated and deleted events');
    console.log('- Data persists in SQLite file\n');

    // Close database
    closeDatabase();
    console.log('Database connection closed.');
}

// Run the demo
main().catch(console.error);
