import React, { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { Send } from '@/components/animate-ui/icons/send';
import { EventAttachmentChip } from './EventAttachmentChip';
import { CalendarEvent, ViewType } from '@/types';

interface ChatInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  isAnimating: boolean;
  attachedEvent?: CalendarEvent | null;
  onClearAttachedEvent?: () => void;
  calendars?: import('@/types').CalendarCategory[];
  onViewChange?: (view: ViewType) => void;
  onNavigateToday?: () => void;
  placeholder?: string;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  (
    {
      value,
      onChange,
      onSend,
      isAnimating,
      attachedEvent,
      onClearAttachedEvent,
      calendars = [],
      onViewChange,
      onNavigateToday,
      placeholder = "Ask AI anything...",
    },
    ref
  ) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Handle Enter key
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    };

    return (
      <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4">
        <div className="w-full max-w-3xl bg-card rounded-[2rem] shadow-2xl border border-border relative overflow-hidden">
          {/* Attached Event Chip - shows above input when event is attached */}
          <AnimatePresence>
            {attachedEvent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                className="px-3 pt-3 pb-1"
              >
                <EventAttachmentChip
                  event={attachedEvent}
                  calendars={calendars}
                  onRemove={() => onClearAttachedEvent?.()}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Row */}
          <div className="p-2 flex items-center gap-2">
            {/* Add Button & Menu */}
            <div className="relative flex-shrink-0 ml-1">
              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute bottom-12 left-0 w-52 bg-card/95 backdrop-blur-sm border border-border rounded-2xl shadow-2xl z-50 overflow-hidden py-1.5 mb-2 transform origin-bottom-left animate-in fade-in zoom-in-95 duration-200">
                    <button
                      onClick={() => {
                        onNavigateToday?.();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[15px] text-foreground hover:bg-accent transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-muted-foreground text-[20px]">
                        today
                      </span>
                      Today
                    </button>
                    <button
                      onClick={() => {
                        onViewChange?.('week');
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[15px] text-foreground hover:bg-accent transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-muted-foreground text-[20px]">
                        view_week
                      </span>
                      Week
                    </button>
                    <button
                      onClick={() => {
                        onViewChange?.('month');
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[15px] text-foreground hover:bg-accent transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-muted-foreground text-[20px]">
                        calendar_month
                      </span>
                      Month
                    </button>
                  </div>
                </>
              )}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={clsx(
                  'w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200',
                  isMenuOpen
                    ? 'text-foreground rotate-45'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span className="material-symbols-outlined text-[24px]">add</span>
              </button>
            </div>

            {/* Textarea */}
            <textarea
              ref={ref}
              value={value}
              onChange={(e) => {
                const textarea = e.target;
                textarea.style.height = 'auto';
                textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
                onChange(e);
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none text-foreground placeholder-muted-foreground resize-none py-3 px-2 text-base"
              placeholder={placeholder}
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />

            {/* Send Button */}
            <div className="flex items-center gap-2 mr-1 flex-shrink-0">
              <button
                onClick={onSend}
                disabled={!value.trim() && !attachedEvent}
                className={clsx(
                  'w-8 h-8 flex items-center justify-center rounded-full transition-colors',
                  value.trim() || attachedEvent
                    ? 'bg-primary text-white hover:brightness-110'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                <Send size={18} animate={isAnimating} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ChatInput.displayName = 'ChatInput';
