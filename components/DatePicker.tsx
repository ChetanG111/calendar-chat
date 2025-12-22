"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { ChevronLeft } from '@/components/animate-ui/icons/chevron-left';
import { ChevronRight } from '@/components/animate-ui/icons/chevron-right';

interface DatePickerProps {
    value: string;
    onChange: (date: string) => void;
    placeholder?: string;
    className?: string;
}

const popupVariants: Variants = {
    hidden: {
        opacity: 0,
        y: -10,
        scale: 0.95,
        filter: 'blur(4px)',
        transformOrigin: "top left"
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 25,
            mass: 0.8
        }
    },
    exit: {
        opacity: 0,
        y: -10,
        scale: 0.95,
        filter: 'blur(4px)',
        transition: { duration: 0.15 }
    }
};

const dayVariants: Variants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: (i: number) => ({
        opacity: 1,
        scale: 1,
        transition: {
            delay: i * 0.005, // Very fast stagger
            type: "spring",
            stiffness: 600,
            damping: 25
        }
    })
};

export default function DatePicker({ value, onChange, placeholder = "Select date", className = "" }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Date Logic
    // value is YYYY-MM-DD string
    const dateValue = value ? new Date(value + 'T00:00:00') : null; // Append time to force local if needed, but best is split
    // Actually safer parsing:
    const parseDate = (str: string) => {
        if (!str) return null;
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const selectedDate = parseDate(value);

    // View state (what month we are looking at)
    const [viewDate, setViewDate] = useState(selectedDate || new Date());

    useEffect(() => {
        if (isOpen && value) {
            const date = parseDate(value);
            if (date) setViewDate(date);
        }
    }, [isOpen, value]); // value is string, simplified dependency

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDateClick = (d: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
        // Format to YYYY-MM-DD
        const y = newDate.getFullYear();
        const m = String(newDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(newDate.getDate()).padStart(2, '0');
        onChange(`${y}-${m}-${dayStr}`);
        setIsOpen(false);
    };

    const handleToday = () => {
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const dayStr = String(today.getDate()).padStart(2, '0');
        onChange(`${y}-${m}-${dayStr}`);
        setViewDate(today);
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange('');
        setIsOpen(false);
    };

    // Calendar Grid Generation
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0-6 Sun-Sat
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Fillers
    const prevFillers = Array.from({ length: firstDayOfMonth }, (_, i) => ({
        day: prevMonthDays - firstDayOfMonth + i + 1,
        type: 'prev'
    }));

    const currentDays = Array.from({ length: daysInMonth }, (_, i) => ({
        day: i + 1,
        type: 'current'
    }));

    const remaining = 42 - (prevFillers.length + currentDays.length);
    const nextFillers = Array.from({ length: remaining }, (_, i) => ({
        day: i + 1,
        type: 'next'
    }));

    const displayDate = selectedDate
        ? selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : placeholder;

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="bg-transparent text-[#e8eaed] text-sm border-0 border-b border-transparent focus:border-blue-500 hover:bg-white/5 focus:ring-0 px-2 py-1 transition-all rounded-sm flex items-center gap-2 font-medium min-w-[120px]"
            >
                <span className="material-symbols-outlined text-gray-400 text-[18px]">calendar_today</span>
                <span>{displayDate}</span>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        variants={popupVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute top-full left-0 mt-2 z-[100] bg-[#202124] border border-[#5f6368] rounded-xl shadow-2xl p-4 w-[300px]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <span className="font-semibold text-[#e8eaed] text-base">
                                {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handlePrevMonth}
                                    className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    onClick={handleNextMonth}
                                    className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Days Header */}
                        <div className="grid grid-cols-7 mb-2">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                <div key={d} className="text-center text-xs font-medium text-gray-500 py-1">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {/* Prev Month */}
                            {prevFillers.map((item, i) => (
                                <div key={`prev-${i}`} className="h-9 flex items-center justify-center text-sm text-gray-600 select-none">
                                    {item.day}
                                </div>
                            ))}

                            {/* Current Month */}
                            {currentDays.map((item, i) => {
                                const isSelected = selectedDate &&
                                    selectedDate.getDate() === item.day &&
                                    selectedDate.getMonth() === month &&
                                    selectedDate.getFullYear() === year;

                                const isToday = !isSelected && // Only show today circle if not selected
                                    new Date().getDate() === item.day &&
                                    new Date().getMonth() === month &&
                                    new Date().getFullYear() === year;

                                return (
                                    <motion.button
                                        key={`curr-${item.day}`}
                                        custom={i}
                                        variants={dayVariants}
                                        initial="hidden"
                                        animate="visible"
                                        whileHover={{ scale: 1.1, backgroundColor: isSelected ? '#1a73e8' : 'rgba(255,255,255,0.1)' }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleDateClick(item.day)}
                                        className={`
                                            h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors relative
                                            ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'text-[#e8eaed]'}
                                            ${isToday ? 'text-blue-400 font-bold bg-blue-400/10' : ''}
                                        `}
                                    >
                                        {item.day}
                                    </motion.button>
                                );
                            })}

                            {/* Next Month */}
                            {nextFillers.map((item, i) => (
                                <div key={`next-${i}`} className="h-9 flex items-center justify-center text-sm text-gray-600 select-none">
                                    {item.day}
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/10">
                            <button
                                onClick={handleClear}
                                className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium px-2 py-1 rounded hover:bg-blue-400/10"
                            >
                                Clear
                            </button>
                            <button
                                onClick={handleToday}
                                className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium px-2 py-1 rounded hover:bg-blue-400/10"
                            >
                                Today
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
