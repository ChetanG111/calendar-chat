"use client";

import React, { useState, useEffect, useRef } from 'react';
import { CalendarEvent, EVENT_THEMES } from '@/types';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateChange: (date: Date) => void;
  onNewEvent?: (data?: Partial<CalendarEvent>) => void;
  onEventClick?: (event: CalendarEvent, eventRect: DOMRect, containerRect: DOMRect) => void;
}

const WeekView: React.FC<WeekViewProps> = ({ currentDate, events, onDateChange, onNewEvent, onEventClick }) => {
  // Calculate start of week (Sunday)
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  const containerRef = useRef<HTMLDivElement>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const hours = Array.from({ length: 24 }, (_, i) => i); // 0 to 23

  // State for current time indicator position
  // Initialize with current time so it renders immediately
  const [currentTimePosition, setCurrentTimePosition] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const updateTimePosition = () => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      setCurrentTimePosition(minutes);
    };

    const interval = setInterval(updateTimePosition, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const isToday = (d: Date) => {
    const today = new Date();
    return d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
  };

  // Check if today is in the current view
  const isTodayInView = weekDays.some(day => isToday(day));

  return (
    <div className="flex flex-1 flex-col min-w-0 bg-background-dark relative h-full">
      {/* Week Header */}
      <div className="flex-none flex border-b border-border-dark bg-surface-dark">
        <div className="w-16 flex-shrink-0 border-r border-border-dark">
          <div className="h-16 flex items-end justify-center pb-2 text-xs text-gray-500">
            GMT-05
          </div>
        </div>
        <div className="flex-1 relative">
          <div className="grid grid-cols-7 h-full">
            {weekDays.map((day, idx) => {
              const active = isToday(day);
              const isSelected = day.getDate() === currentDate.getDate();
              return (
                <div key={idx} className={`h-16 flex flex-col items-center justify-center relative ${active ? 'bg-primary/5' : ''}`}>
                  <span className={`text-xs font-medium uppercase mb-1 ${active ? 'text-primary' : 'text-gray-400'}`}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <button
                    onClick={() => onDateChange(day)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-semibold transition-all
                    ${active ? 'bg-primary text-white' : 'text-gray-200 hover:bg-white/10'}
                    ${!active && isSelected ? 'bg-white/10' : ''}
                  `}>
                    {day.getDate()}
                  </button>
                </div>
              );
            })}
          </div>
          {/* Vertical grid lines */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute top-0 bottom-0 w-px bg-border-dark" style={{ left: `${((i + 1) / 7) * 100}%` }} />
          ))}
        </div>
      </div>

      {/* All Day Section */}
      <div className="flex-none flex border-b border-border-dark bg-surface-dark min-h-[40px]">
        <div className="w-16 flex-shrink-0 border-r border-border-dark flex items-center justify-center text-xs text-gray-500 p-2">
          All-day
        </div>
        <div className="flex-1 relative">
          <div className="grid grid-cols-7 h-full">
            {weekDays.map((day, idx) => (
              <div
                key={idx}
                className="relative hover:bg-white/5 transition-colors cursor-pointer group"
                onClick={() => onNewEvent && onNewEvent({
                  isAllDay: true,
                  start: day,
                  end: day
                })}
              >
                {/* All Day Events for this day */}
                {events.filter(e => e.isAllDay && e.start.getDay() === day.getDay()).map(e => {
                  const theme = EVENT_THEMES[e.type] || EVENT_THEMES.business;
                  return (
                    <div
                      key={e.id}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        const containerRect = containerRef.current?.getBoundingClientRect();
                        if (containerRect) {
                          onEventClick?.(e, ev.currentTarget.getBoundingClientRect(), containerRect);
                        }
                      }}
                      className={`m-1 p-1 rounded border-l-2 text-xs font-medium truncate cursor-pointer z-10 transition-all shadow-sm ${theme.bg} ${theme.border} ${theme.text} ${theme.hover}`}
                    >
                      {e.title}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          {/* Vertical grid lines */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute top-0 bottom-0 w-px bg-border-dark pointer-events-none" style={{ left: `${((i + 1) / 7) * 100}%` }} />
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 overflow-y-auto relative bg-background-dark custom-scrollbar">
        <div className="flex h-[1440px] relative">
          {/* Time Labels */}
          <div className="w-16 flex-shrink-0 border-r border-border-dark bg-surface-dark z-10 text-right pr-2 pt-2 select-none sticky left-0">
            {hours.map(h => (
              <div key={h} className="h-[60px] text-xs text-gray-500 relative -top-3">
                {h === 0 ? '' : (h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`)}
              </div>
            ))}
          </div>

          {/* Event Grid */}
          <div ref={containerRef} className="flex-1 relative">
            {/* Horizontal Lines - full width across all columns */}
            <div className="absolute inset-0 flex flex-col pointer-events-none z-0">
              {hours.map(h => (
                <div key={h} className="h-[60px] border-b border-zinc-800/50 w-full"></div>
              ))}
            </div>

            {/* Grid columns with vertical borders */}
            <div className="absolute inset-0 grid grid-cols-7">
              {weekDays.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  className="relative cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNewEvent) onNewEvent();
                  }}
                >
                  {/* Events for this day */}
                  {events.filter(e => !e.isAllDay && e.start.getDay() === dayIdx).map(event => {
                    // Check if event falls in this week
                    const eventDate = event.start;
                    if (eventDate < weekDays[0] || eventDate > weekDays[6]) return null;

                    const startMin = event.start.getHours() * 60 + event.start.getMinutes();
                    const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
                    const theme = EVENT_THEMES[event.type] || EVENT_THEMES.business;

                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          const containerRect = containerRef.current?.getBoundingClientRect();
                          if (containerRect) {
                            onEventClick?.(event, e.currentTarget.getBoundingClientRect(), containerRect);
                          }
                        }}
                        className={`absolute z-10 p-1 border-l-4 rounded-r-md text-xs cursor-text shadow-sm transition-all overflow-hidden ${theme.bg} ${theme.border} ${theme.text} ${theme.hover}`}
                        style={{
                          top: `${startMin}px`,
                          height: `${duration}px`,
                          left: '2px',
                          right: '2px'
                        }}
                      >
                        <p className="font-semibold truncate">{event.title}</p>
                        <p className="opacity-80">{event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    );
                  })}

                  {/* Current Time Line - only on today's column */}
                  {isToday(day) && (
                    <div className="absolute inset-x-0 z-20 pointer-events-none flex items-center" style={{ top: `${currentTimePosition}px` }}>
                      <div className="w-full border-t border-red-500 relative">
                        <div className="absolute -left-[5px] -top-[5px] w-2.5 h-2.5 bg-red-500 rounded-full shadow-md"></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Vertical grid lines positioned to match header */}
            {[...Array(6)].map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 w-px bg-border-dark pointer-events-none z-[5]" style={{ left: `${((i + 1) / 7) * 100}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekView;