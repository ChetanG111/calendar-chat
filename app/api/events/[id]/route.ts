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
 * GET /api/events/[id]
 * 
 * Get a single event by ID
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
 * PUT /api/events/[id]
 * 
 * Update an existing event
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
            type?: 'business' | 'personal' | 'meetings' | 'holiday';
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
