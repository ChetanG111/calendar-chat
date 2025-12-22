/**
 * Chat API Route
 *
 * POST /api/chat
 * Handles chat messages and returns AI responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createChatController, createEmptyContext, ConversationContext, ChatRequest } from '@/lib/chat';

// Store conversation contexts in memory (in production, use Redis/DB)
const conversationContexts = new Map<string, ConversationContext>();

// Get or create conversation context
function getContext(conversationId: string): ConversationContext {
    let context = conversationContexts.get(conversationId);
    if (!context) {
        context = createEmptyContext(conversationId);
        conversationContexts.set(conversationId, context);
    }
    return context;
}

// Update stored context
function updateContext(conversationId: string, context: ConversationContext): void {
    conversationContexts.set(conversationId, context);
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate request
        if (!body.message || typeof body.message !== 'string') {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 }
            );
        }

        // Extract request data
        const conversationId = body.conversationId || crypto.randomUUID();
        const timezone = body.timezone || 'UTC';
        const currentTime = body.currentTime || new Date().toISOString();

        // Get or create context
        const context = getContext(conversationId);

        // Create chat request
        const chatRequest: ChatRequest = {
            message: body.message,
            conversationId,
            context,
            timezone,
            currentTime,
        };

        // Process the message
        const controller = createChatController();
        const response = await controller.handle(chatRequest);

        // Update stored context
        updateContext(conversationId, response.updatedContext);

        // Return response
        return NextResponse.json({
            conversationId,
            message: response.message,
            intent: response.intent,
            intentId: response.intentId,
            event: response.event,
            events: response.events,
            clarification: response.clarification,
            confirmationRequired: response.confirmationRequired,
        });

    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

// Clear old conversations periodically (basic cleanup)
setInterval(() => {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [id, context] of conversationContexts.entries()) {
        const lastActivity = new Date(context.lastActivityAt).getTime();
        if (now - lastActivity > maxAge) {
            conversationContexts.delete(id);
        }
    }
}, 5 * 60 * 1000); // Run every 5 minutes
