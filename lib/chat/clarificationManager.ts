/**
 * Clarification Manager
 *
 * Generates clarification questions and merges follow-up answers.
 * 
 * Enhanced with:
 * - Intent shift detection (deterministic-first)
 * - Keyword matching for candidate selection
 * - Correction pattern handling
 * - Scoped LLM fallback for complex responses
 */

import {
    ConversationContext,
    ClarificationRequest,
    ParsedIntent,
    EventCandidate,
    PendingClarification,
    ClarificationParseResult,
    ActiveIntentState,
    InterruptedIntent,
} from './types';
import {
    POLICIES,
    parseSelectionIndex,
    matchesIntentShiftSignal,
    matchesExpandedConfirmation,
    matchesCorrectionPattern,
    isTrivialInput,
} from './policies';

// ============================================================================
// Clarification Templates (Enhanced with context awareness)
// ============================================================================

const CLARIFICATION_TEMPLATES: Record<string, (context?: ActiveIntentState) => string> = {
    title: (ctx) => {
        if (ctx?.intent.event?.startAt) {
            const time = new Date(ctx.intent.event.startAt).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
            });
            return `What would you like to call this ${time} event?`;
        }
        return 'What would you like to call this event?';
    },
    startAt: (ctx) => {
        const title = ctx?.intent.event?.title;
        return title
            ? `When should "${title}" start?`
            : 'What time should this event start?';
    },
    endAt: (ctx) => {
        const title = ctx?.intent.event?.title;
        if (ctx?.intent.event?.startAt) {
            return 'How long should it be? (or what time should it end?)';
        }
        return 'What time should it end?';
    },
    reference: (ctx) => {
        const intent = ctx?.intent.intent;
        if (intent === 'delete') {
            return 'Which event would you like to delete?';
        }
        if (intent === 'update') {
            return 'Which event would you like to update?';
        }
        return 'Which event are you referring to?';
    },
    reference_not_found: () => "I couldn't find that event. Could you describe it differently?",
    reference_multiple: () => 'I found multiple events. Which one did you mean?',
};

// ============================================================================
// Clarification Manager
// ============================================================================

export class ClarificationManager {
    /**
     * Generate a clarification question for a missing field
     * Now uses context-aware templates
     */
    generateClarification(
        field: string,
        partialIntent: ParsedIntent,
        candidates?: EventCandidate[],
        activeIntent?: ActiveIntentState
    ): ClarificationRequest {
        let question: string;

        if (candidates && candidates.length > 0) {
            const options = candidates
                .slice(0, POLICIES.MAX_CANDIDATES)
                .map((c, i) => {
                    const date = new Date(c.startAt).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                    });
                    const recurring = c.isRecurring ? ' (recurring)' : '';
                    return `${i + 1}. ${c.title} on ${date}${recurring}`;
                })
                .join('\n');

            const template = CLARIFICATION_TEMPLATES.reference_multiple;
            question = `${template()}\n${options}`;
        } else {
            const template = CLARIFICATION_TEMPLATES[field];
            question = template
                ? template(activeIntent)
                : `Could you clarify the ${field}?`;
        }

        return {
            field,
            question,
            candidates,
            partialIntent,
        };
    }

    /**
     * Generate a context-aware question for a missing field
     */
    generateContextAwareQuestion(field: string, activeIntent: ActiveIntentState): string {
        const template = CLARIFICATION_TEMPLATES[field];
        return template
            ? template(activeIntent)
            : `Could you clarify the ${field}?`;
    }

    /**
     * Check if we can process this clarification response
     */
    canProcessClarification(context: ConversationContext): boolean {
        // Use new phase-based check if available
        if (context.phase) {
            const activePhases = ['collecting_info', 'awaiting_selection', 'awaiting_confirmation'];
            if (!activePhases.includes(context.phase)) {
                return false;
            }
        } else {
            // Fallback to legacy check
            if (!context.awaitingClarification || !context.pendingClarification) {
                return false;
            }
        }

        // Check for max clarifications (use activeIntent if available)
        const attempts = context.activeIntent?.clarificationAttempts || context.clarificationCount;
        if (attempts >= POLICIES.MAX_CLARIFICATIONS) {
            return false;
        }

        // Check for timeout
        const lastActivity = new Date(context.lastActivityAt);
        const now = new Date();
        const minutesSinceActivity = (now.getTime() - lastActivity.getTime()) / (60 * 1000);
        if (minutesSinceActivity > POLICIES.CONTEXT_TIMEOUT_MINUTES) {
            return false;
        }

        return true;
    }

    /**
     * Detect if the user message signals an intent shift
     * This should be called BEFORE attempting to parse as clarification response
     */
    detectIntentShift(message: string): { isShift: boolean; type: 'abort' | 'redirect' | 'none' } {
        // Check for deterministic intent shift signals
        if (matchesIntentShiftSignal(message)) {
            // Determine if it's an abort or a redirect
            const normalized = message.toLowerCase().trim();

            // Pure abort patterns
            if (/^(cancel|never ?mind|forget (it|that)|stop)$/i.test(normalized)) {
                return { isShift: true, type: 'abort' };
            }

            // Otherwise it's likely a redirect to a new intent
            return { isShift: true, type: 'redirect' };
        }

        return { isShift: false, type: 'none' };
    }

    /**
     * Try to match user input against candidate keywords
     * Returns the matching candidate index or null
     */
    matchCandidateByKeyword(message: string, candidates: EventCandidate[]): number | null {
        const normalized = message.toLowerCase().trim();

        // Remove common prefixes like "the", "that"
        const cleanedMessage = normalized
            .replace(/^(the|that|this)\s+/i, '')
            .replace(/\s+(one|event)$/i, '');

        // Score each candidate by how well it matches
        let bestMatch: { index: number; score: number } | null = null;

        for (let i = 0; i < candidates.length; i++) {
            const candidate = candidates[i];
            const candidateTitle = candidate.title.toLowerCase();

            // Check for direct keyword match
            const candidateWords = candidateTitle.split(/\s+/);
            const messageWords = cleanedMessage.split(/\s+/);

            let matchScore = 0;
            for (const word of messageWords) {
                if (word.length > 2 && candidateWords.some(cw => cw.includes(word))) {
                    matchScore += 1;
                }
            }

            // Also check if candidate title contains the cleaned message
            if (candidateTitle.includes(cleanedMessage) && cleanedMessage.length > 2) {
                matchScore += 2;
            }

            if (matchScore > 0 && (!bestMatch || matchScore > bestMatch.score)) {
                bestMatch = { index: i, score: matchScore };
            }
        }

        // Only return if we have a clear match (score >= 1) and it's unique enough
        if (bestMatch && bestMatch.score >= 1) {
            // Check if another candidate has the same score (ambiguous)
            const sameScorecandidates = candidates.filter((_, i) => {
                if (i === bestMatch!.index) return false;
                const title = candidates[i].title.toLowerCase();
                return message.split(/\s+/).some(w => w.length > 2 && title.includes(w.toLowerCase()));
            });

            if (sameScorecandidates.length === 0) {
                return bestMatch.index;
            }
        }

        return null;
    }

    /**
     * Process a clarification response and classify it
     * Enhanced with intent shift detection, correction handling, and keyword matching
     */
    processClarificationResponseEnhanced(
        message: string,
        context: ConversationContext
    ): ClarificationParseResult {
        const activeIntent = context.activeIntent;
        const pending = context.pendingClarification;

        if (!activeIntent && !pending) {
            return { type: 'unclear', confusionReason: 'No active clarification context' };
        }

        const field = activeIntent?.awaitingFields[0] || pending?.field || 'unknown';
        const candidates = activeIntent?.candidates || pending?.candidates;

        // Step 1: Check for intent shift signals (BEFORE parsing as answer)
        const shiftDetection = this.detectIntentShift(message);
        if (shiftDetection.isShift) {
            if (shiftDetection.type === 'abort') {
                return { type: 'abort' };
            }
            return { type: 'intent_shift' };
        }

        // Step 2: Check for correction patterns
        const correctedValue = matchesCorrectionPattern(message);
        if (correctedValue) {
            return {
                type: 'correction',
                correctedField: field,
                answerValue: correctedValue,
            };
        }

        // Step 3: Handle candidate selection (if awaiting_selection)
        if (candidates && candidates.length > 0) {
            // Try numeric index first
            const index = parseSelectionIndex(message);
            if (index !== null && index >= 0 && index < candidates.length) {
                return {
                    type: 'answer',
                    answerField: 'reference',
                    answerValue: candidates[index].id,
                };
            }

            // Try keyword matching
            const keywordMatch = this.matchCandidateByKeyword(message, candidates);
            if (keywordMatch !== null) {
                return {
                    type: 'answer',
                    answerField: 'reference',
                    answerValue: candidates[keywordMatch].id,
                };
            }

            // If trivial input that didn't match, ask again
            if (isTrivialInput(message)) {
                return {
                    type: 'unclear',
                    confusionReason: `I couldn't match "${message}" to any event. Please reply with a number (1-${candidates.length}).`,
                };
            }

            // Complex input - might be intent shift, return for LLM parsing
            return { type: 'unclear', confusionReason: 'Complex input during selection' };
        }

        // Step 4: Handle date/time fields
        if (field === 'startAt' || field === 'endAt') {
            const parsed = this.parseRelativeDateTime(message);
            if (parsed) {
                return {
                    type: 'answer',
                    answerField: field,
                    answerValue: parsed,
                };
            }

            // If trivial but couldn't parse, ask again
            if (isTrivialInput(message)) {
                return {
                    type: 'unclear',
                    confusionReason: "I couldn't understand that time. Try something like '3pm tomorrow' or 'Monday at 10am'.",
                };
            }

            // Complex input - might need LLM
            return { type: 'unclear', confusionReason: 'Could not parse time expression' };
        }

        // Step 5: Handle title field
        if (field === 'title') {
            // Almost anything can be a title, just use it
            const trimmed = message.trim();
            if (trimmed.length > 0 && trimmed.length <= 200) {
                return {
                    type: 'answer',
                    answerField: 'title',
                    answerValue: trimmed,
                };
            }
            return {
                type: 'unclear',
                confusionReason: 'Please provide a shorter title (under 200 characters).',
            };
        }

        // Step 6: Handle confirmation responses
        if (field === 'confirmation') {
            const confirmed = matchesExpandedConfirmation(message);
            if (confirmed === true) {
                return { type: 'answer', answerField: 'confirmation', answerValue: 'confirmed' };
            }
            if (confirmed === false) {
                return { type: 'abort' };
            }
            return {
                type: 'unclear',
                confusionReason: 'Please reply "yes" to confirm or "no" to cancel.',
            };
        }

        // Fallback
        return { type: 'unclear', confusionReason: 'Could not process response' };
    }

    /**
     * Process a clarification response and merge with partial intent
     * Returns the merged intent or null if could not process
     * @deprecated Use processClarificationResponseEnhanced instead
     */
    processClarificationResponse(
        message: string,
        context: ConversationContext
    ): { mergedIntent: ParsedIntent; selectedEventId?: string } | null {
        if (!context.pendingClarification) {
            return null;
        }

        const { field, partialIntent, candidates } = context.pendingClarification;

        // Handle reference field with candidates
        if (field === 'reference' && candidates && candidates.length > 0) {
            const index = parseSelectionIndex(message);
            if (index !== null && index >= 0 && index < candidates.length) {
                const selected = candidates[index];
                const mergedIntent: ParsedIntent = {
                    ...partialIntent,
                    reference: {
                        type: 'id',
                        value: selected.id,
                    },
                };
                return { mergedIntent, selectedEventId: selected.id };
            }

            // Try keyword matching
            const keywordMatch = this.matchCandidateByKeyword(message, candidates);
            if (keywordMatch !== null) {
                const selected = candidates[keywordMatch];
                const mergedIntent: ParsedIntent = {
                    ...partialIntent,
                    reference: {
                        type: 'id',
                        value: selected.id,
                    },
                };
                return { mergedIntent, selectedEventId: selected.id };
            }

            return null;
        }

        // Handle date/time fields
        if (field === 'startAt' || field === 'endAt') {
            const parsed = this.parseRelativeDateTime(message);
            if (parsed) {
                const mergedIntent: ParsedIntent = {
                    ...partialIntent,
                    event: {
                        ...partialIntent.event,
                        [field]: parsed,
                    },
                };
                return { mergedIntent };
            }
            return null;
        }

        // Handle title field
        if (field === 'title') {
            const mergedIntent: ParsedIntent = {
                ...partialIntent,
                event: {
                    ...partialIntent.event,
                    title: message.trim(),
                },
            };
            return { mergedIntent };
        }

        return null;
    }

    /**
     * Merge a clarification parse result into the active intent
     */
    mergeParseResult(
        result: ClarificationParseResult,
        activeIntent: ActiveIntentState
    ): ParsedIntent | null {
        if (result.type !== 'answer' && result.type !== 'correction') {
            return null;
        }

        const field = result.answerField || result.correctedField;
        const value = result.answerValue;

        if (!field || !value) {
            return null;
        }

        const intent = { ...activeIntent.intent };

        // Merge any event data provided in the result
        if (result.event) {
            intent.event = {
                ...intent.event,
                ...result.event,
            };
        }

        if (field === 'reference') {
            // Check if value is one of the candidate IDs
            const isCandidateId = activeIntent.candidates?.some(c => c.id === value);
            intent.reference = {
                type: isCandidateId ? 'id' : 'search',
                value
            };
        } else if (field === 'title' || field === 'startAt' || field === 'endAt') {
            intent.event = {
                ...intent.event,
                [field]: value,
            };
        }

        return intent;
    }

    /**
     * Update context to reflect pending clarification
     */
    setPendingClarification(
        context: ConversationContext,
        clarification: ClarificationRequest
    ): ConversationContext {
        return {
            ...context,
            awaitingClarification: true,
            pendingClarification: {
                field: clarification.field,
                partialIntent: clarification.partialIntent,
                candidates: clarification.candidates,
                attemptCount: (context.pendingClarification?.attemptCount || 0) + 1,
            },
            clarificationCount: context.clarificationCount + 1,
            lastActivityAt: new Date().toISOString(),
        };
    }

    /**
     * Clear pending clarification from context
     */
    clearPendingClarification(context: ConversationContext): ConversationContext {
        return {
            ...context,
            awaitingClarification: false,
            pendingClarification: undefined,
            phase: 'idle',
            activeIntent: null,
            lastActivityAt: new Date().toISOString(),
        };
    }

    /**
     * Set the active intent in context (new phase-based approach)
     */
    setActiveIntent(
        context: ConversationContext,
        intent: ParsedIntent,
        awaitingFields: string[],
        question: string,
        candidates?: EventCandidate[]
    ): ConversationContext {
        const phase = candidates && candidates.length > 0 ? 'awaiting_selection' : 'collecting_info';

        return {
            ...context,
            phase,
            activeIntent: {
                intent,
                awaitingFields,
                lastQuestion: question,
                clarificationAttempts: (context.activeIntent?.clarificationAttempts || 0) + 1,
                candidates,
            },
            awaitingClarification: true,
            pendingClarification: {
                field: awaitingFields[0],
                partialIntent: intent,
                candidates,
                attemptCount: (context.pendingClarification?.attemptCount || 0) + 1,
            },
            clarificationCount: context.clarificationCount + 1,
            lastActivityAt: new Date().toISOString(),
        };
    }

    /**
     * Push current intent to interrupted stack and clear active
     */
    interruptCurrentIntent(
        context: ConversationContext,
        reason: 'user_redirected' | 'ambiguous_input' | 'timeout'
    ): ConversationContext {
        const interrupted: InterruptedIntent[] = [...(context.interruptedIntents || [])];

        if (context.activeIntent) {
            interrupted.push({
                intent: context.activeIntent.intent,
                interruptedAt: new Date().toISOString(),
                reason,
            });

            // Keep only last 2 interrupted intents
            while (interrupted.length > 2) {
                interrupted.shift();
            }
        }

        return {
            ...context,
            phase: 'idle',
            activeIntent: null,
            interruptedIntents: interrupted,
            awaitingClarification: false,
            pendingClarification: undefined,
            lastActivityAt: new Date().toISOString(),
        };
    }

    /**
     * Parse relative date/time expressions
     * Enhanced for forgiving input handling with natural time expressions
     */
    private parseRelativeDateTime(message: string): string | null {
        const now = new Date();
        const normalized = message.toLowerCase().trim();

        // Natural time expressions (forgiving parsing)
        const timeHeuristics: Record<string, { hour: number; minute: number }> = {
            'morning': { hour: 9, minute: 0 },
            'in the morning': { hour: 9, minute: 0 },
            'am': { hour: 9, minute: 0 },
            'noon': { hour: 12, minute: 0 },
            'at noon': { hour: 12, minute: 0 },
            'lunch': { hour: 12, minute: 0 },
            'lunchtime': { hour: 12, minute: 0 },
            'after lunch': { hour: 13, minute: 0 },
            'post lunch': { hour: 13, minute: 0 },
            'afternoon': { hour: 14, minute: 0 },
            'in the afternoon': { hour: 14, minute: 0 },
            'evening': { hour: 18, minute: 0 },
            'in the evening': { hour: 18, minute: 0 },
            'tonight': { hour: 19, minute: 0 },
            'night': { hour: 20, minute: 0 },
            'at night': { hour: 20, minute: 0 },
            'end of day': { hour: 17, minute: 0 },
            'eod': { hour: 17, minute: 0 },
            'close of business': { hour: 17, minute: 0 },
            'cob': { hour: 17, minute: 0 },
        };

        // Check for natural time expressions first
        for (const [expr, time] of Object.entries(timeHeuristics)) {
            if (normalized.includes(expr)) {
                const date = new Date(now);

                // Check for "tomorrow" modifier
                if (normalized.includes('tomorrow')) {
                    date.setDate(date.getDate() + 1);
                }

                date.setHours(time.hour, time.minute, 0, 0);

                // If the time is in the past today and no tomorrow modifier, assume tomorrow
                if (date < now && !normalized.includes('tomorrow')) {
                    date.setDate(date.getDate() + 1);
                }

                return date.toISOString().substring(0, 16); // Without offset
            }
        }

        // Time patterns (3pm, 3:30pm, 15:00)
        const timeMatch = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
            const meridian = timeMatch[3]?.toLowerCase();

            if (meridian === 'pm' && hours !== 12) hours += 12;
            if (meridian === 'am' && hours === 12) hours = 0;

            const date = new Date(now);

            // Check for "tomorrow" modifier
            if (normalized.includes('tomorrow')) {
                date.setDate(date.getDate() + 1);
            }

            date.setHours(hours, minutes, 0, 0);

            // If the time is in the past today and no tomorrow modifier, assume tomorrow
            if (date < now && !normalized.includes('tomorrow')) {
                date.setDate(date.getDate() + 1);
            }

            return date.toISOString().substring(0, 16); // Without offset
        }

        // Relative day patterns
        if (normalized.includes('tomorrow')) {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0); // Default to 9 AM
            return tomorrow.toISOString().substring(0, 16);
        }

        if (normalized.includes('today')) {
            const today = new Date(now);
            today.setHours(9, 0, 0, 0);
            // If 9am already passed, set to next hour
            if (today < now) {
                today.setHours(now.getHours() + 1, 0, 0, 0);
            }
            return today.toISOString().substring(0, 16);
        }

        if (normalized.includes('next week')) {
            const nextWeek = new Date(now);
            nextWeek.setDate(nextWeek.getDate() + 7);
            nextWeek.setHours(9, 0, 0, 0);
            return nextWeek.toISOString().substring(0, 16);
        }

        // Day of week patterns
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        for (let i = 0; i < days.length; i++) {
            if (normalized.includes(days[i])) {
                const target = new Date(now);
                const currentDay = now.getDay();
                let daysToAdd = i - currentDay;
                if (daysToAdd <= 0) daysToAdd += 7; // Next occurrence
                target.setDate(target.getDate() + daysToAdd);
                target.setHours(9, 0, 0, 0);
                return target.toISOString().substring(0, 16);
            }
        }

        // Duration expressions (in 1 hour, in 30 minutes)
        const durationMatch = normalized.match(/in\s+(\d+)\s*(hour|hr|minute|min)s?/i);
        if (durationMatch) {
            const amount = parseInt(durationMatch[1], 10);
            const unit = durationMatch[2].toLowerCase();
            const target = new Date(now);

            if (unit.startsWith('hour') || unit.startsWith('hr')) {
                target.setHours(target.getHours() + amount);
            } else if (unit.startsWith('min')) {
                target.setMinutes(target.getMinutes() + amount);
            }

            return target.toISOString().substring(0, 16);
        }

        return null;
    }
}

/**
 * Create a ClarificationManager instance
 */
export function createClarificationManager(): ClarificationManager {
    return new ClarificationManager();
}
