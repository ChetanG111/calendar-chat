/**
 * Command Validator
 *
 * Validates parsed intents, resolves event references,
 * and enforces safety rules (e.g., bulk operation ban).
 */

import {
    ParsedIntent,
    ValidationResult,
    ValidatedCommand,
    ValidatedEventData,
    ClarificationRequest,
    EventCandidate,
} from './types';
import { POLICIES, calculateDefaultEndAt, validateDuration } from './policies';
import { queryEventsInRange, getEventById } from '@/lib/db';
import type { ExpandedEventInstance } from '@/lib/db/types';

// ============================================================================
// Date/Time Utilities
// ============================================================================

/**
 * Parse ISO 8601 datetime string (without offset) with timezone
 * Converts to UTC Date object
 */
function parseDateTime(dateTimeStr: string, timezone: string): Date | null {
    try {
        // If it's just a time (e.g., "15:00"), return null - needs context
        if (/^\d{2}:\d{2}(:\d{2})?$/.test(dateTimeStr)) {
            return null;
        }

        // Parse as local time in the given timezone
        // The dateTimeStr should be in format: 2025-12-29T09:00
        const date = new Date(dateTimeStr);

        if (isNaN(date.getTime())) {
            return null;
        }

        return date;
    } catch {
        return null;
    }
}

/**
 * Parse a date-only string
 */
function parseDate(dateStr: string): Date | null {
    try {
        const date = new Date(dateStr + 'T00:00:00');
        return isNaN(date.getTime()) ? null : date;
    } catch {
        return null;
    }
}

// ============================================================================
// Reference Resolution
// ============================================================================

interface ReferenceResolution {
    resolved: boolean;
    eventId?: string;
    candidates?: EventCandidate[];
    error?: string;
}

/**
 * Resolve an event reference to a specific event ID
 */
async function resolveReference(
    reference: { type: string; value: string },
    timezone: string
): Promise<ReferenceResolution> {
    // Direct ID reference
    if (reference.type === 'id') {
        const event = getEventById(reference.value);
        if (event) {
            return { resolved: true, eventId: event.id };
        }
        return { resolved: false, error: 'Event not found' };
    }

    // Search-based reference
    if (reference.type === 'search' || reference.type === 'relative') {
        const searchTerm = reference.value.toLowerCase();

        // Search in a reasonable time range (past week to next month)
        const now = new Date();
        const rangeStart = new Date(now);
        rangeStart.setDate(rangeStart.getDate() - 7);
        const rangeEnd = new Date(now);
        rangeEnd.setMonth(rangeEnd.getMonth() + 1);

        const events = queryEventsInRange({
            rangeStart,
            rangeEnd,
            expandRecurrence: true,
        });

        // Filter by search term in title
        const matches = events.filter(event =>
            event.title.toLowerCase().includes(searchTerm)
        );

        if (matches.length === 0) {
            return { resolved: false, error: 'No matching events found' };
        }

        if (matches.length === 1) {
            return { resolved: true, eventId: matches[0].eventId };
        }

        // Multiple matches - need clarification
        const candidates: EventCandidate[] = matches
            .slice(0, POLICIES.MAX_CANDIDATES)
            .map(event => ({
                id: event.eventId,
                title: event.title,
                startAt: event.startAt.toISOString(),
                isRecurring: event.isRecurring,
            }));

        return { resolved: false, candidates };
    }

    return { resolved: false, error: 'Unknown reference type' };
}

// ============================================================================
// Command Validator
// ============================================================================

export class CommandValidator {
    /**
     * Validate a parsed intent and convert to a validated command
     */
    async validate(
        intent: ParsedIntent,
        userTimezone: string
    ): Promise<ValidationResult> {
        // Check confidence threshold
        if (intent.confidence < POLICIES.CONFIDENCE_REJECT_THRESHOLD) {
            return {
                valid: false,
                error: {
                    code: 'LOW_CONFIDENCE',
                    message: "I'm not sure I understood. Could you rephrase that?",
                },
            };
        }

        // Handle unclear intent
        if (intent.intent === 'unclear') {
            return {
                valid: false,
                clarification: this.buildClarificationFromAmbiguity(intent),
            };
        }

        // Validate based on intent type
        switch (intent.intent) {
            case 'create':
                return this.validateCreate(intent, userTimezone);
            case 'update':
                return this.validateUpdate(intent, userTimezone);
            case 'delete':
                return this.validateDelete(intent, userTimezone);
            case 'query':
                return this.validateQuery(intent);
            default:
                return {
                    valid: false,
                    error: {
                        code: 'SCHEMA_VIOLATION',
                        message: 'Unknown intent type',
                    },
                };
        }
    }

    /**
     * Validate a create intent
     */
    private validateCreate(
        intent: ParsedIntent,
        timezone: string
    ): ValidationResult {
        const event = intent.event;

        // Check required fields
        if (!event?.title) {
            return {
                valid: false,
                clarification: this.buildClarification('title', intent, 'What would you like to call this event?'),
            };
        }

        if (!event.startAt && !event.isAllDay) {
            return {
                valid: false,
                clarification: this.buildClarification('startAt', intent, 'When should this event start?'),
            };
        }

        // Parse dates
        const eventTimezone = event.timezone || timezone;
        const startAt = event.startAt ? parseDateTime(event.startAt, eventTimezone) : null;

        if (!startAt && !event.isAllDay) {
            return {
                valid: false,
                error: {
                    code: 'INVALID_DATE',
                    message: 'Could not parse the start time',
                    field: 'startAt',
                },
            };
        }

        // Calculate or parse endAt
        let endAt: Date;
        if (event.endAt) {
            const parsed = parseDateTime(event.endAt, eventTimezone);
            if (!parsed) {
                return {
                    valid: false,
                    error: {
                        code: 'INVALID_DATE',
                        message: 'Could not parse the end time',
                        field: 'endAt',
                    },
                };
            }
            endAt = parsed;
        } else if (startAt) {
            // Apply default duration policy
            endAt = calculateDefaultEndAt(startAt);
        } else {
            endAt = new Date(); // Will be overwritten for all-day events
        }

        // Validate duration
        if (startAt && !event.isAllDay && !validateDuration(startAt, endAt)) {
            return {
                valid: false,
                error: {
                    code: 'SCHEMA_VIOLATION',
                    message: `Event duration must be at least ${POLICIES.MIN_DURATION_MINUTES} minutes`,
                    field: 'endAt',
                },
            };
        }

        // Build validated command
        const finalStartAt = startAt || new Date();
        const finalEndAt = endAt;

        // Derive startDate and endDate from the parsed timestamps, or use provided values
        const startDate = event.startDate || finalStartAt.toISOString().split('T')[0];
        const endDate = event.endDate || finalEndAt.toISOString().split('T')[0];

        const validatedEvent: ValidatedEventData = {
            title: event.title,
            startAt: finalStartAt,
            endAt: finalEndAt,
            startDate,
            endDate,
            timezone: eventTimezone,
            isAllDay: event.isAllDay ?? false,
            rrule: event.rrule,
            description: event.description,
            type: event.type || POLICIES.DEFAULT_EVENT_TYPE,
        };

        return {
            valid: true,
            command: {
                intentId: intent.intentId,
                intent: 'create',
                event: validatedEvent,
            },
        };
    }

    /**
     * Validate an update intent
     */
    private async validateUpdate(
        intent: ParsedIntent,
        timezone: string
    ): Promise<ValidationResult> {
        // Must have a reference to resolve
        if (!intent.reference) {
            return {
                valid: false,
                clarification: this.buildClarification(
                    'reference',
                    intent,
                    'Which event would you like to update?'
                ),
            };
        }

        // Resolve the reference
        const resolution = await resolveReference(intent.reference, timezone);

        if (!resolution.resolved) {
            if (resolution.candidates) {
                return {
                    valid: false,
                    clarification: this.buildClarificationWithCandidates(
                        'reference',
                        intent,
                        resolution.candidates
                    ),
                };
            }
            return {
                valid: false,
                clarification: this.buildClarification(
                    'reference',
                    intent,
                    resolution.error || "I couldn't find that event. Could you describe it differently?"
                ),
            };
        }

        // Parse any date updates
        let startAt: Date | undefined;
        let endAt: Date | undefined;
        const eventTimezone = intent.event?.timezone || timezone;

        if (intent.event?.startAt) {
            const parsed = parseDateTime(intent.event.startAt, eventTimezone);
            if (!parsed) {
                return {
                    valid: false,
                    error: {
                        code: 'INVALID_DATE',
                        message: 'Could not parse the new start time',
                        field: 'startAt',
                    },
                };
            }
            startAt = parsed;
        }

        if (intent.event?.endAt) {
            const parsed = parseDateTime(intent.event.endAt, eventTimezone);
            if (!parsed) {
                return {
                    valid: false,
                    error: {
                        code: 'INVALID_DATE',
                        message: 'Could not parse the new end time',
                        field: 'endAt',
                    },
                };
            }
            endAt = parsed;
        }

        // Derive startDate and endDate for updates
        const updateStartDate = intent.event?.startDate || (startAt ? startAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        const updateEndDate = intent.event?.endDate || (endAt ? endAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

        return {
            valid: true,
            command: {
                intentId: intent.intentId,
                intent: 'update',
                targetEventId: resolution.eventId,
                event: intent.event ? {
                    title: intent.event.title || '',
                    startAt: startAt || new Date(),
                    endAt: endAt || new Date(),
                    startDate: updateStartDate,
                    endDate: updateEndDate,
                    timezone: eventTimezone,
                    isAllDay: intent.event.isAllDay ?? false,
                    rrule: intent.event.rrule,
                    description: intent.event.description,
                    type: intent.event.type || POLICIES.DEFAULT_EVENT_TYPE,
                } : undefined,
            },
        };
    }

    /**
     * Validate a delete intent
     */
    private async validateDelete(
        intent: ParsedIntent,
        timezone: string
    ): Promise<ValidationResult> {
        // Must have a reference to resolve
        if (!intent.reference) {
            return {
                valid: false,
                clarification: this.buildClarification(
                    'reference',
                    intent,
                    'Which event would you like to delete?'
                ),
            };
        }

        // Resolve the reference
        const resolution = await resolveReference(intent.reference, timezone);

        if (!resolution.resolved) {
            if (resolution.candidates) {
                // BULK DELETE FORBIDDEN - but we need to clarify which one
                if (resolution.candidates.length > 1) {
                    return {
                        valid: false,
                        clarification: this.buildClarificationWithCandidates(
                            'reference',
                            intent,
                            resolution.candidates
                        ),
                    };
                }
            }
            return {
                valid: false,
                clarification: this.buildClarification(
                    'reference',
                    intent,
                    resolution.error || "I couldn't find that event. Could you describe it differently?"
                ),
            };
        }

        return {
            valid: true,
            command: {
                intentId: intent.intentId,
                intent: 'delete',
                targetEventId: resolution.eventId,
                instanceDate: intent.event?.instanceDate,
            },
        };
    }

    /**
     * Validate a query intent
     */
    private validateQuery(intent: ParsedIntent): ValidationResult {
        // Queries are generally always valid
        return {
            valid: true,
            command: {
                intentId: intent.intentId,
                intent: 'query',
                query: intent.query,
            },
        };
    }

    /**
     * Build a clarification request from ambiguity info
     */
    private buildClarificationFromAmbiguity(intent: ParsedIntent): ClarificationRequest {
        const ambiguity = intent.ambiguity;
        return {
            field: ambiguity?.field || 'unknown',
            question: ambiguity?.reason || 'Could you please clarify your request?',
            partialIntent: intent,
        };
    }

    /**
     * Build a clarification request for a missing field
     */
    private buildClarification(
        field: string,
        intent: ParsedIntent,
        question: string
    ): ClarificationRequest {
        return {
            field,
            question,
            partialIntent: intent,
        };
    }

    /**
     * Build a clarification request with event candidates
     */
    private buildClarificationWithCandidates(
        field: string,
        intent: ParsedIntent,
        candidates: EventCandidate[]
    ): ClarificationRequest {
        const options = candidates
            .map((c, i) => `${i + 1}. ${c.title} on ${new Date(c.startAt).toLocaleDateString()}`)
            .join('\n');

        return {
            field,
            question: `I found multiple events. Which one did you mean?\n${options}`,
            candidates,
            partialIntent: intent,
        };
    }
}

/**
 * Create a CommandValidator instance
 */
export function createCommandValidator(): CommandValidator {
    return new CommandValidator();
}
