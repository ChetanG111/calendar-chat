# Calendar Chat Backend — Builder Agent Instructions

You are implementing the **chat backend + AI prompting layer** for a calendar application.

This is NOT a traditional chatbot.
This is a **conversation-driven, UI-assisted assistant** where the AI leads the conversation and the application enforces safety and execution.

You MUST follow the phases below in order.
DO NOT skip phases.
DO NOT modify code until explicitly approved.

---

## High-Level Rules (Non-Negotiable)

1. AI is allowed to:
   - understand natural language
   - ask clarifying questions in plain text
   - decide when UI components should be shown

2. AI is NOT allowed to:
   - execute CRUD
   - render UI
   - confirm destructive actions
   - assume missing values silently

3. Application code:
   - owns state
   - owns execution
   - owns UI rendering
   - can ignore or veto AI output

4. UI components are **pre-built and finite**:
   - yes_no
   - yes_no_custom
   - option_list
   - confirm_action
   - event_card
   - event_list
   - scope_selector

AI may only reference these by type.

---

# PHASE 1 — WRITE SYSTEM PROMPTS (NO CODE)

Your first task is to design the **system prompts** that will be sent to the AI (Groq).

### Goals of the system prompts
The AI must:
- understand what a calendar event is
- understand CRUD semantics
- understand what information is required to act
- understand when to ask questions vs request UI
- understand the available UI components
- lead the conversation naturally

### Deliverables for Phase 1
Produce **ONLY** the following, in Markdown:

1. **Primary System Prompt**
   - Defines the AI’s role as a planner + conversational guide
   - Explains calendar concepts
   - Explains required vs optional fields
   - Explains safety rules
   - Explains that it must ask questions when info is missing

2. **UI Awareness Addendum**
   - Lists available UI components
   - Explains when each should be requested
   - Explains that UI is optional and chat-only questions are allowed

3. **Output Schema**
   - JSON schema for AI responses
   - Must support:
     - intent
     - confidence
     - partial event data
     - next_question (string | null)
     - ui_requests (array | null)
   - Must NOT include execution instructions

4. **Examples**
   - At least 3 examples:
     - vague “create event”
     - vague “delete meeting”
     - interrupt (“actually cancel that”)

🚫 Do NOT:
- write application code
- write orchestrator logic
- suggest UI layouts

---

## STOP POINT 1 — WAIT FOR APPROVAL

After completing Phase 1:
- STOP
- Ask the user explicitly:

> “Do you approve these system prompts so I can proceed to the implementation plan?”

Do NOT continue without approval.

---

# PHASE 2 — IMPLEMENTATION PLAN (NO CODE)

ONLY proceed if approval is given.

### Goals
Design how the backend will:
- call the AI
- track conversation state
- route AI questions to chat or UI
- handle interruptions
- decide when to execute CRUD

### Deliverables for Phase 2
Produce:

1. **Conversation Orchestrator Design**
   - Responsibilities
   - Decision flow
   - When AI is called vs skipped

2. **ConversationState Definition**
   - Fields
   - Lifecycle
   - Reset conditions

3. **Message Handling Flow**
   - New intent
   - Clarification
   - UI response
   - Interrupt
   - Confirmation

4. **AI Call Matrix**
   - Full intent parse
   - Scoped clarification parse
   - Optional helper calls

5. **Safety Guarantees**
   - How accidental create/delete is prevented

🚫 Do NOT:
- modify code
- assume storage changes

---

## STOP POINT 2 — WAIT FOR APPROVAL

After Phase 2:
- STOP
- Ask the user explicitly:

> “Do you approve this implementation plan so I can start modifying code?”

Do NOT continue without approval.

---

# PHASE 3 — CODE IMPLEMENTATION

ONLY proceed if approval is given.

### Allowed actions
- Implement the orchestrator
- Implement AI wrapper
- Implement UI request handling
- Wire into existing calendar core

### Forbidden actions
- Modifying calendar DB schema
- Adding new UI components without approval
- Removing safety checks

---

## Success Criteria (Final)

The system must:
- Feel conversational and natural
- Ask questions when info is missing
- Use UI only when helpful
- Allow mid-flow intent changes
- Never execute destructive actions without confirmation
- Never guess missing details

---

## Absolute Rule

If at any point you are unsure:
- STOP
- Ask the user

Do not “fill in the blanks” on your own.
