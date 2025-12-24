"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { CalendarEvent, CalendarCategory } from '@/types';
import { MessageSquareText } from '@/components/animate-ui/icons/message-square-text';

// ============================================================================
// Event Card Component - Displays event details in chat
// ============================================================================

export interface EventCardProps {
    event: CalendarEvent;
    intent?: string;
    compact?: boolean;
    onNavigateToEvent?: (date: Date) => void;
    onAttachToChat?: (event: CalendarEvent) => void;
    calendars?: CalendarCategory[];
}

export function EventCard({
    event,
    intent,
    compact = false,
    onNavigateToEvent,
    onAttachToChat,
    calendars = [],
}: EventCardProps) {
    const formatTime = (date: Date) => {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    // Look up calendar theme
    const calendar = calendars.find(c => c.id === event.type) || calendars.find(c => c.isDefault) || calendars[0];
    const theme = calendar?.theme;

    const typeBorderColor = theme?.border || 'border-gray-500';
    const typeBgColor = compact ? 'bg-zinc-800/40' : (theme?.bg || 'bg-zinc-800/40');
    const typeHoverBgColor = theme?.hover || 'hover:bg-muted/80';

    const handleAttachClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent navigate on card click
        onAttachToChat?.(event);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
            }}
            onClick={() => onNavigateToEvent?.(new Date(event.start))}
            className={clsx(
                "rounded-lg border-l-4 p-3 transition-all cursor-pointer group relative overflow-hidden",
                "backdrop-blur-sm shadow-[inset_0_0_0_1000px_rgba(255,255,255,0.04),inset_0_0_0_1px_rgba(255,255,255,0.06)]",
                typeBorderColor,
                typeBgColor,
                typeHoverBgColor
            )}
            role="button"
            tabIndex={0}
            title="View in calendar"
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground group-hover:underline decoration-foreground/30 underline-offset-4">
                        {event.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {event.isAllDay ? (
                            event.startDate && event.endDate && event.startDate !== event.endDate ? (
                                `${formatDate(event.start)} - ${formatDate(event.end)}`
                            ) : (
                                formatDate(event.start)
                            )
                        ) : (
                            event.startDate && event.endDate && event.startDate !== event.endDate ? (
                                `${formatTime(event.start)}, ${formatDate(event.start)} - ${formatTime(event.end)}, ${formatDate(event.end)}`
                            ) : (
                                `${formatTime(event.start)} - ${formatTime(event.end)}, ${formatDate(event.start)}`
                            )
                        )}
                    </p>
                    {event.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {event.description}
                        </p>
                    )}
                    {event.location && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">location_on</span>
                            {event.location}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {event.rrule && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            Recurring
                        </span>
                    )}
                    {/* Attach to chat button */}
                    {onAttachToChat && (
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleAttachClick}
                            className="w-7 h-7 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition-all"
                            title="Ask about this event"
                        >
                            <MessageSquareText size={14} />
                        </motion.button>
                    )}
                    {/* Navigate indicator icon */}
                    <span className="material-symbols-outlined text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity text-lg">
                        arrow_forward
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

export default EventCard;

