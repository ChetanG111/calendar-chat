# Nexus Calendar

A conversational AI-powered calendar application built with Next.js 15, featuring natural language event management through an LLM-driven chat interface.

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quickstart](#quickstart)
- [Project Structure](#project-structure)
- [Project Index](#project-index)
- [API Reference](#api-reference)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## Overview

Nexus Calendar is a full-stack calendar application that combines traditional calendar views (day, week, month) with a conversational AI interface. Users can create, update, delete, and query events using natural language commands ("Schedule a meeting with the design team tomorrow at 3pm") or through the standard calendar UI.

The chat system uses Groq's LLaMA 3.3 70B model to parse user intent, with a multi-layered validation pipeline that prevents unsafe operations and handles ambiguity through clarification loops rather than guessing.

**Key architectural decisions:**

- **SQLite with better-sqlite3** for event persistence, designed for easy migration to PostgreSQL
- **RFC 5545 RRULE support** for recurring events via the `rrule` library
- **Stateless chat controller** with confirmations required for all destructive operations
- **No autonomous agent loops**—the AI never directly mutates calendar state without validation

---

## Features

- **Multi-view calendar**: Day, week, and month views with smooth Framer Motion transitions
- **Conversational event management**: Create, update, delete, and query events via natural language
- **Recurring event support**: Full RFC 5545 RRULE implementation with exception date handling
- **Intent parsing with guardrails**: Groq-powered NLU with confidence thresholds and clarification flows
- **Confirmation gates**: Destructive operations (update/delete) require explicit user confirmation
- **Event type theming**: Color-coded events by category (business, personal, meetings, holiday)
- **All-day event support**: Proper handling of date-only events
- **Responsive design**: Collapsible sidebar with mobile-first breakpoints
- **Mini calendar navigation**: Quick date selection via embedded month picker
- **Event popovers**: Click-to-view summaries with edit/delete actions

---

## Quickstart

**Prerequisites:** Node.js 18+ (LTS recommended)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   
   Create or edit `.env.local` at the project root:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```
   
   Obtain a Groq API key from [console.groq.com](https://console.groq.com).

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open the application:**
   
   Navigate to [http://localhost:3000](http://localhost:3000).

The SQLite database (`data/calendar.db`) is created automatically on first run. Demo data can be seeded with:
```bash
npm run db:demo
```

---

## Project Structure

```
calendar-chat/
├── app/                        # Next.js App Router
│   ├── api/
│   │   ├── chat/               # Chat endpoint (POST /api/chat)
│   │   └── events/             # Event CRUD endpoints
│   │       └── [id]/           # Single event operations
│   ├── globals.css             # Global styles + Tailwind
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main application page
├── components/
│   ├── ChatView.tsx            # Conversational interface
│   ├── CreateEventModal.tsx    # Event creation/edit modal
│   ├── DayView.tsx             # Single day calendar view
│   ├── EventSummaryPopover.tsx # Event quick-view popover
│   ├── MonthView.tsx           # Monthly calendar grid
│   ├── Sidebar.tsx             # Mini calendar + filters
│   ├── TimePicker.tsx          # Time selection component
│   ├── ViewSwitcher.tsx        # Day/Week/Month/Chat toggle
│   └── WeekView.tsx            # Weekly calendar view
├── lib/
│   ├── api/                    # Frontend API client
│   ├── chat/                   # Chat pipeline modules
│   │   ├── chatController.ts   # Main orchestrator
│   │   ├── clarificationManager.ts
│   │   ├── commandValidator.ts # Intent validation
│   │   ├── intentParser.ts     # Groq adapter
│   │   ├── policies.ts         # Safety guardrails
│   │   ├── responseFormatter.ts
│   │   └── types.ts            # Chat type definitions
│   ├── db/                     # SQLite persistence layer
│   │   ├── connection.ts       # Database connection manager
│   │   ├── events.ts           # Event CRUD operations
│   │   ├── recurrence.ts       # RRULE expansion logic
│   │   ├── schema.ts           # Table definitions
│   │   └── types.ts            # Database type definitions
│   └── utils.ts                # Shared utilities
├── scripts/
│   └── db-example.ts           # Database demo/seeder
├── data/                       # SQLite database files
├── types.ts                    # Shared TypeScript types
├── tailwind.config.ts          # Tailwind configuration
└── next.config.ts              # Next.js configuration
```

---

## Project Index

| File | Purpose |
|------|---------|
| `app/page.tsx` | Main application component; manages calendar state, event selection, and view switching |
| `lib/chat/chatController.ts` | Orchestrates the full chat pipeline: pre-checks, clarification handling, Groq parsing, validation, and execution |
| `lib/chat/intentParser.ts` | Single point of Groq API integration; translates natural language to structured commands |
| `lib/chat/commandValidator.ts` | Validates parsed intents against calendar state; resolves event references; enforces business rules |
| `lib/chat/policies.ts` | Defines safety guardrails: max clarifications, acknowledgment patterns, confirmation parsing |
| `lib/db/events.ts` | All database operations: create, read, update, delete, and range queries with RRULE expansion |
| `lib/db/recurrence.ts` | Expands recurring events into instances for a given date range; handles exception dates |
| `components/ChatView.tsx` | Conversational UI with message history, intent indicators, and confirmation buttons |
| `components/CreateEventModal.tsx` | Full event editor with title, date/time, recurrence, type, and metadata fields |
| `app/api/events/route.ts` | REST endpoints for event listing (GET) and creation (POST) |
| `app/api/chat/route.ts` | Chat endpoint with in-memory conversation context storage |

---

## API Reference

### Events API

**GET** `/api/events`

Query parameters:
- `rangeStart` (ISO 8601 date) — optional, defaults to current month start
- `rangeEnd` (ISO 8601 date) — optional, defaults to current month end

Returns expanded event instances including recurring event occurrences.

**POST** `/api/events`

Request body:
```json
{
  "title": "Team Meeting",
  "start": "2025-12-22T10:00:00",
  "end": "2025-12-22T11:00:00",
  "type": "meetings",
  "description": "Weekly sync",
  "location": "Room A",
  "isAllDay": false,
  "rrule": "FREQ=WEEKLY;BYDAY=MO",
  "timezone": "Asia/Kolkata"
}
```

**PUT** `/api/events/[id]`

Partial update. Same schema as POST, all fields optional.

**DELETE** `/api/events/[id]`

Removes the event permanently.

### Chat API

**POST** `/api/chat`

Request body:
```json
{
  "message": "Schedule a standup tomorrow at 9am",
  "conversationId": "optional-uuid",
  "timezone": "Asia/Kolkata",
  "currentTime": "2025-12-22T14:30:00"
}
```

Response includes: `message`, `intent`, `event` (if created/updated), `clarification` (if needed), `confirmationRequired` (for destructive ops).

---

## Roadmap

Based on current implementation gaps and obvious extensions:

- [ ] **Persistent conversation storage** — Replace in-memory context with database-backed sessions
- [ ] **Google Calendar sync** — OAuth integration for importing/exporting events
- [ ] **Notification system** — Browser notifications and email reminders
- [ ] **Multi-user support** — Authentication and per-user event isolation
- [ ] **Drag-and-drop rescheduling** — Direct manipulation of events on calendar views
- [ ] **Timezone selector** — UI for changing display timezone (currently hardcoded to Asia/Kolkata)
- [ ] **Event attachments** — File upload support for meeting agendas
- [ ] **Undo/redo for chat actions** — Reversible operations within a session
- [ ] **Keyboard navigation** — Full keyboard accessibility for power users

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit changes with descriptive messages
4. Ensure linting passes (`npm run lint`)
5. Open a pull request against `main`

For chat system changes, include test cases covering:
- Intent parsing for the new feature
- Validation edge cases
- Confirmation flow (if destructive)

---

## License

Not specified. Contact the repository owner for licensing terms.

---

## Acknowledgements

- **[Groq](https://groq.com)** — LLaMA 3.3 70B inference for intent parsing
- **[rrule](https://github.com/jakubroztocil/rrule)** — RFC 5545 recurrence rule implementation
- **[better-sqlite3](https://github.com/WiseLibs/better-sqlite3)** — Synchronous SQLite bindings for Node.js
- **[Framer Motion](https://www.framer.com/motion/)** — Animation library powering view transitions
- **[Tailwind CSS](https://tailwindcss.com)** — Utility-first styling
- **[Next.js](https://nextjs.org)** — React framework with App Router
