/**
 * Conversation Orchestrator
 * 
 * The main decision flow for handling chat messages.
 * Routes messages to local handlers or AI, manages state, enforces safety.
 */

import { CalendarEvent } from '@/types';
import {
    ConversationState,
    createConversationState,
    resetConversationState,
    updateState,
    setIntent,
    setTargetEvent,
    setPendingUI,
    clearPendingUI,
    setRecurringScope,
    mergePartialEvent,
    hasActiveIntent,
    isAwaitingScope,
    isReadyForConfirm,
    hasMinimumCreateData,
    type IntentType,
    type RecurringScopeType,
    type UIComponentType,
} from './state';
import {
    parseIntent,
    parseClarification,
    checkInterrupt,
    getPromptContext,
    type AIResponse,
} from './ai-client';
import {
    searchEvents,
    findAmbiguousMatches,
    findBestMatch,
    findEventsInRange,
    type SearchCriteria,
} from './search';

// ============================================================================
// Types
// ============================================================================

export type MessageType = 'text' | 'ui_response';

export interface UIResponsePayload {
    type: UIComponentType;
    value: unknown;
}

export interface IncomingMessage {
    type: MessageType;
    content?: string;           // For text messages
    uiResponse?: UIResponsePayload; // For UI responses
}

export interface OrchestratorResponse {
    state: ConversationState;
    reply: string | null;
    uiToRender: {
        type: UIComponentType;
        payload: unknown;
    } | null;
    action: OrchestratorAction | null;
}

export type OrchestratorAction =
    | { type: 'create_event'; data: Partial<CalendarEvent> }
    | { type: 'update_event'; eventId: string; data: Partial<CalendarEvent>; scope?: RecurringScopeType }
    | { type: 'delete_event'; eventId: string; scope?: RecurringScopeType }
    | { type: 'query_events'; criteria: SearchCriteria; events: CalendarEvent[] };

// ============================================================================
// Interrupt Detection
// ============================================================================

const CLEAR_INTERRUPT_PATTERNS = [
    /^cancel$/i,
    /^stop$/i,
    /^never\s*mind$/i,
    /^forget\s*it$/i,
    /^quit$/i,
    /^exit$/i,
    /^abort$/i,
];

const AMBIGUOUS_INTERRUPT_PATTERNS = [
    /^actually/i,
    /^wait/i,
    /^hold\s*on/i,
];

/**
 * Detect if a message is a clear interrupt
 */
function isClearInterrupt(message: string): boolean {
    const trimmed = message.trim();
    return CLEAR_INTERRUPT_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Detect if a message might be an interrupt (needs AI disambiguation)
 */
function mightBeInterrupt(message: string): boolean {
    const trimmed = message.trim();
    return AMBIGUOUS_INTERRUPT_PATTERNS.some(pattern => pattern.test(trimmed));
}

// ============================================================================
// Main Orchestrator
// ============================================================================

export class ChatOrchestrator {
    private state: ConversationState;
    private events: CalendarEvent[];
    private timezone: string;

    constructor(
        events: CalendarEvent[] = [],
        timezone: string = 'UTC',
        existingState?: ConversationState
    ) {
        this.events = events;
        this.timezone = timezone;
        this.state = existingState || createConversationState();
    }

    /**
     * Get current state (for persistence)
     */
    getState(): ConversationState {
        return this.state;
    }

    /**
     * Update the events list (e.g., after CRUD operations)
     */
    updateEvents(events: CalendarEvent[]): void {
        this.events = events;
    }

    /**
     * Process an incoming message
     */
    async processMessage(message: IncomingMessage): Promise<OrchestratorResponse> {
        // 1. Handle UI responses locally
        if (message.type === 'ui_response' && message.uiResponse) {
            return this.handleUIResponse(message.uiResponse);
        }

        const content = message.content?.trim() || '';

        // 2. Check for clear interrupts
        if (isClearInterrupt(content)) {
            return this.handleInterrupt();
        }

        // 3. Check for ambiguous interrupts (needs AI disambiguation)
        if (mightBeInterrupt(content) && hasActiveIntent(this.state)) {
            const context = getPromptContext(this.timezone);
            const interruptCheck = await checkInterrupt(content, context);

            if (interruptCheck?.is_interrupt) {
                return this.handleInterrupt();
            }
            // Not an interrupt, continue to next step
        }

        // 4. If we have a pending question, do scoped clarification
        if (this.state.pendingQuestion && hasActiveIntent(this.state)) {
            return this.handleClarification(content);
        }

        // 5. Otherwise, do full intent parse
        return this.handleNewMessage(content);
    }

    /**
     * Handle UI responses locally
     */
    private handleUIResponse(uiResponse: UIResponsePayload): OrchestratorResponse {
        const { type, value } = uiResponse;

        switch (type) {
            case 'scope_selector':
                return this.handleScopeSelection(value as RecurringScopeType);

            case 'confirm_action_delete':
                return this.handleDeleteConfirmation(value as boolean);

            case 'confirm_action_update':
                return this.handleUpdateConfirmation(value as boolean);

            case 'option_list':
                return this.handleEventSelection(value as string); // event ID

            case 'yes_no':
                return this.handleYesNo(value as boolean);

            default:
                // Unknown UI type, just clear it
                this.state = clearPendingUI(this.state);
                return this.buildResponse(null, null, null);
        }
    }

    /**
     * Handle interrupt - clear state and confirm
     */
    private handleInterrupt(): OrchestratorResponse {
        this.state = resetConversationState(this.state);

        return this.buildResponse(
            'No problem, I\'ve cancelled that. What would you like to do?',
            null,
            null
        );
    }

    /**
     * Handle scoped clarification
     */
    private async handleClarification(content: string): Promise<OrchestratorResponse> {
        const context = getPromptContext(this.timezone);

        // Convert partialEvent to AIPartialEventData format for the prompt
        const currentPartialData = {
            title: this.state.partialEvent.title || null,
            start: this.state.partialEvent.start || null,
            end: this.state.partialEvent.end || null,
            isAllDay: this.state.partialEvent.isAllDay ?? null,
            description: this.state.partialEvent.description || null,
            location: this.state.partialEvent.location || null,
            type: this.state.partialEvent.type || null,
            guests: this.state.partialEvent.guests || null,
        };

        const aiResponse = await parseClarification(
            content,
            this.state.pendingQuestion || '',
            context,
            currentPartialData,
            this.state.intent || undefined
        );

        // Clear the pending question
        this.state = updateState(this.state, { pendingQuestion: null });

        if (!aiResponse) {
            return this.buildResponse(
                'I didn\'t quite catch that. Could you try again?',
                null,
                null
            );
        }

        return this.processAIResponse(aiResponse);
    }

    /**
     * Handle a fresh message with full intent parse
     */
    private async handleNewMessage(content: string): Promise<OrchestratorResponse> {
        const context = getPromptContext(this.timezone);
        const aiResponse = await parseIntent(content, context);

        if (!aiResponse) {
            return this.buildResponse(
                'I\'m having trouble understanding. Could you rephrase that?',
                null,
                null
            );
        }

        // Initialize state with intent
        const intent = this.mapAIIntent(aiResponse.intent);
        if (intent) {
            this.state = setIntent(this.state, intent);
        }

        return this.processAIResponse(aiResponse);
    }

    /**
     * Process AI response and determine next step
     */
    private processAIResponse(aiResponse: AIResponse): OrchestratorResponse {
        // Merge any partial event data
        if (aiResponse.partial_event_data) {
            const data = aiResponse.partial_event_data;
            this.state = mergePartialEvent(this.state, {
                title: data.title || undefined,
                start: data.start || undefined,
                end: data.end || undefined,
                isAllDay: data.isAllDay ?? undefined,
                description: data.description || undefined,
                location: data.location || undefined,
                type: data.type || undefined,
                guests: data.guests || undefined,
            });
        }

        // Check if AI wants to show UI
        if (aiResponse.ui_requests && aiResponse.ui_requests.length > 0) {
            const uiRequest = aiResponse.ui_requests[0]; // Take first UI request
            this.state = setPendingUI(this.state, uiRequest.type, uiRequest.data);

            return this.buildResponse(
                aiResponse.next_question,
                { type: uiRequest.type, payload: uiRequest.data },
                null
            );
        }

        // Check if AI has a question
        if (aiResponse.next_question) {
            this.state = updateState(this.state, { pendingQuestion: aiResponse.next_question });
            return this.buildResponse(aiResponse.next_question, null, null);
        }

        // Check if we can proceed based on intent
        return this.checkAndProceed();
    }

    /**
     * Check state and proceed to next step (show UI, execute, etc.)
     */
    private checkAndProceed(): OrchestratorResponse {
        const { intent } = this.state;

        switch (intent) {
            case 'create':
                return this.proceedCreate();

            case 'update':
                return this.proceedUpdate();

            case 'delete':
                return this.proceedDelete();

            case 'query':
                return this.proceedQuery();

            default:
                return this.buildResponse(
                    'What would you like to do?',
                    null,
                    null
                );
        }
    }

    /**
     * Proceed with create intent
     */
    private proceedCreate(): OrchestratorResponse {
        if (!hasMinimumCreateData(this.state)) {
            const question = 'What would you like to call this event, and when should it be?';
            this.state = updateState(this.state, { pendingQuestion: question });
            return this.buildResponse(question, null, null);
        }

        // Create directly (no confirmation UI needed)
        const action: OrchestratorAction = {
            type: 'create_event',
            data: this.buildEventFromPartial(),
        };

        const reply = `Got it! I'll create "${this.state.partialEvent.title}".`;

        // Reset state after action
        this.state = resetConversationState(this.state);

        return this.buildResponse(reply, null, action);
    }

    /**
     * Proceed with update intent
     */
    private proceedUpdate(): OrchestratorResponse {
        // Need to find the target event first
        if (!this.state.targetEventId) {
            return this.findTargetEvent('update');
        }

        // For recurring events, need scope first
        if (this.state.isRecurring && !this.state.recurringScope) {
            this.state = setPendingUI(this.state, 'scope_selector', {
                eventId: this.state.targetEventId,
                action: 'update',
            });
            this.state = updateState(this.state, { status: 'awaiting_scope' });

            return this.buildResponse(
                'This is a recurring event. How would you like to apply this change?',
                { type: 'scope_selector', payload: { event: this.state.targetEvent, actionType: 'edit' } },
                null
            );
        }

        // Show update confirmation
        this.state = setPendingUI(this.state, 'confirm_action_update', {
            event: this.state.targetEvent,
            changes: this.state.partialEvent,
        });
        this.state = updateState(this.state, { status: 'awaiting_confirm' });

        return this.buildResponse(
            'Here are the changes. Does this look right?',
            { type: 'confirm_action_update', payload: { event: this.state.targetEvent } },
            null
        );
    }

    /**
     * Proceed with delete intent
     */
    private proceedDelete(): OrchestratorResponse {
        // Need to find the target event first
        if (!this.state.targetEventId) {
            return this.findTargetEvent('delete');
        }

        // For recurring events, need scope first
        if (this.state.isRecurring && !this.state.recurringScope) {
            this.state = setPendingUI(this.state, 'scope_selector', {
                eventId: this.state.targetEventId,
                action: 'delete',
            });
            this.state = updateState(this.state, { status: 'awaiting_scope' });

            return this.buildResponse(
                'This is a recurring event. Which occurrences would you like to delete?',
                { type: 'scope_selector', payload: { event: this.state.targetEvent, actionType: 'delete' } },
                null
            );
        }

        // Show delete confirmation
        this.state = setPendingUI(this.state, 'confirm_action_delete', {
            event: this.state.targetEvent,
        });
        this.state = updateState(this.state, { status: 'awaiting_confirm' });

        return this.buildResponse(
            'Are you sure you want to delete this event?',
            { type: 'confirm_action_delete', payload: { event: this.state.targetEvent } },
            null
        );
    }

    /**
     * Proceed with query intent
     */
    private proceedQuery(): OrchestratorResponse {
        // Build search criteria from partial event data
        const criteria: SearchCriteria = {
            title: this.state.partialEvent.title,
            startDate: this.state.partialEvent.start?.split('T')[0],
            endDate: this.state.partialEvent.end?.split('T')[0],
        };

        // Actually search for events
        let matchingEvents: CalendarEvent[] = [];

        if (criteria.startDate) {
            // Search by date range
            const endDate = criteria.endDate || criteria.startDate;
            matchingEvents = findEventsInRange(this.events, criteria.startDate, endDate);
        } else if (criteria.title) {
            // Search by title
            const results = searchEvents(this.events, criteria);
            matchingEvents = results.map(r => r.event);
        } else {
            // No specific criteria - return today's events as default
            const today = new Date().toISOString().split('T')[0];
            matchingEvents = findEventsInRange(this.events, today, today);
        }

        // Build appropriate reply
        let reply: string;
        if (matchingEvents.length === 0) {
            reply = criteria.startDate
                ? `You don't have any events scheduled for ${criteria.startDate}.`
                : "You don't have any events matching that criteria.";
        } else if (matchingEvents.length === 1) {
            reply = `Here's what you have scheduled:`;
        } else {
            reply = `Here are ${matchingEvents.length} events:`;
        }

        const action: OrchestratorAction = {
            type: 'query_events',
            criteria,
            events: matchingEvents,
        };

        // Reset state
        this.state = resetConversationState(this.state);

        return this.buildResponse(reply, null, action);
    }

    /**
     * Find target event for update/delete
     */
    private findTargetEvent(action: 'update' | 'delete'): OrchestratorResponse {
        const criteria: SearchCriteria = {
            title: this.state.partialEvent.title,
            startDate: this.state.partialEvent.start?.split('T')[0],
        };

        // If we have a date but no title, search by date first
        if (criteria.startDate && !criteria.title) {
            const dateEvents = findEventsInRange(this.events, criteria.startDate, criteria.startDate);

            if (dateEvents.length === 0) {
                const question = `You don't have any events on ${criteria.startDate}. Which event did you want to ${action}?`;
                this.state = updateState(this.state, { pendingQuestion: question });
                return this.buildResponse(question, null, null);
            }

            if (dateEvents.length === 1) {
                // Single event on that date - use it
                this.state = setTargetEvent(this.state, dateEvents[0]);
                return this.checkAndProceed();
            }

            // Multiple events on that date - show option list
            this.state = setPendingUI(this.state, 'option_list', {
                events: dateEvents,
                action,
            });

            return this.buildResponse(
                `I found ${dateEvents.length} events on ${criteria.startDate}. Which one would you like to ${action}?`,
                { type: 'option_list', payload: { events: dateEvents, action } },
                null
            );
        }

        // Look for ambiguous matches by title
        const ambiguous = findAmbiguousMatches(this.events, criteria);

        if (ambiguous.length > 1) {
            // Multiple matches, show option list
            this.state = setPendingUI(this.state, 'option_list', {
                events: ambiguous,
                action,
            });

            return this.buildResponse(
                `I found ${ambiguous.length} events that might match. Which one did you mean?`,
                { type: 'option_list', payload: { events: ambiguous, action } },
                null
            );
        }

        // Try to find best match
        const bestMatch = findBestMatch(this.events, criteria);

        if (bestMatch) {
            this.state = setTargetEvent(this.state, bestMatch);
            return this.checkAndProceed();
        }

        // No match found - ask for more details
        const question = `I couldn't find that event. Could you give me more details, like the event title or date?`;
        this.state = updateState(this.state, { pendingQuestion: question });
        return this.buildResponse(question, null, null);
    }

    // ============================================================================
    // UI Response Handlers
    // ============================================================================

    private handleScopeSelection(scope: RecurringScopeType): OrchestratorResponse {
        this.state = setRecurringScope(this.state, scope);
        this.state = clearPendingUI(this.state);

        // Continue to confirmation
        return this.checkAndProceed();
    }

    private handleDeleteConfirmation(confirmed: boolean): OrchestratorResponse {
        this.state = clearPendingUI(this.state);

        if (!confirmed) {
            this.state = resetConversationState(this.state);
            return this.buildResponse('Event deletion cancelled.', null, null);
        }

        // Execute delete
        const action: OrchestratorAction = {
            type: 'delete_event',
            eventId: this.state.targetEventId!,
            scope: this.state.recurringScope || undefined,
        };

        const eventTitle = this.state.targetEvent?.title || 'Event';
        this.state = resetConversationState(this.state);

        return this.buildResponse(`"${eventTitle}" has been deleted.`, null, action);
    }

    private handleUpdateConfirmation(confirmed: boolean): OrchestratorResponse {
        this.state = clearPendingUI(this.state);

        if (!confirmed) {
            this.state = resetConversationState(this.state);
            return this.buildResponse('Event update cancelled.', null, null);
        }

        // Execute update
        const action: OrchestratorAction = {
            type: 'update_event',
            eventId: this.state.targetEventId!,
            data: this.buildEventFromPartial(),
            scope: this.state.recurringScope || undefined,
        };

        const eventTitle = this.state.targetEvent?.title || 'Event';
        this.state = resetConversationState(this.state);

        return this.buildResponse(`"${eventTitle}" has been updated.`, null, action);
    }

    private handleEventSelection(eventId: string): OrchestratorResponse {
        const event = this.events.find(e => e.id === eventId);

        if (!event) {
            this.state = clearPendingUI(this.state);
            return this.buildResponse('I couldn\'t find that event. Please try again.', null, null);
        }

        this.state = setTargetEvent(this.state, event);
        this.state = clearPendingUI(this.state);

        return this.checkAndProceed();
    }

    private handleYesNo(value: boolean): OrchestratorResponse {
        this.state = clearPendingUI(this.state);
        // Generic yes/no handling - can be extended
        return this.buildResponse(
            value ? 'Great!' : 'Okay, no problem.',
            null,
            null
        );
    }

    // ============================================================================
    // Helpers
    // ============================================================================

    private mapAIIntent(aiIntent: string): IntentType {
        switch (aiIntent) {
            case 'create_event':
                return 'create';
            case 'update_event':
                return 'update';
            case 'delete_event':
                return 'delete';
            case 'query_event':
                return 'query';
            default:
                return null;
        }
    }

    private buildEventFromPartial(): Partial<CalendarEvent> {
        const { partialEvent } = this.state;
        return {
            title: partialEvent.title,
            start: partialEvent.start ? new Date(partialEvent.start) : undefined,
            end: partialEvent.end ? new Date(partialEvent.end) : undefined,
            isAllDay: partialEvent.isAllDay,
            description: partialEvent.description,
            location: partialEvent.location,
            type: partialEvent.type || 'default',
            guests: partialEvent.guests,
        };
    }

    private buildResponse(
        reply: string | null,
        uiToRender: { type: UIComponentType; payload: unknown } | null,
        action: OrchestratorAction | null
    ): OrchestratorResponse {
        return {
            state: this.state,
            reply,
            uiToRender,
            action,
        };
    }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new orchestrator instance
 */
export function createOrchestrator(
    events: CalendarEvent[] = [],
    timezone: string = 'UTC',
    existingState?: ConversationState
): ChatOrchestrator {
    return new ChatOrchestrator(events, timezone, existingState);
}
