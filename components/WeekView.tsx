"use client";

import React, { useState, useEffect, useRef } from 'react';
import { CalendarEvent, EVENT_THEMES } from '@/types';
import { arrangeEvents } from '@/lib/utils';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateChange: (date: Date) => void;
  onNewEvent?: (data?: Partial<CalendarEvent>) => void;
  onEventClick?: (event: CalendarEvent, eventRect: DOMRect, containerRect: DOMRect) => void;
  selectedEventId?: string;
}

const WeekView: React.FC<WeekViewProps> = ({ currentDate, events, onDateChange, onNewEvent, onEventClick, selectedEventId }) => {
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
    <div className="flex flex-1 flex-col min-w-0 bg-surface relative h-full">
      {/* Week Header */}
      <div className="flex-none flex border-b border-border bg-canvas">
        <div className="w-20 flex-shrink-0 border-r border-border">
          <div className="h-20 flex items-center justify-center p-4">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider leading-tight text-center">
              UTC<br />-05
            </span>
          </div>
        </div>
        <div className="flex-1 relative">
          <div className="grid grid-cols-7 h-full">
            {weekDays.map((day, idx) => {
              const active = isToday(day);
              const isSelected = day.getDate() === currentDate.getDate();
              return (
                <div key={idx} className={`h-20 flex flex-col items-center justify-center relative transition-colors ${active ? 'bg-accent/[0.03]' : ''}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-2 ${active ? 'text-accent' : 'text-fg-subtle'}`}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <button
                    onClick={() => onDateChange(day)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all
                    ${active ? 'bg-accent text-white shadow-premium-sm' : 'text-foreground hover:bg-white/10'}
                    ${!active && isSelected ? 'ring-1 ring-white/20' : ''}
                  `}>
                    {day.getDate()}
                  </button>
                </div>
              );
            })}
          </div>
          {/* Vertical grid lines */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute top-0 bottom-0 w-px bg-border/50" style={{ left: `${((i + 1) / 7) * 100}%` }} />
          ))}
        </div>
      </div>

      {/* All Day Section */}
      <div className="flex-none flex border-b border-border bg-canvas/40 min-h-[48px]">
        <div className="w-20 flex-shrink-0 border-r border-border flex items-center justify-center text-[10px] font-bold uppercase tracking-wider text-fg-subtle p-2">
          All-day
        </div>
        <div className="flex-1 relative">
          <div className="grid grid-cols-7 h-full">
            {weekDays.map((day, idx) => (
              <div
                key={idx}
                className="relative hover:bg-white/[0.02] transition-colors cursor-pointer group select-none p-1"
                onDoubleClick={() => onNewEvent && onNewEvent({
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
                      className={`mb-1 px-2 py-0.5 rounded border-l-2 text-[10px] font-bold truncate cursor-pointer z-10 transition-all ${theme.border} ${e.id === selectedEventId ? `${theme.solidBg} text-white` : `${theme.bg} ${theme.text}`} ${theme.hover}`}
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
            <div key={i} className="absolute top-0 bottom-0 w-px bg-border/50 pointer-events-none" style={{ left: `${((i + 1) / 7) * 100}%` }} />
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 overflow-y-auto relative bg-background custom-scrollbar">
        <div className="flex h-[1440px] relative">
          {/* Time Labels */}
          <div className="w-20 flex-shrink-0 border-r border-border bg-canvas/20 z-10 text-right pr-3 pt-2 select-none sticky left-0">
            {hours.map(h => (
              <div key={h} className="h-[60px] text-[10px] font-bold text-fg-subtle relative -top-3 uppercase tracking-widest">
                {h === 0 ? '' : (h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`)}
              </div>
            ))}
          </div>

          {/* Event Grid */}
          <div ref={containerRef} className="flex-1 relative">
            {/* Horizontal Lines - full width across all columns */}
            <div className="absolute inset-0 flex flex-col pointer-events-none z-0">
              {hours.map(h => (
                <div key={h} className="h-[60px] border-b border-border/30 w-full"></div>
              ))}
            </div>

            {/* Grid columns with vertical borders */}
            <div className="absolute inset-0 grid grid-cols-7">
              {weekDays.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  className="relative cursor-pointer select-none"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (onNewEvent) onNewEvent();
                  }}
                >
                  {/* Events for this day */}
                  {arrangeEvents(events.filter(e => {
                    if (e.isAllDay) return false;
                    if (e.start.getDay() !== dayIdx) return false;
                    const eventDate = e.start;
                    if (eventDate < weekDays[0] || eventDate > weekDays[6]) return false;
                    return true;
                  })).map(({ event, style }) => {
                    const startMin = event.start.getHours() * 60 + event.start.getMinutes();
                    const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
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
                        className={`absolute z-10 p-3 border-l-4 rounded-lg text-xs cursor-pointer shadow-premium-sm transition-all duration-200 overflow-hidden ${theme.border} ${isSelected ? `${theme.solidBg} text-white scale-[1.02] z-30` : `${theme.bg} ${theme.text} hover:scale-[1.01] hover:z-20`} `}
                        style={{
                          top: `${startMin}px`,
                          height: `${duration}px`,
                          minHeight: '40px',
                          left: style.left,
                          width: style.width
                        }}
                      >
                        <p className="font-bold truncate leading-tight mb-0.5">{event.title}</p>
                        <p className="text-[10px] font-bold opacity-70 tracking-tight">
                          {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </p>
                      </div>
                    );
                  })}

                  {/* Current Time Line - only on today's column */}
                  {isToday(day) && (
                    <div className="absolute inset-x-0 z-20 pointer-events-none flex items-center" style={{ top: `${currentTimePosition}px` }}>
                      <div className="w-full border-t border-accent relative">
                        <div className="absolute -left-[4px] -top-[4px] w-2 h-2 bg-accent rounded-full ring-4 ring-accent/20"></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Vertical grid lines positioned to match header */}
            {[...Array(6)].map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 w-px bg-border/50 pointer-events-none z-[5]" style={{ left: `${((i + 1) / 7) * 100}%` }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeekView;