/**
 * Response Formatter
 *
 * Generates user-facing confirmation and response text.
 * Pure formatting - no side effects.
 */

import { CalendarEvent } from '@/types';
import { ChatResponseIntent } from './types';

// ============================================================================
// Date Formatting Utilities
// ============================================================================

function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        ...options,
    });
}

function formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

function formatDateTime(date: Date): string {
    return `${formatTime(date)} on ${formatDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`;
}

function formatDateRange(start: Date, end: Date): string {
    const sameDay = start.toDateString() === end.toDateString();

    if (sameDay) {
        return `${formatTime(start)} - ${formatTime(end)} on ${formatDate(start, { weekday: 'long', month: 'long', day: 'numeric' })}`;
    }

    return `${formatDateTime(start)} to ${formatDateTime(end)}`;
}

// ============================================================================
// Response Formatter
// ============================================================================

export class ResponseFormatter {
    /**
     * Format a successful event creation response
     */
    formatCreated(event: CalendarEvent): string {
        const timeInfo = event.isAllDay
            ? `on ${formatDate(event.start, { weekday: 'long', month: 'long', day: 'numeric' })}`
            : `at ${formatTime(event.start)} on ${formatDate(event.start, { weekday: 'long', month: 'long', day: 'numeric' })}`;

        let message = `✅ Created "${event.title}" ${timeInfo}`;

        // Add recurrence info if applicable
        if (event.rrule) {
            message = this.addRecurrenceInfo(message, event.rrule);
        }

        return message;
    }

    /**
     * Format a successful event update response
     */
    formatUpdated(event: CalendarEvent, changes: string[]): string {
        const timeInfo = `${formatTime(event.start)} on ${formatDate(event.start, { weekday: 'long', month: 'long', day: 'numeric' })}`;

        return `✅ Updated "${event.title}" to ${timeInfo}`;
    }

    /**
     * Format a successful event deletion response
     */
    formatDeleted(event: CalendarEvent, instanceOnly: boolean = false): string {
        if (instanceOnly) {
            return `✅ Cancelled "${event.title}" for ${formatDate(event.start, { weekday: 'long', month: 'long', day: 'numeric' })}. Future occurrences are unchanged.`;
        }

        return `✅ Deleted "${event.title}"`;
    }

    /**
     * Format a query result response
     */
    formatQueryResult(events: CalendarEvent[]): string {
        if (events.length === 0) {
            return "I couldn't find any events matching your query.";
        }

        if (events.length === 1) {
            const event = events[0];
            return `Found: "${event.title}" at ${formatDateTime(event.start)}`;
        }

        const header = `Found ${events.length} events:\n`;
        const list = events
            .slice(0, 5) // Limit to 5 results
            .map((e, i) => `${i + 1}. ${e.title} - ${formatDateTime(e.start)}`)
            .join('\n');

        return header + list;
    }

    /**
     * Format a confirmation request for destructive actions
     */
    formatConfirmationRequest(
        action: 'delete' | 'update',
        event: CalendarEvent,
        instanceOnly: boolean = false
    ): string {
        const dateStr = formatDate(event.start, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

        if (action === 'delete') {
            if (instanceOnly) {
                return `Cancel "${event.title}" on ${dateStr} only? This won't affect future occurrences.\nReply "yes" to confirm.`;
            }
            return `Delete "${event.title}"?\nReply "yes" to confirm.`;
        }

        return `Update "${event.title}"?\nReply "yes" to confirm.`;
    }

    /**
     * Format an error response
     */
    formatError(message: string): string {
        return `❌ ${message}`;
    }

    /**
     * Format a NO-OP response
     */
    formatNoop(): string {
        return "Anything else I can help with?";
    }

    /**
     * Format max clarifications exceeded
     */
    formatMaxClarifications(): string {
        return "I'm having trouble understanding. Let's start fresh - what would you like to do?";
    }

    /**
     * Add recurrence info to a message
     */
    private addRecurrenceInfo(message: string, rrule: string): string {
        // Parse basic RRULE patterns
        if (rrule.includes('FREQ=DAILY')) {
            return message.replace('Created', 'Created recurring event') + ' (repeats daily)';
        }
        if (rrule.includes('FREQ=WEEKLY')) {
            const dayMatch = rrule.match(/BYDAY=([A-Z,]+)/);
            if (dayMatch) {
                const days = this.formatRruleDays(dayMatch[1]);
                return message.replace('Created', 'Created recurring event') + ` (every ${days})`;
            }
            return message.replace('Created', 'Created recurring event') + ' (weekly)';
        }
        if (rrule.includes('FREQ=MONTHLY')) {
            return message.replace('Created', 'Created recurring event') + ' (monthly)';
        }
        if (rrule.includes('FREQ=YEARLY')) {
            return message.replace('Created', 'Created recurring event') + ' (yearly)';
        }

        return message;
    }

    /**
     * Format RRULE day codes to readable text
     */
    private formatRruleDays(dayCode: string): string {
        const dayMap: Record<string, string> = {
            MO: 'Monday',
            TU: 'Tuesday',
            WE: 'Wednesday',
            TH: 'Thursday',
            FR: 'Friday',
            SA: 'Saturday',
            SU: 'Sunday',
        };

        const days = dayCode.split(',').map(d => dayMap[d] || d);

        if (days.length === 1) {
            return days[0];
        }
        if (days.length === 2) {
            return `${days[0]} and ${days[1]}`;
        }

        return days.slice(0, -1).join(', ') + ', and ' + days[days.length - 1];
    }
}

/**
 * Create a ResponseFormatter instance
 */
export function createResponseFormatter(): ResponseFormatter {
    return new ResponseFormatter();
}
