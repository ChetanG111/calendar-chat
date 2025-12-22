# Nexus Calendar

A sleek, modern dark-mode calendar application built with Next.js 15, featuring Day, Week, and Month views alongside an integrated conversational UI workspace.

## 🚀 Features

- **Fluid UI & Animations** — Premium spring-based transitions using Framer Motion.
- **Multiple Views** — Seamless switching between Day, Week, Month, and Chat interfaces.
- **Modern Tech Stack** — Built with Next.js 15 (App Router), TypeScript, and Tailwind CSS.
- **Persistent Storage** — Local SQLite database for event management.

## 🛠️ Project Structure

```text
calendar-chat/
├── app/
│   ├── api/
│   │   └── events/             # CRUD endpoints for calendar events
│   ├── layout.tsx              # Root layout with font/styles
│   └── page.tsx                # Main entry point and view orchestration
├── components/
│   ├── ChatView.tsx            # Conversational UI shell
│   ├── MonthView.tsx           # Full-featured month grid
│   ├── WeekView.tsx            # Multi-column week layout
│   ├── DayView.tsx             # Hourly detail view
│   └── ViewSwitcher.tsx        # View navigation component
├── lib/
│   ├── db/                     # SQLite database schema and connection
│   └── api/                    # Frontend API clients
└── types.ts                    # Shared TypeScript definitions
```

## 🏗️ Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Setup Database:**
   ```bash
   npm run db:demo
   ```

3. **Run Development Server:**
   ```bash
   npm run dev
   ```

## 📝 Development

The project uses a clean architecture separating the UI components from the database layer. Calendar events are stored in a local SQLite database (`data/calendar.db`).

- **Styling:** Tailwind CSS with custom utility classes for the "surface-dark" theme.
- **Animations:** Framer Motion for all interactive transitions.
- **Database:** `better-sqlite3` for efficient local persistence.