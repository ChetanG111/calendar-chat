# Calendar Chat Assistant — UX & Conversation Redesign Prompt

You are a **senior conversational systems designer + engineer**.

You have been given a **full technical explanation** of an existing calendar chat assistant:
- parsing flow
- Groq usage
- clarification logic
- state handling
- constraints

Your task is **NOT to rewrite the system from scratch**.

Your task is to **redesign the conversational UX and dialogue flow** so the assistant:
- feels natural in NL
- handles vague inputs gracefully
- avoids destructive misinterpretations
- recovers cleanly from mid-flow changes
- uses LLM calls intelligently (not excessively)

All improvements must fit within the **existing architecture** unless explicitly justified.

---

## Non-Negotiable Constraints (Must Respect)

1. **Groq remains the only LLM**
   - llama-3.1-8b-instant
   - Cost and rate limits are NOT a concern (up to ~6 calls per event acceptable)

2. **Application code remains the authority**
   - LLM proposes
   - App validates, executes, and responds

3. **State must remain serializable**
   - Currently in-memory
   - Must be Redis-compatible later

4. **Calendar storage & CRUD are unchanged**
   - SQLite
   - RRULE-based recurrence
   - Existing lib/db layer remains

5. **Serverless-friendly**
   - No long-running agents
   - No background loops

---

## What Is Broken (Given Signal)

You must explicitly address these known UX failures:

- “yes / yess / ok” not understood correctly in context
- Vague requests not triggering intelligent follow-ups
- Missing fields (time, duration) not always asked for
- Rigid clarification flow that hijacks intent
- Regex-only clarification parsing causing disasters:
  - `"Actually cancel that"` becoming a title
  - `"The one with Alex"` failing selection
- No ability to **change intent mid-flow**
- Losing clarification context too easily
- Assistant feeling “dumb” instead of “careful”

Do NOT hand-wave these away.

---

## Your Objectives

Design a **better conversational UX layer** that:

1. Feels human and flexible
2. Never guesses destructively
3. Allows users to interrupt, correct, or redirect
4. Uses LLM calls strategically (not wastefully)
5. Preserves performance optimizations where possible

---

## What You Must Produce

### 1. Revised Conversation State Model

Propose an improved `ConversationContext` shape that supports:
- intent-in-progress
- clarification steps
- confirmation steps
- interruption handling

Explain **why each field exists**.

---

### 2. Clarification Strategy Redesign (Critical)

Redesign how clarifications work so that:

- Users can answer naturally (“the one with Alex”, “actually cancel it”)
- The system can detect **intent shifts mid-clarification**
- The system avoids regex-only brittleness

You may:
- introduce **secondary, scoped LLM calls** for clarification answers
- define strict gating rules for when LLM is allowed

Explain:
- when to re-call Groq
- when NOT to
- how to merge results safely

---

### 3. Intent Interruption & Recovery

Design how the system should behave when the user:

- changes intent mid-flow
- corrects a detail (“no, 4pm not 5”)
- abandons a clarification and starts fresh

Provide a **clear decision tree** for:
- continue flow
- restart flow
- ask a meta-question

---

### 4. Missing Information Handling

Redesign how missing fields are handled so that:

- The assistant proactively asks for missing info
- Questions are phrased naturally
- Only one piece of info is requested at a time
- The system remembers what is already known

Include example phrasing.

---

### 5. Confirmation UX

Design a confirmation pattern that:
- feels natural
- avoids “are you sure?” spam
- protects destructive actions
- allows easy cancelation

---

### 6. Example End-to-End Conversations (MANDATORY)

Provide **at least 4 realistic conversations**, including:

1. Creating an event with missing time
2. Updating an event via vague reference
3. Changing intent mid-clarification
4. Deleting a single instance of a recurring event

For each example, show:
- user messages
- system responses
- when Groq is called
- when code-only logic is used
- how state evolves

---

### 7. Call Budget & Performance Notes

Explain:
- how many LLM calls occur per scenario
- why this is acceptable
- how to prevent accidental call explosions

---

## Style & Depth Requirements

- Be concrete
- Use flowcharts / bullet logic where helpful
- Avoid vague advice like “the system should feel smarter”
- Prefer **deterministic rules + scoped intelligence**
- Call out tradeoffs explicitly

---

## Success Criteria

At the end, the redesigned UX should:

- Never create an event accidentally
- Never misinterpret “cancel”, “actually”, or “no”
- Handle vague language gracefully
- Feel conversational without being chatty
- Be implementable by an engineer without guesswork

If you need to relax any constraint, **explicitly justify why**.

Do NOT write production code.  
Do NOT redesign storage or parsing schemas unless necessary.

Focus on **conversation quality and safety**.
