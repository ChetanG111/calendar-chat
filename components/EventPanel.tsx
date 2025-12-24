"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareShare } from '@/components/animate-ui/icons/message-square-share';
import { EventPanelProps } from './event-panel/types';
import { ViewEvent } from './event-panel/ViewEvent';
import { EditEvent } from './event-panel/EditEvent';
import {
    containerVariants,
    itemVariants,
    viewModeVariants,
    editModeVariants
} from './event-panel/animations';

export type { EventPanelMode } from './event-panel/types';

const EventPanel: React.FC<EventPanelProps> = ({
    isOpen,
    mode,
    event,
    initialData,
    onClose,
    onEdit,
    onDelete,
    onSave,
    onChatAboutEvent,
    calendars = []
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    onClick={(e) => e.stopPropagation()}
                    className="fixed right-6 top-20 bottom-6 w-[420px] bg-card/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-border font-sans text-foreground z-[60] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex-none flex items-center justify-between px-4 py-3 bg-transparent border-b border-border">
                        <motion.div variants={itemVariants} className="flex items-center gap-1 text-sm text-muted-foreground px-2 py-1">
                            <span className="material-symbols-outlined text-[18px]">
                                {mode === 'view' ? 'event' : (mode === 'edit' ? 'edit_calendar' : 'add_circle')}
                            </span>
                            <span className="font-medium capitalize">{mode === 'create' ? 'New Event' : (mode === 'edit' ? 'Edit Event' : 'Event')}</span>
                        </motion.div>
                        <motion.div variants={itemVariants} className="flex items-center gap-1">
                            {mode === 'view' && (
                                <>
                                    <motion.button
                                        whileHover={{ scale: 1.1, backgroundColor: "var(--accent)" }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={onEdit}
                                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full transition-colors"
                                        title="Edit event"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                    </motion.button>
                                    <motion.button
                                        whileHover={{ scale: 1.1, backgroundColor: "var(--accent)" }}
                                        whileTap={{ scale: 0.9 }}
                                        onClick={onDelete}
                                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full transition-colors"
                                        title="Delete event"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </motion.button>
                                    {onChatAboutEvent && event && (
                                        <MessageSquareShare
                                            size={18}
                                            className="w-8 h-8 p-1.5 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full transition-colors cursor-pointer hover:bg-[var(--accent)]"
                                            onClick={() => onChatAboutEvent(event)}
                                        />
                                    )}
                                    <div className="w-[1px] h-4 bg-border mx-1"></div>
                                </>
                            )}
                            <motion.button
                                whileHover={{ scale: 1.1, backgroundColor: "var(--accent)" }}
                                whileTap={{ scale: 0.9 }}
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-full transition-colors"
                                title="Close"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </motion.button>
                        </motion.div>
                    </div>

                    <AnimatePresence mode="wait">
                        {mode === 'view' && event ? (
                            <motion.div
                                key="view"
                                variants={viewModeVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="flex-1 overflow-hidden flex flex-col"
                            >
                                <ViewEvent
                                    event={event}
                                    calendars={calendars}
                                    onClose={onClose}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key={mode}
                                variants={editModeVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="flex-1 overflow-hidden flex flex-col"
                            >
                                <EditEvent
                                    mode={mode === 'create' ? 'create' : 'edit'}
                                    event={event}
                                    initialData={initialData}
                                    calendars={calendars}
                                    onClose={onClose}
                                    onSave={onSave}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default EventPanel;
