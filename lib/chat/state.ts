/**
 * Conversation State Management
 * 
 * Defines the ConversationState type and helper functions for managing
 * the orchestrator's state across turns.
 */

import { CalendarEvent } from '@/types';

// ============================================================================
// Types
// ============================================================================

export type UIComponentType =
    | 'yes_no'
    | 'option_list'
    | 'scope_selector'
    | 'confirm_action_delete'
    | 'confirm_action_update'
    | 'event_card';

export type IntentType = 'create' | 'update' | 'delete' | 'query' | null;

export type StatusType =
    | 'idle'
    | 'gathering'
    | 'awaiting_scope'
    | 'awaiting_confirm'
    | 'completed'
    | 'cancelled';

export type RecurringScopeType = 'single' | 'future' | 'all' | null;

export interface PartialEventData {
    title?: string;
    start?: string;       // ISO datetime string
    end?: string;         // ISO datetime string
    isAllDay?: boolean;
    description?: string;
    location?: string;
    type?: string;        // Calendar type/category ID
    guests?: string[];
}

export interface PendingUI {
    type: UIComponentType;
    payload?: unknown;
}

export interface ConversationState {
    id: string;

    // Core intent
    intent: IntentType;

    // Advisory status for logging/readability
    status: StatusType;

    // Accumulated event data (for create/update)
    partialEvent: PartialEventData;

    // Target event (for update/delete)
    targetEventId: string | null;
    targetEvent: CalendarEvent | null;

    // Recurring event handling
    isRecurring: boolean;
    recurringScope: RecurringScopeType;

    // Pending UI component
    pendingUI: PendingUI | null;

    // Pending question from AI (for clarification flow)
    pendingQuestion: string | null;

    // Timestamps
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Generate a unique state ID
 */
function generateStateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a fresh conversation state
 */
export function createConversationState(): ConversationState {
    const now = new Date();
    return {
        id: generateStateId(),
        intent: null,
        status: 'idle',
        partialEvent: {},
        targetEventId: null,
        targetEvent: null,
        isRecurring: false,
        recurringScope: null,
        pendingUI: null,
        pendingQuestion: null,
        createdAt: now,
        updatedAt: now,
    };
}

/**
 * Reset state to idle (for interrupts or completion)
 */
export function resetConversationState(state: ConversationState): ConversationState {
    return createConversationState();
}

// ============================================================================
// State Update Helpers
// ============================================================================

/**
 * Update state with new values (immutable)
 */
export function updateState(
    state: ConversationState,
    updates: Partial<Omit<ConversationState, 'id' | 'createdAt'>>
): ConversationState {
    return {
        ...state,
        ...updates,
        updatedAt: new Date(),
    };
}

/**
 * Set the intent and move to gathering status
 */
export function setIntent(state: ConversationState, intent: IntentType): ConversationState {
    return updateState(state, {
        intent,
        status: 'gathering',
    });
}

/**
 * Set target event for update/delete operations
 */
export function setTargetEvent(
    state: ConversationState,
    event: CalendarEvent
): ConversationState {
    return updateState(state, {
        targetEventId: event.id,
        targetEvent: event,
        isRecurring: !!event.rrule,
    });
}

/**
 * Set pending UI component
 */
export function setPendingUI(
    state: ConversationState,
    type: UIComponentType,
    payload?: unknown
): ConversationState {
    return updateState(state, {
        pendingUI: { type, payload },
    });
}

/**
 * Clear pending UI
 */
export function clearPendingUI(state: ConversationState): ConversationState {
    return updateState(state, {
        pendingUI: null,
    });
}

/**
 * Set recurring scope and advance to awaiting_confirm
 */
export function setRecurringScope(
    state: ConversationState,
    scope: RecurringScopeType
): ConversationState {
    return updateState(state, {
        recurringScope: scope,
        status: 'awaiting_confirm',
    });
}

/**
 * Merge partial event data
 * Only merges non-undefined values to preserve previously collected data
 */
export function mergePartialEvent(
    state: ConversationState,
    data: PartialEventData
): ConversationState {
    // Filter out undefined values to avoid overwriting existing data
    const filteredData: PartialEventData = {};

    if (data.title !== undefined) filteredData.title = data.title;
    if (data.start !== undefined) filteredData.start = data.start;
    if (data.end !== undefined) filteredData.end = data.end;
    if (data.isAllDay !== undefined) filteredData.isAllDay = data.isAllDay;
    if (data.description !== undefined) filteredData.description = data.description;
    if (data.location !== undefined) filteredData.location = data.location;
    if (data.type !== undefined) filteredData.type = data.type;
    if (data.guests !== undefined) filteredData.guests = data.guests;

    return updateState(state, {
        partialEvent: {
            ...state.partialEvent,
            ...filteredData,
        },
    });
}

/**
 * Mark state as completed
 */
export function completeState(state: ConversationState): ConversationState {
    return updateState(state, {
        status: 'completed',
    });
}

/**
 * Mark state as cancelled
 */
export function cancelState(state: ConversationState): ConversationState {
    return updateState(state, {
        status: 'cancelled',
    });
}

// ============================================================================
// State Queries
// ============================================================================

/**
 * Check if state has an active intent
 */
export function hasActiveIntent(state: ConversationState): boolean {
    return state.intent !== null &&
        state.status !== 'completed' &&
        state.status !== 'cancelled';
}

/**
 * Check if state is awaiting scope selection for recurring event
 */
export function isAwaitingScope(state: ConversationState): boolean {
    return state.isRecurring && state.recurringScope === null;
}

/**
 * Check if state is ready for confirmation
 */
export function isReadyForConfirm(state: ConversationState): boolean {
    // For recurring events, scope must be set
    if (state.isRecurring && state.recurringScope === null) {
        return false;
    }

    // Must have a target event for update/delete
    if ((state.intent === 'update' || state.intent === 'delete') && !state.targetEventId) {
        return false;
    }

    return true;
}

/**
 * Check if create intent has minimum required fields
 */
export function hasMinimumCreateData(state: ConversationState): boolean {
    const { partialEvent } = state;
    return !!(partialEvent.title && partialEvent.start);
}
