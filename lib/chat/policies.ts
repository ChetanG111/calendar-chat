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

    /** Maximum clarification attempts before aborting - reduced to 1 for less friction */
    MAX_CLARIFICATIONS: 1,

    /** Minutes of inactivity before clearing pending clarification */
    CONTEXT_TIMEOUT_MINUTES: 5,

    /** Confidence below this → reject immediately (lowered from 0.5) */
    CONFIDENCE_REJECT_THRESHOLD: 0.3,

    /** Confidence below this (but >= reject) → proceed with clarification for missing fields (lowered from 0.7) */
    CONFIDENCE_CLARIFY_THRESHOLD: 0.5,
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

// ============================================================================
// Expanded Confirmation Patterns (UX Improvement)
// ============================================================================

const EXPANDED_CONFIRM_PATTERNS = [
    // Standard affirmatives
    /^\s*(yes|yep|yeah|yup|y|yea|yess|sure)\b/i,
    // Action confirmations
    /^\s*(ok|okay|go ahead|do it|confirm|proceed|please|correct|right)\b/i,
    // Sounds good variants
    /^\s*(sounds? good|works? for me|perfect|great|fine)\b/i,
    // Affirmative acknowledgments
    /^\s*(uh ?huh|mhm|absolutely|definitely)\b/i,
    // "That's right" variants
    /^\s*(that'?s? (right|correct|it|the one))\b/i,
];

const EXPANDED_CANCEL_PATTERNS = [
    // Standard negatives
    /^\s*(no|nope|n|nah)\b/i,
    // Cancel/abort actions
    /^\s*(cancel|stop|don'?t|abort|quit)\b/i,
    // Never mind variants
    /^\s*(never ?mind|forget ?(it|that)?|wait|hold on)\b/i,
    // Wrong selection
    /^\s*(not (that|this) one)\b/i,
    /^\s*(wrong (one|event))\b/i,
];

// ============================================================================
// Intent Shift Signals (Detect when user wants to change course)
// ============================================================================

const INTENT_SHIFT_SIGNALS = [
    /^(actually|wait|hold on|stop),?\s/i,         // "Actually, I want to..."
    /^(cancel|never ?mind|forget (it|that))/i,    // Abort signals
    /^no,?\s+(I |i |let'?s |we )/i,               // "No, I want to..." = redirect
    /^(instead|rather),?\s/i,                      // "Instead, let's..."
    /^let'?s (do|try) something else/i,           // Fresh start request
    /^(can we|let me|I want to) (start over|begin again)/i, // Restart request
];

// ============================================================================
// Correction Patterns (Detect when user is fixing a detail)
// ============================================================================

const CORRECTION_PATTERNS = [
    // "no, 4pm" or "no 4pm not 5"
    { pattern: /^no,?\s+(.+)/i, valueGroup: 1 },
    // "not 5, 4pm" or "actually 4pm"  
    { pattern: /^(not|actually)\s+(.+)/i, valueGroup: 2 },
    // "4pm, not 5pm"
    { pattern: /^(.+?),?\s+not\s+.+$/i, valueGroup: 1 },
    // "I meant 4pm"
    { pattern: /^I meant\s+(.+)/i, valueGroup: 1 },
    // "change it to 4pm"
    { pattern: /^(change|make) it( to)?\s+(.+)/i, valueGroup: 3 },
];

/**
 * Check if message matches intent shift signals
 * @param message - User message
 * @returns true if it signals an intent shift
 */
export function matchesIntentShiftSignal(message: string): boolean {
    const normalized = message.trim();
    return INTENT_SHIFT_SIGNALS.some(pattern => pattern.test(normalized));
}

/**
 * Parse a confirmation response using expanded patterns
 * @param message - User message  
 * @returns true = confirmed, false = cancelled, null = unclear
 */
export function matchesExpandedConfirmation(message: string): boolean | null {
    const normalized = message.trim();

    for (const pattern of EXPANDED_CONFIRM_PATTERNS) {
        if (pattern.test(normalized)) return true;
    }

    for (const pattern of EXPANDED_CANCEL_PATTERNS) {
        if (pattern.test(normalized)) return false;
    }

    return null;
}

/**
 * Check for and extract correction patterns
 * @param message - User message
 * @returns The corrected value or null if not a correction
 */
export function matchesCorrectionPattern(message: string): string | null {
    const normalized = message.trim();

    for (const { pattern, valueGroup } of CORRECTION_PATTERNS) {
        const match = normalized.match(pattern);
        if (match && match[valueGroup]) {
            return match[valueGroup].trim();
        }
    }

    return null;
}

/**
 * Check if input is "trivial" (likely just an answer attempt, not a new intent)
 * @param message - User message
 * @returns true if trivial (< 4 words and no verb-like patterns)
 */
export function isTrivialInput(message: string): boolean {
    const words = message.trim().split(/\s+/);
    if (words.length >= 5) return false;

    // Check for command-like patterns that indicate a new intent
    const commandPatterns = [
        /^(create|add|schedule|book|make)/i,
        /^(update|change|move|modify|edit|reschedule)/i,
        /^(delete|remove|cancel)/i,
        /^(show|list|what|when|find)/i,
    ];

    return !commandPatterns.some(p => p.test(message));
}

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
