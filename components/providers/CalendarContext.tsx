"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ViewType, CalendarEvent, CalendarCategory, DEFAULT_CALENDARS, getThemeForColor } from '@/types';
import {
    fetchEvents,
    createEventApi,
    updateEventApi,
    deleteEventApi,
    getViewDateRange,
} from '@/lib/api/events';

interface CalendarContextType {
    // State
    currentView: ViewType;
    currentDate: Date;
    events: CalendarEvent[];
    calendars: CalendarCategory[];
    isLoading: boolean;
    
    // Actions
    setCurrentView: (view: ViewType) => void;
    setCurrentDate: (date: Date) => void;
    refreshEvents: () => Promise<void>;
    
    // Calendar Management
    addCalendar: (data: { label: string; colorName: string }) => void;
    updateCalendar: (id: string, updates: Partial<CalendarCategory>) => void;
    deleteCalendar: (id: string) => void;
    toggleCalendar: (id: string) => void;
    
    // Event Actions
    createEvent: (eventData: Partial<CalendarEvent>) => Promise<void>;
    updateEvent: (id: string, eventData: Partial<CalendarEvent>) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: React.ReactNode }) {
    const [currentView, setCurrentView] = useState<ViewType>('week');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [calendars, setCalendars] = useState<CalendarCategory[]>(DEFAULT_CALENDARS);
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Load events from the database for the current view
     */
    const loadEvents = useCallback(async () => {
        try {
            setIsLoading(true);
            // Get a wider range to ensure we capture all relevant events
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

    // Calendar Management
    const addCalendar = (data: { label: string; colorName: string }) => {
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

    const updateCalendar = (id: string, updates: Partial<CalendarCategory>) => {
        setCalendars(calendars.map(cal => {
            if (cal.id === id) {
                if (cal.isDefault && updates.label) {
                    updates = { ...updates };
                    delete updates.label;
                }
                const updatedCal = { ...cal, ...updates };
                if (updates.colorName) {
                    updatedCal.theme = getThemeForColor(updates.colorName);
                }
                return updatedCal;
            }
            return cal;
        }));
    };

    const deleteCalendar = (id: string) => {
        const calendar = calendars.find(c => c.id === id);
        if (calendar?.isDefault) return;
        setCalendars(calendars.filter(cal => cal.id !== id));
    };

    const toggleCalendar = (id: string) => {
        setCalendars(calendars.map(cal =>
            cal.id === id ? { ...cal, checked: !cal.checked } : cal
        ));
    };

    // Event Actions
    const createEvent = async (eventData: Partial<CalendarEvent>) => {
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
        await loadEvents();
    };

    const updateEvent = async (id: string, eventData: Partial<CalendarEvent>) => {
        // Handle instance IDs (e.g., event_id_date)
        
        // If the ID format is evt_TIMESTAMP_RANDOM_DATE, splitting might be tricky.
        // Let's rely on the fact that instance IDs usually append _DATE at the end.
        // But our DB logic for instance ID is: `${event.id}_${instanceStart.toISOString()}`
        // And event.id is `evt_${Date.now()}_${random}`
        // So a recurring instance ID looks like: evt_123_abc_2025-01-01T00:00:00.000Z
        
        // Safer extraction:
        // If it contains more than 2 underscores AND ends with a date-like string, it's an instance.
        // But wait, generateEventId uses `evt_TIMESTAMP_RANDOM`. That has 2 underscores.
        // Instance ID adds a 3rd underscore: `evt_TIMESTAMP_RANDOM_ISOSTRING`.
        
        let targetId = id;
        const parts = id.split('_');
        if (parts.length > 3) {
             // It's likely an instance ID, remove the last part (date)
             targetId = parts.slice(0, 3).join('_');
        }

        await updateEventApi(targetId, eventData);
        await loadEvents();
    };

    const deleteEvent = async (id: string) => {
        let targetId = id;
        const parts = id.split('_');
        if (parts.length > 3) {
             targetId = parts.slice(0, 3).join('_');
        }
        
        await deleteEventApi(targetId);
        await loadEvents();
    };

    return (
        <CalendarContext.Provider value={{
            currentView,
            currentDate,
            events,
            calendars,
            isLoading,
            setCurrentView,
            setCurrentDate,
            refreshEvents: loadEvents,
            addCalendar,
            updateCalendar,
            deleteCalendar,
            toggleCalendar,
            createEvent,
            updateEvent,
            deleteEvent,
        }}>
            {children}
        </CalendarContext.Provider>
    );
}

export function useCalendar() {
    const context = useContext(CalendarContext);
    if (context === undefined) {
        throw new Error('useCalendar must be used within a CalendarProvider');
    }
    return context;
}
