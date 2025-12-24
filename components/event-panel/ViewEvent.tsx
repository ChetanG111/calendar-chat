import React from 'react';
import { motion } from 'framer-motion';
import { CalendarEvent, CalendarCategory, CalendarTheme } from '@/types';
import { itemVariants, contentContainerVariants } from './animations';

interface ViewEventProps {
    event: CalendarEvent;
    calendars?: CalendarCategory[];
    onClose?: () => void;
}

const defaultTheme: CalendarTheme = {
    primary: 'blue',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500',
    text: 'text-blue-100',
    dot: 'bg-blue-500',
    hover: 'hover:bg-blue-500/30',
    solidBg: 'bg-blue-500'
};

export const ViewEvent: React.FC<ViewEventProps> = ({ event, calendars = [] }) => {
    const viewTheme = event ? (calendars?.find(c => c.id === event.type)?.theme || defaultTheme) : defaultTheme;
    
    const durationMinutes = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    const durationString = `${hours > 0 ? `${hours} h ` : ''}${mins > 0 ? `${mins} min` : ''}`;

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            <motion.div variants={contentContainerVariants} className="p-6 pt-2 flex flex-col gap-5">
                {/* Title */}
                <motion.div variants={itemVariants} className="flex gap-4 items-start">
                    {event.end >= new Date() && (
                        <div className={`w-4 h-4 rounded mt-1.5 flex-shrink-0 ${viewTheme.bg} ${viewTheme.border} border`}></div>
                    )}
                    <div className="flex-1">
                        <h2 className="text-[22px] leading-tight font-normal text-[#e8eaed]">{event.title}</h2>
                        <div className="text-sm text-[#9aa0a6] mt-1">
                            {event.start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </div>
                    </div>
                </motion.div>

                {/* Time */}
                <motion.div variants={itemVariants} className="flex gap-4 items-start">
                    <div className="w-8 flex justify-center text-[#9aa0a6]">
                        <span className="material-symbols-outlined text-[20px]">schedule</span>
                    </div>
                    <div className="flex-1">
                        <div className="text-sm text-[#e8eaed]">
                            {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {'\u2192'} {event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            <span className="text-[#9aa0a6] ml-2">{durationString}</span>
                        </div>
                        <div className="text-xs text-[#9aa0a6] mt-1">Time zone • Repeat</div>
                    </div>
                </motion.div>

                {/* Creator */}
                <motion.div variants={itemVariants} className="flex gap-4 items-start">
                    <div className="w-8 flex justify-center text-[#9aa0a6]">
                        <span className="material-symbols-outlined text-[20px]">person</span>
                    </div>
                    <div className="flex-1">
                        <div className="text-sm text-[#e8eaed]">Created by <span className="text-[#9aa0a6]">you</span></div>
                    </div>
                </motion.div>

                {/* Location */}
                {event.location && (
                    <motion.div variants={itemVariants} className="flex gap-4 items-start">
                        <div className="w-8 flex justify-center text-[#9aa0a6]">
                            <span className="material-symbols-outlined text-[20px]">location_on</span>
                        </div>
                        <div className="flex-1">
                            <div className="text-sm text-blue-400 hover:underline cursor-pointer">{event.location}</div>
                        </div>
                    </motion.div>
                )}

                {/* Description */}
                <motion.div variants={itemVariants} className="flex gap-4 items-start">
                    <div className="w-8 flex justify-center text-[#9aa0a6]">
                        <span className="material-symbols-outlined text-[20px]">subject</span>
                    </div>
                    <div className="flex-1">
                        <div className="text-sm text-[#e8eaed] whitespace-pre-wrap">
                            {event.description || <span className="text-[#9aa0a6] italic">No description</span>}
                        </div>
                    </div>
                </motion.div>

                {/* Footer Calendar Info */}
                <motion.div variants={itemVariants} className="flex gap-4 items-center pt-2">
                    <div className="w-8 flex justify-center text-[#9aa0a6]">
                        <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${viewTheme.dot}`}></div>
                            <span className="text-sm text-[#e8eaed] capitalize">{calendars?.find(c => c.id === event.type)?.label || event.type}</span>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
};
