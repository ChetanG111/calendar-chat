"use client";

import React from 'react';
import { CalendarCategory, CALENDAR_CATEGORIES } from '@/types';

interface SidebarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

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
    <aside className="w-64 flex flex-col border-r-2 border-black bg-white overflow-y-auto flex-shrink-0">
      <div className="p-6">
        {/* Month Picker Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-black uppercase tracking-tight">
            {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate)}
          </h2>
          <div className="flex gap-1">
            <button className="p-1 border-2 border-black hover:bg-black hover:text-white brutal-transition">
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button className="p-1 border-2 border-black hover:bg-black hover:text-white brutal-transition">
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-fg-muted uppercase tracking-widest mb-3">
          <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 text-center text-sm mb-8">
          {prevMonthFiller.map((day) => (
            <span key={`prev-${day}`} className="p-1 text-fg-subtle/50 font-medium">{day}</span>
          ))}

          {currentDays.map((day) => {
            const selected = isSelected(day);
            const today = isToday(day);
            return (
              <button
                key={`curr-${day}`}
                onClick={() => onDateChange(new Date(year, month, day))}
                className={`p-1 w-8 h-8 flex items-center justify-center mx-auto brutal-transition font-bold border-2
                  ${selected
                    ? 'bg-black text-white border-black'
                    : today
                      ? 'text-black border-black bg-white'
                      : 'border-transparent hover:border-black text-fg-muted hover:text-black'
                  }
                `}
              >
                {day}
              </button>
            );
          })}

          {nextMonthFiller.map((day) => (
            <span key={`next-${day}`} className="p-1 text-fg-subtle/50 font-medium">{day}</span>
          ))}
        </div>

        {/* Calendars List */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-1 border-b-2 border-black pb-3">
            <h3 className="text-[11px] font-bold text-black uppercase tracking-[0.15em]">My Calendars</h3>
            <button className="material-symbols-outlined text-black text-[20px] hover:scale-110 brutal-bounce">add</button>
          </div>
          <div className="space-y-2">
            {CALENDAR_CATEGORIES.map((cat) => (
              <div key={cat.id} className="flex items-center space-x-3 px-3 py-2 border-2 border-transparent cursor-pointer group hover:border-black brutal-transition">
                <div className={`w-3 h-3 border-2 border-black ${cat.color}`} />
                <span className="text-sm font-bold text-fg-muted group-hover:text-black brutal-transition">{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
