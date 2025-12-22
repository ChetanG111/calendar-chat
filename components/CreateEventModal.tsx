"use client";

import React, { useState, useEffect, useRef } from 'react';
import { CalendarEvent, CalendarCategory } from '@/types';
import TimePicker from './TimePicker';

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: Partial<CalendarEvent>) => void;
    defaultDate?: Date;
    event?: CalendarEvent;
    initialData?: Partial<CalendarEvent>;
    calendars?: CalendarCategory[];
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose, onSave, defaultDate, event, initialData, calendars = [] }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('10:45');
    // Default to first calendar or personal or whatever is available
    const [eventType, setEventType] = useState<string>('personal');
    const [isAllDay, setIsAllDay] = useState(false);

    // Dragging state
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ x: number, y: number } | null>(null);

    // Dropdown state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle click outside dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    // Animation state
    const [isAnimating, setIsAnimating] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    // Handle open/close animations
    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            // Small delay to trigger enter animation
            setTimeout(() => setIsAnimating(true), 10);
        } else {
            setIsAnimating(false);
            // Wait for exit animation to complete before unmounting
            const timer = setTimeout(() => setShouldRender(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Reset position and populate form when modal opens
    useEffect(() => {
        if (isOpen) {
            setIsDropdownOpen(false);
            setPosition({ x: 0, y: 0 }); // Reset position on open

            if (event) {
                setTitle(event.title);
                setDescription(event.description || '');
                setLocation(event.location || '');
                setEventType(event.type);
                setStartTime(event.start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
                setEndTime(event.end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
                setIsAllDay(event.isAllDay || false);
            } else {
                // Initial data or defaults
                const data = initialData || {};

                setTitle(data.title || '');
                setDescription(data.description || '');
                setLocation(data.location || '');
                // Default to a valid calendar ID or 'personal'
                setEventType(data.type || (calendars.length > 0 ? calendars[0].id : 'personal'));

                // If initialData has start/end, use them
                if (data.start) {
                    setStartTime(data.start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
                } else {
                    setStartTime('10:00');
                }

                if (data.end) {
                    setEndTime(data.end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
                } else {
                    setEndTime('10:45');
                }

                setIsAllDay(data.isAllDay || false);
            }
        }
    }, [event, isOpen, defaultDate, initialData, calendars]);

    // Drag Handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        // Prevent dragging when clicking buttons/inputs inside the header
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
            return;
        }

        setIsDragging(true);
        dragStartRef.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !dragStartRef.current) return;

            e.preventDefault(); // Prevent text selection
            const newX = e.clientX - dragStartRef.current.x;
            const newY = e.clientY - dragStartRef.current.y;

            setPosition({ x: newX, y: newY });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    if (!shouldRender) return null;

    const handleSave = () => {
        // Basic date construction logic
        const baseDate = event ? event.start : (defaultDate || new Date());

        let start = new Date(baseDate);
        let end = new Date(baseDate);

        if (isAllDay) {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else {
            const [startH, startM] = startTime.split(':').map(Number);
            const [endH, endM] = endTime.split(':').map(Number);
            start.setHours(startH, startM);
            end.setHours(endH, endM);

            // Handle overnight events briefly (simple check)
            if (end < start) {
                end.setDate(end.getDate() + 1);
            }
        }

        onSave({
            title: title || '(No title)',
            start,
            end,
            description,
            location,
            type: eventType,
            isAllDay: isAllDay
        });

        onClose();
    };

    // Helper to find calendar details
    const selectedCalendar = calendars.find(c => c.id === eventType) || calendars[0];

    return (
        <div
            className={`fixed inset-0 z-[60] flex items-center justify-center transition-all duration-300 ease-out ${isAnimating ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-none'}`}
            onClick={onClose}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
                className="transition-transform duration-0 ease-linear"
            >
                <div
                    className={`w-[500px] bg-[#202124] rounded-xl shadow-2xl border border-zinc-700 font-sans flex flex-col transition-all duration-300 ease-out ${isAnimating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-4'}`}
                >

                    {/* Header / Drag Handle */}
                    <div
                        onMouseDown={handleMouseDown}
                        className="flex items-center justify-between px-4 py-2 bg-[#202124] rounded-t-xl cursor-move border-b border-white/5 select-none"
                    >
                        <div className="flex items-center gap-1 text-sm text-[#9aa0a6] px-2 py-1.5 rounded select-none">
                            <span className="material-symbols-outlined text-[20px]">event</span>
                            <span className="font-medium">{event ? 'Edit Event' : 'Event'}</span>
                        </div>
                        <div className="flex items-center">
                            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#303134] rounded-full transition-colors">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-8 pb-8 pt-4 flex flex-col gap-5 max-h-[85vh] overflow-y-auto custom-scrollbar">

                        {/* Title Input */}
                        <div className="ml-10">
                            <input
                                autoFocus
                                className="w-full bg-transparent focus:bg-[#303134]/50 border-0 px-2 py-1.5 rounded-md text-[20px] text-[#e8eaed] focus:ring-0 placeholder-[#9aa0a6] font-normal leading-tight transition-all duration-200 outline-none"
                                placeholder="Title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        {/* Date & Time */}
                        <div className="flex gap-5 items-start">
                            <div className="w-6 flex justify-center mt-1">
                                <span className="material-symbols-outlined text-[#9aa0a6] text-[22px]">schedule</span>
                            </div>
                            <div className="flex-1 flex flex-col gap-2">
                                <div className="flex items-center gap-3 text-[#e8eaed] text-sm">
                                    {!isAllDay && (
                                        <>
                                            <div className="relative">
                                                <TimePicker
                                                    value={startTime}
                                                    onChange={setStartTime}
                                                />
                                            </div>
                                            <span className="text-[#9aa0a6] text-sm flex items-center pt-1">→</span>
                                            <div className="relative">
                                                <TimePicker
                                                    value={endTime}
                                                    onChange={setEndTime}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center px-0 py-1 rounded w-fit">
                                    <span className="text-sm font-medium text-[#e8eaed]">
                                        {(event ? event.start : (defaultDate || new Date())).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                                <div className="flex gap-4 mt-1 text-xs text-[#9aa0a6]">
                                    <button
                                        type="button"
                                        onClick={() => setIsAllDay(!isAllDay)}
                                        className={`px-2 py-1 -ml-2 rounded transition-colors text-left font-medium ${isAllDay ? 'bg-blue-500/20 text-blue-200' : 'hover:bg-[#303134] text-[#9aa0a6]'}`}
                                    >
                                        All-day
                                    </button>
                                    {!isAllDay && (
                                        <button className="hover:bg-[#303134] px-2 py-1 rounded transition-colors text-left font-medium">Time zone</button>
                                    )}
                                    <button className="hover:bg-[#303134] px-2 py-1 rounded transition-colors text-left font-medium">Repeat</button>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="flex gap-5 items-start">
                            <div className="w-6 flex justify-center mt-1">
                                <span className="material-symbols-outlined text-[#9aa0a6] text-[22px]">segment</span>
                            </div>
                            <div className="flex-1">
                                <textarea
                                    className="w-full bg-[#303134]/20 focus:bg-[#303134]/60 border border-zinc-700/30 hover:border-zinc-600/60 rounded-lg px-4 py-3 text-sm text-[#e8eaed] placeholder-[#9aa0a6]/70 focus:ring-0 resize-none transition-all duration-200 outline-none"
                                    placeholder="Description"
                                    rows={4}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                ></textarea>
                            </div>
                        </div>

                        {/* Calendar Select / Options */}
                        <div className="flex gap-5 items-start pt-4 mt-2 border-t border-[#3c4043]">
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

                                    {/* Dropdown Menu */}
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
                        </div>

                        {/* Footer Actions */}
                        <div className="flex justify-end pt-6 gap-3">
                            <button onClick={onClose} className="px-5 py-2.5 rounded text-sm font-medium text-[#e8eaed] hover:bg-[#303134] transition-colors">Cancel</button>
                            <button onClick={handleSave} className="px-8 py-2.5 rounded text-sm font-medium bg-primary text-white hover:brightness-110 transition-colors shadow-lg font-semibold tracking-wide">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateEventModal;