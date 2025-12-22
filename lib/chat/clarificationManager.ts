/**
 * Clarification Manager
 *
 * Generates clarification questions and merges follow-up answers.
 * HARD RULE: Clarification responses are parsed deterministically, NEVER via Groq.
 */

import {
    ConversationContext,
    ClarificationRequest,
    ParsedIntent,
    EventCandidate,
    PendingClarification,
} from './types';
import { POLICIES, parseSelectionIndex, parseConfirmation } from './policies';

// ============================================================================
// Clarification Templates
// ============================================================================

const CLARIFICATION_TEMPLATES: Record<string, string> = {
    title: 'What would you like to call this event?',
    startAt: 'When should this event start?',
    endAt: 'How long should the event be?',
    reference_not_found: "I couldn't find that event. Could you describe it differently?",
    reference_multiple: 'I found multiple events. Which one did you mean?',
};

// ============================================================================
// Clarification Manager
// ============================================================================

export class ClarificationManager {
    /**
     * Generate a clarification question for a missing field
     */
    generateClarification(
        field: string,
        partialIntent: ParsedIntent,
        candidates?: EventCandidate[]
    ): ClarificationRequest {
        let question: string;

        if (candidates && candidates.length > 0) {
            const options = candidates
                .slice(0, POLICIES.MAX_CANDIDATES)
                .map((c, i) => {
                    const date = new Date(c.startAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                    });
                    return `${i + 1}. ${c.title} on ${date}`;
                })
                .join('\n');
            question = `${CLARIFICATION_TEMPLATES.reference_multiple}\n${options}`;
        } else {
            question = CLARIFICATION_TEMPLATES[field] || `Could you clarify the ${field}?`;
        }

        return {
            field,
            question,
            candidates,
            partialIntent,
        };
    }

    /**
     * Check if we can process this clarification response
     */
    canProcessClarification(context: ConversationContext): boolean {
        if (!context.awaitingClarification || !context.pendingClarification) {
            return false;
        }

        // Check for max clarifications
        if (context.clarificationCount >= POLICIES.MAX_CLARIFICATIONS) {
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
     * Process a clarification response and merge with partial intent
     * Returns the merged intent or null if could not process
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
            // Could not parse selection
            return null;
        }

        // Handle date/time fields
        if (field === 'startAt' || field === 'endAt') {
            // Simple relative date parsing
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
