"use client";

import React, { useRef, useState, useEffect } from 'react';
import { CalendarEvent, EVENT_THEMES } from '@/types';

interface EventSummaryPopoverProps {
  event: CalendarEvent;
  anchorRect: DOMRect | null;
  containerRect: DOMRect | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const EventSummaryPopover: React.FC<EventSummaryPopoverProps> = ({ event, anchorRect, containerRect, onClose, onEdit, onDelete }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Trigger opening animation
  useEffect(() => {
    // Small delay to ensure smooth animation
    const timer = setTimeout(() => setIsOpen(true), 10);
    return () => clearTimeout(timer);
  }, []);

  if (!anchorRect || !containerRect) return null;

  const theme = EVENT_THEMES[event.type];
  const durationMinutes = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  const durationString = `${hours > 0 ? `${hours} h ` : ''}${mins > 0 ? `${mins} min` : ''}`;

  const handleClose = () => {
    setIsClosing(true);
    setIsOpen(false);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      onClose();
    }, 200); // Match animation duration
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-200 ${!isOpen ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      />

      {/* Floating Panel */}
      <div
        ref={popoverRef}
        onClick={(e) => e.stopPropagation()}
        className={`fixed right-6 top-20 bottom-6 w-[420px] bg-[#202124] rounded-2xl shadow-2xl border border-zinc-700/50 font-sans text-[#e8eaed] z-50 overflow-hidden flex flex-col transition-all duration-200 ease-out ${!isOpen ? 'translate-x-[480px] opacity-0' : 'translate-x-0 opacity-100'}`}
      >
        {/* Header */}
        <div className="flex-none flex items-center justify-between px-4 py-3 bg-[#202124] border-b border-zinc-800">
          <div className="flex items-center gap-1 text-sm text-[#9aa0a6] hover:bg-[#303134] px-2 py-1 rounded cursor-pointer transition-colors">
            <span className="material-symbols-outlined text-[18px]">event</span>
            <span>Event</span>
            <span className="material-symbols-outlined text-[18px]">arrow_drop_down</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-2 text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#303134] rounded-full transition-colors" title="Edit event">
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button onClick={onDelete} className="p-2 text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#303134] rounded-full transition-colors" title="Delete event">
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
            <button className="p-2 text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#303134] rounded-full transition-colors">
              <span className="material-symbols-outlined text-[18px]">more_horiz</span>
            </button>
            <button onClick={handleClose} className="p-2 text-[#9aa0a6] hover:text-[#e8eaed] hover:bg-[#303134] rounded-full transition-colors">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 pt-2 flex flex-col gap-5">

            {/* Title */}
            <div className="flex gap-4 items-start">
              <div className={`w-4 h-4 rounded mt-1.5 flex-shrink-0 ${theme.bg} ${theme.border} border`}></div>
              <div className="flex-1">
                <h2 className="text-[22px] leading-tight font-normal">{event.title}</h2>
                <div className="text-sm text-[#9aa0a6] mt-1">
                  {event.start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Time */}
            <div className="flex gap-4 items-start">
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
            </div>

            {/* Creator */}
            <div className="flex gap-4 items-start">
              <div className="w-8 flex justify-center text-[#9aa0a6]">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
              <div className="flex-1">
                <div className="text-sm">Created by <span className="text-[#9aa0a6]">you</span></div>
              </div>
            </div>

            {/* Location (Optional) */}
            {event.location && (
              <div className="flex gap-4 items-start">
                <div className="w-8 flex justify-center text-[#9aa0a6]">
                  <span className="material-symbols-outlined text-[20px]">location_on</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-blue-400 hover:underline cursor-pointer">{event.location}</div>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="flex gap-4 items-start">
              <div className="w-8 flex justify-center text-[#9aa0a6]">
                <span className="material-symbols-outlined text-[20px]">subject</span>
              </div>
              <div className="flex-1">
                <div className="text-sm text-[#e8eaed] whitespace-pre-wrap">
                  {event.description || <span className="text-[#9aa0a6] italic">No description</span>}
                </div>
              </div>
            </div>

            {/* Footer Calendar Info */}
            <div className="flex gap-4 items-center pt-2">
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
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default EventSummaryPopover;