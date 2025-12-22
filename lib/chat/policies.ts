/**
 * Calendar Policy Service
 *
 * Centralized, explicit policies for defaults and constraints.
 * All heuristics and magic numbers are documented here—not scattered.
 */

import { CalendarPolicies, ValidatedCommand, ParsedEventData, ValidatedEventData } from './types';

// ============================================================================
// Policies (Single Source of Truth)
// ============================================================================

export const POLICIES: CalendarPolicies = {
    /** Default event duration when endAt is not specified */
    DEFAULT_DURATION_MINUTES: 60,

    /** Default event type when not specified */
    DEFAULT_EVENT_TYPE: 'personal',

    /** Maximum candidates to show in clarification (cognitive load limit) */
    MAX_CANDIDATES: 3,

    /** Minimum event duration to prevent accidental 0-minute events */
    MIN_DURATION_MINUTES: 15,

    /** Maximum clarification attempts before aborting */
    MAX_CLARIFICATIONS: 2,

    /** Minutes of inactivity before clearing pending clarification */
    CONTEXT_TIMEOUT_MINUTES: 5,

    /** Confidence below this → reject immediately */
    CONFIDENCE_REJECT_THRESHOLD: 0.5,

    /** Confidence below this (but >= reject) → proceed with clarification for missing fields */
    CONFIDENCE_CLARIFY_THRESHOLD: 0.7,
} as const;

// ============================================================================
// Acknowledgment Patterns (for NO-OP detection)
// ============================================================================

export const ACKNOWLEDGMENTS = [
    'ok',
    'okay',
    'thanks',
    'thank you',
    'sounds good',
    'got it',
    'cool',
    'great',
    'perfect',
    'alright',
    'sure',
    'yep',
    'yes',  // Only when not awaiting confirmation
    'no problem',
    'np',
] as const;

/**
 * Check if a message is a simple acknowledgment
 * @param message - User message
 * @returns true if it's an acknowledgment
 */
export function isAcknowledgment(message: string): boolean {
    const normalized = message.toLowerCase().trim().replace(/[!.,]+$/, '');
    return ACKNOWLEDGMENTS.includes(normalized as typeof ACKNOWLEDGMENTS[number]);
}

// ============================================================================
// Selection Patterns (for clarification responses)
// ============================================================================

const SELECTION_PATTERNS: { pattern: RegExp; index: number | 'extract' }[] = [
    { pattern: /^1$|^first( one)?$|^the first( one)?$/i, index: 0 },
    { pattern: /^2$|^second( one)?$|^the second( one)?$/i, index: 1 },
    { pattern: /^3$|^third( one)?$|^the third( one)?$/i, index: 2 },
    { pattern: /^option (\d+)$/i, index: 'extract' },
    { pattern: /^#(\d+)$/i, index: 'extract' },
];

/**
 * Parse a selection index from user input (deterministic, no AI)
 * @param message - User message
 * @returns 0-based index or null if not a selection
 */
export function parseSelectionIndex(message: string): number | null {
    const normalized = message.trim();

    for (const { pattern, index } of SELECTION_PATTERNS) {
        const match = normalized.match(pattern);
        if (match) {
            if (index === 'extract') {
                const extracted = parseInt(match[1], 10);
                return isNaN(extracted) ? null : extracted - 1; // Convert to 0-based
            }
            return index;
        }
    }

    return null;
}

// ============================================================================
// Confirmation Patterns
// ============================================================================

const CONFIRM_PATTERNS = [
    /^yes$/i,
    /^y$/i,
    /^confirm$/i,
    /^do it$/i,
    /^go ahead$/i,
    /^proceed$/i,
];

const CANCEL_PATTERNS = [
    /^no$/i,
    /^n$/i,
    /^cancel$/i,
    /^never ?mind$/i,
    /^stop$/i,
    /^don'?t$/i,
];

/**
 * Parse a confirmation response (deterministic, no AI)
 * @param message - User message
 * @returns true = confirmed, false = cancelled, null = unclear
 */
export function parseConfirmation(message: string): boolean | null {
    const normalized = message.trim();

    for (const pattern of CONFIRM_PATTERNS) {
        if (pattern.test(normalized)) return true;
    }

    for (const pattern of CANCEL_PATTERNS) {
        if (pattern.test(normalized)) return false;
    }

    return null;
}

// ============================================================================
// Policy Application
// ============================================================================

/**
 * Apply policies to a validated command
 * Fills in defaults for missing optional fields
 */
export function applyPolicies(
    event: ParsedEventData,
    timezone: string
): Partial<ValidatedEventData> {
    const result: Partial<ValidatedEventData> = {
        type: event.type || POLICIES.DEFAULT_EVENT_TYPE,
        timezone: event.timezone || timezone,
        isAllDay: event.isAllDay ?? false,
    };

    // Apply default duration if endAt is missing
    if (event.startAt && !event.endAt && !event.isAllDay) {
        // This will be handled during Date conversion in CommandValidator
        // We just mark that default duration should be applied
    }

    return result;
}

/**
 * Calculate endAt based on default duration
 */
export function calculateDefaultEndAt(startAt: Date): Date {
    return new Date(startAt.getTime() + POLICIES.DEFAULT_DURATION_MINUTES * 60 * 1000);
}

/**
 * Validate duration meets minimum requirement
 */
export function validateDuration(startAt: Date, endAt: Date): boolean {
    const durationMinutes = (endAt.getTime() - startAt.getTime()) / (60 * 1000);
    return durationMinutes >= POLICIES.MIN_DURATION_MINUTES;
}
