import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CalendarEvent, CalendarCategory } from '@/types';
import { itemVariants, contentContainerVariants } from './animations';
import TimePicker from '../TimePicker';
import DatePicker from '../DatePicker';
import { Button } from '@/components/animate-ui/components/buttons/button';

interface EditEventProps {
    event?: CalendarEvent;
    initialData?: Partial<CalendarEvent>;
    mode: 'edit' | 'create';
    calendars?: CalendarCategory[];
    onClose: () => void;
    onSave: (event: Partial<CalendarEvent>) => void;
}

export const EditEvent: React.FC<EditEventProps> = ({
    event,
    initialData,
    mode,
    calendars = [],
    onClose,
    onSave,
}) => {
    // ----------------------------------------------------------------------
    // Form State
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

    // Initialize form data
    useEffect(() => {
        const targetEvent = mode === 'edit' ? event : undefined;
        
        const formatDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        if (targetEvent) {
            setTitle(targetEvent.title);
            setDescription(targetEvent.description || '');
            setLocation(targetEvent.location || '');
            setEventType(targetEvent.type);
            setStartTime(targetEvent.start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
            setEndTime(targetEvent.end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
            setStartDate(targetEvent.startDate || formatDate(targetEvent.start));
            setEndDate(targetEvent.endDate || formatDate(targetEvent.end));
            setIsAllDay(targetEvent.isAllDay || false);
        } else if (mode === 'create') {
            const data = initialData || {};
            const now = new Date();

            const defaultStart = new Date(now);
            const defaultEnd = new Date(defaultStart);
            defaultEnd.setHours(defaultStart.getHours() + 1);

            const formatTime = (date: Date) => date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

            setTitle(data.title || '');
            setDescription(data.description || '');
            setLocation(data.location || '');
            // Do not set event type here based on calendars to avoid reset
            
            if (data.start) {
                setStartTime(formatTime(data.start));
                setStartDate(data.startDate || formatDate(data.start));
            } else {
                setStartTime(formatTime(defaultStart));
                setStartDate(formatDate(now));
            }

            if (data.end) {
                setEndTime(formatTime(data.end));
                setEndDate(data.endDate || formatDate(data.end));
            } else {
                setEndTime(formatTime(defaultEnd));
                setEndDate(formatDate(now));
            }

            setIsAllDay(data.isAllDay || false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, event, initialData]);

    // Separate effect to set default calendar when they load
    useEffect(() => {
        if (mode === 'create' && eventType === 'default' && calendars.length > 0) {
             setEventType(calendars.find(c => c.isDefault)?.id || calendars[0].id);
        }
    }, [calendars, mode, eventType]);

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
        const baseStartDate = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
        const baseEndDate = endDate ? new Date(`${endDate}T00:00:00`) : baseStartDate;

        const start = new Date(baseStartDate);
        const end = new Date(baseEndDate);

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

    const selectedCalendar = calendars.find(c => c.id === eventType) || calendars[0];

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <motion.div variants={contentContainerVariants} className="p-6 pt-2 flex flex-col gap-5">

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
                                <DatePicker
                                    value={startDate}
                                    onChange={setStartDate}
                                    placeholder="Start date"
                                    className="w-[140px]"
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
                                <DatePicker
                                    value={endDate}
                                    onChange={setEndDate}
                                    placeholder="End date"
                                    className="w-[140px]"
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
                <motion.div variants={itemVariants} className="flex justify-end pt-4 gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded text-sm font-medium text-[#e8eaed] hover:bg-[#303134] transition-colors">Cancel</button>
                    <Button
                        onClick={handleFormSave}
                        className="px-8 py-2.5 rounded text-sm font-medium bg-primary text-white hover:brightness-110 transition-colors shadow-lg font-semibold tracking-wide border-0"
                        hoverScale={1.02}
                        tapScale={0.98}
                    >
                        Save
                    </Button>
                </motion.div>
            </motion.div>
        </div>
    );
};