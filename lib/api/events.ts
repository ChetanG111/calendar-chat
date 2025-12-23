/**
 * Events API Client
 * 
 * Client-side functions for interacting with the events API.
 * Used by React components to perform CRUD operations.
 */

import { CalendarEvent } from '@/types';

const API_BASE = '/api/events';

/**
 * API response for a single event
 */
interface ApiEvent {
    id: string;
    eventId: string;
    title: string;
    start: string;
    end: string;
    startDate?: string;
    endDate?: string;
    type: 'business' | 'personal' | 'meetings' | 'holiday';
    description?: string;
    location?: string;
    guests?: string[];
    meetLink?: string;
    isAllDay?: boolean;
    isRecurring?: boolean;
    rrule?: string;
    timezone?: string;
}

/**
 * Map a server-side ApiEvent into a frontend CalendarEvent ready for UI use.
 *
 * @param apiEvent - Event object from the API
 * @returns A CalendarEvent with `start` and `end` converted to Date objects; optional fields (`startDate`, `endDate`, `description`) are `undefined` when not present on the API event
 */
function toCalendarEvent(apiEvent: ApiEvent): CalendarEvent {
    return {
        id: apiEvent.id,
        eventId: apiEvent.eventId,
        title: apiEvent.title,
        start: new Date(apiEvent.start),
        end: new Date(apiEvent.end),
        startDate: apiEvent.startDate || undefined,
        endDate: apiEvent.endDate || undefined,
        type: apiEvent.type,
        description: apiEvent.description || undefined,
        location: apiEvent.location,
        guests: apiEvent.guests,
        meetLink: apiEvent.meetLink,
        isAllDay: apiEvent.isAllDay,
    };
}

/**
 * Fetch events within a date range
 */
export async function fetchEvents(rangeStart: Date, rangeEnd: Date): Promise<CalendarEvent[]> {
    const params = new URLSearchParams({
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
    });

    const response = await fetch(`${API_BASE}?${params}`);

    if (!response.ok) {
        throw new Error('Failed to fetch events');
    }

    const data = await response.json();
    return data.events.map(toCalendarEvent);
}

/**
 * Fetch a single event by ID
 */
export async function fetchEventById(id: string): Promise<CalendarEvent | null> {
    const response = await fetch(`${API_BASE}/${id}`);

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error('Failed to fetch event');
    }

    const data = await response.json();
    return toCalendarEvent(data.event);
}

/**
 * Create a new event
 */
export async function createEventApi(event: Partial<CalendarEvent> & { rrule?: string }): Promise<CalendarEvent> {
    const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            title: event.title,
            start: event.start?.toISOString(),
            end: event.end?.toISOString(),
            type: event.type,
            description: event.description,
            location: event.location,
            guests: event.guests,
            meetLink: event.meetLink,
            isAllDay: event.isAllDay,
            rrule: event.rrule,
        }),
    });

    if (!response.ok) {
        throw new Error('Failed to create event');
    }

    const data = await response.json();
    return toCalendarEvent(data.event);
}

/**
 * Update an existing event
 */
export async function updateEventApi(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const body: Record<string, unknown> = {};

    if (updates.title !== undefined) body.title = updates.title;
    if (updates.description !== undefined) body.description = updates.description;
    if (updates.start !== undefined) body.start = updates.start.toISOString();
    if (updates.end !== undefined) body.end = updates.end.toISOString();
    if (updates.type !== undefined) body.type = updates.type;
    if (updates.location !== undefined) body.location = updates.location;
    if (updates.guests !== undefined) body.guests = updates.guests;
    if (updates.meetLink !== undefined) body.meetLink = updates.meetLink;
    if (updates.isAllDay !== undefined) body.isAllDay = updates.isAllDay;

    const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error('Failed to update event');
    }

    const data = await response.json();
    return toCalendarEvent(data.event);
}

/**
 * Delete an event
 */
export async function deleteEventApi(id: string): Promise<boolean> {
    const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
    });

    if (response.status === 404) {
        return false;
    }

    if (!response.ok) {
        throw new Error('Failed to delete event');
    }

    return true;
}

/**
 * Get the date range for a given view and current date
 */
export function getViewDateRange(view: 'day' | 'week' | 'month', currentDate: Date): { start: Date; end: Date } {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    switch (view) {
        case 'day':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'week':
            // Start from Sunday
            const dayOfWeek = start.getDay();
            start.setDate(start.getDate() - dayOfWeek);
            start.setHours(0, 0, 0, 0);
            end.setDate(start.getDate() + 7);
            end.setHours(0, 0, 0, 0);
            break;
        case 'month':
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            end.setMonth(end.getMonth() + 1, 1);
            end.setHours(0, 0, 0, 0);
            break;
    }

    return { start, end };
}