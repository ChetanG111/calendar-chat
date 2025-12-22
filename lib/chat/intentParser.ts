/**
 * Intent Parser (Groq Adapter)
 *
 * Translates natural language to structured commands via Groq.
 * This is the ONLY place where Groq is called.
 *
 * Enhanced with:
 * - Intelligent retries (max 2)
 * - Context expansion (last 5 messages, last 5 events)
 * - Unified response schema with required_clarification
 */

import { ParsedIntent, ConversationTurn, ClarificationParseResult } from './types';
import { getRateLimiter } from './rateLimiter';
import { getInstrumentation } from './instrumentation';
import { queryEventsInRange } from '@/lib/db';

// ============================================================================
// Configuration
// ============================================================================

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const MAX_CONTEXT_TURNS = 5;
const MAX_CONTEXT_EVENTS = 5;
const MAX_RETRIES = 2;

// ============================================================================
// System Prompt
// ============================================================================

function buildSystemPrompt(currentTime: string, timezone: string, eventsSummary: string): string {
    return `You are a calendar assistant. Parse the user's request into a structured command.

RESPOND IN JSON ONLY. No explanations, no markdown code blocks, just raw JSON.

Schema:
{
  "intentId": "unique UUID for this command (generate one)",
  "intent": "create" | "update" | "delete" | "query" | "unclear",
  "confidence": 0.0 - 1.0,
  "requiredClarification": true | false,
  "clarificationQuestion": "string | null",
  "event": {
    "title": "string (can be null if needs clarification)",
    "startAt": "ISO 8601 datetime WITHOUT offset (e.g., 2025-12-29T09:00)",
    "endAt": "ISO 8601 datetime WITHOUT offset (optional)",
    "timezone": "IANA timezone (e.g., Asia/Kolkata)",
    "isAllDay": boolean,
    "rrule": "RFC 5545 RRULE string (optional, for recurring events)",
    "description": "string (optional)",
    "type": "business" | "personal" | "meetings" | "holiday",
    "instanceDate": "YYYY-MM-DD (only for operations on specific recurring instance)"
  } | null,
  "query": {
    "rangeStart": "ISO 8601 date",
    "rangeEnd": "ISO 8601 date",
    "titleContains": "string"
  } | null,
  "reference": {
    "type": "id" | "relative" | "search",
    "value": "string (e.g., 'evt_123' or 'that meeting' or 'call with Rahul')"
  } | null,
  "ambiguity": {
    "field": "which field is unclear",
    "reason": "why it's unclear"
  } | null
}

RULES:
1. Output datetime WITHOUT timezone offset. Use separate "timezone" field.
2. Be FORGIVING with input:
   - If title is missing, set requiredClarification=true and provide clarificationQuestion
   - Parse relative times: "tomorrow evening" → 6pm tomorrow, "after lunch" → 1pm, "morning" → 9am
   - Accept partial dates and infer sensible defaults
3. Only set requiredClarification=true if CRITICAL info (like time for create) is missing
4. NEVER block on minor missing fields - use sensible defaults
5. For relative dates (e.g., "next Monday", "tomorrow"), calculate based on current time
6. For recurring events, use RFC 5545 RRULE format (FREQ=WEEKLY;BYDAY=MO etc.)
7. "relative" reference type is for phrases like "that meeting", "the event we discussed"
8. "search" reference type is for phrases like "meeting with design team", "standup"
9. Generate exactly ONE clarificationQuestion if needed, never multiple
10. Be conversational and helpful in clarificationQuestion

Current time: ${currentTime}
Current timezone: ${timezone}

Recent calendar events for context:
${eventsSummary || 'No recent events'}`;
}

// ============================================================================
// Event Context Provider
// ============================================================================

function getRecentEventsSummary(timezone: string): string {
    try {
        const now = new Date();
        const rangeStart = new Date(now);
        rangeStart.setDate(rangeStart.getDate() - 7);
        const rangeEnd = new Date(now);
        rangeEnd.setDate(rangeEnd.getDate() + 7);

        const events = queryEventsInRange({
            rangeStart,
            rangeEnd,
            expandRecurrence: true,
        });

        if (events.length === 0) {
            return 'No events in the past/upcoming week.';
        }

        // Take last MAX_CONTEXT_EVENTS events, summarized
        const summary = events
            .slice(0, MAX_CONTEXT_EVENTS)
            .map(e => {
                const date = new Date(e.startAt).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                });
                const time = new Date(e.startAt).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                });
                return `- "${e.title}" on ${date} at ${time}`;
            })
            .join('\n');

        return summary;
    } catch {
        return 'Unable to fetch recent events.';
    }
}

// ============================================================================
// UUID Generation
// ============================================================================

function generateUUID(): string {
    return 'cmd_' + crypto.randomUUID();
}

// ============================================================================
// Intent Parser
// ============================================================================

export interface IntentParserConfig {
    apiKey: string;
}

export class IntentParser {
    private apiKey: string;
    private rateLimiter = getRateLimiter();
    private instrumentation = getInstrumentation();

    constructor(config: IntentParserConfig) {
        this.apiKey = config.apiKey;
    }

    /**
     * Parse a user message into a structured intent via Groq
     * Now with intelligent retries and expanded context
     */
    async parse(
        message: string,
        currentTime: string,
        timezone: string,
        conversationHistory: ConversationTurn[] = [],
        actionId?: string
    ): Promise<ParsedIntent> {
        const aid = actionId || generateUUID();
        const eventsSummary = getRecentEventsSummary(timezone);
        const systemPrompt = buildSystemPrompt(currentTime, timezone, eventsSummary);

        // Build messages array with expanded context (5 turns)
        const messages = [
            { role: 'system', content: systemPrompt },
            ...this.buildContextMessages(conversationHistory),
            { role: 'user', content: message },
        ];

        let lastError: Error | null = null;
        let retryCount = 0;

        while (retryCount <= MAX_RETRIES) {
            // Check rate limit
            if (this.rateLimiter.isBurstLimitExceeded()) {
                return this.createUnclearIntent('Rate limit exceeded. Please try again in a moment.');
            }

            if (retryCount > 0 && !this.rateLimiter.canRetry(aid)) {
                break;
            }

            try {
                const startTime = Date.now();
                this.rateLimiter.recordLLMCall(aid);

                const response = await this.callGroq(messages, retryCount > 0);
                const duration = Date.now() - startTime;
                this.instrumentation.recordLLMCall(aid, duration);

                if (!response) {
                    throw new Error('Empty response from Groq');
                }

                const parsed = this.parseResponse(response, timezone);

                // If valid JSON but schema mismatch, retry with stricter prompt
                if (!this.isValidIntent(parsed) && retryCount < MAX_RETRIES) {
                    throw new Error('Schema mismatch');
                }

                return parsed;

            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.error(`IntentParser error (attempt ${retryCount + 1}):`, lastError.message);

                if (retryCount < MAX_RETRIES) {
                    this.rateLimiter.recordRetry(aid);
                    this.instrumentation.recordRetry(aid, lastError.message);
                    await this.rateLimiter.backoff(retryCount);
                    retryCount++;
                } else {
                    break;
                }
            }
        }

        // All retries failed
        this.instrumentation.recordFailure(aid, lastError?.message || 'Unknown error');
        return this.createUnclearIntent(lastError?.message || 'Failed to parse intent');
    }

    /**
     * Call Groq API
     */
    private async callGroq(messages: Array<{ role: string; content: string }>, isRetry: boolean): Promise<string> {
        // If retry, add stricter instruction
        const finalMessages = isRetry
            ? [...messages, { role: 'user', content: 'Return valid JSON only. Follow the schema strictly. No explanations.' }]
            : messages;

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: finalMessages,
                temperature: 0.1,  // Low temperature for consistency
                max_tokens: 1024,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Groq API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }

    /**
     * Build context messages from conversation history
     * Expanded to MAX_CONTEXT_TURNS (5)
     */
    private buildContextMessages(history: ConversationTurn[]): Array<{ role: string; content: string }> {
        // Only include last N turns
        const recentTurns = history.slice(-MAX_CONTEXT_TURNS * 2);

        return recentTurns.map(turn => ({
            role: turn.role === 'user' ? 'user' : 'assistant',
            content: turn.content,
        }));
    }

    /**
     * Parse and validate Groq's JSON response
     */
    private parseResponse(content: string, defaultTimezone: string): ParsedIntent {
        try {
            const parsed = JSON.parse(content);

            // Validate required fields
            if (!parsed.intent || !['create', 'update', 'delete', 'query', 'unclear'].includes(parsed.intent)) {
                return this.createUnclearIntent('Invalid intent type');
            }

            // Ensure intentId exists
            if (!parsed.intentId) {
                parsed.intentId = generateUUID();
            }

            // Ensure confidence is a number
            if (typeof parsed.confidence !== 'number') {
                parsed.confidence = 0.5;
            }

            // Apply default timezone to event if present
            if (parsed.event && !parsed.event.timezone) {
                parsed.event.timezone = defaultTimezone;
            }

            // Handle the new unified clarification fields
            if (parsed.requiredClarification === undefined) {
                parsed.requiredClarification = false;
            }

            return parsed as ParsedIntent;
        } catch (error) {
            return this.createUnclearIntent('Failed to parse JSON response');
        }
    }

    /**
     * Check if parsed intent is valid
     */
    private isValidIntent(intent: ParsedIntent): boolean {
        if (intent.intent === 'unclear') return true;
        if (!intent.intentId) return false;
        if (typeof intent.confidence !== 'number') return false;
        return true;
    }

    private createUnclearIntent(reason: string): ParsedIntent {
        return {
            intentId: generateUUID(),
            intent: 'unclear',
            confidence: 0,
            ambiguity: {
                field: 'parse',
                reason,
            },
            requiredClarification: false,
        };
    }

    /**
     * Parse a clarification response via scoped LLM call
     * This is a focused, smaller prompt specifically for understanding
     * user responses during clarification flows.
     */
    async parseClarificationResponse(
        message: string,
        lastQuestion: string,
        awaitingField: string,
        candidates: Array<{ id: string; title: string }> | undefined,
        timezone: string,
        actionId?: string
    ): Promise<ClarificationParseResult> {
        const aid = actionId || generateUUID();

        // Build a focused prompt for clarification parsing
        const prompt = this.buildClarificationPrompt(message, lastQuestion, awaitingField, candidates);

        try {
            this.rateLimiter.recordLLMCall(aid);
            const startTime = Date.now();

            const response = await this.callGroq([
                { role: 'system', content: prompt },
                { role: 'user', content: message },
            ], false);

            const duration = Date.now() - startTime;
            this.instrumentation.recordLLMCall(aid, duration);

            return this.parseClarificationResult(response);
        } catch (error) {
            console.error('Clarification parsing error:', error);
            return {
                type: 'unclear',
                confusionReason: 'Failed to parse response',
            };
        }
    }

    /**
     * Build a focused prompt for clarification parsing
     */
    private buildClarificationPrompt(
        userMessage: string,
        lastQuestion: string,
        awaitingField: string,
        candidates?: Array<{ id: string; title: string }>
    ): string {
        const candidateList = candidates && candidates.length > 0
            ? `\nAvailable options:\n${candidates.map((c, i) => `${i + 1}. "${c.title}" (id: ${c.id})`).join('\n')}`
            : '';

        return `You are parsing a user's response to a clarification question in a calendar assistant.

CONTEXT:
- We asked: "${lastQuestion}"
- User replied: "${userMessage}"
- We are waiting for: ${awaitingField}${candidateList}

RESPOND IN JSON ONLY:
{
  "type": "answer" | "intent_shift" | "abort" | "correction" | "unclear",
  "answerField": "${awaitingField}" | null,
  "answerValue": "the extracted value" | null,
  "selectedId": "candidate id if selecting from list" | null,
  "confusionReason": "why unclear" | null
}

RULES:
1. If user is answering the question, extract the value as "answer"
2. If user says "actually...", "wait...", "cancel...", "never mind", it's "intent_shift" or "abort"
3. If user says "no, [correct value]" or "not X, Y", it's a "correction"
4. If referring to a candidate like "the one with [keyword]", match to a candidate and return "answer" with selectedId
5. For time expressions, convert to natural description (e.g., "3pm tomorrow")
6. If you can't understand, return "unclear" with a helpful confusionReason`;
    }

    /**
     * Parse the LLM response for clarification
     */
    private parseClarificationResult(content: string): ClarificationParseResult {
        try {
            const parsed = JSON.parse(content);

            const validTypes = ['answer', 'intent_shift', 'abort', 'correction', 'unclear'];
            if (!parsed.type || !validTypes.includes(parsed.type)) {
                return { type: 'unclear', confusionReason: 'Invalid response type' };
            }

            return {
                type: parsed.type,
                answerField: parsed.answerField || undefined,
                answerValue: parsed.selectedId || parsed.answerValue || undefined,
                confusionReason: parsed.confusionReason || undefined,
                correctedField: parsed.type === 'correction' ? parsed.answerField : undefined,
            };
        } catch {
            return { type: 'unclear', confusionReason: 'Failed to parse LLM response' };
        }
    }
}

/**
 * Create an IntentParser instance
 */
export function createIntentParser(): IntentParser {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('GROQ_API_KEY environment variable is not set');
    }
    return new IntentParser({ apiKey });
}
