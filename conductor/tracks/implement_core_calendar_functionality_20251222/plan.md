# Track: Implement Core Calendar Functionality with Event Management - Plan

## Phase 1: Database Setup and Basic Event Model

*   [ ] Task: Write tests for database connection and basic event schema.
*   [ ] Task: Implement `lib/db/connection.ts` for SQLite database connection.
*   [ ] Task: Define event schema in `lib/db/schema.ts` for title, description, start/end times, all-day flag, and recurrence rules.
*   [ ] Task: Implement basic CRUD operations for events in `lib/db/events.ts`.
*   [ ] Task: Conductor - User Manual Verification 'Phase 1: Database Setup and Basic Event Model' (Protocol in workflow.md)

## Phase 2: Event Creation Interface

*   [ ] Task: Write tests for `CreateEventModal.tsx` components and event form validation.
*   [ ] Task: Implement `components/CreateEventModal.tsx` for adding/editing events.
*   [ ] Task: Integrate date and time pickers (`components/TimePicker.tsx` will be reused or created) and recurrence input using `rrule`.
*   [ ] Task: Conductor - User Manual Verification 'Phase 2: Event Creation Interface' (Protocol in workflow.md)

## Phase 3: Event Viewing - Day View

*   [ ] Task: Write tests for `DayView.tsx` rendering and event display.
*   [ ] Task: Implement `components/DayView.tsx` to display events for a single day chronologically.
*   [ ] Task: Implement navigation for changing days.
*   [ ] Task: Conductor - User Manual Verification 'Phase 3: Event Viewing - Day View' (Protocol in workflow.md)

## Phase 4: Event Viewing - Week View

*   [ ] Task: Write tests for `WeekView.tsx` rendering and event display across a week.
*   [ ] Task: Implement `components/WeekView.tsx` to display events for a week.
*   [ ] Task: Implement navigation for changing weeks.
*   [ ] Task: Conductor - User Manual Verification 'Phase 4: Event Viewing - Week View' (Protocol in workflow.md)

## Phase 5: Event Viewing - Month View

*   [ ] Task: Write tests for `MonthView.tsx` rendering and event display in a month grid.
*   [ ] Task: Implement `components/MonthView.tsx` to display a month calendar with indicators for days having events.
*   [ ] Task: Enable clicking on a day to navigate to the Day View.
*   [ ] Task: Implement navigation for changing months.
*   [ ] Task: Conductor - User Manual Verification 'Phase 5: Event Viewing - Month View' (Protocol in workflow.md)

## Phase 6: Event Editing and Deletion

*   [ ] Task: Write integration tests for editing and deleting events (single/recurring).
*   [ ] Task: Enhance `CreateEventModal.tsx` to pre-populate event data for editing.
*   [ ] Task: Add logic for handling recurrence rule updates/deletions.
*   [ ] Task: Conductor - User Manual Verification 'Phase 6: Event Editing and Deletion' (Protocol in workflow.md)