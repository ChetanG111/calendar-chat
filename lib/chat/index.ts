/**
 * Chat Module Exports
 *
 * Public API for the chat pipeline.
 */

// Types
export * from './types';

// Policies
export { POLICIES, isAcknowledgment, parseSelectionIndex, parseConfirmation } from './policies';

// Rate Limiting
export { RateLimiter, createRateLimiter, getRateLimiter, DEFAULT_RATE_LIMIT_CONFIG } from './rateLimiter';

// Instrumentation
export { ChatInstrumentation, createInstrumentation, getInstrumentation } from './instrumentation';

// Core modules
export { IntentParser, createIntentParser } from './intentParser';
export { CommandValidator, createCommandValidator } from './commandValidator';
export { ClarificationManager, createClarificationManager } from './clarificationManager';
export { ResponseFormatter, createResponseFormatter } from './responseFormatter';
export { ChatController, createChatController } from './chatController';

// Convenience: Create a default context
export function createEmptyContext(conversationId: string): import('./types').ConversationContext {
    return {
        conversationId,
        turns: [],
        awaitingClarification: false,
        clarificationCount: 0,
        lastActivityAt: new Date().toISOString(),
    };
}

