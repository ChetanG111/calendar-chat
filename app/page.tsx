"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ViewType, CalendarEvent, CalendarCategory, DEFAULT_CALENDARS, getThemeForColor } from '@/types';
import Sidebar from '@/components/Sidebar';
import DayView from '@/components/DayView';
import WeekView from '@/components/WeekView';
import MonthView from '@/components/MonthView';
import ChatView from '@/components/ChatView';
import EventPanel, { EventPanelMode } from '@/components/EventPanel';
import ViewSwitcher from '@/components/ViewSwitcher';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from '@/components/animate-ui/icons/chevron-left';
import { ChevronRight } from '@/components/animate-ui/icons/chevron-right';
import { PanelLeftOpen } from '@/components/animate-ui/icons/panel-left-open';
import { PanelLeftClose } from '@/components/animate-ui/icons/panel-left-close';
import { Button } from '@/components/animate-ui/components/buttons/button';
import {
    fetchEvents,
    createEventApi,
    updateEventApi,
    deleteEventApi,
    getViewDateRange,
} from '@/lib/api/events';

export default function Home() {
    const [currentView, setCurrentView] = useState<ViewType>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [calendars, setCalendars] = useState<CalendarCategory[]>(DEFAULT_CALENDARS);
    const [isLoading, setIsLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Responsive sidebar init
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setIsSidebarOpen(false);
            } else {
                setIsSidebarOpen(true);
            }
        };

        // Set initial state
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Event Panel State
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [panelMode, setPanelMode] = useState<EventPanelMode>('view');
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>(undefined);
    const [initialEventData, setInitialEventData] = useState<Partial<CalendarEvent> | undefined>(undefined);

    // Selection State (kept for highlighting, though panel doesn't position based on them anymore)
    const [selectedEventRect, setSelectedEventRect] = useState<DOMRect | null>(null);
    const [selectedContainerRect, setSelectedContainerRect] = useState<DOMRect | null>(null);

    /**
     * Load events from the database for the current view
     */
    const loadEvents = useCallback(async () => {
        try {
            setIsLoading(true);
            // Get a wider range to ensure we capture all relevant events
            // For week view, get the whole month; for month view, get surrounding months
            const { start, end } = getViewDateRange(
                currentView === 'chat' ? 'month' : currentView,
                currentDate
            );

            // Expand the range a bit for better coverage
            const rangeStart = new Date(start);
            rangeStart.setDate(rangeStart.getDate() - 7);
            const rangeEnd = new Date(end);
            rangeEnd.setDate(rangeEnd.getDate() + 7);

            const loadedEvents = await fetchEvents(rangeStart, rangeEnd);
            setEvents(loadedEvents);
        } catch (error) {
            console.error('Failed to load events:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentView, currentDate]);

    // Load events when view or date changes
    useEffect(() => {
        loadEvents();
    }, [loadEvents]);

    // Calendar Management Handlers
    const handleAddCalendar = (data: { label: string; colorName: string }) => {
        const newId = crypto.randomUUID();
        const newCalendar: CalendarCategory = {
            id: newId,
            label: data.label,
            colorName: data.colorName,
            theme: getThemeForColor(data.colorName),
            icon: 'check',
            checked: true
        };
        setCalendars([...calendars, newCalendar]);
    };

    const handleUpdateCalendar = (id: string, updates: Partial<CalendarCategory>) => {
        setCalendars(calendars.map(cal => {
            if (cal.id === id) {
                // Prevent renaming the default calendar
                if (cal.isDefault && updates.label) {
                    updates = { ...updates };
                    delete updates.label;
                }
                const updatedCal = { ...cal, ...updates };
                // If color changed, update theme
                if (updates.colorName) {
                    updatedCal.theme = getThemeForColor(updates.colorName);
                }
                return updatedCal;
            }
            return cal;
        }));
    };

    const handleDeleteCalendar = (id: string) => {
        const calendar = calendars.find(c => c.id === id);
        if (calendar?.isDefault) return; // Prevent deleting default calendar

        setCalendars(calendars.filter(cal => cal.id !== id));
    };

    const toggleCalendarVisibility = (id: string) => {
        setCalendars(calendars.map(cal =>
            cal.id === id ? { ...cal, checked: !cal.checked } : cal
        ));
    };

    // Filter events based on visible calendars
    const visibleEventTypes = calendars.filter(c => c.checked).map(c => c.id);
    const visibleEvents = events.filter(e => visibleEventTypes.includes(e.type));

    // Layout handling
    const renderView = () => {
        if (isLoading && events.length === 0) {
            return (
                <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex items-center justify-center"
                >
                    <div className="text-gray-400">Loading events...</div>
                </motion.div>
            );
        }

        const className = "flex-1 flex flex-col overflow-hidden";

        // Helper to inject calendars into View props if needed, but for now Views take events.
        // We pass 'calendars' so views can resolve themes.
        const viewProps = {
            currentDate,
            events: visibleEvents,
            calendars, // Passing calendars list for theme lookup
            onEventClick: handleEventClick,
            onNewEvent: handleNewEvent,
            selectedEventId: selectedEvent?.id,
        };

        switch (currentView) {
            case 'day':
                return (
                    <motion.div
                        key="day"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className={className}
                    >
                        <DayView {...viewProps} />
                    </motion.div>
                );
            case 'week':
                return (
                    <motion.div
                        key="week"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className={className}
                    >
                        <WeekView
                            {...viewProps}
                            onDateChange={setCurrentDate}
                        />
                    </motion.div>
                );
            case 'month':
                return (
                    <motion.div
                        key="month"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className={className}
                    >
                        <MonthView {...viewProps} onDateChange={setCurrentDate} />
                    </motion.div>
                );
            case 'chat':
                return (
                    <motion.div
                        key="chat"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className={className}
                    >
                        <ChatView
                            onViewChange={setCurrentView}
                            onNavigateToday={() => {
                                setCurrentDate(new Date());
                                setCurrentView('day');
                            }}
                            onNavigateToEvent={(date) => {
                                setCurrentDate(date);
                                setCurrentView('day');
                            }}
                            onEventCreated={() => loadEvents()}
                            onEventUpdated={() => loadEvents()}
                            onEventDeleted={() => loadEvents()}
                            calendars={calendars}
                        />
                    </motion.div>
                );
            default:
                return (
                    <motion.div
                        key="default"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className={className}
                    >
                        <WeekView
                            {...viewProps}
                            onDateChange={setCurrentDate}
                        />
                    </motion.div>
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

    const handleEventClick = (event: CalendarEvent) => {
        if (selectedEvent && selectedEvent.id === event.id && isPanelOpen && panelMode === 'view') {
            // Close if already open on same event in view mode
            handleClosePanel();
            return;
        }

        setSelectedEvent(event);
        setPanelMode('view');
        setIsPanelOpen(true);
    };

    const handleNewEvent = (data?: Partial<CalendarEvent>) => {
        setSelectedEvent(undefined);
        setInitialEventData(data);
        setPanelMode('create');
        setIsPanelOpen(true);
    };

        const handleClosePanel = () => {
            setIsPanelOpen(false);
            // Delay clearing selection to allow exit animation to look good        
            setTimeout(() => {
                setSelectedEvent(undefined);
                setInitialEventData(undefined);
            }, 600);
        };
    const handleDeleteEvent = async () => {
        if (selectedEvent) {
            const eventId = selectedEvent.eventId || selectedEvent.id;
            // Optimistic UI update: remove immediately
            const previousEvents = [...events];
            setEvents(events.filter(e => !e.id.startsWith(eventId)));
            handleClosePanel();

            try {
                await deleteEventApi(eventId);
                // Success: optionally reload to be sure, or trust local state
                // loadEvents(); 
            } catch (error) {
                console.error('Failed to delete event:', error);
                // Revert on failure
                setEvents(previousEvents);
                // Ideally show a toast error here
            }
        }
    };

    const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
        try {
            if (selectedEvent && panelMode === 'edit') {
                const eventId = selectedEvent.id.includes('_2')
                    ? selectedEvent.id.split('_').slice(0, 3).join('_')
                    : selectedEvent.id;

                await updateEventApi(eventId, eventData);
            } else {
                const newEventData = {
                    title: eventData.title || '(No Title)',
                    start: eventData.start || new Date(),
                    end: eventData.end || new Date(new Date().getTime() + 3600000),
                    type: eventData.type || 'default',
                    description: eventData.description,
                    location: eventData.location,
                    isAllDay: eventData.isAllDay,
                };
                await createEventApi(newEventData);
            }

            handleClosePanel();
            loadEvents();
        } catch (error) {
            console.error('Failed to save event:', error);
        }
    };

    const handleBackgroundClick = (e: React.MouseEvent) => {
        // If clicking background, close panel
        // But need to ensure we aren't clicking inside the panel (propagated)
        // The Panel stops propagation on click, so this should catch clicks on the main background
        if (isPanelOpen) {
            handleClosePanel();
        }
    };

    return (
        <div onClick={handleBackgroundClick} className="flex flex-col h-screen bg-background-dark text-gray-200 overflow-hidden font-sans">

            <EventPanel
                isOpen={isPanelOpen}
                mode={panelMode}
                event={selectedEvent}
                initialData={initialEventData}
                onClose={handleClosePanel}
                onEdit={() => setPanelMode('edit')}
                onDelete={handleDeleteEvent}
                onSave={handleSaveEvent}
                calendars={calendars}
            />

            <header className="h-16 flex-none border-b border-border-dark bg-surface-dark z-50 flex items-center justify-between px-4 relative">
                <div className="flex items-center gap-6">
                    {/* Sidebar Toggle */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors focus:outline-none"
                        aria-label="Toggle Sidebar"
                    >
                        {isSidebarOpen ? (
                            <PanelLeftClose size={20} animateOnHover />
                        ) : (
                            <PanelLeftOpen size={20} animateOnHover />
                        )}
                    </button>

                    {/* Date Navigation Group */}
                    <div className="flex items-center gap-2">
                        <button onClick={(e) => { e.stopPropagation(); handleDateNav('prev'); }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                            <ChevronLeft size={18} animateOnHover />
                        </button>
                        <h1
                            className="text-lg font-semibold tracking-tight text-white hidden md:block min-w-[180px] text-center cursor-pointer hover:text-gray-300 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setCurrentView('month'); }}
                        >
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h1>
                        <button onClick={(e) => { e.stopPropagation(); handleDateNav('next'); }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                            <ChevronRight size={18} animateOnHover />
                        </button>
                    </div>
                </div>

                <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <ViewSwitcher currentView={currentView} onChange={setCurrentView} />
                </div>

                <div className="flex items-center">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setCurrentDate(new Date()); }}
                        className="mr-4 text-gray-300 border-zinc-600 bg-transparent hover:bg-white/10 hover:text-white hover:border-zinc-500"
                        hoverScale={1.02}
                        tapScale={0.98}
                    >
                        Today
                    </Button>
                    <img
                        alt="User"
                        className="w-8 h-8 rounded-full border border-gray-700 cursor-pointer object-cover hover:border-gray-500 transition-colors"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuD2Nx-sIaN8vRXbzHj3sYwqql_Z62Zo5iPv6WLQ1F8UwxwcPmaULdNdyCSFy_6J3t48cndAiY_as21YB8kGM4Bpb8oa3eKqt2eygDwr9WIz2q-UsaQ5YAhs5dQrLGkWFi6Njyv4fL5sm3a1KX84Zeg30ObAxbIqk6Nu9UaL9tDzOp0RP_a7X5J8FUx-PyCG3THHFIx4-QxAk3LorTFSrSZUKE4FFO38qPSX50XHuI3y0vnZBQnVchYDYnYCzMRCjjSFZ1o4j6n5oq_G"
                    />
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative w-full">
                <AnimatePresence mode="wait">
                    {isSidebarOpen && (
                        <motion.div
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: "auto", opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="flex-shrink-0 overflow-hidden h-full flex"
                            onClick={(e) => e.stopPropagation()} // Sidebar shouldn't close panel
                        >
                            <Sidebar
                                currentDate={currentDate}
                                onDateChange={setCurrentDate}
                                calendars={calendars}
                                onAddCalendar={handleAddCalendar}
                                onUpdateCalendar={handleUpdateCalendar}
                                onDeleteCalendar={handleDeleteCalendar}
                                onToggleCalendar={toggleCalendarVisibility}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                <main className="flex-1 flex flex-col min-w-0 bg-background-dark relative overflow-hidden transition-all duration-300 ease-in-out">
                    <AnimatePresence mode="wait" initial={false}>
                        {renderView()}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
