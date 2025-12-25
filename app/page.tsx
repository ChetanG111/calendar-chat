"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ViewType, CalendarEvent } from '@/types';
import Sidebar from '@/components/Sidebar';
import DayView from '@/components/DayView';
import WeekView from '@/components/WeekView';
import MonthView from '@/components/MonthView';
import ChatView from '@/components/ChatView';
import EventPanel, { EventPanelMode } from '@/components/EventPanel';
import ViewSwitcher from '@/components/ViewSwitcher';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { ChevronLeft } from '@/components/animate-ui/icons/chevron-left';
import { ChevronRight } from '@/components/animate-ui/icons/chevron-right';
import { PanelLeftOpen } from '@/components/animate-ui/icons/panel-left-open';
import { PanelLeftClose } from '@/components/animate-ui/icons/panel-left-close';
import { Button } from '@/components/animate-ui/components/buttons/button';
import { useCalendar } from '@/components/providers/CalendarContext';

const getViewKey = (view: ViewType, date: Date) => {
    // Chat view should have a stable key - it shouldn't remount when date changes
    if (view === 'chat') {
        return 'chat';
    }
    if (view === 'month') {
        return `${view}-${date.getFullYear()}-${date.getMonth()}`;
    }
    if (view === 'week') {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        const startOfWeek = new Date(d);
        startOfWeek.setDate(diff);
        return `${view}-${startOfWeek.getFullYear()}-${startOfWeek.getMonth()}-${startOfWeek.getDate()}`;
    }
    return `${view}-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

export default function Home() {
    const {
        currentView,
        currentDate,
        events,
        calendars,
        isLoading,
        setCurrentView,
        setCurrentDate,
        refreshEvents,
        addCalendar,
        updateCalendar,
        deleteCalendar,
        toggleCalendar,
        createEvent,
        updateEvent,
        deleteEvent
    } = useCalendar();

    const [slideDirection, setSlideDirection] = useState<number>(0);
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

    // Chat attached event state - when user clicks "talk about event" in EventPanel
    const [attachedEventForChat, setAttachedEventForChat] = useState<CalendarEvent | null>(null);

    // Filter events based on visible calendars
    const visibleEventTypes = calendars.filter(c => c.checked).map(c => c.id);
    const visibleEvents = events.filter(e => visibleEventTypes.includes(e.type));

    // Layout handling
    const renderView = () => {
        const viewVariants: Variants = {
            initial: (direction: number) => ({
                opacity: 0,
                // x: direction > 0 ? 300 : -300,
                x: direction * 50, // Subtle slide
                scale: 0.96,
                filter: 'blur(4px)'
            }),
            animate: {
                opacity: 1,
                x: 0,
                scale: 1,
                filter: 'blur(0px)',
                transition: { type: "spring" as const, stiffness: 350, damping: 25, mass: 1 }
            },
            exit: (direction: number) => ({
                opacity: 0,
                // x: direction < 0 ? 300 : -300,
                x: direction * -50, // Subtle slide exit opposite
                scale: 0.96,
                filter: 'blur(4px)',
                transition: { duration: 0.15, ease: "easeOut" }
            })
        };

        if (isLoading && events.length === 0) {
            return (
                <motion.div
                    key="loading"
                    variants={viewVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
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

        let viewContent;
        switch (currentView) {
            case 'day':
                viewContent = <DayView {...viewProps} />;
                break;
            case 'week':
                viewContent = <WeekView {...viewProps} onDateChange={setCurrentDate} />;
                break;
            case 'month':
                viewContent = <MonthView {...viewProps} onDateChange={setCurrentDate} />;
                break;
            case 'chat':
                viewContent = (
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
                        onEventCreated={createEvent}
                        onEventUpdated={async (event) => {
                            if (event.id) {
                                await updateEvent(event.id, event);
                            }
                        }}
                        onEventDeleted={async (event) => {
                            const eventId = event.eventId || event.id;
                            if (eventId) {
                                await deleteEvent(eventId);
                            }
                        }}
                        calendars={calendars}
                        attachedEvent={attachedEventForChat}
                        onClearAttachedEvent={() => setAttachedEventForChat(null)}
                        onAttachEvent={setAttachedEventForChat}
                    />
                );
                break;
            default:
                viewContent = <WeekView {...viewProps} onDateChange={setCurrentDate} />;
        }

        return (
            <motion.div
                key={getViewKey(currentView, currentDate)} // Trigger animation on view or meaningful date change
                custom={slideDirection}
                variants={viewVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={className}
            >
                {viewContent}
            </motion.div>
        );
    };

    const handleDateNav = React.useCallback((direction: 'prev' | 'next') => {
        const dir = direction === 'next' ? 1 : -1;
        setSlideDirection(dir);

        const newDate = new Date(currentDate);
        if (currentView === 'day') {
            newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
        } else if (currentView === 'week') {
            newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        } else if (currentView === 'month') {
            newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        }
        setCurrentDate(newDate);
    }, [currentDate, currentView, setCurrentDate]);

    // Keyboard and horizontal scroll navigation
    const isNavigatingRef = useRef(false); // Ref for debounce
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isPanelOpen) return; // Don't navigate if panel is open (might be typing)
            if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
                if (document.activeElement instanceof HTMLInputElement ||
                    document.activeElement instanceof HTMLTextAreaElement) {
                    return;
                }
                handleDateNav(e.key === 'ArrowLeft' ? 'prev' : 'next');
            }
        };

        const handleWheel = (e: WheelEvent) => {
            // Prevent default browser back/forward navigation on trackpad
            // The passive: false is kept for now but consider its implications.
            // If horizontal swiping is desired without interfering with browser navigation,
            // more sophisticated logic is needed, possibly involving checking if a scrollable
            // element is being swiped within.
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                // Not calling e.preventDefault() to allow native browser back/forward gestures
                // This might allow horizontal scrolling in other contexts too.
                // Depending on desired UX, may need to re-add with more specific conditions.
            }

            if (isNavigatingRef.current) return;

            // Threshold for horizontal swipe/scroll
            if (Math.abs(e.deltaX) > 40) { // deltaX is usually horizontal scroll
                isNavigatingRef.current = true;
                handleDateNav(e.deltaX > 0 ? 'next' : 'prev');

                // Debounce
                setTimeout(() => {
                    isNavigatingRef.current = false;
                }, 500);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        // Passive: false is required to call preventDefault
        window.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('wheel', handleWheel);
        };
    }, [handleDateNav, isPanelOpen]);

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

            // Optimistic UI update handled by context? No, wait for context.
            // Actually, we can just call delete and let context refresh.
            handleClosePanel();

            try {
                await deleteEvent(eventId);
            } catch (error) {
                console.error('Failed to delete event:', error);
                // Revert/Toast handled by context error boundary ideally
            }
        }
    };

    const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
        try {
            if (selectedEvent && panelMode === 'edit') {
                await updateEvent(selectedEvent.id, eventData);
            } else {
                await createEvent(eventData);
            }

            handleClosePanel();
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
        <div onClick={handleBackgroundClick} className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans">

            <EventPanel
                isOpen={isPanelOpen}
                mode={panelMode}
                event={selectedEvent}
                initialData={initialEventData}
                onClose={handleClosePanel}
                onEdit={() => setPanelMode('edit')}
                onDelete={handleDeleteEvent}
                onSave={handleSaveEvent}
                onChatAboutEvent={(event) => {
                    setAttachedEventForChat(event);
                    handleClosePanel();
                    setCurrentView('chat');
                }}
                calendars={calendars}
            />

            <header className="h-16 flex-none border-b border-border bg-card z-50 flex items-center justify-between px-4 relative">
                <div className="flex items-center gap-6">
                    {/* Sidebar Toggle */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(!isSidebarOpen); }}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
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
                        <button onClick={(e) => { e.stopPropagation(); handleDateNav('prev'); }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                            <ChevronLeft size={18} animateOnHover />
                        </button>
                        <h1
                            className="text-lg font-semibold tracking-tight text-foreground hidden md:block min-w-[180px] text-center cursor-pointer hover:text-muted-foreground transition-colors"
                            onClick={(e) => { e.stopPropagation(); setCurrentView('month'); }}
                        >
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </h1>
                        <button onClick={(e) => { e.stopPropagation(); handleDateNav('next'); }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
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
                        className="mr-4 text-muted-foreground border-border bg-transparent hover:bg-accent hover:text-foreground hover:border-border"
                        hoverScale={1.02}
                        tapScale={0.98}
                    >
                        Today
                    </Button>
                    <img
                        alt="User"
                        className="w-8 h-8 rounded-full border border-border cursor-pointer object-cover hover:border-muted-foreground transition-colors"
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
                                onAddCalendar={addCalendar}
                                onUpdateCalendar={updateCalendar}
                                onDeleteCalendar={deleteCalendar}
                                onToggleCalendar={toggleCalendar}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden transition-all duration-300 ease-in-out">
                    <AnimatePresence mode="popLayout" custom={slideDirection} initial={false}>
                        {renderView()}
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
