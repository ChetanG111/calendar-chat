"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CalendarCategory, getThemeForColor } from '@/types';
import { motion, AnimatePresence, LayoutGroup, Variants } from 'framer-motion';

interface SidebarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  calendars: CalendarCategory[];
  onAddCalendar: (data: { label: string; colorName: string }) => void;
  onUpdateCalendar: (id: string, updates: Partial<CalendarCategory>) => void;
  onDeleteCalendar: (id: string) => void;
  onToggleCalendar: (id: string) => void;
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

const popupVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -5, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: "spring",
      bounce: 0,
      duration: 0.2, // Fast container expand
      staggerChildren: 0.015, // Almost simultaneous "pop"
      delayChildren: 0.01
    }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -5,
    filter: 'blur(4px)',
    transition: { duration: 0.05 }
  }
};

const colorItemVariants: Variants = {
  hidden: { opacity: 0, scale: 0, y: 15 }, // Start smaller and lower
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 600, // Much snappier
      damping: 20,
      mass: 0.6
    }
  }
};

const AVAILABLE_COLORS = [
  'blue', 'red', 'orange', 'green', 'purple', 'pink', 'yellow', 'cyan', 'gray', 'indigo'
];

const Sidebar: React.FC<SidebarProps> = ({
  currentDate,
  onDateChange,
  calendars,
  onAddCalendar,
  onUpdateCalendar,
  onDeleteCalendar,
  onToggleCalendar
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Mini Calendar Logic
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const prevMonthDays = new Date(year, month, 0).getDate();
  const prevMonthFiller = Array.from({ length: firstDayOfMonth }, (_, i) => prevMonthDays - firstDayOfMonth + i + 1);
  const currentDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
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

  // Calendar Management State
  const [isAdding, setIsAdding] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [openColorMenuId, setOpenColorMenuId] = useState<string | null>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const [hoveredCalendarId, setHoveredCalendarId] = useState<string | null>(null);

  // Compute used colors reactively
  const usedColors = useMemo(() => new Set(calendars.map(c => c.colorName)), [calendars]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(event.target as Node)) {
        setOpenColorMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCalendarName.trim()) {
      // Find a random UNUSED color if possible
      const unusedColors = AVAILABLE_COLORS.filter(c => !usedColors.has(c));
      const pool = unusedColors.length > 0 ? unusedColors : AVAILABLE_COLORS;
      const randomColor = pool[Math.floor(Math.random() * pool.length)];

      onAddCalendar({ label: newCalendarName.trim(), colorName: randomColor });
      setNewCalendarName('');
      setIsAdding(false);
    }
  };

  const handleEditSubmit = (id: string) => {
    if (editName.trim()) {
      onUpdateCalendar(id, { label: editName.trim() });
    }
    setEditingId(null);
  };

  return (
    <motion.aside
      className="w-64 flex flex-col border-r border-border-dark bg-surface-dark overflow-y-auto flex-shrink-0"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="p-4">
        {/* Days Header */}
        <motion.div variants={itemVariants} className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-2 select-none">
          <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
        </motion.div>

        {/* Calendar Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-7 gap-1 text-center text-sm mb-6 select-none">
          {prevMonthFiller.map((day) => (
            <span key={`prev-${day}`} className="p-1 text-zinc-600">{day}</span>
          ))}

          {currentDays.map((day) => {
            const selected = isSelected(day);
            const today = isToday(day);
            return (
              <motion.button
                key={`curr-${day}`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onDateChange(new Date(year, month, day))}
                className={`relative p-1 rounded-full w-8 h-8 flex items-center justify-center mx-auto transition-colors z-0
                  ${selected ? 'text-white' : 'text-gray-300'}
                  ${today && !selected ? 'text-primary font-bold' : ''}
                `}
              >
                {selected && (
                  <motion.div
                    layoutId="active-day-indicator"
                    className="absolute inset-0 bg-primary rounded-full -z-10"
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
          <motion.div variants={itemVariants} className="flex justify-between items-center group/header">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">My Calendars</h3>
            <motion.button
              onClick={() => setIsAdding(true)}
              whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
              whileTap={{ scale: 0.9 }}
              className="w-5 h-5 flex items-center justify-center rounded text-gray-500 cursor-pointer"
            >
              <span className="material-icons text-[16px]">add</span>
            </motion.button>
          </motion.div>

          <LayoutGroup>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-1 relative"
              onMouseLeave={() => setHoveredCalendarId(null)}
            >
              <AnimatePresence mode='popLayout'>
                {calendars.map((cat, index) => (
                  <motion.div
                    key={cat.id}
                    layout
                    variants={itemVariants}
                    custom={index}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                    className="relative flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer group"
                    onMouseEnter={() => setHoveredCalendarId(cat.id)}
                  >
                    {/* Hover Background - iOS style */}
                    {hoveredCalendarId === cat.id && (
                      <motion.div
                        layoutId="calendar-hover-bg"
                        className="absolute inset-0 bg-white/5 rounded-lg -z-10"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}

                    <div className="flex items-center space-x-3 flex-1 min-w-0 z-10">
                      {/* Checkbox */}
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onToggleCalendar(cat.id)}
                        className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shadow-sm transition-colors ${cat.checked ? cat.theme.bg.split('/')[0].replace('bg-', 'bg-').replace('20', '500') + ' border-transparent' : 'border-gray-600 hover:border-gray-500'}`}
                      >
                        <AnimatePresence>
                          {cat.checked && (
                            <motion.span
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              className="material-icons text-white text-[10px] font-bold"
                            >
                              check
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      {/* Label or Edit Input */}
                      {editingId === cat.id ? (
                        <input
                          autoFocus
                          className="bg-transparent border-b border-primary text-sm text-white focus:outline-none w-full pb-0.5"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={() => handleEditSubmit(cat.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSubmit(cat.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                      ) : (
                        <span
                          onClick={() => onToggleCalendar(cat.id)}
                          onDoubleClick={() => {
                            if (!cat.isDefault) {
                              setEditingId(cat.id);
                              setEditName(cat.label);
                            }
                          }}
                          className={`text-sm text-gray-300 transition-colors truncate select-none flex-1 ${cat.isDefault ? 'font-medium cursor-default' : 'cursor-pointer'}`}
                        >
                          {cat.label}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                      <motion.button
                        layout
                        whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); setOpenColorMenuId(cat.id); }}
                        className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white transition-colors"
                        title="Change color"
                      >
                        <span className="material-icons text-[16px]">palette</span>
                      </motion.button>
                      
                      {!cat.isDefault && (
                        <motion.button
                          layout
                          whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.1)" }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(cat.id);
                            setEditName(cat.label);
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-white transition-colors"
                          title="Rename calendar"
                        >
                          <span className="material-icons text-[16px]">edit</span>
                        </motion.button>
                      )}

                      {!cat.isDefault && (
                        <motion.button
                          layout
                          whileHover={{ scale: 1.1, backgroundColor: "rgba(255,68,68,0.15)" }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => { e.stopPropagation(); onDeleteCalendar(cat.id); }}
                          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete calendar"
                        >
                          <span className="material-icons text-[16px]">delete</span>
                        </motion.button>
                      )}
                    </div>

                    {/* Color Picker Dropdown */}
                    <AnimatePresence>
                      {openColorMenuId === cat.id && (
                        <motion.div
                          ref={colorMenuRef}
                          variants={popupVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="absolute right-0 top-8 z-50 bg-[#1e1e1e]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-3 w-[160px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="grid grid-cols-5 gap-2">
                            {AVAILABLE_COLORS.map(color => {
                              // A color is "used" if ANOTHER calendar has it.
                              // This allows the current calendar to keep its own color while blocking others.
                              const usingCalendar = calendars.find(c => c.colorName === color && c.id !== cat.id);
                              const isUsedByOther = !!usingCalendar;
                              const isSelected = cat.colorName === color;

                              return (
                                <motion.button
                                  key={color}
                                  variants={colorItemVariants}
                                  whileHover={!isUsedByOther ? { scale: 1.2, zIndex: 10 } : {}}
                                  whileTap={!isUsedByOther ? { scale: 0.8 } : {}}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isUsedByOther) {
                                      onUpdateCalendar(cat.id, { colorName: color });
                                      setOpenColorMenuId(null);
                                    }
                                  }}
                                  title={isUsedByOther ? `Used by ${usingCalendar?.label}` : color}
                                  className={`relative w-6 h-6 rounded-full flex items-center justify-center transition-all
                                    ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1e1e1e]' : ''}
                                    ${isUsedByOther ? 'opacity-20 cursor-not-allowed grayscale' : 'cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-white/20'}
                                  `}
                                >
                                  <div className={`w-full h-full rounded-full bg-${color}-500 shadow-sm`}></div>
                                  {isUsedByOther && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <span className="material-icons text-[10px] text-white/50">block</span>
                                    </div>
                                  )}
                                </motion.button>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </LayoutGroup>

          {/* Add New Input */}
          <AnimatePresence>
            {isAdding && (
              <motion.form
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                onSubmit={handleAddSubmit}
                className="flex items-center space-x-3 px-3 py-1 overflow-hidden"
              >
                <div className="w-4 h-4 rounded-[4px] border border-gray-600 flex-shrink-0"></div>
                <input
                  autoFocus
                  placeholder="New Calendar"
                  className="bg-transparent border-b border-primary text-sm text-white focus:outline-none w-full pb-0.5"
                  value={newCalendarName}
                  onChange={(e) => setNewCalendarName(e.target.value)}
                  onBlur={() => !newCalendarName && setIsAdding(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsAdding(false);
                  }}
                />
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;