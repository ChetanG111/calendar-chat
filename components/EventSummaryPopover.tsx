"use client";

import React from 'react';
import { CalendarEvent, EVENT_THEMES } from '@/types';
import { motion, Variants } from 'framer-motion';

interface EventSummaryPopoverProps {
  event: CalendarEvent;
  anchorRect: DOMRect | null;
  containerRect: DOMRect | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const containerVariants: Variants = {
  hidden: {
    x: 480,
    opacity: 0,
    scale: 0.95,
    filter: "blur(10px)"
  },
  visible: {
    x: 0,
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      type: "spring",
      damping: 28,
      stiffness: 300,
      mass: 0.8,
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  },
  exit: {
    x: 100,
    opacity: 0,
    scale: 0.95,
    filter: "blur(10px)",
    transition: {
      duration: 0.2,
      ease: "anticipate"
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  }
};

const EventSummaryPopover: React.FC<EventSummaryPopoverProps> = ({ event, anchorRect, containerRect, onClose, onEdit, onDelete }) => {
  if (!anchorRect || !containerRect) return null;

  const theme = EVENT_THEMES[event.type];
  const durationMinutes = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  const durationString = `${hours > 0 ? `${hours} h ` : ''}${mins > 0 ? `${mins} min` : ''}`;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onClick={(e) => e.stopPropagation()}
      className="fixed right-6 top-20 bottom-6 w-[420px] bg-[#202124]/85 backdrop-blur-xl rounded-2xl shadow-[0_24px_48px_rgba(0,0,0,0.75)] border border-white/10 font-sans text-[#e8eaed] z-50 overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex-none flex items-center justify-between px-4 py-3 bg-transparent border-b border-white/10">
        <motion.div variants={itemVariants} className="flex items-center gap-1 text-sm text-[#9aa0a6] hover:bg-white/5 px-2 py-1 rounded cursor-pointer transition-colors">
          <span className="material-symbols-outlined text-[18px]">event</span>
          <span>Event</span>
          <span className="material-symbols-outlined text-[18px]">arrow_drop_down</span>
        </motion.div>
        <motion.div variants={itemVariants} className="flex items-center gap-1">
          <button onClick={onEdit} className="w-8 h-8 flex items-center justify-center text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-white/10 rounded-full transition-colors" title="Edit event">
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button onClick={onDelete} className="w-8 h-8 flex items-center justify-center text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-white/10 rounded-full transition-colors" title="Delete event">
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
          <button className="w-8 h-8 flex items-center justify-center text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-white/10 rounded-full transition-colors">
            <span className="material-symbols-outlined text-[18px]">more_horiz</span>
          </button>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-white/10 rounded-full transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </motion.div>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 pt-2 flex flex-col gap-5">

          {/* Title */}
          <motion.div variants={itemVariants} className="flex gap-4 items-start">
            {event.end >= new Date() && (
              <div className={`w-4 h-4 rounded mt-1.5 flex-shrink-0 ${theme.bg} ${theme.border} border`}></div>
            )}
            <div className="flex-1">
              <h2 className="text-[22px] leading-tight font-normal">{event.title}</h2>
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
              <div className="text-sm">
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
              <div className="text-sm">Created by <span className="text-[#9aa0a6]">you</span></div>
            </div>
          </motion.div>

          {/* Location (Optional) */}
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
                <div className={`w-3 h-3 rounded-full ${theme.dot}`}></div>
                <span className="text-sm text-[#e8eaed] capitalize">{event.type}</span>
              </div>
              <div className="flex gap-2 text-xs text-[#9aa0a6]">
                <span>Busy</span>
                <span>•</span>
                <span>Default visibility</span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
};

export default EventSummaryPopover;