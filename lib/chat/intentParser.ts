/**
 * Intent Parser (Groq Adapter)
 *
 * Translates natural language to structured commands via Groq.
 * This is the ONLY place where Groq is called.
 */

import { ParsedIntent, ConversationTurn } from './types';

// ============================================================================
// Configuration
// ============================================================================

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const MAX_CONTEXT_TURNS = 3;

// ============================================================================
// System Prompt
// ============================================================================

function buildSystemPrompt(currentTime: string, timezone: string): string {
    return `You are a calendar assistant. Parse the user's request into a structured command.

RESPOND IN JSON ONLY. No explanations, no markdown code blocks, just raw JSON.

Schema:
{
  "intentId": "unique UUID for this command (generate one)",
  "intent": "create" | "update" | "delete" | "query" | "unclear",
  "confidence": 0.0 - 1.0,
  "event": {
    "title": "string",
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
2. If the request is unclear, set intent to "unclear" and describe the ambiguity.
3. Do NOT guess. If a date/time is missing, mark it ambiguous.
4. For relative dates (e.g., "next Monday", "tomorrow"), calculate based on current time.
5. For recurring events, use RFC 5545 RRULE format (FREQ=WEEKLY;BYDAY=MO etc.)
6. "relative" reference type is for phrases like "that meeting", "the event we discussed"
7. "search" reference type is for phrases like "meeting with design team", "standup"

Current time: ${currentTime}
Current timezone: ${timezone}`;
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

    constructor(config: IntentParserConfig) {
        this.apiKey = config.apiKey;
    }

    /**
     * Parse a user message into a structured intent via Groq
     */
    async parse(
        message: string,
        currentTime: string,
        timezone: string,
        conversationHistory: ConversationTurn[] = []
    ): Promise<ParsedIntent> {
        const systemPrompt = buildSystemPrompt(currentTime, timezone);

        // Build messages array with context
        const messages = [
            { role: 'system', content: systemPrompt },
            ...this.buildContextMessages(conversationHistory),
            { role: 'user', content: message },
        ];

        try {
            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: GROQ_MODEL,
                    messages,
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
            const content = data.choices?.[0]?.message?.content;

            if (!content) {
                throw new Error('Empty response from Groq');
            }

            return this.parseResponse(content, timezone);
        } catch (error) {
            // On any error, return unclear intent
            console.error('IntentParser error:', error);
            return {
                intentId: generateUUID(),
                intent: 'unclear',
                confidence: 0,
                ambiguity: {
                    field: 'parse',
                    reason: error instanceof Error ? error.message : 'Failed to parse intent',
                },
            };
        }
    }

    /**
     * Build context messages from conversation history
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

            return parsed as ParsedIntent;
        } catch (error) {
            return this.createUnclearIntent('Failed to parse JSON response');
        }
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
        };
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
