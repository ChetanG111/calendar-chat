/**
 * Chat Controller
 *
 * Orchestrates the entire chat pipeline:
 * 1. Pre-check for NO-OPs
 * 2. Handle pending clarifications (without Groq)
 * 3. Parse intent via Groq (with retries and rate limiting)
 * 4. Handle unified clarification response from LLM
 * 5. Validate command
 * 6. Execute calendar operations
 * 7. Format and return response
 *
 * Enhanced with:
 * - Rate limiting integration
 * - Instrumentation logging
 * - Unified clarification flow
 * - Reduced confirmations for low-risk ops
 */

import {
    ChatRequest,
    ChatResponse,
    ConversationContext,
    ParsedIntent,
    ValidatedCommand,
} from './types';
import { CalendarEvent } from '@/types';
import { createIntentParser, IntentParser } from './intentParser';
import { createCommandValidator, CommandValidator } from './commandValidator';
import { createClarificationManager, ClarificationManager } from './clarificationManager';
import { createResponseFormatter, ResponseFormatter } from './responseFormatter';
import { POLICIES, isAcknowledgment, parseConfirmation } from './policies';
import { getRateLimiter, RateLimiter } from './rateLimiter';
import { getInstrumentation, ChatInstrumentation } from './instrumentation';
import {
    createEvent,
    updateEvent,
    deleteEvent,
    addExceptionDate,
    queryEventsInRange,
    getEventById,
} from '@/lib/db';
import type { StoredEvent, CreateEventInput, UpdateEventInput } from '@/lib/db/types';

// ============================================================================
// Helper: Convert StoredEvent to CalendarEvent
// ============================================================================

function toCalendarEvent(stored: StoredEvent): CalendarEvent {
    return {
        id: stored.id,
        title: stored.title,
        start: stored.startAt,
        end: stored.endAt,
        type: stored.metadata.type || 'personal',
        description: stored.description || undefined,
        location: stored.metadata.location,
        guests: stored.metadata.guests,
        meetLink: stored.metadata.meetLink,
        isAllDay: stored.isAllDay,
        rrule: stored.rrule || undefined,
        timezone: stored.timezone,
    };
}

// ============================================================================
// Chat Controller
// ============================================================================

export class ChatController {
    private intentParser: IntentParser;
    private commandValidator: CommandValidator;
    private clarificationManager: ClarificationManager;
    private responseFormatter: ResponseFormatter;
    private rateLimiter: RateLimiter;
    private instrumentation: ChatInstrumentation;

    constructor() {
        this.intentParser = createIntentParser();
        this.commandValidator = createCommandValidator();
        this.clarificationManager = createClarificationManager();
        this.responseFormatter = createResponseFormatter();
        this.rateLimiter = getRateLimiter();
        this.instrumentation = getInstrumentation();
    }

    /**
     * Handle a chat request
     */
    async handle(request: ChatRequest): Promise<ChatResponse> {
        const { message, context, timezone, currentTime } = request;
        let updatedContext = { ...context, lastActivityAt: new Date().toISOString() };
        const actionId = `action_${crypto.randomUUID()}`;

        // Start instrumentation and rate limiting for this action
        this.rateLimiter.startAction(actionId);
        this.instrumentation.startAction(actionId);

        try {
            // Check burst limit before proceeding
            if (this.rateLimiter.isBurstLimitExceeded()) {
                return {
                    message: this.rateLimiter.getGracefulDegradationMessage(),
                    intent: 'error',
                    updatedContext,
                };
            }

            // Step 1: Pre-check for NO-OP acknowledgments
            if (this.isNoopMessage(message, context)) {
                this.instrumentation.recordSuccess(actionId, 'noop');
                return {
                    message: this.responseFormatter.formatNoop(),
                    intent: 'noop',
                    updatedContext: this.clarificationManager.clearPendingClarification(updatedContext),
                };
            }

            // Step 2: Handle pending confirmations
            if (context.awaitingClarification && context.pendingClarification?.field === 'confirmation') {
                const result = await this.handleConfirmation(message, context, timezone);
                this.instrumentation.recordSuccess(actionId, result.intent);
                return result;
            }

            // Step 3: Handle pending clarifications (without Groq)
            if (this.clarificationManager.canProcessClarification(context)) {
                const result = this.clarificationManager.processClarificationResponse(message, context);

                if (result) {
                    // Re-validate the merged intent
                    const validationResult = await this.commandValidator.validate(
                        result.mergedIntent,
                        timezone
                    );

                    if (validationResult.valid && validationResult.command) {
                        // Clear clarification and execute
                        updatedContext = this.clarificationManager.clearPendingClarification(updatedContext);
                        const execResult = await this.executeCommand(validationResult.command, updatedContext, timezone);
                        this.instrumentation.recordSuccess(actionId, execResult.intent);
                        return execResult;
                    }

                    if (validationResult.clarification) {
                        // Need more clarification - but limit to 1 per action
                        if (context.clarificationCount >= POLICIES.MAX_CLARIFICATIONS) {
                            // Instead of error, try to execute with defaults
                            return {
                                message: this.responseFormatter.formatMaxClarifications(),
                                intent: 'clarification',
                                updatedContext: this.clarificationManager.clearPendingClarification(updatedContext),
                            };
                        }

                        updatedContext = this.clarificationManager.setPendingClarification(
                            updatedContext,
                            validationResult.clarification
                        );
                        this.instrumentation.recordClarification(actionId, validationResult.clarification.field);

                        return {
                            message: validationResult.clarification.question,
                            intent: 'clarification',
                            clarification: validationResult.clarification,
                            updatedContext,
                        };
                    }
                }

                // Could not process clarification response - continue to Groq
            }

            // Step 4: Parse intent via Groq (with retries handled internally)
            const parsedIntent = await this.intentParser.parse(
                message,
                currentTime,
                timezone,
                context.turns,
                actionId
            );

            // Add turn to history
            updatedContext = this.addTurn(updatedContext, 'user', message);

            // Step 5: Validate the parsed intent
            const validationResult = await this.commandValidator.validate(parsedIntent, timezone);

            if (!validationResult.valid) {
                if (validationResult.error) {
                    return {
                        message: this.responseFormatter.formatError(validationResult.error.message),
                        intent: 'error',
                        intentId: parsedIntent.intentId,
                        updatedContext,
                    };
                }

                if (validationResult.clarification) {
                    if (context.clarificationCount >= POLICIES.MAX_CLARIFICATIONS) {
                        return {
                            message: this.responseFormatter.formatMaxClarifications(),
                            intent: 'error',
                            updatedContext: this.clarificationManager.clearPendingClarification(updatedContext),
                        };
                    }

                    updatedContext = this.clarificationManager.setPendingClarification(
                        updatedContext,
                        validationResult.clarification
                    );

                    const response: ChatResponse = {
                        message: validationResult.clarification.question,
                        intent: 'clarification',
                        intentId: parsedIntent.intentId,
                        clarification: validationResult.clarification,
                        updatedContext,
                    };

                    updatedContext = this.addTurn(updatedContext, 'assistant', validationResult.clarification.question);
                    return { ...response, updatedContext };
                }

                return {
                    message: this.responseFormatter.formatError('Could not process request'),
                    intent: 'error',
                    intentId: parsedIntent.intentId,
                    updatedContext,
                };
            }

            // Step 6: Execute the validated command
            return this.executeCommand(validationResult.command!, updatedContext, timezone);

        } catch (error) {
            console.error('ChatController error:', error);
            return {
                message: this.responseFormatter.formatError(
                    error instanceof Error ? error.message : 'An unexpected error occurred'
                ),
                intent: 'error',
                updatedContext,
            };
        }
    }

    /**
     * Check if message is a NO-OP acknowledgment
     */
    private isNoopMessage(message: string, context: ConversationContext): boolean {
        return isAcknowledgment(message) && !context.awaitingClarification;
    }

    /**
     * Handle a confirmation response
     */
    private async handleConfirmation(
        message: string,
        context: ConversationContext,
        timezone: string
    ): Promise<ChatResponse> {
        const confirmed = parseConfirmation(message);
        const pending = context.pendingClarification;
        let updatedContext = this.clarificationManager.clearPendingClarification(context);

        if (confirmed === null) {
            // Could not parse - ask again
            return {
                message: 'Please reply "yes" to confirm or "no" to cancel.',
                intent: 'clarification',
                updatedContext,
            };
        }

        if (!confirmed) {
            return {
                message: 'Cancelled.',
                intent: 'noop',
                updatedContext,
            };
        }

        // Execute the pending action
        if (pending?.partialIntent) {
            const validationResult = await this.commandValidator.validate(
                pending.partialIntent,
                timezone
            );

            if (validationResult.valid && validationResult.command) {
                return this.executeCommand(validationResult.command, updatedContext, timezone, true);
            }
        }

        return {
            message: this.responseFormatter.formatError('Could not complete the action'),
            intent: 'error',
            updatedContext,
        };
    }

    /**
     * Execute a validated command
     * Note: Confirmation only required for DELETE, not UPDATE (reduced friction)
     */
    private async executeCommand(
        command: ValidatedCommand,
        context: ConversationContext,
        timezone: string,
        skipConfirmation: boolean = false
    ): Promise<ChatResponse> {
        let updatedContext = context;

        switch (command.intent) {
            case 'create':
                return this.executeCreate(command, updatedContext);

            case 'update':
                // Skip confirmation for updates - reduced friction
                return this.executeUpdate(command, updatedContext);

            case 'delete':
                // Only require confirmation for destructive delete actions
                if (!skipConfirmation && command.targetEventId) {
                    return this.requestConfirmation('delete', command, context);
                }
                return this.executeDelete(command, updatedContext);

            case 'query':
                return this.executeQuery(command, updatedContext);

            default:
                return {
                    message: this.responseFormatter.formatError('Unknown command type'),
                    intent: 'error',
                    intentId: command.intentId,
                    updatedContext,
                };
        }
    }

    /**
     * Execute a create command
     */
    private executeCreate(command: ValidatedCommand, context: ConversationContext): ChatResponse {
        if (!command.event) {
            return {
                message: this.responseFormatter.formatError('Missing event data'),
                intent: 'error',
                intentId: command.intentId,
                updatedContext: context,
            };
        }

        const input: CreateEventInput = {
            title: command.event.title,
            startAt: command.event.startAt,
            endAt: command.event.endAt,
            timezone: command.event.timezone,
            isAllDay: command.event.isAllDay,
            rrule: command.event.rrule,
            description: command.event.description,
            metadata: {
                type: command.event.type,
            },
        };

        const created = createEvent(input);
        const calendarEvent = toCalendarEvent(created);
        const message = this.responseFormatter.formatCreated(calendarEvent);

        const updatedContext = this.addTurn(context, 'assistant', message);

        return {
            message,
            intent: 'created',
            intentId: command.intentId,
            event: calendarEvent,
            updatedContext,
        };
    }

    /**
     * Execute an update command
     */
    private executeUpdate(command: ValidatedCommand, context: ConversationContext): ChatResponse {
        if (!command.targetEventId) {
            return {
                message: this.responseFormatter.formatError('No event specified to update'),
                intent: 'error',
                intentId: command.intentId,
                updatedContext: context,
            };
        }

        const updates: UpdateEventInput = {};

        if (command.event) {
            if (command.event.title) updates.title = command.event.title;
            if (command.event.startAt) updates.startAt = command.event.startAt;
            if (command.event.endAt) updates.endAt = command.event.endAt;
            if (command.event.description !== undefined) updates.description = command.event.description;
            if (command.event.rrule !== undefined) updates.rrule = command.event.rrule;
            if (command.event.isAllDay !== undefined) updates.isAllDay = command.event.isAllDay;
            if (command.event.type) {
                updates.metadata = { type: command.event.type };
            }
        }

        const updated = updateEvent(command.targetEventId, updates);

        if (!updated) {
            return {
                message: this.responseFormatter.formatError('Event not found'),
                intent: 'error',
                intentId: command.intentId,
                updatedContext: context,
            };
        }

        const calendarEvent = toCalendarEvent(updated);
        const message = this.responseFormatter.formatUpdated(calendarEvent, Object.keys(updates));

        const updatedContext = this.addTurn(context, 'assistant', message);

        return {
            message,
            intent: 'updated',
            intentId: command.intentId,
            event: calendarEvent,
            updatedContext,
        };
    }

    /**
     * Execute a delete command
     */
    private executeDelete(command: ValidatedCommand, context: ConversationContext): ChatResponse {
        if (!command.targetEventId) {
            return {
                message: this.responseFormatter.formatError('No event specified to delete'),
                intent: 'error',
                intentId: command.intentId,
                updatedContext: context,
            };
        }

        // Get event info before deletion for response
        const event = getEventById(command.targetEventId);
        if (!event) {
            return {
                message: this.responseFormatter.formatError('Event not found'),
                intent: 'error',
                intentId: command.intentId,
                updatedContext: context,
            };
        }

        const calendarEvent = toCalendarEvent(event);
        let message: string;

        // Handle recurring event instance deletion
        if (command.instanceDate && event.rrule) {
            addExceptionDate(command.targetEventId, command.instanceDate);
            message = this.responseFormatter.formatDeleted(calendarEvent, true);
        } else {
            deleteEvent(command.targetEventId);
            message = this.responseFormatter.formatDeleted(calendarEvent, false);
        }

        const updatedContext = this.addTurn(context, 'assistant', message);

        return {
            message,
            intent: 'deleted',
            intentId: command.intentId,
            event: calendarEvent,
            updatedContext,
        };
    }

    /**
     * Execute a query command
     */
    private executeQuery(command: ValidatedCommand, context: ConversationContext): ChatResponse {
        const query = command.query;

        // Default to this week if no range specified
        const now = new Date();
        const rangeStart = query?.rangeStart ? new Date(query.rangeStart) : new Date(now.setHours(0, 0, 0, 0));
        const rangeEnd = query?.rangeEnd ? new Date(query.rangeEnd) : new Date(rangeStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        let events = queryEventsInRange({
            rangeStart,
            rangeEnd,
            expandRecurrence: true,
        });

        // Filter by title if specified
        if (query?.titleContains) {
            const searchTerm = query.titleContains.toLowerCase();
            events = events.filter(e => e.title.toLowerCase().includes(searchTerm));
        }

        const calendarEvents = events.map(e => ({
            id: e.instanceId,
            title: e.title,
            start: e.startAt,
            end: e.endAt,
            type: (e.metadata.type || 'personal') as 'business' | 'personal' | 'meetings' | 'holiday',
            description: e.description || undefined,
            isAllDay: e.isAllDay,
            rrule: e.rrule || undefined,
            timezone: e.timezone,
        }));

        const message = this.responseFormatter.formatQueryResult(calendarEvents);
        const updatedContext = this.addTurn(context, 'assistant', message);

        return {
            message,
            intent: 'queried',
            intentId: command.intentId,
            events: calendarEvents,
            updatedContext,
        };
    }

    /**
     * Request confirmation for destructive action
     */
    private requestConfirmation(
        action: 'delete' | 'update',
        command: ValidatedCommand,
        context: ConversationContext
    ): ChatResponse {
        const event = getEventById(command.targetEventId!);
        if (!event) {
            return {
                message: this.responseFormatter.formatError('Event not found'),
                intent: 'error',
                intentId: command.intentId,
                updatedContext: context,
            };
        }

        const calendarEvent = toCalendarEvent(event);
        const instanceOnly = !!command.instanceDate && !!event.rrule;
        const message = this.responseFormatter.formatConfirmationRequest(action, calendarEvent, instanceOnly);

        // Store command in pending clarification for confirmation
        const updatedContext = this.clarificationManager.setPendingClarification(context, {
            field: 'confirmation',
            question: message,
            partialIntent: {
                intentId: command.intentId,
                intent: command.intent,
                confidence: 1,
                reference: { type: 'id', value: command.targetEventId! },
                event: command.instanceDate ? { instanceDate: command.instanceDate } : undefined,
            },
        });

        return {
            message,
            intent: 'confirmation_required',
            intentId: command.intentId,
            event: calendarEvent,
            confirmationRequired: {
                action,
                targetEvent: calendarEvent,
                description: message,
                instanceOnly,
            },
            updatedContext,
        };
    }

    /**
     * Add a turn to conversation history
     */
    private addTurn(
        context: ConversationContext,
        role: 'user' | 'assistant',
        content: string
    ): ConversationContext {
        return {
            ...context,
            turns: [
                ...context.turns,
                {
                    role,
                    content,
                    timestamp: new Date().toISOString(),
                },
            ].slice(-10), // Keep last 10 turns
        };
    }
}

/**
 * Create a ChatController instance
 */
export function createChatController(): ChatController {
    return new ChatController();
}
