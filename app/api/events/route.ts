/**
 * Events API Route Handlers
 * 
 * Provides REST API endpoints for event CRUD operations.
 * GET - List events in a date range
 * POST - Create a new event
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    createEvent,
    queryEventsInRange,
} from '@/lib/db';
import type { CreateEventInput, EventMetadata } from '@/lib/db';

// Default timezone for the application
const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * List events within a date range; defaults to events for the current month when no range is provided.
 *
 * Accepts query parameters `rangeStart` and `rangeEnd` as ISO date strings to restrict the range.
 *
 * @returns An object with an `events` array of frontend-formatted event objects (fields include `id`, `eventId`, `title`, `start`, `end`, optional `startDate`, optional `endDate`, `type`, optional `description`, optional `location`, optional `guests`, optional `meetLink`, `isAllDay`, `isRecurring`, optional `rrule`, and `timezone`).
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const rangeStartParam = searchParams.get('rangeStart');
        const rangeEndParam = searchParams.get('rangeEnd');

        let rangeStart: Date;
        let rangeEnd: Date;

        if (rangeStartParam && rangeEndParam) {
            rangeStart = new Date(rangeStartParam);
            rangeEnd = new Date(rangeEndParam);
        } else {
            // Default to current month
            const now = new Date();
            rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
            rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }

        const events = queryEventsInRange({
            rangeStart,
            rangeEnd,
            expandRecurrence: true,
        });

        // Transform to frontend format
        const frontendEvents = events.map(event => ({
            id: event.instanceId, // Use instance ID for recurring events
            eventId: event.eventId, // Original event ID
            title: event.title,
            start: event.startAt.toISOString(),
            end: event.endAt.toISOString(),
            startDate: event.startDate || undefined,
            endDate: event.endDate || undefined,
            type: event.metadata?.type || 'default',
            description: event.description || undefined,
            location: event.metadata?.location,
            guests: event.metadata?.guests,
            meetLink: event.metadata?.meetLink,
            isAllDay: event.isAllDay,
            isRecurring: event.isRecurring,
            rrule: event.rrule,
            timezone: event.timezone,
        }));

        return NextResponse.json({ events: frontendEvents });
    } catch (error) {
        console.error('[API] GET /api/events error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch events' },
            { status: 500 }
        );
    }
}

/**
 * Handle POST /api/events requests to create a new calendar event.
 *
 * Accepts a JSON body with the following fields:
 * - title (required), start (required, ISO string), end (required, ISO string)
 * - startDate?, endDate? (optional date-only strings)
 * - type? — 'business' | 'personal' | 'meetings' | 'holiday' | 'default' (defaults to 'default')
 * - description?, location?, isAllDay?, rrule? (RFC 5545), timezone? (IANA), guests? (string[]), meetLink?
 *
 * The handler validates required fields, constructs event metadata, persists the event,
 * and returns a frontend-facing event representation.
 *
 * @returns On success returns a JSON object { event: { id, eventId, title, start, end, startDate?, endDate?, type, description?, location?, guests?, meetLink?, isAllDay, isRecurring, rrule?, timezone } } with HTTP status 201. Returns 400 with `{ error: string }` when required fields are missing, and 500 with `{ error: string }` on server error.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as {
            title?: string;
            start?: string;
            end?: string;
            startDate?: string;
            endDate?: string;
            type?: 'business' | 'personal' | 'meetings' | 'holiday' | 'default';
            description?: string;
            location?: string;
            isAllDay?: boolean;
            rrule?: string;
            timezone?: string;
            guests?: string[];
            meetLink?: string;
        };

        // Validate required fields
        if (!body.title || !body.start || !body.end) {
            return NextResponse.json(
                { error: 'Missing required fields: title, start, end' },
                { status: 400 }
            );
        }

        const metadata: EventMetadata = {
            type: body.type || 'default',
            location: body.location,
            guests: body.guests,
            meetLink: body.meetLink,
        };

        const input: CreateEventInput = {
            title: body.title,
            description: body.description,
            startAt: new Date(body.start),
            endAt: new Date(body.end),
            startDate: body.startDate,
            endDate: body.endDate,
            timezone: body.timezone || DEFAULT_TIMEZONE,
            isAllDay: body.isAllDay || false,
            rrule: body.rrule,
            metadata,
        };

        const event = createEvent(input);

        // Transform to frontend format
        const frontendEvent = {
            id: event.id,
            eventId: event.id,
            title: event.title,
            start: event.startAt.toISOString(),
            end: event.endAt.toISOString(),
            startDate: event.startDate,
            endDate: event.endDate,
            type: event.metadata?.type || 'default',
            description: event.description,
            location: event.metadata?.location,
            guests: event.metadata?.guests,
            meetLink: event.metadata?.meetLink,
            isAllDay: event.isAllDay,
            isRecurring: !!event.rrule,
            rrule: event.rrule,
            timezone: event.timezone,
        };

        return NextResponse.json({ event: frontendEvent }, { status: 201 });
    } catch (error) {
        console.error('[API] POST /api/events error:', error);
        return NextResponse.json(
            { error: 'Failed to create event' },
            { status: 500 }
        );
    }
}