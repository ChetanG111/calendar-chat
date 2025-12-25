/**
 * Chat API Route
 * 
 * Next.js API endpoint for processing chat messages.
 * Handles both text messages and UI responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    createOrchestrator,
    type IncomingMessage,
    type ConversationState,
} from '@/lib/chat';
import { queryEventsInRange } from '@/lib/db/events';
import type { CalendarEvent } from '@/types';

// ============================================================================
// Types
// ============================================================================

interface ChatRequestBody {
    message: IncomingMessage;
    state?: ConversationState;
    timezone?: string;
}

interface ChatResponseBody {
    success: boolean;
    reply: string | null;
    state: ConversationState;
    ui?: {
        type: string;
        payload: unknown;
    } | null;
    action?: {
        type: string;
        data?: unknown;
        eventId?: string;
        scope?: string;
        criteria?: unknown;
        events?: CalendarEvent[];
    } | null;
    error?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get events for the current month (used for search context)
 */
function getEventsForContext(): CalendarEvent[] {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0); // 2 months ahead

    try {
        const instances = queryEventsInRange({
            rangeStart: startOfMonth,
            rangeEnd: endOfMonth,
        });

        // Convert expanded instances to CalendarEvent format
        return instances.map((instance) => ({
            id: instance.eventId,
            eventId: instance.eventId,
            title: instance.title,
            start: instance.startAt,
            end: instance.endAt,
            startDate: instance.startDate || undefined,
            endDate: instance.endDate || undefined,
            type: (instance.metadata?.type as string) || 'default',
            description: instance.description || undefined,
            location: (instance.metadata?.location as string) || undefined,
            isAllDay: instance.isAllDay,
            rrule: instance.rrule || undefined,
            timezone: instance.timezone,
        }));
    } catch (error) {
        console.error('[Chat API] Failed to fetch events:', error);
        return [];
    }
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<ChatResponseBody>> {
    try {
        const body = (await request.json()) as ChatRequestBody;
        const { message, state, timezone = 'UTC' } = body;

        // Validate message
        if (!message || (!message.content && !message.uiResponse)) {
            return NextResponse.json(
                {
                    success: false,
                    reply: null,
                    state: state || ({} as ConversationState),
                    error: 'Invalid message format',
                },
                { status: 400 }
            );
        }

        // Get events for context
        const events = getEventsForContext();

        // Create orchestrator with existing state (if any)
        const orchestrator = createOrchestrator(events, timezone, state);

        // Process the message
        const response = await orchestrator.processMessage(message);

        // Build action response with proper type narrowing
        let actionResponse: ChatResponseBody['action'] = null;
        if (response.action) {
            const action = response.action;
            switch (action.type) {
                case 'create_event':
                    actionResponse = {
                        type: 'create_event',
                        data: action.data,
                    };
                    break;
                case 'update_event':
                    actionResponse = {
                        type: 'update_event',
                        eventId: action.eventId,
                        data: action.data,
                        scope: action.scope || undefined,
                    };
                    break;
                case 'delete_event':
                    actionResponse = {
                        type: 'delete_event',
                        eventId: action.eventId,
                        scope: action.scope || undefined,
                    };
                    break;
                case 'query_events':
                    actionResponse = {
                        type: 'query_events',
                        criteria: action.criteria,
                        events: action.events,
                    };
                    break;
            }
        }

        return NextResponse.json({
            success: true,
            reply: response.reply,
            state: response.state,
            ui: response.uiToRender,
            action: actionResponse,
        });
    } catch (error) {
        console.error('[Chat API] Error processing message:', error);

        return NextResponse.json(
            {
                success: false,
                reply: 'Sorry, something went wrong. Please try again.',
                state: {} as ConversationState,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// ============================================================================
// GET Handler (for health check)
// ============================================================================

export async function GET(): Promise<NextResponse> {
    return NextResponse.json({
        status: 'ok',
        service: 'chat-api',
        timestamp: new Date().toISOString(),
    });
}
