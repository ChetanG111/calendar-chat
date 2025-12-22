"use client";

import React, { useState, useEffect, useRef } from 'react';
import { CalendarEvent, CalendarCategory, CalendarTheme } from '@/types';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import TimePicker from './TimePicker';

export type EventPanelMode = 'view' | 'edit' | 'create';

interface EventPanelProps {
    isOpen: boolean;
    mode: EventPanelMode;
    event?: CalendarEvent;
    initialData?: Partial<CalendarEvent>;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onSave: (event: Partial<CalendarEvent>) => void;
    calendars?: CalendarCategory[];
}

const containerVariants: Variants = {
    hidden: {
        x: 480,
        opacity: 0,
        scale: 0.95,
        filter: "blur(10px)"
    },
    visible: {
        x: 0,
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        transition: {
            type: "spring",
            damping: 28,
            stiffness: 300,
            mass: 0.8,
            staggerChildren: 0.05,
            delayChildren: 0.1
        }
    },
    exit: {
        x: 100,
        opacity: 0,
        scale: 0.95,
        filter: "blur(10px)",
        transition: {
            duration: 0.2,
            ease: "anticipate"
        }
    }
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 400,
            damping: 25
        }
    }
};

const defaultTheme: CalendarTheme = {
    primary: 'blue',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500',
    text: 'text-blue-100',
    dot: 'bg-blue-500',
    hover: 'hover:bg-blue-500/30',
    solidBg: 'bg-blue-500'
};

const EventPanel: React.FC<EventPanelProps> = ({
    isOpen,
    mode,
    event,
    initialData,
    onClose,
    onEdit,
    onDelete,
    onSave,
    calendars = []
}) => {
    // ----------------------------------------------------------------------
    // Form State (for Edit/Create modes)
    // ----------------------------------------------------------------------
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [eventType, setEventType] = useState<string>('default');
    const [isAllDay, setIsAllDay] = useState(false);

    // Dropdown state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Initialize form data when opening in Create/Edit mode
    useEffect(() => {
        if (!isOpen) {
            setIsDropdownOpen(false);
            return;
        }

        // If viewing, we don't necessarily need to reset form state, 
        // but if we switch to edit, we want it populated.
        // We'll populate based on the current 'event' or 'initialData' logic.
        
        const targetEvent = mode === 'edit' ? event : undefined;
        // If create mode, use initialData.
        
        if (targetEvent) {
            setTitle(targetEvent.title);
            setDescription(targetEvent.description || '');
            setLocation(targetEvent.location || '');
            setEventType(targetEvent.type);
            setStartTime(targetEvent.start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
            setEndTime(targetEvent.end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
            setStartDate(targetEvent.startDate || targetEvent.start.toISOString().split('T')[0]);
            setEndDate(targetEvent.endDate || targetEvent.end.toISOString().split('T')[0]);
            setIsAllDay(targetEvent.isAllDay || false);
        } else if (mode === 'create') {
            const data = initialData || {};
            const now = new Date();
            
            // Default times
            const defaultStart = new Date(now);
            const defaultEnd = new Date(defaultStart);
            defaultEnd.setHours(defaultStart.getHours() + 1);
            
            const formatTime = (date: Date) => date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

            setTitle(data.title || '');
            setDescription(data.description || '');
            setLocation(data.location || '');
            
            // Calendar Type
            setEventType(data.type || (calendars.length > 0 ? (calendars.find(c => c.isDefault)?.id || calendars[0].id) : 'default'));

            // Start/End Logic
            if (data.start) {
                setStartTime(formatTime(data.start));
                setStartDate(data.startDate || data.start.toISOString().split('T')[0]);
            } else {
                setStartTime(formatTime(defaultStart));
                setStartDate(now.toISOString().split('T')[0]);
            }

            if (data.end) {
                setEndTime(formatTime(data.end));
                setEndDate(data.endDate || data.end.toISOString().split('T')[0]);
            } else {
                setEndTime(formatTime(defaultEnd));
                setEndDate(now.toISOString().split('T')[0]);
            }

            setIsAllDay(data.isAllDay || false);
        }
    }, [isOpen, mode, event, initialData, calendars]);


    // Handle click outside dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        if (isDropdownOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);


    const handleFormSave = () => {
        // Construct dates
        const baseStartDate = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
        const baseEndDate = endDate ? new Date(`${endDate}T00:00:00`) : baseStartDate;

        let start = new Date(baseStartDate);
        let end = new Date(baseEndDate);

        if (isAllDay) {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else {
            const [startH, startM] = startTime.split(':').map(Number);
            const [endH, endM] = endTime.split(':').map(Number);
            start.setHours(startH || 0, startM || 0, 0, 0);
            end.setHours(endH || 0, endM || 0, 0, 0);

            if (end < start) {
                end.setDate(end.getDate() + 1);
            }
        }

        onSave({
            title: title || '(No title)',
            start,
            end,
            startDate: startDate || start.toISOString().split('T')[0],
            endDate: endDate || end.toISOString().split('T')[0],
            description,
            location,
            type: eventType,
            isAllDay: isAllDay
        });
    };

    // ----------------------------------------------------------------------
    // Render Helpers
    // ----------------------------------------------------------------------
    const selectedCalendar = calendars.find(c => c.id === eventType) || calendars[0];
    const viewTheme = event ? (calendars?.find(c => c.id === event.type)?.theme || defaultTheme) : defaultTheme;

    if (!isOpen) return null;

    // View Mode Content
    const renderViewMode = () => {
        if (!event) return null;
        const durationMinutes = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
        const hours = Math.floor(durationMinutes / 60);
        const mins = durationMinutes % 60;
        const durationString = `${hours > 0 ? `${hours} h ` : ''}${mins > 0 ? `${mins} min` : ''}`;

        return (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 pt-2 flex flex-col gap-5">
                    {/* Title */}
                    <motion.div variants={itemVariants} className="flex gap-4 items-start">
                        {event.end >= new Date() && (
                            <div className={`w-4 h-4 rounded mt-1.5 flex-shrink-0 ${viewTheme.bg} ${viewTheme.border} border`}></div>
                        )}
                        <div className="flex-1">
                            <h2 className="text-[22px] leading-tight font-normal text-[#e8eaed]">{event.title}</h2>
                            <div className="text-sm text-[#9aa0a6] mt-1">
                                {event.start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                        </div>
                    </motion.div>

                    {/* Time */}
                    <motion.div variants={itemVariants} className="flex gap-4 items-start">
                        <div className="w-8 flex justify-center text-[#9aa0a6]">
                            <span className="material-symbols-outlined text-[20px]">schedule</span>
                        </div>
                        <div className="flex-1">
                            <div className="text-sm text-[#e8eaed]">
                                {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {'\u2192'} {event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                <span className="text-[#9aa0a6] ml-2">{durationString}</span>
                            </div>
                            <div className="text-xs text-[#9aa0a6] mt-1">Time zone • Repeat</div>
                        </div>
                    </motion.div>

                    {/* Creator */}
                    <motion.div variants={itemVariants} className="flex gap-4 items-start">
                        <div className="w-8 flex justify-center text-[#9aa0a6]">
                            <span className="material-symbols-outlined text-[20px]">person</span>
                        </div>
                        <div className="flex-1">
                            <div className="text-sm text-[#e8eaed]">Created by <span className="text-[#9aa0a6]">you</span></div>
                        </div>
                    </motion.div>

                    {/* Location */}
                    {event.location && (
                        <motion.div variants={itemVariants} className="flex gap-4 items-start">
                            <div className="w-8 flex justify-center text-[#9aa0a6]">
                                <span className="material-symbols-outlined text-[20px]">location_on</span>
                            </div>
                            <div className="flex-1">
                                <div className="text-sm text-blue-400 hover:underline cursor-pointer">{event.location}</div>
                            </div>
                        </motion.div>
                    )}

                    {/* Description */}
                    <motion.div variants={itemVariants} className="flex gap-4 items-start">
                        <div className="w-8 flex justify-center text-[#9aa0a6]">
                            <span className="material-symbols-outlined text-[20px]">subject</span>
                        </div>
                        <div className="flex-1">
                            <div className="text-sm text-[#e8eaed] whitespace-pre-wrap">
                                {event.description || <span className="text-[#9aa0a6] italic">No description</span>}
                            </div>
                        </div>
                    </motion.div>

                    {/* Footer Calendar Info */}
                    <motion.div variants={itemVariants} className="flex gap-4 items-center pt-2">
                        <div className="w-8 flex justify-center text-[#9aa0a6]">
                            <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                        </div>
                        <div className="flex-1 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${viewTheme.dot}`}></div>
                                <span className="text-sm text-[#e8eaed] capitalize">{calendars?.find(c => c.id === event.type)?.label || event.type}</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    };

    // Edit/Create Mode Content
    const renderEditMode = () => {
        return (
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-6 pt-2 flex flex-col gap-5">
                    
                    {/* Title Input */}
                    <motion.div variants={itemVariants} className="ml-10">
                        <input
                            autoFocus
                            className="w-full bg-transparent focus:bg-[#303134]/50 border-0 px-2 py-1.5 rounded-md text-[20px] text-[#e8eaed] focus:ring-0 placeholder-[#9aa0a6] font-normal leading-tight transition-all duration-200 outline-none"
                            placeholder="Title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </motion.div>

                    {/* Date & Time */}
                    <motion.div variants={itemVariants} className="flex gap-5 items-start">
                        <div className="w-6 flex justify-center mt-1">
                            <span className="material-symbols-outlined text-[#9aa0a6] text-[22px]">schedule</span>
                        </div>
                        <div className="flex-1 flex flex-col gap-2">
                            <div className="flex flex-col gap-1 text-[#e8eaed] text-sm">
                                {/* Start Date/Time */}
                                <div className="flex items-center gap-3">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="bg-transparent text-[#e8eaed] text-sm border-0 border-b border-transparent focus:border-blue-500 focus:ring-0 px-0 py-1 transition-colors w-[120px] font-medium"
                                    />

                                    {!isAllDay && (
                                        <div className="relative">
                                            <TimePicker
                                                value={startTime}
                                                onChange={setStartTime}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Arrow */}
                                <div className="flex items-center pl-[50px]">
                                    <span className="material-symbols-outlined text-[#9aa0a6] text-[20px]">arrow_downward</span>
                                </div>

                                {/* End Date/Time */}
                                <div className="flex items-center gap-3">
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="bg-transparent text-[#e8eaed] text-sm border-0 border-b border-transparent focus:border-blue-500 focus:ring-0 px-0 py-1 transition-colors w-[120px] font-medium"
                                    />

                                    {!isAllDay && (
                                        <div className="relative">
                                            <TimePicker
                                                value={endTime}
                                                onChange={setEndTime}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-3 mt-1 text-xs text-[#9aa0a6]">
                                <button
                                    type="button"
                                    onClick={() => setIsAllDay(!isAllDay)}
                                    className={`px-2 py-1 -ml-2 rounded transition-colors text-left font-medium ${isAllDay ? 'bg-blue-500/20 text-blue-200' : 'hover:bg-[#303134] text-[#9aa0a6]'}`}
                                >
                                    All-day
                                </button>
                                <button className="hover:bg-[#303134] px-2 py-1 rounded transition-colors text-left font-medium">Repeat</button>
                            </div>
                        </div>
                    </motion.div>

                    {/* Location */}
                    <motion.div variants={itemVariants} className="flex gap-5 items-start">
                        <div className="w-6 flex justify-center mt-1">
                            <span className="material-symbols-outlined text-[#9aa0a6] text-[22px]">location_on</span>
                        </div>
                        <div className="flex-1">
                            <input
                                className="w-full bg-[#303134]/20 focus:bg-[#303134]/60 border border-zinc-700/30 hover:border-zinc-600/60 rounded-lg px-4 py-2 text-sm text-[#e8eaed] placeholder-[#9aa0a6]/70 focus:ring-0 transition-all duration-200 outline-none"
                                placeholder="Add location"
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                            />
                        </div>
                    </motion.div>

                    {/* Description */}
                    <motion.div variants={itemVariants} className="flex gap-5 items-start">
                        <div className="w-6 flex justify-center mt-1">
                            <span className="material-symbols-outlined text-[#9aa0a6] text-[22px]">segment</span>
                        </div>
                        <div className="flex-1">
                            <textarea
                                className="w-full bg-[#303134]/20 focus:bg-[#303134]/60 border border-zinc-700/30 hover:border-zinc-600/60 rounded-lg px-4 py-3 text-sm text-[#e8eaed] placeholder-[#9aa0a6]/70 focus:ring-0 resize-none transition-all duration-200 outline-none"
                                placeholder="Add description"
                                rows={4}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            ></textarea>
                        </div>
                    </motion.div>

                    {/* Calendar Select */}
                    <motion.div variants={itemVariants} className="flex gap-5 items-start pt-4 mt-2 border-t border-[#3c4043]">
                        <div className="w-6 flex justify-center mt-1">
                            <span className="material-symbols-outlined text-[#9aa0a6] text-[22px]">calendar_today</span>
                        </div>
                        <div className="flex-1 flex flex-col gap-3">
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="flex items-center gap-2 hover:bg-[#303134] px-3 py-1.5 -ml-3 rounded transition-colors group/cal cursor-pointer outline-none w-full text-left"
                                >
                                    <div className={`w-3.5 h-3.5 rounded-full ${selectedCalendar?.theme?.solidBg || 'bg-blue-500'}`}></div>
                                    <span className="text-[#e8eaed] text-sm font-medium">
                                        {selectedCalendar?.label || 'Calendar'}
                                    </span>
                                    <span className={`material-symbols-outlined text-[#9aa0a6] text-[20px] transition-transform duration-200 ml-auto ${isDropdownOpen ? 'rotate-180' : ''}`}>
                                        arrow_drop_down
                                    </span>
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute bottom-full left-0 mb-1 w-56 bg-[#202124] border border-[#5f6368] rounded-lg shadow-xl z-[70] overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-100 origin-bottom-left">
                                        {calendars.map((option) => (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => {
                                                    setEventType(option.id);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm transition-colors
                                                    ${eventType === option.id ? 'bg-[#1967d2] text-white' : 'text-[#e8eaed] hover:bg-[#3c4043]'}
                                                `}
                                            >
                                                <div className={`w-2.5 h-2.5 rounded-full ${option.theme.solidBg} ${eventType === option.id ? 'ring-2 ring-white/50' : ''}`}></div>
                                                <span className="flex-1 truncate">{option.label}</span>
                                                {eventType === option.id && (
                                                    <span className="material-symbols-outlined text-[18px]">check</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Footer Actions */}
                    <div className="flex justify-end pt-4 gap-3">
                        {mode === 'edit' && (
                             <button onClick={onClose} className="px-5 py-2.5 rounded text-sm font-medium text-[#e8eaed] hover:bg-[#303134] transition-colors">Cancel</button>
                        )}
                        <button onClick={handleFormSave} className="px-8 py-2.5 rounded text-sm font-medium bg-primary text-white hover:brightness-110 transition-colors shadow-lg font-semibold tracking-wide">
                            Save
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={(e) => e.stopPropagation()}
                    className="fixed right-6 top-20 bottom-6 w-[420px] bg-[#202124]/90 backdrop-blur-xl rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.75)] border border-white/10 font-sans text-[#e8eaed] z-[60] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex-none flex items-center justify-between px-4 py-3 bg-transparent border-b border-white/10">
                        <motion.div variants={itemVariants} className="flex items-center gap-1 text-sm text-[#9aa0a6] px-2 py-1">
                            <span className="material-symbols-outlined text-[18px]">
                                {mode === 'view' ? 'event' : (mode === 'edit' ? 'edit_calendar' : 'add_circle')}
                            </span>
                            <span className="font-medium capitalize">{mode === 'create' ? 'New Event' : (mode === 'edit' ? 'Edit Event' : 'Event')}</span>
                        </motion.div>
                        <motion.div variants={itemVariants} className="flex items-center gap-1">
                            {mode === 'view' && (
                                <>
                                    <button onClick={onEdit} className="w-8 h-8 flex items-center justify-center text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-white/10 rounded-full transition-colors" title="Edit event">
                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                    </button>
                                    <button onClick={onDelete} className="w-8 h-8 flex items-center justify-center text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-white/10 rounded-full transition-colors" title="Delete event">
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                    <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
                                </>
                            )}
                            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-white/10 rounded-full transition-colors" title="Close">
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </motion.div>
                    </div>

                    {mode === 'view' ? renderViewMode() : renderEditMode()}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default EventPanel;