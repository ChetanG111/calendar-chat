/**
 * Recurrence Expansion Logic
 * 
 * Handles RFC 5545 RRULE parsing and expansion for recurring events.
 * Uses the 'rrule' library for standards-compliant recurrence handling.
 */

import { RRule, RRuleSet, rrulestr } from 'rrule';
import type { StoredEvent, ExpandedEventInstance } from './types';

/**
 * Expand a recurring event into individual instances within a date range
 * 
 * @param event - The stored event with an RRULE
 * @param rangeStart - Start of the query range (inclusive)
 * @param rangeEnd - End of the query range (exclusive)
 * @returns Array of expanded event instances
 */
export function expandRecurringEvent(
    event: StoredEvent,
    rangeStart: Date,
    rangeEnd: Date
): ExpandedEventInstance[] {
    if (!event.rrule) {
        // Non-recurring event: return single instance if it overlaps the range
        if (eventOverlapsRange(event.startAt, event.endAt, rangeStart, rangeEnd)) {
            return [eventToInstance(event, event.startAt, event.endAt)];
        }
        return [];
    }

    const instances: ExpandedEventInstance[] = [];

    // Calculate event duration for applying to each occurrence
    const durationMs = event.endAt.getTime() - event.startAt.getTime();

    // Parse the RRULE
    const rruleSet = new RRuleSet();

    try {
        // Parse the RRULE string
        // The rrule library expects DTSTART to be part of the rule or set separately
        const rule = rrulestr(event.rrule, { dtstart: event.startAt });
        rruleSet.rrule(rule);
    } catch (error) {
        console.error(`[Recurrence] Failed to parse RRULE for event ${event.id}:`, error);
        // Fall back to returning the original event if it overlaps
        if (eventOverlapsRange(event.startAt, event.endAt, rangeStart, rangeEnd)) {
            return [eventToInstance(event, event.startAt, event.endAt)];
        }
        return [];
    }

    // Add exception dates (exdates) to exclude
    if (event.exdates && event.exdates.length > 0) {
        for (const exdate of event.exdates) {
            try {
                const excludeDate = new Date(exdate);
                rruleSet.exdate(excludeDate);
            } catch (error) {
                console.warn(`[Recurrence] Invalid exdate '${exdate}' for event ${event.id}`);
            }
        }
    }

    // Get occurrences within the range
    // Note: rrule.between() is inclusive on start, exclusive on end by default
    // We add a buffer to the range to catch events that start before but end within the range
    const occurrences = rruleSet.between(
        new Date(rangeStart.getTime() - durationMs), // Look back by event duration
        rangeEnd,
        true // inc = true to include start boundary
    );

    for (const occurrence of occurrences) {
        const instanceStart = occurrence;
        const instanceEnd = new Date(occurrence.getTime() + durationMs);

        // Double-check the instance actually overlaps our query range
        if (eventOverlapsRange(instanceStart, instanceEnd, rangeStart, rangeEnd)) {
            instances.push(eventToInstance(event, instanceStart, instanceEnd));
        }
    }

    return instances;
}

/**
 * Check if an event (start, end) overlaps with a query range
 */
function eventOverlapsRange(
    eventStart: Date,
    eventEnd: Date,
    rangeStart: Date,
    rangeEnd: Date
): boolean {
    // Event overlaps if it starts before range ends AND ends after range starts
    return eventStart < rangeEnd && eventEnd > rangeStart;
}

/**
 * Convert a StoredEvent to an ExpandedEventInstance for a specific occurrence
 */
function eventToInstance(
    event: StoredEvent,
    instanceStart: Date,
    instanceEnd: Date
): ExpandedEventInstance {
    // Create a unique instance ID by combining event ID with occurrence date
    const instanceId = event.rrule
        ? `${event.id}_${instanceStart.toISOString()}`
        : event.id;

    return {
        eventId: event.id,
        instanceId,
        title: event.title,
        description: event.description,
        startAt: instanceStart,
        endAt: instanceEnd,
        timezone: event.timezone,
        isAllDay: event.isAllDay,
        isRecurring: !!event.rrule,
        rrule: event.rrule,
        metadata: event.metadata,
    };
}

/**
 * Validate an RRULE string
 * 
 * @param rruleString - The RRULE string to validate
 * @returns true if valid, false otherwise
 */
export function isValidRRule(rruleString: string): boolean {
    try {
        rrulestr(rruleString);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get a human-readable description of an RRULE
 * 
 * @param rruleString - The RRULE string
 * @param dtstart - Optional start date for context
 * @returns Human-readable description or null if invalid
 */
export function describeRRule(rruleString: string, dtstart?: Date): string | null {
    try {
        const rule = rrulestr(rruleString, { dtstart });
        return rule.toText();
    } catch {
        return null;
    }
}

/**
 * Create common RRULE patterns
 * 
 * Helper functions for creating standard recurrence patterns
 */
export const RRulePatterns = {
    /** Daily recurrence */
    daily: (count?: number) => {
        const rule = new RRule({ freq: RRule.DAILY, count });
        return rule.toString();
    },

    /** Weekly on specific weekdays */
    weekly: (weekdays: number[], count?: number) => {
        const rule = new RRule({
            freq: RRule.WEEKLY,
            byweekday: weekdays,
            count,
        });
        return rule.toString();
    },

    /** Monthly on specific day of month */
    monthly: (dayOfMonth: number, count?: number) => {
        const rule = new RRule({
            freq: RRule.MONTHLY,
            bymonthday: dayOfMonth,
            count,
        });
        return rule.toString();
    },

    /** Yearly on specific month and day */
    yearly: (month: number, dayOfMonth: number, count?: number) => {
        const rule = new RRule({
            freq: RRule.YEARLY,
            bymonth: month,
            bymonthday: dayOfMonth,
            count,
        });
        return rule.toString();
    },

    /** Weekdays only (Mon-Fri) */
    weekdays: (count?: number) => {
        const rule = new RRule({
            freq: RRule.WEEKLY,
            byweekday: [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR],
            count,
        });
        return rule.toString();
    },
};
