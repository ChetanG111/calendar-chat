"use client";

import React, { useState, useEffect, useRef } from 'react';
import { CalendarEvent } from '@/types';
import TimePicker from './TimePicker';

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: Partial<CalendarEvent>) => void;
    defaultDate?: Date;
    event?: CalendarEvent;
    initialData?: Partial<CalendarEvent>;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose, onSave, defaultDate, event, initialData }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('10:45');
    const [eventType, setEventType] = useState<'business' | 'personal' | 'meetings' | 'holiday'>('personal');
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
            setTimeout(() => setIsAnimating(true), 10);
        } else {
            setIsAnimating(false);
            const timer = setTimeout(() => setShouldRender(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Reset position and populate form
    useEffect(() => {
        if (isOpen) {
            setIsDropdownOpen(false);
            setPosition({ x: 0, y: 0 });

            if (event) {
                setTitle(event.title);
                setDescription(event.description || '');
                setLocation(event.location || '');
                setEventType(event.type);
                setStartTime(event.start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
                setEndTime(event.end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
                setIsAllDay(event.isAllDay || false);
            } else {
                const data = initialData || {};
                setTitle(data.title || '');
                setDescription(data.description || '');
                setLocation(data.location || '');
                setEventType(data.type || 'personal');
                setStartTime(data.start ? data.start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '10:00');
                setEndTime(data.end ? data.end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '10:45');
                setIsAllDay(data.isAllDay || false);
            }
        }
    }, [event, isOpen, defaultDate, initialData]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('textarea')) {
            return;
        }
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !dragStartRef.current) return;
            setPosition({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
        };
        const handleMouseUp = () => setIsDragging(false);
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
            if (end < start) end.setDate(end.getDate() + 1);
        }

        onSave({ title: title || '(No title)', start, end, description, location, type: eventType, isAllDay: isAllDay });
        onClose();
    };

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${!isOpen ? 'opacity-0' : 'opacity-100'}`}
                onClick={onClose}
            />
            <div
                className={`fixed inset-0 z-[50] flex items-center justify-center transition-all duration-300 ease-out ${isAnimating ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
                    className="transition-transform duration-0 ease-linear"
                >
                    <div className={`w-[520px] bg-surface-overlay rounded-2xl shadow-premium-lg border border-border font-sans flex flex-col transition-all duration-400 ease-[cubic-bezier(0.175,0.885,0.32,1.1)] ${isAnimating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-4'}`}>
                        <div onMouseDown={handleMouseDown} className="flex items-center justify-between px-6 py-4 bg-canvas/30 rounded-t-2xl cursor-move border-b border-border select-none">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-fg-subtle uppercase tracking-widest px-2 py-1 select-none">
                                <span className="material-symbols-outlined text-[18px]">event</span>
                                <span>{event ? 'Edit Event' : 'Create Event'}</span>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-fg-muted hover:text-foreground hover:bg-white/5 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="px-8 pb-8 pt-4 flex flex-col gap-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                            <div className="px-1">
                                <input
                                    autoFocus
                                    className="w-full bg-transparent border-0 px-2 py-2 text-3xl font-bold tracking-tight text-foreground placeholder-white/10 transition-all duration-200 outline-none"
                                    placeholder="Event Title"
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-5 items-start">
                                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-fg-muted text-[22px]">schedule</span>
                                </div>
                                <div className="flex-1 flex flex-col gap-4 pt-1">
                                    {!isAllDay && (
                                        <div className="flex items-center gap-3">
                                            <TimePicker value={startTime} onChange={setStartTime} />
                                            <span className="text-fg-subtle opacity-30 font-bold">\u2192</span>
                                            <TimePicker value={endTime} onChange={setEndTime} />
                                        </div>
                                    )}
                                    <div className="text-sm font-bold text-fg-muted uppercase tracking-wider">
                                        {(event ? event.start : (defaultDate || new Date())).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => setIsAllDay(!isAllDay)} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${isAllDay ? 'bg-accent text-white shadow-premium-sm ring-1 ring-accent/20' : 'bg-white/[0.03] hover:bg-white/5 text-fg-muted border border-white/5'}`}>All-day</button>
                                        <button className="bg-white/[0.03] hover:bg-white/5 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-fg-muted border border-white/5 transition-all">Repeat</button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-5 items-start">
                                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-fg-muted text-[22px]">segment</span>
                                </div>
                                <div className="flex-1">
                                    <textarea
                                        className="w-full bg-canvas/30 border border-border focus:border-white/20 focus:bg-canvas/50 rounded-2xl px-5 py-4 text-sm font-medium text-foreground placeholder-white/10 resize-none transition-all duration-300 outline-none leading-relaxed"
                                        placeholder="Add description..."
                                        rows={4}
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="flex gap-5 items-start pt-6 border-t border-border mt-2">
                                <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center flex-shrink-0">
                                    <span className="material-symbols-outlined text-fg-muted text-[22px]">category</span>
                                </div>
                                <div className="flex-1 relative" ref={dropdownRef}>
                                    <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-3 bg-white/[0.03] hover:bg-white/5 border border-white/5 px-5 py-3 rounded-2xl transition-all w-full text-left group">
                                        <div className={`w-3.5 h-3.5 rounded-full ring-2 ring-background ${eventType === 'business' ? 'bg-accent' : eventType === 'personal' ? 'bg-rose-500' : eventType === 'meetings' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                        <span className="text-foreground text-sm font-bold uppercase tracking-widest flex-1">
                                            {eventType === 'personal' ? 'Leslie Alexander' : eventType}
                                        </span>
                                        <span className={`material-symbols-outlined text-fg-subtle text-[20px] transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                                    </button>

                                    {isDropdownOpen && (
                                        <div className="absolute bottom-full left-0 mb-3 w-72 bg-surface-overlay border border-border rounded-2xl shadow-premium-lg z-[70] overflow-hidden p-2 animate-spring-in origin-bottom-left">
                                            {[
                                                { id: 'personal', label: 'Leslie Alexander', color: 'bg-rose-500' },
                                                { id: 'business', label: 'Business', color: 'bg-accent' },
                                                { id: 'meetings', label: 'Meetings', color: 'bg-amber-500' },
                                                { id: 'holiday', label: 'Holiday', color: 'bg-emerald-500' }
                                            ].map((option) => (
                                                <button key={option.id} onClick={() => { setEventType(option.id as any); setIsDropdownOpen(false); }} className={`w-full text-left px-4 py-3.5 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest transition-all rounded-xl ${eventType === option.id ? 'bg-white/5 text-foreground' : 'text-fg-muted hover:bg-white/[0.02] hover:text-foreground'}`}>
                                                    <div className={`w-2.5 h-2.5 rounded-full ${option.color} ring-2 ring-background`}></div>
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end pt-8 gap-4 border-t border-border mt-4">
                                <button onClick={onClose} className="px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-fg-muted hover:text-foreground hover:bg-white/5 transition-all">Cancel</button>
                                <button onClick={handleSave} className="px-10 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-foreground text-background hover:bg-white transition-all shadow-premium-md">Save Event</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CreateEventModal;