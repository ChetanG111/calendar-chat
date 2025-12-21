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
    <div className="flex flex-col flex-grow h-full bg-background">
      {/* Weekday Header */}
      <div className="grid grid-cols-7 border-b-2 border-black bg-white">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center py-4 text-sm font-bold text-black uppercase tracking-wide border-r-2 last:border-r-0 border-black">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div ref={containerRef} className="grid grid-cols-7 flex-grow border-l-2 border-black">
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
              className={`min-h-[120px] border-b-2 border-r-2 last:border-r-0 border-black p-3 relative group hover:bg-gray-100 brutal-transition cursor-pointer select-none
                ${cell.type !== 'current' ? 'bg-gray-50 opacity-50' : 'bg-white'}
              `}
            >
              <div className="flex justify-end mb-2">
                <span className={`
                  text-sm font-bold w-8 h-8 flex items-center justify-center border-2
                  ${isToday ? 'bg-black text-white border-black' : (cell.type === 'current' ? 'text-black border-transparent' : 'text-gray-400 border-transparent')}
                `}>
                  {cell.day == 1 ? `${cell.day} ${cell.date.toLocaleString('default', { month: 'short' })}` : cell.day}
                </span>
              </div>

              <div className="space-y-1.5">
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
                      className={`flex items-center gap-2 px-2 py-1 border-2 border-black brutal-transition hover:scale-[1.02] ${ev.id === selectedEventId ? `${theme.solidBg} text-white font-bold` : `${theme.bg} ${theme.text} font-bold`}`}
                    >
                      <div className={`w-2 h-2 border-2 border-black ${theme.dot}`}></div>
                      <span className="text-xs font-bold truncate hidden xl:inline">{ev.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                      <span className="text-xs truncate font-bold">{ev.title}</span>
                    </div>
                  )
                })}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-fg-muted font-bold px-2 py-1">
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
