/**
 * Chat API Route
 *
 * POST /api/chat
 * Handles chat messages and returns AI responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createChatController, createEmptyContext, ConversationContext, ChatRequest } from '@/lib/chat';

// Store conversation contexts in memory with a TTL mechanism to prevent leaks.
const conversationContexts = new Map<string, { context: ConversationContext, expires: number }>();
const CONTEXT_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Periodically clean up expired contexts
setInterval(() => {
    const now = Date.now();
    for (const [id, value] of conversationContexts.entries()) {
        if (now > value.expires) {
            conversationContexts.delete(id);
        }
    }
}, 60 * 1000); // Check every minute

// Get or create conversation context
function getContext(conversationId: string): ConversationContext {
    const stored = conversationContexts.get(conversationId);
    if (!stored || Date.now() > stored.expires) {
        const newContext = createEmptyContext(conversationId);
        conversationContexts.set(conversationId, { context: newContext, expires: Date.now() + CONTEXT_TTL_MS });
        return newContext;
    }
    // Extend expiration on access
    stored.expires = Date.now() + CONTEXT_TTL_MS;
    return stored.context;
}

// Update stored context
function updateContext(conversationId: string, context: ConversationContext): void {
    conversationContexts.set(conversationId, { context, expires: Date.now() + CONTEXT_TTL_MS });
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

/*
NOTE: The in-memory cache and setInterval are for demonstration purposes only.
In a production/serverless environment, this should be replaced with a persistent,
distributed cache like Redis, Vercel KV, or a database with a TTL policy to
manage conversation context and session cleanup effectively.
*/
