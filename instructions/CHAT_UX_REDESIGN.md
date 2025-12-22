# Calendar Chat Assistant — UX & Conversation Redesign

> **Status**: Design Document  
> **Author**: AI Assistant  
> **Date**: 2025-12-22  
> **Scope**: Conversation UX layer redesign — no storage/parsing schema changes

---

## Executive Summary

This document redesigns the conversational UX layer of the calendar chat assistant to address known failures while respecting architectural constraints. The key improvements are:

1. **Scoped LLM calls for clarification parsing** — Groq is called only when deterministic parsing fails AND the input looks non-trivial
2. **Intent shift detection** — Recognize when users abandon or redirect mid-flow
3. **Improved state model** — Track flow phase, prior intents, and recovery context
4. **Natural language confirmation** — Accept diverse phrasing without repeated prompting

---

## 1. Revised Conversation State Model

### Current `ConversationContext` (Problems)

```typescript
interface ConversationContext {
    conversationId: string;
    turns: ConversationTurn[];
    awaitingClarification: boolean;
    pendingClarification?: PendingClarification;
    clarificationCount: number;
    lastActivityAt: string;
}
```

**Issues:**
- No distinction between clarification types (missing field vs. event selection vs. confirmation)
- No tracking of interrupted/abandoned intents for recovery
- No phase tracking — can't tell if user is mid-create, mid-update, etc.
- `clarificationCount` is global, not per-intent

---

### Proposed `ConversationContext` v2

```typescript
interface ConversationContext {
    /** Unique conversation identifier */
    conversationId: string;
    
    /** Rolling window of conversation turns (max 10) */
    turns: ConversationTurn[];
    
    /** Current conversation phase */
    phase: ConversationPhase;
    
    /** Active intent being processed (null if idle) */
    activeIntent: ActiveIntentState | null;
    
    /** Stack of interrupted intents for potential recovery (max 2) */
    interruptedIntents: InterruptedIntent[];
    
    /** ISO 8601 timestamp of last activity */
    lastActivityAt: string;
    
    /** Number of LLM calls in current action (for budgeting) */
    llmCallsThisAction: number;
}

type ConversationPhase = 
    | 'idle'                    // No active intent
    | 'collecting_info'         // Gathering missing fields
    | 'awaiting_selection'      // User must pick from candidates
    | 'awaiting_confirmation'   // Destructive action pending approval
    | 'executing';              // Command validated, executing

interface ActiveIntentState {
    /** The parsed intent (may be incomplete) */
    intent: ParsedIntent;
    
    /** Which field(s) are we waiting for */
    awaitingFields: string[];
    
    /** What question did we last ask */
    lastQuestion: string;
    
    /** How many clarification attempts for THIS intent */
    clarificationAttempts: number;
    
    /** Event candidates if awaiting selection */
    candidates?: EventCandidate[];
    
    /** For confirmation: the validated command ready to execute */
    pendingCommand?: ValidatedCommand;
}

interface InterruptedIntent {
    intent: ParsedIntent;
    interruptedAt: string;
    reason: 'user_redirected' | 'ambiguous_input' | 'timeout';
}
```

### Field Justifications

| Field | Purpose |
|-------|---------|
| `phase` | Enables deterministic routing — different handling for selection vs. info collection |
| `activeIntent` | Preserves incomplete intents across turns, with per-intent clarification tracking |
| `awaitingFields` | Tracks exactly what's missing — enables smart question sequencing |
| `interruptedIntents` | Allows "Actually, go back to..." recovery (max 2 to bound memory) |
| `llmCallsThisAction` | Hard limit on LLM calls per user action (default: 3) |

---

## 2. Clarification Strategy Redesign

### Current Problems

1. **Regex-only parsing** — "Actually cancel that" becomes a title
2. **No intent shift detection** — User can't escape a broken flow
3. **Vague confirmations fail** — "yess", "yep", "sounds good" not recognized

### New Strategy: Deterministic-First with Scoped LLM Fallback

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLARIFICATION RESPONSE                        │
│                       USER INPUT                                 │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ 1. CHECK FOR            │
                    │    INTENT SHIFT SIGNAL  │
                    │    (cancel/never mind/  │
                    │     actually/wait)      │
                    └───────────┬─────────────┘
                           Yes? │        No?
                                │        │
            ┌───────────────────┘        └───────────────┐
            ▼                                            ▼
   ┌────────────────────┐                 ┌─────────────────────────┐
   │ ABORT CURRENT FLOW │                 │ 2. TRY DETERMINISTIC    │
   │ Ask: "Would you    │                 │    PARSING              │
   │ like to start      │                 │    (regex, patterns,    │
   │ fresh?"            │                 │     numeric indices)    │
   └────────────────────┘                 └───────────┬─────────────┘
                                              Success? │        Fail?
                                                       │        │
                              ┌─────────────────────────┘        │
                              ▼                                  ▼
                   ┌────────────────────┐      ┌─────────────────────────┐
                   │ MERGE & VALIDATE   │      │ 3. IS INPUT "TRIVIAL"?  │
                   │ (proceed to next   │      │    (< 4 words, looks    │
                   │  missing field or  │      │     like just an        │
                   │  execute)          │      │     answer attempt)     │
                   └────────────────────┘      └───────────┬─────────────┘
                                                   Trivial? │    Complex?
                                                            │        │
                            ┌────────────────────────────────┘        │
                            ▼                                         ▼
                 ┌────────────────────┐            ┌─────────────────────────┐
                 │ RE-ASK SAME        │            │ 4. SCOPED LLM CALL      │
                 │ QUESTION           │            │    (pass context,       │
                 │ (user may have     │            │     ask Groq to         │
                 │  mistyped)         │            │     classify input)     │
                 └────────────────────┘            └───────────┬─────────────┘
                                                               │
                              ┌─────────────────────────────────┘
                              ▼
                   ┌─────────────────────────────────────────┐
                   │ LLM OUTPUT:                              │
                   │ - "answer_to_question": {field, value}   │
                   │ - "intent_shift": {new_intent}           │
                   │ - "abort_request": true                  │
                   │ - "unclear": true (ask to rephrase)      │
                   └─────────────────────────────────────────┘
```

### Intent Shift Signals (Deterministic Detection)

These phrases ALWAYS trigger intent shift handling, regardless of context:

```typescript
const INTENT_SHIFT_SIGNALS = [
    /^(actually|wait|hold on|stop)/i,
    /^(cancel|never ?mind|forget (it|that))/i,
    /^(no,? )(I |i |let'?s )/i,  // "No, I want to..." = redirect
    /^(instead|rather)/i,
    /^(let'?s (do|try) something else)/i,
];
```

When detected:
1. Mark current intent as `interrupted` (push to stack)
2. Ask: "Should I cancel creating that event? Or would you like to continue?"
3. If user confirms abort → clear and return to idle
4. If user wants to continue → restore intent and proceed

### When to Call Groq for Clarification Parsing

**CALL LLM** when:
1. Input is > 4 words AND deterministic parsing failed
2. Input contains a reference phrase ("the one", "that event", "with Alex")
3. Phase is `awaiting_selection` and input is not a clear number/word

**DO NOT CALL LLM** when:
1. Input matches a known confirmation/cancel pattern exactly
2. Input is a single word that's clearly not a valid response
3. Input is clearly a number in selection context
4. `llmCallsThisAction >= 3` (hard limit)

### Scoped LLM Prompt for Clarification Parsing

```typescript
function buildClarificationParsingPrompt(
    userMessage: string,
    context: ConversationContext,
    lastQuestion: string
): string {
    return `You are parsing a user's response to a clarification question.

CONTEXT:
- Current phase: ${context.phase}
- We asked: "${lastQuestion}"
- User replied: "${userMessage}"
- Active intent: ${JSON.stringify(context.activeIntent?.intent)}
- Missing fields: ${context.activeIntent?.awaitingFields.join(', ')}

RESPOND IN JSON ONLY:
{
  "type": "answer" | "intent_shift" | "abort" | "unclear",
  "answer_field": string | null,          // which field this answers
  "answer_value": string | null,          // the extracted value
  "new_intent": ParsedIntent | null,      // if intent_shift
  "confusion_reason": string | null       // if unclear
}

RULES:
1. If user is answering the question, extract the value
2. If user says "actually cancel/delete/update...", it's an intent_shift
3. If user says "never mind" or "cancel that", it's an abort
4. If user's response makes no sense in context, it's unclear
5. For event references like "the one with Alex", try to match against known events
`;
}
```

---

## 3. Intent Interruption & Recovery

### Decision Tree for Flow Control

```
USER MESSAGE ARRIVES
        │
        ▼
┌───────────────────────────────────────────────────────────────┐
│              IS THERE AN ACTIVE INTENT?                        │
└───────────────────────────────┬───────────────────────────────┘
                           No   │   Yes
                                │    │
        ┌───────────────────────┘    └──────────────────────────┐
        ▼                                                       ▼
┌───────────────────┐                        ┌──────────────────────────────┐
│ FRESH MESSAGE     │                        │ CHECK FOR INTENT SHIFT       │
│ → Parse via Groq  │                        │ (deterministic signals)      │
│ → Start new flow  │                        └───────────────┬──────────────┘
└───────────────────┘                               Shift?   │    No Shift?
                                                             │    │
                              ┌───────────────────────────────┘    │
                              ▼                                    │
              ┌───────────────────────────────┐                    │
              │ INTENT SHIFT DETECTED         │                    │
              │ Ask: "Cancel [current] and    │                    │
              │ [do new thing]?"              │                    │
              └───────────────┬───────────────┘                    │
                              ▼                                    │
              ┌───────────────────────────────┐                    │
              │ WAIT FOR USER CONFIRMATION    │                    │
              │ - "Yes" → abort + start new   │                    │
              │ - "No" → resume current       │                    │
              │ - Something else → ask again  │                    │
              └───────────────────────────────┘                    │
                                                                   │
                              ┌─────────────────────────────────────┘
                              ▼
              ┌───────────────────────────────────────────────────┐
              │ PROCESS AS CLARIFICATION RESPONSE                 │
              │ → Deterministic first                             │
              │ → Scoped LLM fallback if needed                   │
              │ → Merge into active intent                        │
              └───────────────────────────────────────────────────┘
```

### Correction Handling ("No, 4pm not 5")

Detection pattern:
```typescript
const CORRECTION_PATTERNS = [
    /^no,?\s*(.+)/i,           // "no, 4pm"
    /^(not|actually)\s+(.+)/i, // "not 5, 4pm" / "actually 4pm"
    /^(.+),?\s+not\s+(.+)/i,   // "4pm, not 5"
];
```

When detected:
1. Extract the replacement value (not the rejected value)
2. Update the relevant field in `activeIntent.intent.event`
3. Re-validate and proceed

### Abandonment Handling

If user says something completely unrelated to the current flow and doesn't match intent shift patterns:

1. Call scoped LLM to classify
2. If LLM returns `intent_shift` with a new intent → handle as above
3. If LLM returns `unclear` → ask: "Would you like to continue with [current task]?"

---

## 4. Missing Information Handling

### Principles

1. **Ask for ONE piece of information at a time**
2. **Order by criticality**: Time → Duration → Title (for creates)
3. **Remember what's already provided** — never re-ask
4. **Use natural phrasing** — not form-like questions

### Question Templates

```typescript
const MISSING_FIELD_QUESTIONS: Record<string, (context: ActiveIntentState) => string> = {
    startAt: (ctx) => {
        const title = ctx.intent.event?.title;
        return title 
            ? `When should "${title}" start?`
            : "What time should this event start?";
    },
    
    endAt: (ctx) => {
        const title = ctx.intent.event?.title;
        const hasStart = !!ctx.intent.event?.startAt;
        if (hasStart) {
            return "How long should it be? (or what time should it end?)";
        }
        return "What time should it end?";
    },
    
    title: (ctx) => {
        const hasTime = !!ctx.intent.event?.startAt;
        if (hasTime) {
            const start = new Date(ctx.intent.event!.startAt!);
            const timeStr = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            return `What would you like to call this ${timeStr} event?`;
        }
        return "What would you like to call this event?";
    },
    
    reference: (ctx) => {
        const intent = ctx.intent.intent;
        if (intent === 'delete') {
            return "Which event would you like to delete?";
        }
        if (intent === 'update') {
            return "Which event would you like to update?";
        }
        return "Which event are you referring to?";
    },
};
```

### Missing Field Priority Order

For **create** intents:
```
1. startAt (if not all-day)
2. title
3. [endAt defaults to +1 hour, never ask]
4. [type defaults to personal, never ask]
```

For **update/delete** intents:
```
1. reference (must identify target)
2. [any changes to apply, from user's original message]
```

---

## 5. Confirmation UX

### Design Principles

1. **Only confirm destructive actions** — deletes only, not updates
2. **No "are you sure?" spam** — one confirmation attempt max
3. **Accept diverse phrasing** — expanded pattern matching
4. **Show what will happen** — be explicit about the effect

### Expanded Confirmation Patterns

```typescript
const EXPANDED_CONFIRM_PATTERNS = [
    // Affirmative
    /^(yes|yep|yeah|yup|y|yea|yess|sure|ok|okay|go ahead|do it|confirm|proceed|please|correct|right|uh ?huh|mhm)$/i,
    /^(that'?s? (right|correct|it|the one))$/i,
    /^(sounds? good|works? for me|perfect|great)$/i,
];

const EXPANDED_CANCEL_PATTERNS = [
    // Negative
    /^(no|nope|n|nah|cancel|stop|don'?t|abort|never ?mind|forget ?(it|that)?|wait)$/i,
    /^(not (that|this) one)$/i,
    /^(wrong (one|event))$/i,
];
```

### Confirmation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ DELETE COMMAND VALIDATED                                        │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
              ┌───────────────────────────────────────────────────┐
              │ SHOW PREVIEW:                                      │
              │ "Delete 'Team Standup' on Monday, Dec 23?"         │
              │ "This is a recurring event - delete just this      │
              │  occurrence, or the entire series?"                │
              │                                                    │
              │ Options shown:                                     │
              │ 1. This occurrence only                            │
              │ 2. All occurrences                                 │
              │ 3. Cancel                                          │
              └───────────────────────────────┬───────────────────┘
                                              │
                                              ▼
              ┌───────────────────────────────────────────────────┐
              │ USER RESPONDS                                      │
              └───────────────────────────────┬───────────────────┘
                                              │
           ┌──────────────────┬───────────────┼───────────────┬────────────────┐
           ▼                  ▼               ▼               ▼                ▼
     "yes"/"1"         "all"/"2"         "cancel"/"3"    Unclear        Other intent
           │                  │               │               │                │
           ▼                  ▼               ▼               ▼                ▼
     Delete this       Delete series    Abort,          Ask once more   Intent shift
     instance only                      return idle     then give up    → handle as new
```

### Natural Confirmation Responses

Instead of: "Reply 'yes' to confirm."

Use context-aware prompts:
- "Delete it?" (single, non-recurring)
- "Delete 'Meeting with Alex' on Monday? (yes/no)" (specific)
- "This is a recurring event. Delete just this Monday, or all future occurrences?" (recurring)

---

## 6. Example End-to-End Conversations

### Example 1: Creating an Event with Missing Time

```
USER: "Add a meeting with the design team"

[SYSTEM FLOW]
1. Parse via Groq (1 LLM call)
   → intent: create, title: "Meeting with the design team", startAt: null
2. Validate: missing startAt
3. Phase → collecting_info
4. Ask for startAt

ASSISTANT: "When should the meeting with the design team start?"

USER: "Tomorrow afternoon"

[SYSTEM FLOW]
1. Deterministic parsing attempt
   → "tomorrow afternoon" matches natural time pattern
   → Resolved to: 2025-12-23T14:00 (default afternoon = 2pm)
2. Merge into intent: startAt now set
3. Validate: all required fields present
4. Execute create

ASSISTANT: "✅ Created 'Meeting with the design team' at 2:00 PM on Tuesday, December 23"

[LLM CALLS: 1]
[STATE EVOLUTION]
- Turn 1: phase=idle → collecting_info, activeIntent set
- Turn 2: phase=collecting_info → executing, intent complete
- Turn 3: phase=idle (complete)
```

---

### Example 2: Updating an Event via Vague Reference

```
USER: "Move the standup to 10am"

[SYSTEM FLOW]
1. Parse via Groq (1 LLM call)
   → intent: update, reference: {type: search, value: "standup"}, event: {startAt: 10:00}
2. Resolve reference: query events with "standup" in title
   → Found 2 matches: "Daily Standup" (Mon-Fri 9am), "Team Standup" (Thu 11am)
3. Phase → awaiting_selection
4. Show candidates

ASSISTANT: "I found multiple events. Which one did you mean?
1. Daily Standup (recurring, Mon-Fri 9:00 AM)
2. Team Standup on Thursday, 11:00 AM"

USER: "The daily one"

[SYSTEM FLOW]
1. Deterministic parsing attempt
   → "the daily one" not a clear number
2. Check if trivial (<4 words, looks like selection)
   → Yes, but contains "daily" which may match candidate
3. Simple heuristic: check if input contains keyword from a candidate
   → "daily" matches "Daily Standup" (index 0)
4. No LLM call needed
5. Merge: reference resolved to Daily Standup ID
6. Execute update

ASSISTANT: "✅ Updated 'Daily Standup' - now starts at 10:00 AM"

[LLM CALLS: 1]
[STATE EVOLUTION]
- Turn 1: phase=idle → awaiting_selection, candidates set
- Turn 2: phase=awaiting_selection → executing
- Turn 3: phase=idle (complete)
```

---

### Example 3: Changing Intent Mid-Clarification

```
USER: "Schedule a call with Alex"

[SYSTEM FLOW]
1. Parse via Groq (1 LLM call)
   → intent: create, title: "Call with Alex", startAt: null
2. Validate: missing startAt
3. Phase → collecting_info

ASSISTANT: "When should the call with Alex be?"

USER: "Actually, cancel the meeting with Bob instead"

[SYSTEM FLOW]
1. Check for intent shift signals
   → "Actually" detected at start
2. Check content: contains "cancel the meeting with Bob"
   → This is a new intent, not an answer
3. Push current intent to interruptedIntents stack
4. Phase → awaiting_confirmation (for intent switch)

ASSISTANT: "Should I cancel creating the call with Alex and instead find a meeting with Bob to delete?"

USER: "Yes"

[SYSTEM FLOW]
1. Deterministic confirmation: "yes" → confirmed
2. Clear interrupted intent (discard "Call with Alex")
3. Parse new intent: delete, reference: {type: search, value: "meeting with Bob"}
4. Resolve reference: found "Meeting with Bob" on Dec 24
5. Phase → awaiting_confirmation (for delete)

ASSISTANT: "Delete 'Meeting with Bob' on Tuesday, December 24? (yes/no)"

USER: "yep"

[SYSTEM FLOW]
1. Deterministic confirmation: "yep" → confirmed
2. Execute delete

ASSISTANT: "✅ Deleted 'Meeting with Bob'"

[LLM CALLS: 1 (only the initial failed create)]
[STATE EVOLUTION]
- Turn 1: phase=idle → collecting_info
- Turn 2: intent shift detected, phase → confirming intent switch
- Turn 3: switch confirmed, new intent parsed, phase → awaiting_confirmation
- Turn 4: delete confirmed and executed, phase → idle
```

---

### Example 4: Deleting a Single Instance of a Recurring Event

```
USER: "Skip standup tomorrow"

[SYSTEM FLOW]
1. Parse via Groq (1 LLM call)
   → intent: delete, reference: {type: search, value: "standup"}, 
     event: {instanceDate: "2025-12-23"}
2. Resolve reference: "standup" matches "Daily Standup" (recurring, Mon-Fri)
   → Found exactly 1 match (unique enough)
3. Detect recurring event + instance date = single instance deletion
4. Phase → awaiting_confirmation

ASSISTANT: "Cancel 'Daily Standup' on Monday, December 23 only? Future occurrences won't be affected. (yes/no)"

USER: "sounds good"

[SYSTEM FLOW]
1. Deterministic confirmation: "sounds good" → confirmed (expanded patterns)
2. Execute: add exception date to rrule, not full delete

ASSISTANT: "✅ Cancelled 'Daily Standup' for Monday, December 23. Future occurrences are unchanged."

[LLM CALLS: 1]
[STATE EVOLUTION]
- Turn 1: phase=idle → awaiting_confirmation (recurring instance delete)
- Turn 2: confirmed, executed, phase → idle
```

---

## 7. Call Budget & Performance Notes

### LLM Call Limits

| Scenario | Max LLM Calls | Typical |
|----------|---------------|---------|
| Simple create (all info provided) | 1 | 1 |
| Create with 1-2 clarifications | 1-2 | 1 (deterministic parsing) |
| Update/delete with selection | 1-2 | 1 |
| Intent shift mid-flow | 2 | 1 (shift detected deterministically) |
| Worst case (complex + retries) | 3 | 2 |

### Hard Limits

```typescript
const CALL_BUDGET = {
    maxLLMCallsPerAction: 3,    // If exceeded, give up gracefully
    maxRetriesPerCall: 2,        // Retry on schema mismatch only
    maxClarificationAttempts: 2, // Per intent, not global
};
```

### Preventing Call Explosions

1. **Deterministic-first parsing** — Most clarification responses don't need LLM
2. **Trivial input detection** — Single words/numbers never trigger LLM
3. **Hard cap** — `llmCallsThisAction >= 3` → stop and ask to rephrase
4. **Intent-scoped clarifications** — Reset count when starting new intent
5. **Timeout** — Clear context after 5 minutes of inactivity

### Performance Optimizations (Preserved)

1. **Event context caching** — Recent events fetched once per action, not per LLM call
2. **Lazy reference resolution** — Only query DB when actually needed
3. **Rolling conversation window** — Keep only last 10 turns

---

## 8. Implementation Summary

### Files to Modify

| File | Changes |
|------|---------|
| `lib/chat/types.ts` | Add `ConversationPhase`, `ActiveIntentState`, `InterruptedIntent` |
| `lib/chat/chatController.ts` | Implement phase-based routing, intent shift handling |
| `lib/chat/clarificationManager.ts` | Add scoped LLM call for clarification, intent shift detection |
| `lib/chat/policies.ts` | Add expanded confirmation patterns, intent shift signals |
| `lib/chat/intentParser.ts` | Add `parseClarificationResponse` method for scoped calls |

### New Functions Needed

```typescript
// In clarificationManager.ts
detectIntentShift(message: string): boolean;
parseClarificationWithLLM(message: string, context: ConversationContext): Promise<ClarificationParseResult>;

// In policies.ts
matchesIntentShiftSignal(message: string): boolean;
matchesExpandedConfirmation(message: string): boolean | null;
matchesCorrectionPattern(message: string): CorrectionMatch | null;
```

### Tradeoffs Acknowledged

1. **More complex state** — Necessary for recovery and natural flow
2. **Occasional extra LLM call** — Acceptable (up to 3 per action) for much better UX
3. **Heuristic-based shift detection** — May false-positive on "actually" in legitimate answers → mitigated by confirmation before abandoning

---

## 9. Success Criteria Checklist

- [ ] "yes / yess / ok" understood correctly in confirmation context
- [ ] "Actually cancel that" does NOT become a title
- [ ] "The one with Alex" successfully selects matching event
- [ ] Missing start time triggers natural question, not error
- [ ] User can abandon a flow and start fresh
- [ ] User can correct a detail ("no, 4pm not 5")
- [ ] Recurring event deletion offers instance vs. series choice
- [ ] Max 3 LLM calls per action, typically 1
- [ ] Conversation feels natural, not robotic

---

## Appendix: Quick Reference Decision Matrix

| User Says | Phase | Action |
|-----------|-------|--------|
| "yes" / "yep" / "sounds good" | `awaiting_confirmation` | Execute pending command |
| "no" / "cancel" / "never mind" | `awaiting_confirmation` | Abort, return to idle |
| "yes" / "yep" | `collecting_info` | Treated as input, try deterministic parse |
| "1" / "first" / "the first one" | `awaiting_selection` | Select candidate, proceed |
| "actually..." / "wait..." | Any active | Trigger intent shift detection |
| "3pm" / "tomorrow morning" | `collecting_info` (for time) | Deterministic parse, merge |
| Complex sentence | `collecting_info` | Scoped LLM call if > 4 words |
| Random word | Any | Re-ask question (1 retry) |
