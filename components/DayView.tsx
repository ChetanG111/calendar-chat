"use client";

import React, { useState, useEffect, useRef } from 'react';
import { CalendarEvent, CalendarCategory, CalendarTheme } from '@/types';
import { arrangeEvents } from '@/lib/utils';
import { getThemeForColor } from '@/types';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  calendars?: CalendarCategory[];
  onEventClick?: (event: CalendarEvent, eventRect: DOMRect, containerRect: DOMRect) => void;
  onNewEvent?: (data?: Partial<CalendarEvent>) => void;
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

const DayView: React.FC<DayViewProps> = ({ currentDate, events, calendars, onEventClick, onNewEvent, selectedEventId }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate day boundaries
  const dayStart = new Date(currentDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(currentDate);
  dayEnd.setHours(23, 59, 59, 999);

  // Filter events that overlap with this day, exclude all-day events, and deduplicate
  const uniqueIntersectingEvents = events.reduce((acc, e) => {
    if (e.isAllDay) return acc;

    // Check intersection
    if (!(e.start < dayEnd && e.end > dayStart)) return acc;

    const isDuplicate = acc.some(existing =>
      existing.title === e.title &&
      Math.abs(existing.start.getTime() - e.start.getTime()) < 1000 &&
      Math.abs(existing.end.getTime() - e.end.getTime()) < 1000
    );

    if (!isDuplicate) acc.push(e);
    return acc;
  }, [] as CalendarEvent[]);

  // Clamp events to day boundaries for display
  const daysEvents = uniqueIntersectingEvents.map(e => {
    const clampedStart = e.start < dayStart ? dayStart : e.start;
    const clampedEnd = e.end > dayEnd ? dayEnd : e.end;
    return { ...e, start: clampedStart, end: clampedEnd };
  });

  // State for current time indicator position
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(() => {
    const now = new Date();
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

  // Scroll to current time on mount
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      // Scroll so current time is roughly in the middle, or at least visible
      // 1440px is total height, viewport is likely smaller. 
      // Let's scroll to current time - 200px (approx 3-4 hours padding)
      scrollContainerRef.current.scrollTop = Math.max(0, minutes - 200);
    }
  }, []);

  return (
    <motion.div 
      className="flex flex-1 flex-col h-full bg-background overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Day Header */}
      <motion.div variants={itemVariants} className="flex-none px-6 py-4 border-b border-border bg-card">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </span>
          <span className="text-2xl font-bold text-foreground">
            {currentDate.getDate()}
          </span>
        </div>
      </motion.div>

      {/* All Day Section */}
      <motion.div variants={itemVariants} className="flex-none border-b border-border bg-card min-h-[50px]">
        <div className="flex h-full">
          <div className="w-16 flex-shrink-0 border-r border-border flex items-center justify-center text-xs text-muted-foreground bg-card">
            All-day
          </div>
          <div
            className="flex-1 relative cursor-pointer hover:bg-accent transition-colors p-1 flex flex-col gap-1 select-none"
            onDoubleClick={() => onNewEvent && onNewEvent({ isAllDay: true, start: currentDate, end: currentDate })}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {events.filter(e => e.isAllDay &&
                e.start.getDate() === currentDate.getDate() &&
                e.start.getMonth() === currentDate.getMonth() &&
                e.start.getFullYear() === currentDate.getFullYear()
              ).map(e => {
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
                    className={`p-2 rounded border-l-2 text-xs font-medium truncate cursor-pointer z-10 transition-all shadow-sm ${theme.border} ${e.id === selectedEventId ? `${theme.solidBg} text-white` : `${theme.bg} ${theme.text} ${theme.hover}`} `}
                  >
                    {e.title}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Scrollable Timeline */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative bg-background scroll-smooth no-scrollbar">
        <div className="relative w-full h-[1440px]">
          <div className="flex h-full">
            {/* Time Column */}
            <div className="w-16 flex-shrink-0 border-r border-border bg-card text-right text-xs text-muted-foreground font-medium z-10 h-full">
              {hours.map(hour => (
                <motion.div variants={itemVariants} key={hour} className="h-[60px] pr-2 pt-2 border-b border-border/50 relative">
                  <span className="relative block text-right">
                    {hour === 0 ? '' : (() => {
                      const isPM = hour >= 12;
                      const h = hour % 12 || 12;
                      return `${h} ${isPM ? 'PM' : 'AM'}`;
                    })()}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Event Area */}
            <div
              ref={containerRef}
              className="flex-1 relative bg-background h-full cursor-pointer select-none"
              onDoubleClick={(e) => {
                if (onNewEvent) onNewEvent();
              }}
            >
              {hours.map(hour => (
                <motion.div variants={itemVariants} key={`grid - ${hour} `} className="h-[60px] border-b border-border/50 w-full"></motion.div>
              ))}

              {currentTimePosition !== null && (
                <div className="absolute w-full z-20 pointer-events-none flex items-center" style={{ top: `${currentTimePosition}px` }}>
                  <div className="w-full border-t border-red-500 relative">
                    <div className="absolute -left-[5px] -top-[5px] w-2.5 h-2.5 bg-red-500 rounded-full shadow-md"></div>
                  </div>
                </div>
              )}

              <AnimatePresence mode="popLayout">
                {arrangeEvents(daysEvents).map(({ event, style }) => {
                  const startHour = event.start.getHours();
                  const startMin = event.start.getMinutes();
                  const durationMinutes = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
                  const top = (startHour * 60) + startMin;

                  const theme = calendars?.find(c => c.id === event.type)?.theme || defaultTheme;
                  const isSelected = event.id === selectedEventId;
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
                      className={`absolute ${originalEvent.end > dayEnd ? 'border-b-0 rounded-b-none opacity-80' : ''} ${originalEvent.start < dayStart ? 'border-t-0 rounded-t-none opacity-80' : ''} ${originalEvent.end >= new Date() ? 'border-l-4' : ''} rounded-md pl-4 pr-4 py-2 flex justify-between items-start shadow-sm cursor-pointer overflow-hidden group ${theme.border} ${isSelected ? `${theme.solidBg} text-white` : `${theme.bg} ${theme.text} ${theme.hover}`} `}
                      style={{
                        top: `${top}px`,
                        height: `${durationMinutes}px`,
                        left: style.left,
                        width: style.width
                      }}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="text-sm font-medium truncate">{originalEvent.title}</h4>
                        {originalEvent.description && <p className="text-xs opacity-70 mt-1 truncate">{originalEvent.description}</p>}
                      </div>
                      <span className="text-xs opacity-70 font-medium flex-shrink-0 whitespace-nowrap">
                        {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DayView;