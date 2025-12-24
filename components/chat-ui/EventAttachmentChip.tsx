"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { CalendarEvent, CalendarCategory } from '@/types';

// ============================================================================
// Event Attachment Chip - Shows attached event in chat input (like reference)
// ============================================================================

export interface EventAttachmentChipProps {
    event: CalendarEvent;
    calendars?: CalendarCategory[];
    onRemove: () => void;
}

export function EventAttachmentChip({
    event,
    calendars = [],
    onRemove,
}: EventAttachmentChipProps) {
    // Get calendar theme for the event
    const calendar = calendars.find(c => c.id === event.type)
        || calendars.find(c => c.isDefault)
        || calendars[0];
    const theme = calendar?.theme;
    const solidBgColor = theme?.solidBg || 'bg-blue-500';

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{
                type: "spring",
                stiffness: 500,
                damping: 25,
            }}
            className="inline-flex items-center gap-2 bg-muted/80 border border-border rounded-xl px-3 py-2 max-w-[280px] group"
        >
            {/* Calendar color indicator */}
            <div className={`w-8 h-8 rounded-lg ${solidBgColor} flex items-center justify-center flex-shrink-0`}>
                <span className="material-symbols-outlined text-white text-lg">event</span>
            </div>

            {/* Event info - just title, no details */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{event.title}</p>
                <p className="text-xs text-muted-foreground">Event</p>
            </div>

            {/* Remove button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onRemove}
                className="w-5 h-5 rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/40 flex items-center justify-center flex-shrink-0 transition-colors"
                title="Remove attachment"
            >
                <span className="material-symbols-outlined text-muted-foreground text-sm">close</span>
            </motion.button>
        </motion.div>
    );
}

export default EventAttachmentChip;
