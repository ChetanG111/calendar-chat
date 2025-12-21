"use client";

import React, { useState } from 'react';
import { ViewType, MOCK_EVENTS, CalendarEvent } from '@/types';
import Sidebar from '@/components/Sidebar';
import DayView from '@/components/DayView';
import WeekView from '@/components/WeekView';
import MonthView from '@/components/MonthView';
import ChatView from '@/components/ChatView';
import CreateEventModal from '@/components/CreateEventModal';
import EventSummaryPopover from '@/components/EventSummaryPopover';

export default function Home() {
    const [currentView, setCurrentView] = useState<ViewType>('week');
    const [currentDate, setCurrentDate] = useState(new Date(2025, 11, 16)); // Dec 16 2025 as per screenshot
    const [events, setEvents] = useState<CalendarEvent[]>(MOCK_EVENTS);
    const [initialEventData, setInitialEventData] = useState<Partial<CalendarEvent> | undefined>(undefined);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Selection State
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>(undefined);
    const [selectedEventRect, setSelectedEventRect] = useState<DOMRect | null>(null);
    const [selectedContainerRect, setSelectedContainerRect] = useState<DOMRect | null>(null);

    // Layout handling
    const renderView = () => {
        switch (currentView) {
            case 'day':
                return <DayView currentDate={currentDate} events={events} onEventClick={handleEventClick} onNewEvent={handleNewEvent} />;
            case 'week':
                return (
                    <WeekView
                        currentDate={currentDate}
                        events={events}
                        onDateChange={setCurrentDate}
                        onNewEvent={handleNewEvent}
                        onEventClick={handleEventClick}
                    />
                );
            case 'month':
                return <MonthView currentDate={currentDate} events={events} onDateChange={setCurrentDate} onEventClick={handleEventClick} onNewEvent={handleNewEvent} />;
            case 'chat':
                return <ChatView />;
            default:
                return (
                    <WeekView
                        currentDate={currentDate}
                        events={events}
                        onDateChange={setCurrentDate}
                        onNewEvent={handleNewEvent}
                        onEventClick={handleEventClick}
                    />
                );
        }
    };

    const handleDateNav = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (currentView === 'day') {
            newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        } else if (currentView === 'week') {
            newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        } else if (currentView === 'month') {
            newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        }
        setCurrentDate(newDate);
    };

    const handleEventClick = (event: CalendarEvent, eventRect: DOMRect, containerRect: DOMRect) => {
        // If clicking the same event that is currently selected, close the popover (toggle behavior)
        if (selectedEvent && selectedEvent.id === event.id && selectedEventRect) {
            setSelectedEvent(undefined);
            setSelectedEventRect(null);
            setSelectedContainerRect(null);
            return;
        }

        setSelectedEvent(event);
        setSelectedEventRect(eventRect);
        setSelectedContainerRect(containerRect);
        setIsModalOpen(false); // Close modal if open (unlikely), show popover
    };

    const handleNewEvent = (data?: Partial<CalendarEvent>) => {
        setSelectedEvent(undefined);
        setSelectedEventRect(null);
        setSelectedContainerRect(null);
        setInitialEventData(data);
        setIsModalOpen(true);
    };

    const handleEditFromPopover = () => {
        // Smooth transition: Close popover but keep selectedEvent data for the modal
        setSelectedEventRect(null);
        setIsModalOpen(true);
    };

    const handleDeleteEvent = () => {
        if (selectedEvent) {
            setEvents(events.filter(e => e.id !== selectedEvent.id));
            setSelectedEventRect(null);
            setSelectedContainerRect(null);
            setSelectedEvent(undefined);
        }
    };

    const handleSaveEvent = (eventData: Partial<CalendarEvent>) => {
        if (selectedEvent) {
            // Update existing
            setEvents(events.map(e => e.id === selectedEvent.id ? { ...e, ...eventData } as CalendarEvent : e));
        } else {
            // Create new
            const newEvent: CalendarEvent = {
                id: Math.random().toString(36).substr(2, 9),
                title: eventData.title || '(No Title)',
                start: eventData.start || new Date(),
                end: eventData.end || new Date(new Date().getTime() + 3600000),
                type: eventData.type || 'personal',
                description: eventData.description,
                location: eventData.location,
                isAllDay: eventData.isAllDay
            };
            setEvents([...events, newEvent]);
        }
        // Clear selection after save to reset state
        setSelectedEvent(undefined);
        setInitialEventData(undefined);
    };

    const handleBackgroundClick = (e: React.MouseEvent) => {
        // Prevent closing if modal is open (as clicks bubble from modal)
        if (isModalOpen) return;

        // If a popover is open and we click background (outside popover and outside event), close it
        // Note: Clicks on events stop propagation, so they won't trigger this.
        // Clicks on popover stop propagation, so they won't trigger this.
        if (selectedEventRect) {
            setSelectedEvent(undefined);
            setSelectedEventRect(null);
            setSelectedContainerRect(null);
        }
    };

    return (
        <div onClick={handleBackgroundClick} className="flex flex-col h-screen bg-background-dark text-gray-200 overflow-hidden font-sans">

            {/* Create/Edit Event Modal - Full Edit Mode */}
            <CreateEventModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setSelectedEvent(undefined); setInitialEventData(undefined); }}
                onSave={handleSaveEvent}
                defaultDate={currentDate}
                event={selectedEvent}
                initialData={initialEventData}
            />

            {/* Event Summary Popover - Read Only / Quick Actions */}
            {selectedEvent && selectedEventRect && selectedContainerRect && (
                <EventSummaryPopover
                    event={selectedEvent}
                    anchorRect={selectedEventRect}
                    containerRect={selectedContainerRect}
                    onClose={() => { setSelectedEventRect(null); setSelectedContainerRect(null); setSelectedEvent(undefined); }}
                    onEdit={handleEditFromPopover}
                    onDelete={handleDeleteEvent}
                />
            )}

            {/* Global Header - Flex Item, not fixed */}
            <header className="h-16 flex-none border-b border-border-dark bg-surface-dark z-50 flex items-center justify-between px-4 relative">
                {/* Left Section: Date & Navigation */}
                <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setCurrentView('month')}>
                        <h1 className="text-xl font-bold tracking-tight text-white hidden md:block">
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h1>
                    </div>

                    <div className="flex items-center space-x-1">
                        <button onClick={() => handleDateNav('prev')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 transition-colors">
                            <span className="material-icons text-xl">chevron_left</span>
                        </button>
                        <button onClick={() => handleDateNav('next')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 transition-colors">
                            <span className="material-icons text-xl">chevron_right</span>
                        </button>
                    </div>
                </div>

                {/* Center Section: View Switcher - Positioned Absolutely */}
                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="flex bg-zinc-800 p-1 rounded-lg border border-border-dark">
                        <button
                            onClick={() => setCurrentView('day')}
                            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${currentView === 'day' ? 'bg-zinc-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            Day
                        </button>
                        <button
                            onClick={() => setCurrentView('week')}
                            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${currentView === 'week' ? 'bg-zinc-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            Week
                        </button>
                        <button
                            onClick={() => setCurrentView('month')}
                            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${currentView === 'month' ? 'bg-zinc-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            Month
                        </button>
                        <div className="w-px h-4 bg-zinc-700 mx-1 self-center"></div>
                        <button
                            onClick={() => setCurrentView('chat')}
                            className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 ${currentView === 'chat' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                        >
                            Chat
                        </button>
                    </div>
                </div>

                {/* Right Section: Tools */}
                <div className="flex items-center">
                    <img
                        alt="User"
                        className="w-8 h-8 rounded-full border border-gray-700 cursor-pointer object-cover hover:border-gray-500 transition-colors"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuD2Nx-sIaN8vRXbzHj3sYwqql_Z62Zo5iPv6WLQ1F8UwxwcPmaULdNdyCSFy_6J3t48cndAiY_as21YB8kGM4Bpb8oa3eKqt2eygDwr9WIz2q-UsaQ5YAhs5dQrLGkWFi6Njyv4fL5sm3a1KX84Zeg30ObAxbIqk6Nu9UaL9tDzOp0RP_a7X5J8FUx-PyCG3THHFIx4-QxAk3LorTFSrSZUKE4FFO38qPSX50XHuI3y0vnZBQnVchYDYnYCzMRCjjSFZ1o4j6n5oq_G"
                    />
                </div>
            </header>

            {/* Main Content Layout */}
            <div className="flex flex-1 overflow-hidden relative w-full">
                <Sidebar currentDate={currentDate} onDateChange={setCurrentDate} />

                {/* View Area */}
                <main className="flex-1 flex flex-col min-w-0 bg-background-dark relative overflow-hidden transition-all duration-300 ease-in-out">
                    {renderView()}
                </main>
            </div>
        </div>
    );
}
