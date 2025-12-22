/**
 * Chat Controller
 *
 * Orchestrates the entire chat pipeline with enhanced UX:
 * 1. Phase-based routing (idle, collecting_info, awaiting_selection, awaiting_confirmation)
 * 2. Intent shift detection and handling
 * 3. Expanded confirmation patterns
 * 4. Scoped LLM calls for complex clarification responses
 * 5. Correction handling ("no, 4pm not 5")
 *
 * Enhanced with:
 * - Rate limiting integration
 * - Instrumentation logging
 * - Unified clarification flow
 * - LLM call budget tracking
 */

import {
    ChatRequest,
    ChatResponse,
    ConversationContext,
    ParsedIntent,
    ValidatedCommand,
    ClarificationParseResult,
    ConversationPhase,
    ActiveIntentState,
} from './types';
import { CalendarEvent } from '@/types';
import { createIntentParser, IntentParser } from './intentParser';
import { createCommandValidator, CommandValidator } from './commandValidator';
import { createClarificationManager, ClarificationManager } from './clarificationManager';
import { createResponseFormatter, ResponseFormatter } from './responseFormatter';
import {
    POLICIES,
    isAcknowledgment,
    matchesExpandedConfirmation,
    matchesIntentShiftSignal,
    matchesCorrectionPattern,
    isTrivialInput,
} from './policies';
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
import type { StoredEvent, CreateEventInput, UpdateEventInput, ExpandedEventInstance } from '@/lib/db/types';
import { storedEventToCalendarEvent, expandedEventToCalendarEvent } from '@/lib/mappers';

// ============================================================================
// Constants
// ============================================================================

const MAX_LLM_CALLS_PER_ACTION = 3;
const MAX_CLARIFICATION_ATTEMPTS = 2;

// ============================================================================
// Helper: Create initial/default context
// ============================================================================

function createDefaultContext(conversationId: string): ConversationContext {
    return {
        conversationId,
        turns: [],
        phase: 'idle',
        activeIntent: null,
        interruptedIntents: [],
        lastActivityAt: new Date().toISOString(),
        llmCallsThisAction: 0,
        awaitingClarification: false,
        clarificationCount: 0,
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
     * Handle a chat request with enhanced UX
     */
    async handle(request: ChatRequest): Promise<ChatResponse> {
        const { message, context, timezone, currentTime } = request;

        // Ensure context has all required fields (migration from old format)
        let updatedContext = this.migrateContext(context);
        updatedContext.lastActivityAt = new Date().toISOString();
        updatedContext.llmCallsThisAction = 0;

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

            // Route based on current conversation phase
            const phase = updatedContext.phase || 'idle';

            switch (phase) {
                case 'idle':
                    return this.handleIdlePhase(message, updatedContext, timezone, currentTime, actionId);

                case 'collecting_info':
                    return this.handleCollectingInfoPhase(message, updatedContext, timezone, currentTime, actionId);

                case 'awaiting_selection':
                    return this.handleSelectionPhase(message, updatedContext, timezone, currentTime, actionId);

                case 'awaiting_confirmation':
                    return this.handleConfirmationPhase(message, updatedContext, timezone, currentTime, actionId);

                case 'confirming_intent_shift':
                    return this.handleIntentShiftConfirmation(message, updatedContext, timezone, currentTime, actionId);

                default:
                    // Fallback to legacy handling
                    return this.handleLegacy(request);
            }

        } catch (error) {
            console.error('ChatController error:', error);
            return {
                message: this.responseFormatter.formatError(
                    error instanceof Error ? error.message : 'An unexpected error occurred'
                ),
                intent: 'error',
                updatedContext: this.clarificationManager.clearPendingClarification(updatedContext),
            };
        }
    }

    /**
     * Migrate old context format to new format
     */
    private migrateContext(context: ConversationContext): ConversationContext {
        return {
            ...context,
            phase: context.phase || 'idle',
            activeIntent: context.activeIntent || null,
            interruptedIntents: context.interruptedIntents || [],
            llmCallsThisAction: 0,
        };
    }

    /**
     * Handle messages when in idle phase (fresh message)
     */
    private async handleIdlePhase(
        message: string,
        context: ConversationContext,
        timezone: string,
        currentTime: string,
        actionId: string
    ): Promise<ChatResponse> {
        // Check for NO-OP acknowledgments first
        if (isAcknowledgment(message)) {
            this.instrumentation.recordSuccess(actionId, 'noop');
            return {
                message: this.responseFormatter.formatNoop(),
                intent: 'noop',
                updatedContext: context,
            };
        }

        // Check LLM call budget
        if (context.llmCallsThisAction >= MAX_LLM_CALLS_PER_ACTION) {
            return {
                message: this.responseFormatter.formatMaxClarifications(),
                intent: 'error',
                updatedContext: this.clarificationManager.clearPendingClarification(context),
            };
        }

        // Parse intent via Groq
        const parsedIntent = await this.intentParser.parse(
            message,
            currentTime,
            timezone,
            context.turns,
            actionId
        );
        context.llmCallsThisAction++;

        // Add turn to history
        let updatedContext = this.addTurn(context, 'user', message);

        // Validate the parsed intent
        const validationResult = await this.commandValidator.validate(parsedIntent, timezone, currentTime);

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
                // Set up active intent for clarification
                const question = validationResult.clarification.question;
                updatedContext = this.clarificationManager.setActiveIntent(
                    updatedContext,
                    parsedIntent,
                    [validationResult.clarification.field],
                    question,
                    validationResult.clarification.candidates
                );

                updatedContext = this.addTurn(updatedContext, 'assistant', question);

                return {
                    message: question,
                    intent: 'clarification',
                    intentId: parsedIntent.intentId,
                    clarification: validationResult.clarification,
                    updatedContext,
                };
            }

            return {
                message: this.responseFormatter.formatError('Could not process request'),
                intent: 'error',
                intentId: parsedIntent.intentId,
                updatedContext,
            };
        }

        // Execute the validated command
        return this.executeCommand(validationResult.command!, updatedContext, timezone, actionId);
    }

    /**
     * Handle messages when collecting info (clarification flow)
     */
    private async handleCollectingInfoPhase(
        message: string,
        context: ConversationContext,
        timezone: string,
        currentTime: string,
        actionId: string
    ): Promise<ChatResponse> {
        const activeIntent = context.activeIntent;
        if (!activeIntent) {
            // No active intent, treat as fresh
            return this.handleIdlePhase(message, { ...context, phase: 'idle' }, timezone, currentTime, actionId);
        }

        // Step 1: Check for intent shift signals
        const shiftDetection = this.clarificationManager.detectIntentShift(message);
        if (shiftDetection.isShift && shiftDetection.type !== 'none') {
            return this.handleDetectedIntentShift(message, context, shiftDetection.type, timezone, currentTime, actionId);
        }

        // Step 2: Try deterministic parsing
        const parseResult = this.clarificationManager.processClarificationResponseEnhanced(message, context);

        // Step 3: Handle based on result type
        switch (parseResult.type) {
            case 'answer':
            case 'correction':
                return this.handleClarificationAnswer(parseResult, context, timezone, currentTime, actionId);

            case 'abort':
                return {
                    message: "Cancelled. What would you like to do instead?",
                    intent: 'noop',
                    updatedContext: this.clarificationManager.clearPendingClarification(context),
                };

            case 'intent_shift':
                return this.handleDetectedIntentShift(message, context, 'redirect', timezone, currentTime, actionId);

            case 'unclear':
                // Check clarification attempts
                if ((activeIntent.clarificationAttempts || 0) >= MAX_CLARIFICATION_ATTEMPTS) {
                    return {
                        message: this.responseFormatter.formatMaxClarifications(),
                        intent: 'error',
                        updatedContext: this.clarificationManager.clearPendingClarification(context),
                    };
                }

                // If complex input and within LLM budget, try scoped LLM
                if (!isTrivialInput(message) && context.llmCallsThisAction < MAX_LLM_CALLS_PER_ACTION) {
                    return this.handleComplexClarificationResponse(message, context, timezone, currentTime, actionId);
                }

                // Re-ask with helpful message
                const question = parseResult.confusionReason || activeIntent.lastQuestion;
                const updatedContext = {
                    ...context,
                    activeIntent: {
                        ...activeIntent,
                        clarificationAttempts: (activeIntent.clarificationAttempts || 0) + 1,
                    },
                };

                return {
                    message: question,
                    intent: 'clarification',
                    updatedContext: this.addTurn(updatedContext, 'assistant', question),
                };
        }
    }

    /**
     * Handle messages when awaiting selection from candidates
     */
    private async handleSelectionPhase(
        message: string,
        context: ConversationContext,
        timezone: string,
        currentTime: string,
        actionId: string
    ): Promise<ChatResponse> {
        // Selection phase uses the same logic as collecting info
        // but with candidates available
        return this.handleCollectingInfoPhase(message, context, timezone, currentTime, actionId);
    }

    /**
     * Handle messages when awaiting confirmation for destructive action
     */
    private async handleConfirmationPhase(
        message: string,
        context: ConversationContext,
        timezone: string,
        currentTime: string,
        actionId: string
    ): Promise<ChatResponse> {
        const activeIntent = context.activeIntent;
        if (!activeIntent || !activeIntent.pendingCommand) {
            return {
                message: "I lost track of what we were doing. Could you start over?",
                intent: 'error',
                updatedContext: this.clarificationManager.clearPendingClarification(context),
            };
        }

        // Use expanded confirmation patterns
        const confirmed = matchesExpandedConfirmation(message);

        if (confirmed === true) {
            // Execute the pending command
            const updatedContext = this.clarificationManager.clearPendingClarification(context);
            return this.executeCommand(activeIntent.pendingCommand, updatedContext, timezone, actionId, true);
        }

        if (confirmed === false) {
            return {
                message: "Cancelled. Anything else I can help with?",
                intent: 'noop',
                updatedContext: this.clarificationManager.clearPendingClarification(context),
            };
        }

        // Check for intent shift
        if (matchesIntentShiftSignal(message)) {
            return {
                message: "Cancelled. What would you like to do instead?",
                intent: 'noop',
                updatedContext: this.clarificationManager.clearPendingClarification(context),
            };
        }

        // Unclear - ask again
        return {
            message: 'Please reply "yes" to confirm or "no" to cancel.',
            intent: 'clarification',
            updatedContext: this.addTurn(context, 'assistant', 'Please reply "yes" to confirm or "no" to cancel.'),
        };
    }

    /**
     * Handle confirmation of intent shift
     */
    private async handleIntentShiftConfirmation(
        message: string,
        context: ConversationContext,
        timezone: string,
        currentTime: string,
        actionId: string
    ): Promise<ChatResponse> {
        const confirmed = matchesExpandedConfirmation(message);

        if (confirmed === true) {
            // User confirmed switch - interrupt current intent and process new one
            const newIntentMessage = context.activeIntent?.pendingNewIntent
                ? 'new intent stored'
                : null;

            const updatedContext = this.clarificationManager.interruptCurrentIntent(context, 'user_redirected');

            // If we stored a pending new intent, process it
            if (context.activeIntent?.pendingNewIntent) {
                // Re-parse the original message that triggered the shift
                // For now, just clear and let user re-enter
            }

            return {
                message: "Cancelled. What would you like to do?",
                intent: 'noop',
                updatedContext,
            };
        }

        if (confirmed === false) {
            // User wants to continue with current intent
            const activeIntent = context.activeIntent;
            if (activeIntent) {
                const updatedContext: ConversationContext = {
                    ...context,
                    phase: activeIntent.candidates && activeIntent.candidates.length > 0
                        ? 'awaiting_selection'
                        : 'collecting_info',
                };

                return {
                    message: `Let's continue. ${activeIntent.lastQuestion}`,
                    intent: 'clarification',
                    updatedContext: this.addTurn(updatedContext, 'assistant', activeIntent.lastQuestion),
                };
            }
        }

        // Unclear
        return {
            message: 'Would you like to cancel what we were doing? (yes/no)',
            intent: 'clarification',
            updatedContext: context,
        };
    }

    /**
     * Handle a detected intent shift
     */
    private async handleDetectedIntentShift(
        message: string,
        context: ConversationContext,
        shiftType: 'abort' | 'redirect',
        timezone: string,
        currentTime: string,
        actionId: string
    ): Promise<ChatResponse> {
        const activeIntent = context.activeIntent;

        if (shiftType === 'abort') {
            // Pure abort - just cancel
            return {
                message: "Cancelled. What would you like to do instead?",
                intent: 'noop',
                updatedContext: this.clarificationManager.clearPendingClarification(context),
            };
        }

        // Redirect - ask for confirmation before switching
        const currentTask = activeIntent?.intent.event?.title
            ? `creating "${activeIntent.intent.event.title}"`
            : `${activeIntent?.intent.intent || 'the current task'}`;

        const updatedContext: ConversationContext = {
            ...context,
            phase: 'confirming_intent_shift',
        };

        const question = `Should I cancel ${currentTask} and do something else?`;

        return {
            message: question,
            intent: 'clarification',
            updatedContext: this.addTurn(updatedContext, 'assistant', question),
        };
    }

    /**
     * Handle a successful clarification answer
     */
    private async handleClarificationAnswer(
        parseResult: ClarificationParseResult,
        context: ConversationContext,
        timezone: string,
        currentTime: string,
        actionId: string
    ): Promise<ChatResponse> {
        const activeIntent = context.activeIntent;
        if (!activeIntent) {
            return {
                message: "I lost track of what we were doing. Could you start over?",
                intent: 'error',
                updatedContext: this.clarificationManager.clearPendingClarification(context),
            };
        }

        // Merge the answer into the intent
        const mergedIntent = this.clarificationManager.mergeParseResult(parseResult, activeIntent);
        if (!mergedIntent) {
            return {
                message: this.responseFormatter.formatError('Could not process response'),
                intent: 'error',
                updatedContext: context,
            };
        }

        // Re-validate
        const validationResult = await this.commandValidator.validate(mergedIntent, timezone, currentTime);

        if (!validationResult.valid) {
            if (validationResult.error) {
                return {
                    message: this.responseFormatter.formatError(validationResult.error.message),
                    intent: 'error',
                    updatedContext: context,
                };
            }

            if (validationResult.clarification) {
                // Need more info
                const question = validationResult.clarification.question;
                const updatedContext = this.clarificationManager.setActiveIntent(
                    context,
                    mergedIntent,
                    [validationResult.clarification.field],
                    question,
                    validationResult.clarification.candidates
                );

                return {
                    message: question,
                    intent: 'clarification',
                    clarification: validationResult.clarification,
                    updatedContext: this.addTurn(updatedContext, 'assistant', question),
                };
            }

            return {
                message: this.responseFormatter.formatError('Could not process request'),
                intent: 'error',
                updatedContext: context,
            };
        }

        // Clear clarification state and execute
        const clearedContext = this.clarificationManager.clearPendingClarification(context);
        return this.executeCommand(validationResult.command!, clearedContext, timezone, actionId);
    }

    /**
     * Handle complex clarification response via scoped LLM call
     */
    private async handleComplexClarificationResponse(
        message: string,
        context: ConversationContext,
        timezone: string,
        currentTime: string,
        actionId: string
    ): Promise<ChatResponse> {
        const activeIntent = context.activeIntent;
        if (!activeIntent) {
            return this.handleIdlePhase(message, { ...context, phase: 'idle' }, timezone, currentTime, actionId);
        }

        // Make scoped LLM call
        const candidates = activeIntent.candidates?.map(c => ({ id: c.id, title: c.title }));
        const llmResult = await this.intentParser.parseClarificationResponse(
            message,
            activeIntent.lastQuestion,
            activeIntent.awaitingFields[0],
            candidates,
            timezone,
            actionId
        );
        context.llmCallsThisAction++;

        // Process LLM result
        switch (llmResult.type) {
            case 'answer':
            case 'correction':
                return this.handleClarificationAnswer(llmResult, context, timezone, currentTime, actionId);

            case 'abort':
                return {
                    message: "Cancelled. What would you like to do instead?",
                    intent: 'noop',
                    updatedContext: this.clarificationManager.clearPendingClarification(context),
                };

            case 'intent_shift':
                return this.handleDetectedIntentShift(message, context, 'redirect', timezone, currentTime, actionId);

            case 'unclear':
            default:
                // Give up after LLM also couldn't understand
                const question = llmResult.confusionReason || activeIntent.lastQuestion;
                return {
                    message: question,
                    intent: 'clarification',
                    updatedContext: this.addTurn(context, 'assistant', question),
                };
        }
    }

    /**
     * Execute a validated command
     */
    private async executeCommand(
        command: ValidatedCommand,
        context: ConversationContext,
        timezone: string,
        actionId: string,
        skipConfirmation: boolean = false
    ): Promise<ChatResponse> {
        let updatedContext: ConversationContext = { ...context, phase: 'executing' };

        switch (command.intent) {
            case 'create':
                return this.executeCreate(command, updatedContext, actionId);

            case 'update':
                return this.executeUpdate(command, updatedContext, actionId);

            case 'delete':
                // Require confirmation for destructive delete actions
                if (!skipConfirmation && command.targetEventId) {
                    return this.requestConfirmation('delete', command, context);
                }
                return this.executeDelete(command, updatedContext, actionId);

            case 'query':
                return this.executeQuery(command, updatedContext, actionId);

            default:
                return {
                    message: this.responseFormatter.formatError('Unknown command type'),
                    intent: 'error',
                    intentId: command.intentId,
                    updatedContext: { ...updatedContext, phase: 'idle' },
                };
        }
    }

    /**
     * Execute a create command
     */
    private executeCreate(command: ValidatedCommand, context: ConversationContext, actionId: string): ChatResponse {
        if (!command.event) {
            return {
                message: this.responseFormatter.formatError('Missing event data'),
                intent: 'error',
                intentId: command.intentId,
                updatedContext: { ...context, phase: 'idle' },
            };
        }

        const input: CreateEventInput = {
            title: command.event.title,
            startAt: command.event.startAt,
            endAt: command.event.endAt,
            startDate: command.event.startDate,
            endDate: command.event.endDate,
            timezone: command.event.timezone,
            isAllDay: command.event.isAllDay,
            rrule: command.event.rrule,
            description: command.event.description,
            metadata: {
                type: command.event.type || 'default',
            },
        };

        const created = createEvent(input);
        const calendarEvent = storedEventToCalendarEvent(created);
        const message = this.responseFormatter.formatCreated(calendarEvent);

        this.instrumentation.recordSuccess(actionId, 'created');
        const updatedContext = this.addTurn({ ...context, phase: 'idle' }, 'assistant', message);

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
    private executeUpdate(command: ValidatedCommand, context: ConversationContext, actionId: string): ChatResponse {
        if (!command.targetEventId) {
            return {
                message: this.responseFormatter.formatError('No event specified to update'),
                intent: 'error',
                intentId: command.intentId,
                updatedContext: { ...context, phase: 'idle' },
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
                updatedContext: { ...context, phase: 'idle' },
            };
        }

        const calendarEvent = storedEventToCalendarEvent(updated);
        const message = this.responseFormatter.formatUpdated(calendarEvent, Object.keys(updates));

        this.instrumentation.recordSuccess(actionId, 'updated');
        const updatedContext = this.addTurn({ ...context, phase: 'idle' }, 'assistant', message);

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
    private executeDelete(command: ValidatedCommand, context: ConversationContext, actionId: string): ChatResponse {
        if (!command.targetEventId) {
            return {
                message: this.responseFormatter.formatError('No event specified to delete'),
                intent: 'error',
                intentId: command.intentId,
                updatedContext: { ...context, phase: 'idle' },
            };
        }

        // Get event info before deletion for response
        const event = getEventById(command.targetEventId);
        if (!event) {
            return {
                message: this.responseFormatter.formatError('Event not found'),
                intent: 'error',
                intentId: command.intentId,
                updatedContext: { ...context, phase: 'idle' },
            };
        }

        const calendarEvent = storedEventToCalendarEvent(event);
        let message: string;

        // Handle recurring event instance deletion
        let success = false;
        if (command.instanceDate && event.rrule) {
            console.log(`[Execute] Deleting recurring instance: ${command.targetEventId} on ${command.instanceDate}`);
            const result = addExceptionDate(command.targetEventId, command.instanceDate);
            success = !!result;
            message = success
                ? this.responseFormatter.formatDeleted(calendarEvent, true)
                : this.responseFormatter.formatError("Failed to remove occurrence from series.");
        } else {
            console.log(`[Execute] Deleting base event: ${command.targetEventId}`);
            success = deleteEvent(command.targetEventId);
            message = success
                ? this.responseFormatter.formatDeleted(calendarEvent, false)
                : this.responseFormatter.formatError("Event could not be deleted from database.");
        }

        if (success) {
            this.instrumentation.recordSuccess(actionId, 'deleted');
        }

        const updatedContext = this.addTurn({ ...context, phase: 'idle' }, 'assistant', message);

        return {
            message,
            intent: success ? 'deleted' : 'error',
            intentId: command.intentId,
            event: success ? calendarEvent : undefined,
            updatedContext,
        };
    }

    /**
     * Execute a query command
     */
    private executeQuery(command: ValidatedCommand, context: ConversationContext, actionId: string): ChatResponse {
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

        const calendarEvents = events.map(e => expandedEventToCalendarEvent(e));

        const message = this.responseFormatter.formatQueryResult(calendarEvents);
        this.instrumentation.recordSuccess(actionId, 'queried');
        const updatedContext = this.addTurn({ ...context, phase: 'idle' }, 'assistant', message);

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
                updatedContext: { ...context, phase: 'idle' },
            };
        }

        const calendarEvent = storedEventToCalendarEvent(event);
        const instanceOnly = !!command.instanceDate && !!event.rrule;
        const message = this.responseFormatter.formatConfirmationRequest(action, calendarEvent, instanceOnly);

        // Set up confirmation state
        const updatedContext: ConversationContext = {
            ...context,
            phase: 'awaiting_confirmation',
            activeIntent: {
                intent: {
                    intentId: command.intentId,
                    intent: command.intent,
                    confidence: 1,
                    reference: { type: 'id', value: command.targetEventId! },
                    event: command.instanceDate ? { instanceDate: command.instanceDate } : undefined,
                },
                awaitingFields: ['confirmation'],
                lastQuestion: message,
                clarificationAttempts: 0,
                pendingCommand: command,
            },
            awaitingClarification: true,
            pendingClarification: {
                field: 'confirmation',
                partialIntent: {
                    intentId: command.intentId,
                    intent: command.intent,
                    confidence: 1,
                    reference: { type: 'id', value: command.targetEventId! },
                    event: command.instanceDate ? { instanceDate: command.instanceDate } : undefined,
                },
                attemptCount: 0,
            },
        };

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
            updatedContext: this.addTurn(updatedContext, 'assistant', message),
        };
    }

    /**
     * Legacy handler for backward compatibility
     */
    private async handleLegacy(request: ChatRequest): Promise<ChatResponse> {
        const { message, context, timezone, currentTime } = request;
        let updatedContext = { ...context, lastActivityAt: new Date().toISOString() };
        const actionId = `action_${crypto.randomUUID()}`;

        // Handle pending clarifications
        if (context.awaitingClarification && context.pendingClarification) {
            if (context.pendingClarification.field === 'confirmation') {
                const confirmed = matchesExpandedConfirmation(message);

                if (confirmed === true && context.pendingClarification.partialIntent) {
                    const validationResult = await this.commandValidator.validate(
                        context.pendingClarification.partialIntent,
                        timezone,
                        currentTime
                    );

                    if (validationResult.valid && validationResult.command) {
                        updatedContext = this.clarificationManager.clearPendingClarification(updatedContext);
                        return this.executeCommand(validationResult.command, updatedContext, timezone, actionId, true);
                    }
                }

                if (confirmed === false) {
                    return {
                        message: 'Cancelled.',
                        intent: 'noop',
                        updatedContext: this.clarificationManager.clearPendingClarification(updatedContext),
                    };
                }
            }
        }

        // Fall back to idle handling
        return this.handleIdlePhase(message, { ...updatedContext, phase: 'idle' }, timezone, currentTime, actionId);
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
