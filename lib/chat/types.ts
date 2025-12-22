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

export interface ConversationContext {
    conversationId: string;
    turns: ConversationTurn[];
    awaitingClarification: boolean;
    pendingClarification?: PendingClarification;
    clarificationCount: number;
    lastActivityAt: string;    // ISO 8601
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
