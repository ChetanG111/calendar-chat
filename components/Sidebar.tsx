"use client";

import React from 'react';
import { CalendarCategory, CALENDAR_CATEGORIES } from '@/types';
import { motion, Variants } from 'framer-motion';

interface SidebarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -50, scale: 0.8 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 12,
      mass: 0.5
    }
  }
};

const Sidebar: React.FC<SidebarProps> = ({ currentDate, onDateChange }) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Mini Calendar Logic
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday

  // Previous month filler
  const prevMonthDays = new Date(year, month, 0).getDate();
  const prevMonthFiller = Array.from({ length: firstDayOfMonth }, (_, i) => prevMonthDays - firstDayOfMonth + i + 1);

  // Current month days
  const currentDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Next month filler (to complete 42 grid cells usually 6 rows)
  const remainingCells = 42 - (prevMonthFiller.length + currentDays.length);
  const nextMonthFiller = Array.from({ length: remainingCells }, (_, i) => i + 1);

  const isToday = (d: number, mOffset: number = 0) => {
    const today = new Date();
    const checkDate = new Date(year, month + mOffset, d);
    return today.getDate() === checkDate.getDate() &&
      today.getMonth() === checkDate.getMonth() &&
      today.getFullYear() === checkDate.getFullYear();
  };

  const isSelected = (d: number) => {
    return currentDate.getDate() === d;
  }

  return (
    <motion.aside
      className="w-64 flex flex-col border-r border-border-dark bg-surface-dark overflow-y-auto flex-shrink-0"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="p-4">
        {/* Days Header */}
        <motion.div variants={itemVariants} className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2">
          <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
        </motion.div>

        {/* Calendar Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-7 gap-1 text-center text-sm mb-6">
          {prevMonthFiller.map((day) => (
            <span key={`prev-${day}`} className="p-1 text-zinc-600">{day}</span>
          ))}

          {currentDays.map((day) => {
            const selected = isSelected(day);
            const today = isToday(day);
            return (
              <motion.button
                key={`curr-${day}`}
                whileHover={{ scale: 1.3 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onDateChange(new Date(year, month, day))}
                className={`relative p-1 rounded-full w-8 h-8 flex items-center justify-center mx-auto transition-colors
                  ${selected ? 'text-white' : 'text-gray-300'}
                  ${today && !selected ? 'text-primary font-bold' : ''}
                `}
              >
                {selected && (
                  <motion.div
                    layoutId="active-day-indicator"
                    className="absolute inset-0 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}
                <span className="relative z-10">{day}</span>
              </motion.button>
            );
          })}

          {nextMonthFiller.map((day) => (
            <span key={`next-${day}`} className="p-1 text-zinc-600">{day}</span>
          ))}
        </motion.div>

        {/* Calendars List */}
        <div className="space-y-4">
          <motion.div variants={itemVariants} className="flex justify-between items-center">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">My Calendars</h3>
            <span className="material-icons text-gray-500 text-sm cursor-pointer hover:text-white">add</span>
          </motion.div>
          <div className="space-y-2">
            {CALENDAR_CATEGORIES.map((cat, index) => (
              <motion.div
                key={cat.id}
                variants={itemVariants}
                className="flex items-center space-x-3 cursor-pointer group"
                custom={index}
                whileHover={{ x: 5 }}
              >
                <div className={`w-4 h-4 rounded border border-gray-600 ${cat.color} flex items-center justify-center`}>
                  <span className="material-icons text-white text-[10px]">check</span>
                </div>
                <span className="text-sm text-gray-300 group-hover:text-white transition-colors">{cat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;