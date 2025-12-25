/**
 * AI Client - Groq API Wrapper
 * 
 * Handles all communication with the Groq API for chat completions.
 * Keeps AI calls stateless and focused.
 */

import {
    buildSystemPrompt,
    buildClarificationPrompt,
    buildInterruptCheckPrompt,
    parseAIResponse,
    parseInterruptCheckResponse,
    type PromptContext,
    type AIResponse,
    type AIPartialEventData,
    type InterruptCheckResponse,
} from './prompts';

// Re-export types for external use
export type { AIResponse, PromptContext, InterruptCheckResponse };

// ============================================================================
// Configuration
// ============================================================================

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 1024;

// ============================================================================
// Types
// ============================================================================

interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface GroqResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

// ============================================================================
// Core API Call
// ============================================================================

/**
 * Make a chat completion request to Groq
 */
async function callGroq(
    messages: ChatMessage[],
    options: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
    } = {}
): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        throw new Error('GROQ_API_KEY environment variable is not set');
    }

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: options.model || DEFAULT_MODEL,
            messages,
            temperature: options.temperature ?? DEFAULT_TEMPERATURE,
            max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
            response_format: { type: 'json_object' },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('[AI Client] Groq API error:', error);
        throw new Error(`Groq API error: ${response.status}`);
    }

    const data = (await response.json()) as GroqResponse;

    if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from Groq API');
    }

    return data.choices[0].message.content;
}

// ============================================================================
// High-Level Functions
// ============================================================================

/**
 * Parse a fresh user message (full intent parse)
 */
export async function parseIntent(
    userMessage: string,
    context: PromptContext
): Promise<AIResponse | null> {
    const systemPrompt = buildSystemPrompt(context);

    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
    ];

    try {
        const raw = await callGroq(messages);
        return parseAIResponse(raw);
    } catch (error) {
        console.error('[AI Client] Failed to parse intent:', error);
        return null;
    }
}

/**
 * Parse a clarification response (scoped context)
 */
export async function parseClarification(
    userMessage: string,
    previousQuestion: string,
    context: PromptContext,
    currentPartialData?: AIPartialEventData,
    currentIntent?: string
): Promise<AIResponse | null> {
    const systemPrompt = buildClarificationPrompt(context, previousQuestion, currentPartialData, currentIntent);

    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
    ];

    try {
        const raw = await callGroq(messages);
        return parseAIResponse(raw);
    } catch (error) {
        console.error('[AI Client] Failed to parse clarification:', error);
        return null;
    }
}

/**
 * Check if a message is an interrupt (when orchestrator is unsure)
 */
export async function checkInterrupt(
    userMessage: string,
    context: PromptContext
): Promise<InterruptCheckResponse | null> {
    const systemPrompt = buildInterruptCheckPrompt(context, userMessage);

    const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
    ];

    try {
        const raw = await callGroq(messages, { temperature: 0.1 });
        return parseInterruptCheckResponse(raw);
    } catch (error) {
        console.error('[AI Client] Failed to check interrupt:', error);
        return null;
    }
}

/**
 * Get the current prompt context
 */
export function getPromptContext(timezone: string = 'UTC'): PromptContext {
    return {
        currentDatetime: new Date().toISOString(),
        userTimezone: timezone,
    };
}
