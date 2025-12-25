/**
 * Chat Library Index
 * 
 * Re-exports all chat-related modules for easy importing.
 */

// State management
export {
    type ConversationState,
    type UIComponentType,
    type IntentType,
    type StatusType,
    type RecurringScopeType,
    type PartialEventData,
    type PendingUI,
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
} from './state';

// Prompts and AI response types
export {
    type AIResponse,
    type AIPartialEventData,
    type AIUIRequest,
    type PromptContext,
    buildSystemPrompt,
    buildClarificationPrompt,
    parseAIResponse,
} from './prompts';

// AI client
export {
    parseIntent,
    parseClarification,
    checkInterrupt,
    getPromptContext,
} from './ai-client';

// Event search
export {
    type SearchCriteria,
    type SearchResult,
    searchEvents,
    findEventsByTitle,
    findEventsOnDate,
    findEventsInRange,
    findBestMatch,
    findAmbiguousMatches,
} from './search';

// Orchestrator
export {
    type MessageType,
    type IncomingMessage,
    type UIResponsePayload,
    type OrchestratorResponse,
    type OrchestratorAction,
    ChatOrchestrator,
    createOrchestrator,
} from './orchestrator';
