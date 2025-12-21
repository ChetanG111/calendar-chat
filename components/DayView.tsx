"use client";

import React, { useState, useEffect, useRef } from 'react';
import { CalendarEvent, EVENT_THEMES } from '@/types';
import { arrangeEvents } from '@/lib/utils';


interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent, eventRect: DOMRect, containerRect: DOMRect) => void;
  onNewEvent?: (data?: Partial<CalendarEvent>) => void;
  selectedEventId?: string;
}

const DayView: React.FC<DayViewProps> = ({ currentDate, events, onEventClick, onNewEvent, selectedEventId }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter events for this day, exclude all-day events, and deduplicate by content (Title + Time)
  // This prevents visual stacking of identical events that might have different IDs
  const daysEvents = events.reduce((acc, e) => {
    // 1. Check Date match
    const isSameDay = e.start.getDate() === currentDate.getDate() &&
      e.start.getMonth() === currentDate.getMonth() &&
      e.start.getFullYear() === currentDate.getFullYear();

    if (!isSameDay) return acc;
    if (e.isAllDay) return acc;

    // 3. Deduplicate: Check if an identical event is already in the list
    const isDuplicate = acc.some(existing =>
      existing.title === e.title &&
      Math.abs(existing.start.getTime() - e.start.getTime()) < 1000 &&
      Math.abs(existing.end.getTime() - e.end.getTime()) < 1000
    );

    if (!isDuplicate) acc.push(e);
    return acc;
  }, [] as CalendarEvent[]);

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
    <div className="flex flex-1 flex-col h-full bg-background overflow-hidden">
      {/* Day Header */}
      <div className="flex-none px-8 py-6 border-b-2 border-black bg-white">
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.2em] font-black text-fg-muted">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </span>
          <h1 className="text-4xl font-black text-black">
            {currentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
          </h1>
        </div>
      </div>

      {/* All Day Section */}
      <div className="flex-none border-b-2 border-black bg-white min-h-[56px]">
        <div className="flex h-full">
          <div className="w-20 flex-shrink-0 border-r-2 border-black flex items-center justify-center text-xs font-black uppercase tracking-wider text-black">
            All-day
          </div>
          <div
            className="flex-1 relative cursor-pointer hover:bg-gray-100 brutal-transition p-3 flex flex-col gap-2 select-none"
            onDoubleClick={() => onNewEvent && onNewEvent({ isAllDay: true, start: currentDate, end: currentDate })}
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
                  className={`px-4 py-2 border-2 border-black text-sm font-bold truncate cursor-pointer z-10 brutal-transition hover:scale-[1.01] ${e.id === selectedEventId ? `${theme.solidBg} text-white` : `${theme.bg} ${theme.text}`}`}
                >
                  {e.title}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scrollable Timeline */}
      <div className="flex-1 overflow-y-auto relative bg-background scroll-smooth custom-scrollbar">
        <div className="relative w-full h-[1440px]">
          <div className="flex h-full">
            {/* Time Column */}
            <div className="w-20 flex-shrink-0 border-r-2 border-black bg-white text-right text-xs font-black text-black uppercase tracking-widest z-10 h-full">
              {hours.map(hour => (
                <div key={hour} className="h-[60px] pr-3 pt-2 border-b-2 border-gray-300 relative">
                  <span className="-top-3 relative">
                    {hour === 0 ? '' : `${hour.toString().padStart(2, '0')}:00`}
                  </span>
                </div>
              ))}
            </div>

            {/* Event Area */}
            <div
              ref={containerRef}
              className="flex-1 relative bg-background  h-full cursor-pointer select-none"
              onDoubleClick={(e) => {
                if (onNewEvent) onNewEvent();
              }}
            >
              {/* Grid Lines */}
              {hours.map(hour => (
                <div key={`grid-${hour}`} className="h-[60px] border-b-2 border-gray-100 w-full"></div>
              ))}

              {/* Current Time Line */}
              {currentTimePosition !== null && (
                <div className="absolute w-full z-20 pointer-events-none flex items-center" style={{ top: `${currentTimePosition}px` }}>
                  <div className="w-full border-t border-accent relative">
                    <div className="absolute -left-[4px] -top-[4px] w-2 h-2 bg-accent rounded-full ring-4 ring-accent/20"></div>
                  </div>
                </div>
              )}

              {/* Events Rendering */}
              {arrangeEvents(daysEvents).map(({ event, style }) => {
                const startHour = event.start.getHours();
                const startMin = event.start.getMinutes();
                const durationMinutes = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
                const top = (startHour * 60) + startMin;

                const theme = EVENT_THEMES[event.type] || EVENT_THEMES.business;
                const isSelected = event.id === selectedEventId;

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
                    className={`absolute px-4 py-3 flex flex-col justify-start items-start border-2 border-black cursor-pointer brutal-transition group ${isSelected ? `${theme.solidBg} text-white z-30 brutal-shadow` : `${theme.bg} ${theme.text} hover:brutal-shadow hover:z-20`} `}
                    style={{
                      top: `${top}px`,
                      height: `${durationMinutes}px`,
                      minHeight: '48px',
                      left: style.left,
                      width: style.width
                    }}
                  >
                    <div className="flex justify-between items-start w-full mb-1">
                      <h4 className="text-sm font-bold truncate leading-none">{event.title}</h4>
                      <span className="text-xs font-black opacity-70 uppercase tracking-wider whitespace-nowrap ml-2">
                        {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                    </div>
                    {event.description && durationMinutes > 60 && (
                      <p className="text-xs font-bold opacity-60 truncate w-full">
                        {event.description}
                      </p>
                    )}
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
