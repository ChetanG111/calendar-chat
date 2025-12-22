
Include:
- where Groq is called
- where schema validation happens
- where ambiguity is detected
- where CRUD operations are executed
- where clarification loops occur
- where user-facing text is generated

---

### 3. Core Modules / Services

Define the main internal modules.

For each module, specify:
- responsibility
- inputs
- outputs
- failure modes

Example modules (you may rename or refine):
- ChatController
- IntentParser (Groq adapter)
- CommandValidator
- CalendarService
- ClarificationManager
- ResponseFormatter

---

### 4. Ambiguity & Clarification Strategy

Explain clearly:

- How ambiguous references are detected  
  (e.g., “that meeting”, “my call with Rahul”)
- When the system should **not** call Groq again
- How clarification questions are generated
- How follow-up user answers are merged with prior context
- How the system avoids infinite clarification loops

---

### 5. Safety & Guardrails

Explicitly define:

- What the AI is **never** allowed to decide
- How destructive actions (update / delete) are gated
- How multiple matching events are handled
- How partial or low-confidence parses are rejected
- How confidence thresholds affect behavior

Be conservative. Prefer safety over convenience.

---

### 6. End-to-End Example Flows (Mandatory)

Provide **at least three complete examples**, each showing:

1. User input
2. Groq JSON output
3. Application-level interpretation
4. Calendar/database action
5. Final user-facing response

Required scenarios:
- Creating a recurring event
- Updating an event via a vague reference (“that meeting”)
- Deleting a single instance of a recurring event

---

## Constraints & Anti-Patterns

- Do NOT write production code
- Do NOT design UI visuals
- Do NOT suggest autonomous agent loops
- Do NOT let any AI directly mutate state
- Avoid vague phrasing like “the system should probably…”

If there is a tradeoff:
- Choose **predictability over cleverness**
- Choose **clarification over guessing**
- Choose **boring but debuggable solutions**

---

## Success Criteria

At the end of your response, a developer should be able to:

- Implement the chat pipeline without guessing intent
- Swap Groq for another model with minimal refactoring
- Reason about every calendar mutation deterministically
- Trust that the assistant cannot corrupt user data

---

## Assumptions

If you need to make assumptions, list them explicitly before proceeding.

Do not proceed silently on hidden assumptions.

---
