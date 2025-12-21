"use client";

import React, { useRef } from 'react';
import { CalendarEvent, EVENT_THEMES } from '@/types';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateChange: (date: Date) => void;
  onEventClick?: (event: CalendarEvent, eventRect: DOMRect, containerRect: DOMRect) => void;
  onNewEvent?: () => void;
  selectedEventId?: string;
}

const MonthView: React.FC<MonthViewProps> = ({ currentDate, events, onDateChange, onEventClick, onNewEvent, selectedEventId }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const containerRef = useRef<HTMLDivElement>(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const prevMonthDays = new Date(year, month, 0).getDate();

  // Grid generation
  const grid = [];
  // Prev month filler
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    grid.push({ day: prevMonthDays - i, type: 'prev', date: new Date(year, month - 1, prevMonthDays - i) });
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    grid.push({ day: i, type: 'current', date: new Date(year, month, i) });
  }
  // Next month filler
  const remaining = 42 - grid.length; // 6 rows * 7 cols
  for (let i = 1; i <= remaining; i++) {
    grid.push({ day: i, type: 'next', date: new Date(year, month + 1, i) });
  }

  return (
    <div className="flex flex-col flex-grow h-full bg-background-dark">
      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b border-border-dark bg-surface-dark">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center py-3 text-sm font-semibold text-gray-400 border-r border-transparent">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div ref={containerRef} className="grid grid-cols-7 flex-grow border-l border-border-dark">
        {grid.map((cell, idx) => {
          const isToday = new Date().toDateString() === cell.date.toDateString();
          const dayEvents = events.filter(e => e.start.toDateString() === cell.date.toDateString());

          return (
            <div
              key={idx}
              onDoubleClick={() => {
                // Clicking a cell now triggers new event instead of navigation
                onDateChange(cell.date); // optional: still update current date context
                if (onNewEvent) onNewEvent();
              }}
              className={`min-h-[120px] border-b border-r border-border-dark p-2 relative group hover:bg-white/5 transition-colors cursor-pointer select-none
                ${cell.type !== 'current' ? 'bg-black/20' : ''}
              `}
            >
              <div className="flex justify-end mb-2">
                <span className={`
                  text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-primary text-white' : (cell.type === 'current' ? 'text-gray-200' : 'text-gray-600')}
                `}>
                  {cell.day == 1 ? `${cell.day} ${cell.date.toLocaleString('default', { month: 'short' })}` : cell.day}
                </span>
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(ev => {
                  const theme = EVENT_THEMES[ev.type] || EVENT_THEMES.business;
                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        const containerRect = containerRef.current?.getBoundingClientRect();
                        if (containerRect) {
                          onEventClick?.(ev, e.currentTarget.getBoundingClientRect(), containerRect);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded transition-colors ${ev.id === selectedEventId ? `${theme.solidBg} text-white` : `${theme.hover}`} `}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${theme.dot}`}></div>
                      <span className="text-xs font-medium text-gray-400 truncate hidden xl:inline">{ev.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                      <span className="text-xs text-gray-300 truncate font-medium">{ev.title}</span>
                    </div>
                  )
                })}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 font-medium px-2 py-1">
                    {dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div >
  );
};

export default MonthView;