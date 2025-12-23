import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { CalendarEvent } from "@/types"

/**
 * Combine class name inputs and resolve Tailwind class conflicts into a single string.
 *
 * @param inputs - Class values (strings, arrays, objects, etc.) to merge
 * @returns The merged class string with Tailwind classes deduplicated and conflicts resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Compute horizontal positions for calendar events so overlapping events render side-by-side.
 *
 * Events are assigned to columns and may span adjacent empty columns; each returned entry pairs
 * the original event with a style containing `left` and `width` as percentage strings suitable
 * for inline CSS positioning.
 *
 * @param events - Array of calendar events to layout (each event must have `id`, `start`, and `end`)
 * @returns An array where each item contains the original `event` and a `style` object with `left` and `width` (e.g., `"25%"`) representing the event's horizontal offset and width
 */
export function arrangeEvents(events: CalendarEvent[]): Array<{ event: CalendarEvent; style: { left: string; width: string } }> {
  if (events.length === 0) return [];

  // Sort events by start time, then by duration (longer events first)
  const sortedEvents = [...events].sort((a, b) => {
    const startDiff = a.start.getTime() - b.start.getTime();
    if (startDiff !== 0) return startDiff;
    // Longer events first (so they can span and shorter ones adjust)
    return (b.end.getTime() - b.start.getTime()) - (a.end.getTime() - a.start.getTime());
  });

  // Track columns for each event
  const columns: CalendarEvent[][] = [];

  for (const event of sortedEvents) {
    // Find a column where this event doesn't overlap with existing events
    let placed = false;
    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
      const column = columns[colIdx];
      const lastInColumn = column[column.length - 1];

      // Check if this event starts after the last event in this column ends
      if (event.start >= lastInColumn.end) {
        column.push(event);
        placed = true;
        break;
      }
    }

    // If no suitable column found, create a new one
    if (!placed) {
      columns.push([event]);
    }
  }

  const totalColumns = columns.length;

  // Create a map of event id to column index
  const eventColumnMap = new Map<string, number>();
  columns.forEach((column, colIdx) => {
    column.forEach(event => {
      eventColumnMap.set(event.id, colIdx);
    });
  });

  // For each event, determine how many columns it can expand into
  // (i.e., how many adjacent columns to the right have no overlapping events)
  const result: Array<{ event: CalendarEvent; style: { left: string; width: string } }> = [];

  for (const event of sortedEvents) {
    const colIdx = eventColumnMap.get(event.id)!;

    // Count how many columns to the right this event can span
    let span = 1;
    for (let nextCol = colIdx + 1; nextCol < totalColumns; nextCol++) {
      const overlaps = columns[nextCol].some(otherEvent =>
        event.start < otherEvent.end && event.end > otherEvent.start
      );
      if (overlaps) break;
      span++;
    }

    const widthPercent = (span / totalColumns) * 100;
    const leftPercent = (colIdx / totalColumns) * 100;

    result.push({
      event,
      style: {
        left: `${leftPercent}%`,
        width: `${widthPercent}%`
      }
    });
  }

  return result;
}