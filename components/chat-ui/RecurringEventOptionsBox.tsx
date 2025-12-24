"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { CalendarEvent, CalendarCategory } from '@/types';

// ============================================================================
// Recurring Event Options Box - Handles editing/deleting recurring events
// ============================================================================

export type RecurringOption = 'single' | 'future' | 'all';

export interface RecurringEventOptionsBoxProps {
    messageId: string;
    event?: CalendarEvent;
    calendars?: CalendarCategory[];
    onAnswer: (option: RecurringOption) => void;
    actionType?: 'edit' | 'delete';
    disabled?: boolean;
}

export function RecurringEventOptionsBox({
    messageId,
    event,
    calendars = [],
    onAnswer,
    actionType = 'delete',
    disabled = false,
}: RecurringEventOptionsBoxProps) {
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

    // Look up calendar theme if event is provided
    let theme;
    if (event) {
        const calendar = calendars.find(c => c.id === event.type) || calendars.find(c => c.isDefault) || calendars[0];
        theme = calendar?.theme;
    }

    const typeBorderColor = theme?.border || 'border-blue-500';
    const typeBgColor = 'bg-zinc-800/40';

    const icon = actionType === 'delete' ? 'delete' : 'edit';
    const iconColor = actionType === 'delete' ? 'text-red-500' : 'text-primary';

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
                <span className={clsx("material-symbols-outlined text-xl mt-0.5", iconColor)}>{icon}</span>
                <div>
                    <p className="text-foreground font-medium">How far does this change apply?</p>
                </div>
            </div>

            {/* Event Preview Card (if provided) */}
            {event && (
                <div
                    className={clsx(
                        "rounded-lg border-l-4 p-3 mb-4 backdrop-blur-sm shadow-[inset_0_0_0_1000px_rgba(255,255,255,0.04),inset_0_0_0_1px_rgba(255,255,255,0.06)]",
                        typeBorderColor,
                        typeBgColor
                    )}
                >
                    <h4 className="font-medium text-foreground">{event.title}</h4>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {event.isAllDay ? (
                            event.startDate && event.endDate && event.startDate !== event.endDate ? (
                                `${formatDate(new Date(event.start))} - ${formatDate(new Date(event.end))}`
                            ) : (
                                formatDate(new Date(event.start))
                            )
                        ) : (
                            `${formatTime(new Date(event.start))} - ${formatTime(new Date(event.end))}, ${formatDate(new Date(event.start))}`
                        )}
                    </p>
                </div>
            )}

            {/* Options list */}
            <div className="flex flex-col gap-2">
                <motion.button
                    whileHover={disabled ? {} : { scale: 1.01 }}
                    whileTap={disabled ? {} : { scale: 0.99 }}
                    onClick={() => !disabled && onAnswer('single')}
                    disabled={disabled}
                    className={clsx(
                        "group flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        disabled
                            ? "bg-muted/10 border-border/50 opacity-50 cursor-not-allowed"
                            : "bg-muted/30 border-border hover:bg-muted hover:border-border/80"
                    )}
                >
                    <div className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                        disabled ? "bg-zinc-500/10 text-zinc-500" : "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20"
                    )}>
                        <span className="material-symbols-outlined">event</span>
                    </div>
                    <div>
                        <div className={clsx("font-medium", disabled ? "text-muted-foreground" : "text-foreground")}>Just this occurrence</div>
                        <div className="text-xs text-muted-foreground">This event only (single occurrence)</div>
                    </div>
                </motion.button>

                <motion.button
                    whileHover={disabled ? {} : { scale: 1.01 }}
                    whileTap={disabled ? {} : { scale: 0.99 }}
                    onClick={() => !disabled && onAnswer('future')}
                    disabled={disabled}
                    className={clsx(
                        "group flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        disabled
                            ? "bg-muted/10 border-border/50 opacity-50 cursor-not-allowed"
                            : "bg-muted/30 border-border hover:bg-muted hover:border-border/80"
                    )}
                >
                    <div className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                        disabled ? "bg-zinc-500/10 text-zinc-500" : "bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20"
                    )}>
                        <span className="material-symbols-outlined">update</span>
                    </div>
                    <div>
                        <div className={clsx("font-medium", disabled ? "text-muted-foreground" : "text-foreground")}>This & Future ones</div>
                        <div className="text-xs text-muted-foreground">This and future events (from this date onward)</div>
                    </div>
                </motion.button>

                <motion.button
                    whileHover={disabled ? {} : { scale: 1.01 }}
                    whileTap={disabled ? {} : { scale: 0.99 }}
                    onClick={() => !disabled && onAnswer('all')}
                    disabled={disabled}
                    className={clsx(
                        "group flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        disabled
                            ? "bg-muted/10 border-border/50 opacity-50 cursor-not-allowed"
                            : "bg-muted/30 border-border hover:bg-muted hover:border-border/80"
                    )}
                >
                    <div className={clsx(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                        disabled ? "bg-zinc-500/10 text-zinc-500" : "bg-purple-500/10 text-purple-500 group-hover:bg-purple-500/20"
                    )}>
                        <span className="material-symbols-outlined">event_repeat</span>
                    </div>
                    <div>
                        <div className={clsx("font-medium", disabled ? "text-muted-foreground" : "text-foreground")}>The entire series</div>
                        <div className="text-xs text-muted-foreground">All events in the series (entire recurrence)</div>
                    </div>
                </motion.button>
            </div>
        </motion.div>
    );
}

export default RecurringEventOptionsBox;
