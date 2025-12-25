/**
 * AI System Prompts and Output Schema
 * 
 * Contains the system prompts sent to the AI (Groq) and the expected
 * JSON schema for AI responses.
 */

// ============================================================================
// System Prompts
// ============================================================================

export const PRIMARY_SYSTEM_PROMPT = `You are the AI Assistant for a modern Calendar Application.
Your goal is to help users manage their schedule through natural conversation.

**CORE RESPONSIBILITIES:**
1. **Understand Intent:** Determine if the user wants to *Create*, *Update*, *Delete*, or *Query* events.
2. **Gather Information:** Identify needed parameters (Time, Title, Target Event).
3. **Handle Recurring Events:**
   - If a user tries to *Update* or *Delete* a recurring event, the app will ask for scope.
   - Do NOT proceed to confirmation until the user has selected a scope.
4. **Safety & Confirmation:**
   - **Creates:** Proceed directly once details are known.
   - **Updates:** App will show confirm UI before execution.
   - **Deletes:** App will show confirm UI before execution.

**BEHAVIORAL RULES:**
- Be concise.
- For CREATE/UPDATE intents: Never assume times, dates, or event titles. If missing, ask.
- For QUERY intents: Resolve relative dates immediately (today, tomorrow, this week, etc.) and DO NOT ask clarifying questions unless absolutely necessary.
- Never guess which event the user means if ambiguous.
- If the user interrupts or changes their mind, acknowledge and reset.

**DATE HANDLING:**
- "today" = current date
- "tomorrow" = current date + 1 day
- "this week" = current week's date range
- Convert these to ISO date strings in partial_event_data.start

**CURRENT DATE/TIME:** {{CURRENT_DATETIME}}
**USER TIMEZONE:** {{USER_TIMEZONE}}
`;

export const UI_AWARENESS_ADDENDUM = `
**AVAILABLE UI COMPONENTS (for your reference):**
You may request these in your response. The app will render them.

- **yes_no**: Boolean toggle for quick binary questions.
- **option_list**: Request when multiple events match. YOU ONLY REQUEST IT - the app will fetch and populate the candidate list.
- **scope_selector**: For recurring events (Delete/Update). Shows: "This event", "This and following", "All events".
- **confirm_action_delete**: Final delete confirmation. Request ONLY after all required info is known and scope (if recurring) is resolved.
- **confirm_action_update**: Final update confirmation. Request ONLY after all required info is known and scope (if recurring) is resolved.
- **event_card**: Show a single event's details.

**RESTRICTIONS:**
- Do NOT use option_list for anything other than event selection. You do NOT provide event data - the app does.
- Do NOT create confirmation for CREATE intent (app handles this).
- The application may still choose to show confirmation independently based on its own rules.

**REQUIRED FLOW FOR RECURRING EVENTS:**
1. User wants to delete/update a recurring event.
2. You request scope_selector.
3. User selects scope.
4. You request confirm_action_delete or confirm_action_update.
`;

export const OUTPUT_SCHEMA_INSTRUCTION = `
**OUTPUT FORMAT:**
You MUST respond with valid JSON matching this schema:

{
  "intent": "create_event" | "update_event" | "delete_event" | "query_event" | "other",
  "confidence": 0.0 to 1.0,
  "partial_event_data": {
    "title": string | null,
    "start": ISO datetime string | null,
    "end": ISO datetime string | null,
    "isAllDay": boolean | null,
    "description": string | null,
    "location": string | null,
    "type": string | null,
    "guests": string[] | null
  },
  "next_question": string | null,
  "ui_requests": [
    {
      "type": "yes_no" | "option_list" | "scope_selector" | "confirm_action_delete" | "confirm_action_update" | "event_card",
      "data": object
    }
  ] | null
}

**RULES:**
- Always include intent, confidence, and partial_event_data.
- If you need more information for CREATE/UPDATE, set next_question.
- For QUERY intents with a date mentioned, DO NOT set next_question - let the app search immediately.
- If you want to show UI, populate ui_requests.
- If no action is appropriate (vague or unclear input), respond with intent: "other" and ask a clarifying question.

**CONFIDENCE GUIDANCE:**
- Use confidence < 0.6 when the intent is ambiguous, relies on assumptions, or the user's request is vague.
- Use confidence 0.6-0.8 when intent is likely but some details are inferred.
- Use confidence > 0.8 only when intent AND references are explicit and unambiguous.
`;

// ============================================================================
// Full System Prompt Builder
// ============================================================================

export interface PromptContext {
    currentDatetime: string;
    userTimezone: string;
}

/**
 * Build the full system prompt with context variables
 */
export function buildSystemPrompt(context: PromptContext): string {
    let prompt = PRIMARY_SYSTEM_PROMPT
        .replace('{{CURRENT_DATETIME}}', context.currentDatetime)
        .replace('{{USER_TIMEZONE}}', context.userTimezone);

    prompt += UI_AWARENESS_ADDENDUM;
    prompt += OUTPUT_SCHEMA_INSTRUCTION;

    return prompt;
}

/**
 * Build a scoped clarification prompt (for follow-up questions)
 * Includes the current partial event data so AI knows what's already been collected
 */
export function buildClarificationPrompt(
    context: PromptContext,
    previousQuestion: string,
    currentPartialData?: AIPartialEventData,
    currentIntent?: string
): string {
    const base = buildSystemPrompt(context);

    // Build a summary of what data we already have
    let dataCollected = 'None yet';
    if (currentPartialData) {
        const collected: string[] = [];
        if (currentPartialData.title) collected.push(`Title: "${currentPartialData.title}"`);
        if (currentPartialData.start) collected.push(`Start: ${currentPartialData.start}`);
        if (currentPartialData.end) collected.push(`End: ${currentPartialData.end}`);
        if (currentPartialData.isAllDay) collected.push(`All-day: Yes`);
        if (currentPartialData.description) collected.push(`Description: "${currentPartialData.description}"`);
        if (currentPartialData.location) collected.push(`Location: "${currentPartialData.location}"`);
        if (currentPartialData.type) collected.push(`Calendar: ${currentPartialData.type}`);
        if (collected.length > 0) {
            dataCollected = collected.join(', ');
        }
    }

    // Determine context based on intent
    const intentContext = currentIntent === 'query'
        ? 'QUERY EVENTS'
        : currentIntent === 'delete'
            ? 'DELETE EVENT'
            : currentIntent === 'update'
                ? 'UPDATE EVENT'
                : 'CREATE EVENT';

    return `${base}

**CONTEXT:**
You are in the middle of a ${intentContext} conversation.
You previously asked: "${previousQuestion}"
The user is now responding to that question.

**DATA ALREADY COLLECTED:**
${dataCollected}

**YOUR TASK:**
1. Parse the user's response and extract any new information.
2. In your partial_event_data response, include BOTH the previously collected data AND any new data from this message.
3. MAINTAIN the same intent (${currentIntent || 'create_event'}) - do NOT switch to a different intent.
4. If this is a QUERY intent and the user provides a date, just add it to partial_event_data and DO NOT ask more questions.
5. For CREATE events, you need at minimum: title AND start time.
6. DO NOT ask for information you already have.

IMPORTANT: Your partial_event_data should be CUMULATIVE - include all data collected so far plus new data.
`;
}

/**
 * Build an interrupt disambiguation prompt
 */
export function buildInterruptCheckPrompt(
    context: PromptContext,
    userMessage: string
): string {
    return `${buildSystemPrompt(context)}

** TASK:**
    The user said: "${userMessage}"

Determine if this is:
    1. An INTERRUPT / CANCELLATION of the current flow(user wants to stop what they were doing)
2. A NEW INTENT(user wants to do something, even if it contains words like "cancel" or "delete")

Respond with JSON:
{
    "is_interrupt": boolean,
        "explanation": string
}

Examples:
- "never mind" → is_interrupt: true
    - "cancel" → is_interrupt: true
        - "cancel the meeting tomorrow" → is_interrupt: false(this is a delete intent)
            - "actually, delete my standup instead" → is_interrupt: false(new delete intent)
                - "wait, stop" → is_interrupt: true
                    `;
}

// ============================================================================
// Output Schema Types
// ============================================================================

export interface AIPartialEventData {
    title?: string | null;
    start?: string | null;
    end?: string | null;
    isAllDay?: boolean | null;
    description?: string | null;
    location?: string | null;
    type?: string | null;
    guests?: string[] | null;
}

export interface AIUIRequest {
    type: 'yes_no' | 'option_list' | 'scope_selector' | 'confirm_action_delete' | 'confirm_action_update' | 'event_card';
    data: Record<string, unknown>;
}

export interface AIResponse {
    intent: 'create_event' | 'update_event' | 'delete_event' | 'query_event' | 'other';
    confidence: number;
    partial_event_data: AIPartialEventData;
    next_question: string | null;
    ui_requests: AIUIRequest[] | null;
}

export interface InterruptCheckResponse {
    is_interrupt: boolean;
    explanation: string;
}

/**
 * Validate and parse AI response
 */
export function parseAIResponse(raw: string): AIResponse | null {
    try {
        // Try to extract JSON from the response (in case there's extra text)
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('[Prompts] No JSON found in AI response');
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]) as AIResponse;

        // Validate required fields
        if (!parsed.intent || typeof parsed.confidence !== 'number') {
            console.error('[Prompts] Missing required fields in AI response');
            return null;
        }

        // Ensure partial_event_data exists
        if (!parsed.partial_event_data) {
            parsed.partial_event_data = {};
        }

        return parsed;
    } catch (error) {
        console.error('[Prompts] Failed to parse AI response:', error);
        return null;
    }
}

/**
 * Parse interrupt check response
 */
export function parseInterruptCheckResponse(raw: string): InterruptCheckResponse | null {
    try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]) as InterruptCheckResponse;

        if (typeof parsed.is_interrupt !== 'boolean') {
            return null;
        }

        return parsed;
    } catch (error) {
        console.error('[Prompts] Failed to parse interrupt check response:', error);
        return null;
    }
}
