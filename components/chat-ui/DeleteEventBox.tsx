"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { CalendarEvent, CalendarCategory } from '@/types';

// ============================================================================
// Delete Event Box Component - Confirms event deletion with preview
// ============================================================================

export interface DeleteEventBoxProps {
    messageId: string;
    event: CalendarEvent;
    calendars?: CalendarCategory[];
    onAnswer: (answer: 'delete' | 'cancel') => void;
    disabled?: boolean;
}

export function DeleteEventBox({
    messageId,
    event,
    calendars = [],
    onAnswer,
    disabled = false,
}: DeleteEventBoxProps) {
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
    const typeBgColor = theme?.bg || 'bg-muted/50';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
            }}
            className="bg-card border border-border rounded-2xl p-4 shadow-lg max-w-md"
        >
            {/* Question */}
            <div className="flex items-start gap-2 mb-4">
                <span className="material-symbols-outlined text-red-500 text-xl mt-0.5">delete</span>
                <p className="text-foreground font-medium">Do you want to delete this event?</p>
            </div>

            {/* Event Preview Card */}
            <div
                className={clsx(
                    "rounded-lg border-l-4 p-3 mb-4",
                    typeBorderColor,
                    typeBgColor
                )}
            >
                <h4 className="font-medium text-foreground">{event.title}</h4>
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

            {/* Action buttons */}
            <div className="flex gap-2">
                <motion.button
                    whileHover={disabled ? {} : { scale: 1.02 }}
                    whileTap={disabled ? {} : { scale: 0.98 }}
                    onClick={() => !disabled && onAnswer('delete')}
                    disabled={disabled}
                    className={clsx(
                        "flex-1 py-2.5 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                        disabled
                            ? "bg-muted border border-border text-muted-foreground cursor-not-allowed opacity-50"
                            : "bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30"
                    )}
                >
                    <span className="material-symbols-outlined text-lg">delete</span>
                    Delete
                </motion.button>
                <motion.button
                    whileHover={disabled ? {} : { scale: 1.02 }}
                    whileTap={disabled ? {} : { scale: 0.98 }}
                    onClick={() => !disabled && onAnswer('cancel')}
                    disabled={disabled}
                    className={clsx(
                        "flex-1 py-2.5 px-4 rounded-xl font-medium transition-all",
                        disabled
                            ? "bg-muted/50 border border-border text-muted-foreground cursor-not-allowed opacity-50"
                            : "bg-muted border border-border text-foreground hover:bg-accent"
                    )}
                >
                    Cancel
                </motion.button>
            </div>
        </motion.div>
    );
}

export default DeleteEventBox;
