/**
 * Single Event API Route Handlers
 * 
 * Provides REST API endpoints for individual event operations.
 * GET - Get event by ID
 * PUT - Update event
 * DELETE - Delete event
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    getEventById,
    updateEvent,
    deleteEvent,
} from '@/lib/db';
import type { UpdateEventInput, EventMetadata } from '@/lib/db';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * Retrieve a single event by ID and return it in the frontend-friendly shape.
 *
 * @param _ - The incoming NextRequest (unused).
 * @param params - Route parameters; `params.id` resolves to the event ID to fetch.
 * @returns A JSON response:
 * - Success: `{ event: { id, eventId, title, start, end, type, description, location, guests, meetLink, isAllDay, isRecurring, rrule, timezone } }`
 * - Not found: `{ error: 'Event not found' }` with HTTP 404
 * - Failure: `{ error: 'Failed to fetch event' }` with HTTP 500
 */
export async function GET(_: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const event = getEventById(id);

        if (!event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            );
        }

        // Transform to frontend format
        const frontendEvent = {
            id: event.id,
            eventId: event.id,
            title: event.title,
            start: event.startAt.toISOString(),
            end: event.endAt.toISOString(),
            type: event.metadata?.type || 'default',
            description: event.description || undefined,
            location: event.metadata?.location,
            guests: event.metadata?.guests,
            meetLink: event.metadata?.meetLink,
            isAllDay: event.isAllDay,
            isRecurring: !!event.rrule,
            rrule: event.rrule,
            timezone: event.timezone,
        };

        return NextResponse.json({ event: frontendEvent });
    } catch (error) {
        console.error('[API] GET /api/events/[id] error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch event' },
            { status: 500 }
        );
    }
}

/**
 * Update an existing event identified by the route `id`.
 *
 * Accepts a JSON body with optional fields to update; metadata fields (`type`, `location`, `guests`, `meetLink`)
 * are merged with existing metadata when present. `start` and `end` ISO strings are interpreted as dates.
 *
 * @param request - The incoming request whose JSON body may include any of: `title`, `description`, `start`, `end`, `timezone`, `isAllDay`, `rrule`, `type` ('business' | 'personal' | 'meetings' | 'holiday' | 'default'), `location`, `guests`, `meetLink`.
 * @param params - Route parameters containing a promise-resolved `id` for the event.
 * @returns On success, a JSON object `{ event }` where `event` is the updated event in frontend format with fields: `id`, `eventId`, `title`, `start`, `end`, `type` (defaults to `'default'` when absent), `description` (present or `undefined`), `location`, `guests`, `meetLink`, `isAllDay`, `isRecurring`, `rrule`, and `timezone`. Responds with status 404 when the event is not found and 500 on internal failure.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json() as {
            title?: string;
            description?: string;
            start?: string;
            end?: string;
            timezone?: string;
            isAllDay?: boolean;
            rrule?: string;
            type?: 'business' | 'personal' | 'meetings' | 'holiday' | 'default';
            location?: string;
            guests?: string[];
            meetLink?: string;
        };

        // Build update input
        const updateInput: UpdateEventInput = {};

        if (body.title !== undefined) {
            updateInput.title = body.title;
        }
        if (body.description !== undefined) {
            updateInput.description = body.description;
        }
        if (body.start !== undefined) {
            updateInput.startAt = new Date(body.start);
        }
        if (body.end !== undefined) {
            updateInput.endAt = new Date(body.end);
        }
        if (body.timezone !== undefined) {
            updateInput.timezone = body.timezone;
        }
        if (body.isAllDay !== undefined) {
            updateInput.isAllDay = body.isAllDay;
        }
        if (body.rrule !== undefined) {
            updateInput.rrule = body.rrule;
        }

        // Handle metadata updates
        if (body.type !== undefined || body.location !== undefined || body.guests !== undefined || body.meetLink !== undefined) {
            const existingEvent = getEventById(id);
            const existingMetadata = existingEvent?.metadata || {};

            const metadata: EventMetadata = {
                ...existingMetadata,
                type: body.type !== undefined ? body.type : existingMetadata.type,
                location: body.location !== undefined ? body.location : existingMetadata.location,
                guests: body.guests !== undefined ? body.guests : existingMetadata.guests,
                meetLink: body.meetLink !== undefined ? body.meetLink : existingMetadata.meetLink,
            };
            updateInput.metadata = metadata;
        }

        const event = updateEvent(id, updateInput);

        if (!event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            );
        }

        // Transform to frontend format
        const frontendEvent = {
            id: event.id,
            eventId: event.id,
            title: event.title,
            start: event.startAt.toISOString(),
            end: event.endAt.toISOString(),
            type: event.metadata?.type || 'default',
            description: event.description || undefined,
            location: event.metadata?.location,
            guests: event.metadata?.guests,
            meetLink: event.metadata?.meetLink,
            isAllDay: event.isAllDay,
            isRecurring: !!event.rrule,
            rrule: event.rrule,
            timezone: event.timezone,
        };

        return NextResponse.json({ event: frontendEvent });
    } catch (error) {
        console.error('[API] PUT /api/events/[id] error:', error);
        return NextResponse.json(
            { error: 'Failed to update event' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/events/[id]
 * 
 * Delete an event
 */
export async function DELETE(_: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const deleted = deleteEvent(id);

        if (!deleted) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] DELETE /api/events/[id] error:', error);
        return NextResponse.json(
            { error: 'Failed to delete event' },
            { status: 500 }
        );
    }
}