"use client";

import React, { useState, useEffect, useRef } from 'react';
import { CalendarEvent, EVENT_THEMES } from '@/types';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent, eventRect: DOMRect, containerRect: DOMRect) => void;
  onNewEvent?: (data?: Partial<CalendarEvent>) => void;
}

const DayView: React.FC<DayViewProps> = ({ currentDate, events, onEventClick, onNewEvent }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter events for this day
  const daysEvents = events.filter(e =>
    e.start.getDate() === currentDate.getDate() &&
    e.start.getMonth() === currentDate.getMonth() &&
    e.start.getFullYear() === currentDate.getFullYear()
  );

  // State for current time indicator position
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(() => {
    const now = new Date();
    // Only show if today is the current view date
    if (now.getDate() === currentDate.getDate() &&
      now.getMonth() === currentDate.getMonth() &&
      now.getFullYear() === currentDate.getFullYear()) {
      return now.getHours() * 60 + now.getMinutes();
    }
    return null;
  });

  useEffect(() => {
    const updateTimePosition = () => {
      const now = new Date();
      if (now.getDate() === currentDate.getDate() &&
        now.getMonth() === currentDate.getMonth() &&
        now.getFullYear() === currentDate.getFullYear()) {
        const minutes = now.getHours() * 60 + now.getMinutes();
        setCurrentTimePosition(minutes);
      } else {
        setCurrentTimePosition(null);
      }
    };

    updateTimePosition();
    const interval = setInterval(updateTimePosition, 60000);
    return () => clearInterval(interval);
  }, [currentDate]);

  return (
    <div className="flex flex-1 flex-col h-full bg-background-dark overflow-hidden">
      {/* Day Header */}
      <div className="flex-none px-6 py-4 border-b border-border-dark bg-surface-dark">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide font-semibold text-gray-400">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </span>
          <span className="text-2xl font-bold text-white">
            {currentDate.getDate()}
          </span>
        </div>
      </div>

      {/* All Day Section */}
      <div className="flex-none border-b border-border-dark bg-surface-dark min-h-[50px]">
        <div className="flex h-full">
          <div className="w-16 flex-shrink-0 border-r border-border-dark flex items-center justify-center text-xs text-gray-500 bg-surface-dark">
            All-day
          </div>
          <div
            className="flex-1 relative cursor-pointer hover:bg-white/5 transition-colors p-1 flex flex-col gap-1"
            onClick={() => onNewEvent && onNewEvent({ isAllDay: true, start: currentDate, end: currentDate })}
          >
            {/* All Day Events for this day */}
            {events.filter(e => e.isAllDay &&
              e.start.getDate() === currentDate.getDate() &&
              e.start.getMonth() === currentDate.getMonth() &&
              e.start.getFullYear() === currentDate.getFullYear()
            ).map(e => {
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
                  className={`p-1 rounded border-l-2 text-xs font-medium truncate cursor-pointer z-10 transition-all shadow-sm ${theme.bg} ${theme.border} ${theme.text} ${theme.hover}`}
                >
                  {e.title}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scrollable Timeline */}
      <div className="flex-1 overflow-y-auto relative bg-background-dark scroll-smooth custom-scrollbar">
        {/* Enforce explicit height to ensure child elements stretch correctly */}
        <div className="relative w-full h-[1440px]">

          <div className="flex h-full">
            {/* Time Column */}
            <div className="w-16 flex-shrink-0 border-r border-border-dark bg-surface-dark text-right text-xs text-gray-500 font-medium z-10 h-full">
              {hours.map(hour => (
                <div key={hour} className="h-[60px] pr-2 pt-2 border-b border-zinc-800/50 relative">
                  <span className="-top-3 relative">
                    {hour === 0 ? '' : `${hour.toString().padStart(2, '0')}:00`}
                  </span>
                </div>
              ))}
            </div>

            {/* Event Area */}
            <div
              ref={containerRef}
              className="flex-1 relative bg-background-dark h-full cursor-pointer"
              onClick={(e) => {
                // Simple handler for empty space click
                if (onNewEvent) onNewEvent();
              }}
            >
              {/* Grid Lines */}
              {hours.map(hour => (
                <div key={`grid-${hour}`} className="h-[60px] border-b border-zinc-800/50 w-full"></div>
              ))}

              {/* Current Time Line */}
              {currentTimePosition !== null && (
                <div className="absolute w-full z-20 pointer-events-none flex items-center" style={{ top: `${currentTimePosition}px` }}>
                  <div className="w-full border-t border-red-500 relative">
                    <div className="absolute -left-[5px] -top-[5px] w-2.5 h-2.5 bg-red-500 rounded-full shadow-md"></div>
                  </div>
                </div>
              )}

              {/* Events Rendering */}
              {daysEvents.map((event) => {
                const startHour = event.start.getHours();
                const startMin = event.start.getMinutes();
                const durationMinutes = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
                const top = (startHour * 60) + startMin;

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
                    className={`absolute left-4 right-4 border-l-4 rounded-r-md px-3 py-2 flex justify-between items-start shadow-sm cursor-pointer transition-all group ${theme.bg} ${theme.border} ${theme.text} ${theme.hover}`}
                    style={{ top: `${top}px`, height: `${durationMinutes}px`, minHeight: '40px' }}
                  >
                    <div>
                      <h4 className="text-sm font-medium">{event.title}</h4>
                      {event.description && <p className="text-xs opacity-70 mt-1">{event.description}</p>}
                    </div>
                    <span className="text-xs opacity-70 font-medium">
                      {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayView;