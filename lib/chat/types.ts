/**
 * Chat Pipeline Types
 *
 * Type definitions for the AI-powered calendar chat assistant.
 * These types flow through the entire chat pipeline.
 */

import { CalendarEvent } from '@/types';

// ============================================================================
// Intent & Parsing Types
// ============================================================================

export type IntentType = 'create' | 'update' | 'delete' | 'query' | 'unclear';

export interface ParsedIntent {
    intentId: string;
    intent: IntentType;
    confidence: number;
    event?: ParsedEventData;
    query?: ParsedQueryData;
    reference?: EventReference;
    ambiguity?: AmbiguityInfo;
    /** Whether clarification is needed before execution */
    requiredClarification?: boolean;
    /** Single clarification question to ask user */
    clarificationQuestion?: string | null;
}

export interface ParsedEventData {
    title?: string;
    startAt?: string;          // ISO 8601 WITHOUT offset
    endAt?: string;            // ISO 8601 WITHOUT offset
    timezone?: string;         // IANA timezone
    isAllDay?: boolean;
    rrule?: string;            // RFC 5545
    description?: string;
    type?: 'business' | 'personal' | 'meetings' | 'holiday';
    instanceDate?: string;     // For recurring event instance operations
}

export interface ParsedQueryData {
    rangeStart?: string;
    rangeEnd?: string;
    titleContains?: string;
}

export interface EventReference {
    type: 'id' | 'relative' | 'search';
    value: string;
}

export interface AmbiguityInfo {
    field: string;
    reason: string;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
    valid: boolean;
    command?: ValidatedCommand;
    error?: ValidationError;
    clarification?: ClarificationRequest;
}

export interface ValidatedCommand {
    intentId: string;
    intent: IntentType;
    event?: ValidatedEventData;
    query?: ParsedQueryData;
    targetEventId?: string;    // Resolved from reference
    instanceDate?: string;     // For recurring instance operations
}

export interface ValidatedEventData {
    title: string;
    startAt: Date;             // Converted to Date
    endAt: Date;               // Converted to Date
    timezone: string;
    isAllDay: boolean;
    rrule?: string;
    description?: string;
    type: 'business' | 'personal' | 'meetings' | 'holiday';
}

export interface ValidationError {
    code: 'MALFORMED_JSON' | 'SCHEMA_VIOLATION' | 'LOW_CONFIDENCE' | 'BULK_DELETE_FORBIDDEN' | 'INVALID_DATE' | 'MISSING_FIELD';
    message: string;
    field?: string;
}

// ============================================================================
// Clarification Types
// ============================================================================

export interface ClarificationRequest {
    field: string;
    question: string;
    candidates?: EventCandidate[];
    partialIntent: ParsedIntent;
}

export interface EventCandidate {
    id: string;
    title: string;
    startAt: string;
    isRecurring: boolean;
}

// ============================================================================
// Conversation State Types (Enhanced for UX Improvements)
// ============================================================================

/** Current phase of the conversation flow */
export type ConversationPhase =
    | 'idle'                    // No active intent
    | 'collecting_info'         // Gathering missing fields
    | 'awaiting_selection'      // User must pick from candidates
    | 'awaiting_confirmation'   // Destructive action pending approval
    | 'confirming_intent_shift' // User is switching intents mid-flow
    | 'executing';              // Command validated, executing

/** State of the currently active intent being processed */
export interface ActiveIntentState {
    /** The parsed intent (may be incomplete) */
    intent: ParsedIntent;

    /** Which field(s) are we waiting for */
    awaitingFields: string[];

    /** What question did we last ask */
    lastQuestion: string;

    /** How many clarification attempts for THIS intent */
    clarificationAttempts: number;

    /** Event candidates if awaiting selection */
    candidates?: EventCandidate[];

    /** For confirmation: the validated command ready to execute */
    pendingCommand?: ValidatedCommand;

    /** New intent detected during shift (for confirming_intent_shift phase) */
    pendingNewIntent?: ParsedIntent;
}

/** An intent that was interrupted and can potentially be recovered */
export interface InterruptedIntent {
    intent: ParsedIntent;
    interruptedAt: string;
    reason: 'user_redirected' | 'ambiguous_input' | 'timeout';
}

export interface ConversationContext {
    /** Unique conversation identifier */
    conversationId: string;

    /** Rolling window of conversation turns (max 10) */
    turns: ConversationTurn[];

    /** Current conversation phase */
    phase: ConversationPhase;

    /** Active intent being processed (null if idle) */
    activeIntent: ActiveIntentState | null;

    /** Stack of interrupted intents for potential recovery (max 2) */
    interruptedIntents: InterruptedIntent[];

    /** ISO 8601 timestamp of last activity */
    lastActivityAt: string;

    /** Number of LLM calls in current action (for budgeting) */
    llmCallsThisAction: number;

    // Legacy fields for backward compatibility
    awaitingClarification: boolean;
    pendingClarification?: PendingClarification;
    clarificationCount: number;
}

export interface ConversationTurn {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

export interface PendingClarification {
    field: string;
    partialIntent: ParsedIntent;
    candidates?: EventCandidate[];
    attemptCount: number;
}

// ============================================================================
// Clarification Parse Result (for scoped LLM calls)
// ============================================================================

export type ClarificationParseType =
    | 'answer'        // User answered the question
    | 'intent_shift'  // User wants to do something else
    | 'abort'         // User wants to cancel current flow
    | 'correction'    // User is correcting a previous value
    | 'unclear';      // Couldn't understand the response

export interface ClarificationParseResult {
    type: ClarificationParseType;
    /** Which field this answers (if type === 'answer') */
    answerField?: string;
    /** The extracted value (if type === 'answer' or 'correction') */
    answerValue?: string;
    /** The new intent (if type === 'intent_shift') */
    newIntent?: ParsedIntent;
    /** Why it's unclear (if type === 'unclear') */
    confusionReason?: string;
    /** The corrected field (if type === 'correction') */
    correctedField?: string;
}

// ============================================================================
// Chat Request/Response Types
// ============================================================================

export interface ChatRequest {
    message: string;
    conversationId: string;
    context: ConversationContext;
    timezone: string;
    currentTime: string;       // ISO 8601
}

export type ChatResponseIntent =
    | 'created'
    | 'updated'
    | 'deleted'
    | 'queried'
    | 'clarification'
    | 'confirmation_required'
    | 'noop'
    | 'error';

export interface ChatResponse {
    message: string;
    intent: ChatResponseIntent;
    intentId?: string;
    event?: CalendarEvent;
    events?: CalendarEvent[];
    clarification?: ClarificationRequest;
    confirmationRequired?: ConfirmationRequest;
    updatedContext: ConversationContext;
}

export interface ConfirmationRequest {
    action: 'delete' | 'update';
    targetEvent: CalendarEvent;
    description: string;
    instanceOnly?: boolean;    // For recurring events
}

// ============================================================================
// Policy Types
// ============================================================================

export interface CalendarPolicies {
    DEFAULT_DURATION_MINUTES: number;
    DEFAULT_EVENT_TYPE: 'business' | 'personal' | 'meetings' | 'holiday';
    MAX_CANDIDATES: number;
    MIN_DURATION_MINUTES: number;
    MAX_CLARIFICATIONS: number;
    CONTEXT_TIMEOUT_MINUTES: number;
    CONFIDENCE_REJECT_THRESHOLD: number;
    CONFIDENCE_CLARIFY_THRESHOLD: number;
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

export interface RateLimitConfig {
    maxCallsPerAction: number;
    maxRetries: number;
    maxClarifications: number;
    burstLimitPerMinute: number;
    initialBackoffMs: number;
    backoffMultiplier: number;
    maxBackoffMs: number;
}

// ============================================================================
// Instrumentation Types
// ============================================================================

export interface InstrumentationMetrics {
    totalActions: number;
    totalLLMCalls: number;
    totalRetries: number;
    totalClarifications: number;
    totalFailures: number;
    avgLLMCallsPerAction: number;
    avgDurationMs: number;
    requestsInLastMinute: number;
    requestsInLastHour: number;
}
