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
  const [isOpen, setIsOpen] = useState(false);

  // Trigger opening animation
  useEffect(() => {
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
    setIsOpen(false);
    setTimeout(() => {
      onClose();
    }, 400); // Match animation duration
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 ${!isOpen ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      />

      {/* Floating Panel */}
      <div
        ref={popoverRef}
        onClick={(e) => e.stopPropagation()}
        className={`fixed right-6 top-12 bottom-6 w-[440px] bg-surface-overlay rounded-2xl shadow-premium-lg border border-border font-sans text-foreground z-50 overflow-hidden flex flex-col transition-all duration-400 ease-[cubic-bezier(0.175,0.885,0.32,1.1)] ${!isOpen ? 'translate-x-[480px] opacity-0' : 'translate-x-0 opacity-100'}`}
      >
        {/* Header */}
        <div className="flex-none flex items-center justify-between px-6 py-4 bg-canvas/30 border-b border-border">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-fg-subtle">
            <span className="material-symbols-outlined text-[16px]">event</span>
            <span>Event Detail</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="w-8 h-8 flex items-center justify-center text-fg-muted hover:text-foreground hover:bg-white/5 rounded-lg transition-colors" title="Edit event">
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button onClick={onDelete} className="w-8 h-8 flex items-center justify-center text-fg-muted hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors" title="Delete event">
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center text-fg-muted hover:text-foreground hover:bg-white/5 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 pb-10 flex flex-col gap-8">

            {/* Title & Type */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ring-2 ring-background ${theme.dot}`}></div>
                <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${theme.text}`}>{event.type}</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground leading-[1.1]">{event.title}</h2>
              <div className="text-sm font-medium text-fg-muted flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                {event.start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            <div className="grid gap-6">
              {/* Timing */}
              <div className="flex gap-5 items-start">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center flex-shrink-0 border border-white/5">
                  <span className="material-symbols-outlined text-fg-muted">schedule</span>
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle mb-1">Time & Duration</h3>
                  <div className="text-sm font-medium flex items-center gap-3">
                    <span className="text-foreground">{event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                    <span className="text-fg-subtle">\u2192</span>
                    <span className="text-foreground">{event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                    <span className="ml-2 px-2 py-0.5 rounded bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent uppercase tracking-wider">{durationString}</span>
                  </div>
                </div>
              </div>

              {/* Location */}
              {event.location && (
                <div className="flex gap-5 items-start">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center flex-shrink-0 border border-white/5">
                    <span className="material-symbols-outlined text-fg-muted">location_on</span>
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle mb-1">Location</h3>
                    <div className="text-sm font-medium text-foreground">{event.location}</div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="flex gap-5 items-start">
                <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center flex-shrink-0 border border-white/5">
                  <span className="material-symbols-outlined text-fg-muted text-[22px]">notes</span>
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle mb-1">Description</h3>
                  <div className="text-sm font-medium text-fg-muted whitespace-pre-wrap leading-relaxed">
                    {event.description || <span className="opacity-40 italic font-normal">No description provided</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Meta Info */}
            <div className="mt-4 pt-8 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-surface-raised border border-border flex items-center justify-center overflow-hidden">
                  <span className="material-symbols-outlined text-[16px] text-fg-muted">person</span>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-fg-subtle uppercase tracking-wider">Organizer</div>
                  <div className="text-xs font-medium text-foreground">You</div>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-white/[0.03] border border-white/10 rounded-full text-[10px] font-bold text-fg-subtle uppercase tracking-wider">Busy</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default EventSummaryPopover;