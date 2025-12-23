"use client";

import React, { useState, useEffect, useRef } from 'react';
import { CalendarEvent, CalendarCategory, CalendarTheme } from '@/types';
import { arrangeEvents } from '@/lib/utils';
import { getThemeForColor } from '@/types';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  calendars?: CalendarCategory[];
  onDateChange: (date: Date) => void;
  onNewEvent?: (data?: Partial<CalendarEvent>) => void;
  onEventClick?: (event: CalendarEvent, eventRect: DOMRect, containerRect: DOMRect) => void;
  selectedEventId?: string;
}

const defaultTheme: CalendarTheme = {
  primary: 'blue',
  bg: 'bg-blue-500/20',
  border: 'border-blue-500',
  text: 'text-blue-100',
  dot: 'bg-blue-500',
  hover: 'hover:bg-blue-500/30',
  solidBg: 'bg-blue-500'
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0.05
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 20
    }
  }
};

const WeekView: React.FC<WeekViewProps> = ({ currentDate, events, calendars, onDateChange, onNewEvent, onEventClick, selectedEventId }) => {
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

  // Scroll to current time on mount
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only scroll if we are looking at the current week
    // But user request says "whenever the calendar loads", so probably good to just scroll to "now" position regardless of date, 
    // though it makes most sense if today is visible.
    // The prompt implies: "shifts the view to today and the current time".
    if (scrollContainerRef.current) {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      scrollContainerRef.current.scrollTop = Math.max(0, minutes - 200);
    }
  }, []);

  return (
    <motion.div 
      className="flex flex-1 flex-col min-w-0 bg-background relative h-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Week Header */}
      <motion.div variants={itemVariants} className="flex-none flex border-b border-border bg-card">
        <div className="w-16 flex-shrink-0 border-r border-border">
          <div className="h-16 flex items-end justify-center pb-2 text-xs text-muted-foreground">
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
                  <span className={`text-xs font-medium uppercase mb-1 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <button
                    onClick={() => onDateChange(day)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-lg font-semibold transition-all
                    ${active ? 'bg-primary text-white' : 'text-foreground hover:bg-accent'}
                    ${!active && isSelected ? 'bg-accent' : ''}
                  `}>
                    {day.getDate()}
                  </button>
                </div>
              );
            })}
          </div>
          {/* Vertical grid lines */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute top-0 bottom-0 w-px bg-border" style={{ left: `${((i + 1) / 7) * 100}%` }} />
          ))}
        </div>
      </motion.div>

      {/* All Day Section */}
      <motion.div variants={itemVariants} className="flex-none flex border-b border-border bg-card min-h-[40px]">
        <div className="w-16 flex-shrink-0 border-r border-border flex items-center justify-center text-xs text-muted-foreground p-2">
          All-day
        </div>
        <div className="flex-1 relative">
          <div className="grid grid-cols-7 h-full">
            {weekDays.map((day, idx) => (
              <div
                key={idx}
                className="relative hover:bg-accent transition-colors cursor-pointer group select-none"
                onDoubleClick={() => onNewEvent && onNewEvent({
                  isAllDay: true,
                  start: day,
                  end: day
                })}
              >
                {/* All Day Events for this day */}
                <AnimatePresence mode="popLayout" initial={false}>
                  {events.filter(e => {
                    const dayStart = new Date(day);
                    dayStart.setHours(0, 0, 0, 0);
                    const dayEnd = new Date(day);
                    dayEnd.setHours(23, 59, 59, 999);
                    return e.isAllDay && e.start >= dayStart && e.start <= dayEnd;
                  }).map(e => {
                    const theme = calendars?.find(c => c.id === e.type)?.theme || defaultTheme;
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        key={e.id}
                        onClick={(ev) => {
                          ev.stopPropagation();
                          const containerRect = containerRef.current?.getBoundingClientRect();
                          if (containerRect) {
                            onEventClick?.(e, ev.currentTarget.getBoundingClientRect(), containerRect);
                          }
                        }}
                        className={`m-1 p-1 rounded border-l-2 text-xs font-medium truncate cursor-pointer z-10 transition-all shadow-sm ${theme.border} ${e.id === selectedEventId ? `${theme.solidBg} text-white` : `${theme.bg} ${theme.text} ${theme.hover}`} `}
                      >
                        {e.title}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            ))}
          </div>
          {/* Vertical grid lines */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute top-0 bottom-0 w-px bg-border pointer-events-none" style={{ left: `${((i + 1) / 7) * 100}%` }} />
          ))}
        </div>
      </motion.div>

      {/* Main Grid */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative bg-background no-scrollbar">
        <div className="flex h-[1440px] relative">
          {/* Time Labels */}
          <div className="w-16 flex-shrink-0 border-r border-border bg-card z-10 text-right pr-2 pt-2 select-none sticky left-0">
            {hours.map(h => (
              <motion.div variants={itemVariants} key={h} className="h-[60px] text-xs text-muted-foreground relative -top-3">
                {h === 0 ? '' : (h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`)}
              </motion.div>
            ))}
          </div>

          {/* Event Grid */}
          <div ref={containerRef} className="flex-1 relative">
            {/* Horizontal Lines - full width across all columns */}
            <div className="absolute inset-0 flex flex-col pointer-events-none z-0">
              {hours.map(h => (
                <motion.div variants={itemVariants} key={h} className="h-[60px] border-b border-border/50 w-full"></motion.div>
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
                  {/* Events for this day - Filter overlapping and clamp to day boundaries */}
                  {(() => {
                    const dayStart = new Date(day);
                    dayStart.setHours(0, 0, 0, 0);
                    const dayEnd = new Date(day);
                    dayEnd.setHours(23, 59, 59, 999);

                    const dayEvents = events
                      .filter(e => !e.isAllDay && e.start < dayEnd && e.end > dayStart)
                      .map(e => {
                        const clampedStart = e.start < dayStart ? dayStart : e.start;
                        const clampedEnd = e.end > dayEnd ? dayEnd : e.end;
                        return { ...e, start: clampedStart, end: clampedEnd };
                      });

                    return (
                      <AnimatePresence mode="popLayout">
                        {arrangeEvents(dayEvents).map(({ event, style }) => {
                          const startMin = event.start.getHours() * 60 + event.start.getMinutes();
                          const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
                          const theme = calendars?.find(c => c.id === event.type)?.theme || defaultTheme;
                          const originalEvent = events.find(ev => ev.id === event.id) || event;

                          return (
                            <motion.div
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              key={event.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                const containerRect = containerRef.current?.getBoundingClientRect();
                                if (containerRect) {
                                  onEventClick?.(originalEvent, e.currentTarget.getBoundingClientRect(), containerRect);
                                }
                              }}
                              className={`absolute z-10 px-2 py-1 ${originalEvent.end > dayEnd ? 'border-b-0 rounded-b-none opacity-80' : ''} ${originalEvent.start < dayStart ? 'border-t-0 rounded-t-none opacity-80' : ''} ${event.end >= new Date() ? 'border-l-4' : ''} rounded-md text-xs cursor-pointer shadow-sm overflow-hidden ${theme.border} ${event.id === selectedEventId ? `${theme.solidBg} text-white` : `${theme.bg} ${theme.text} ${theme.hover}`} `}
                              style={{
                                top: `${startMin}px`,
                                height: `${duration}px`,
                                left: style.left,
                                width: style.width
                              }}
                            >
                              <p className="font-semibold truncate">{originalEvent.title}</p>
                              <p className="opacity-80">{event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    );
                  })()}

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
    </motion.div>
  );
};

export default WeekView;