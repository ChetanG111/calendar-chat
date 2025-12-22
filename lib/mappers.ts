/**
 * Mappers
 *
 * Functions to map data between different layers of the application,
 * for example from database types to API or frontend types.
 */

import { CalendarEvent } from '@/types';
import type { StoredEvent, ExpandedEventInstance } from '@/lib/db/types';

/**
 * Maps a StoredEvent (base DB event) to a CalendarEvent (frontend type)
 */
export function storedEventToCalendarEvent(event: StoredEvent): CalendarEvent {
    return {
        id: event.id,
        eventId: event.id, // For a base event, id is the eventId
        title: event.title,
        start: event.startAt,
        end: event.endAt,
        startDate: event.startDate || event.startAt.toISOString().split('T')[0],
        endDate: event.endDate || event.endAt.toISOString().split('T')[0],
        type: event.metadata.type || 'default',
        description: event.description || undefined,
        location: event.metadata.location,
        guests: event.metadata.guests,
        meetLink: event.metadata.meetLink,
        isAllDay: event.isAllDay,
        rrule: event.rrule || undefined,
        timezone: event.timezone,
    };
}

/**
 * Maps an ExpandedEventInstance (recurring instance) to a CalendarEvent
 */
export function expandedEventToCalendarEvent(event: ExpandedEventInstance): CalendarEvent {
    return {
        id: event.instanceId,
        eventId: event.eventId, // The original event ID
        title: event.title,
        start: event.startAt,
        end: event.endAt,
        startDate: event.startDate || event.startAt.toISOString().split('T')[0],
        endDate: event.endDate || event.endAt.toISOString().split('T')[0],
        type: event.metadata.type || 'default',
        description: event.description || undefined,
        location: event.metadata.location,
        guests: event.metadata.guests,
        meetLink: event.metadata.meetLink,
        isAllDay: event.isAllDay,
        rrule: event.rrule || undefined,
        timezone: event.timezone,
    };
}
