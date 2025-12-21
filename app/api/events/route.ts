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
 * GET /api/events
 * 
 * Query parameters:
 * - rangeStart: ISO date string (optional)
 * - rangeEnd: ISO date string (optional)
 * 
 * If no range is provided, returns events for the current month.
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
            type: event.metadata?.type || 'personal',
            description: event.description,
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
 * POST /api/events
 * 
 * Request body:
 * - title: string (required)
 * - start: ISO date string (required)
 * - end: ISO date string (required)
 * - type: 'business' | 'personal' | 'meetings' | 'holiday'
 * - description: string (optional)
 * - location: string (optional)
 * - isAllDay: boolean (optional)
 * - rrule: string (optional) - RFC 5545 RRULE
 * - timezone: string (optional) - IANA timezone
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as {
            title?: string;
            start?: string;
            end?: string;
            type?: 'business' | 'personal' | 'meetings' | 'holiday';
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
            type: body.type || 'personal',
            location: body.location,
            guests: body.guests,
            meetLink: body.meetLink,
        };

        const input: CreateEventInput = {
            title: body.title,
            description: body.description,
            startAt: new Date(body.start),
            endAt: new Date(body.end),
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
            type: event.metadata?.type || 'personal',
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
