"use client";

import React, { useRef } from 'react';
import { CalendarEvent, CalendarCategory, CalendarTheme } from '@/types';
import { getThemeForColor } from '@/types';
import { motion, AnimatePresence, Variants } from 'framer-motion';

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  calendars?: CalendarCategory[];
  onDateChange: (date: Date) => void;
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

const MonthView: React.FC<MonthViewProps> = ({ currentDate, events, calendars, onDateChange, onEventClick, onNewEvent, selectedEventId }) => {
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
    <motion.div 
      className="flex flex-col flex-grow h-full bg-background"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Weekday Header */}
      <motion.div variants={containerVariants} className="grid grid-cols-7 border-b border-border bg-card">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <motion.div variants={itemVariants} key={day} className="text-center py-3 text-sm font-semibold text-muted-foreground border-r border-transparent">
            {day}
          </motion.div>
        ))}
      </motion.div>

      {/* Grid */}
      <motion.div variants={containerVariants} ref={containerRef} className="grid grid-cols-7 flex-grow border-l border-border">
        {grid.map((cell, idx) => {
          const isToday = new Date().toDateString() === cell.date.toDateString();
          const cellEnd = new Date(cell.date);
          cellEnd.setHours(23, 59, 59, 999);
          const dayEvents = events.filter(e => e.start < cellEnd && e.end > cell.date);

          return (
            <motion.div
              variants={itemVariants}
              key={idx}
              onDoubleClick={() => {
                // Clicking a cell now triggers new event instead of navigation
                onDateChange(cell.date); // optional: still update current date context
                if (onNewEvent) onNewEvent({ start: cell.date, end: cell.date });
              }}
              className={`min-h-[120px] border-b border-r border-border p-2 relative group hover:bg-accent transition-colors cursor-pointer select-none
                ${cell.type !== 'current' ? 'bg-muted/30' : ''}
              `}
            >
              <div className="flex justify-end mb-2">
                <span className={`
                  text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-primary text-white' : (cell.type === 'current' ? 'text-foreground' : 'text-muted-foreground')}
                `}>
                  {cell.day}
                </span>
              </div>

              <div className="space-y-1">
                <AnimatePresence mode="popLayout" initial={false}>
                  {dayEvents.slice(0, 3).map(ev => {
                    const theme = calendars?.find(c => c.id === ev.type)?.theme || defaultTheme;
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
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
                        <span className="text-xs font-medium text-muted-foreground truncate hidden xl:inline">{ev.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                        <span className="text-xs text-foreground truncate font-medium">{ev.title}</span>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground font-medium px-2 py-1">
                    {dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};

export default MonthView;