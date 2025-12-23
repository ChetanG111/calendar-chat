"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ViewType, CalendarEvent } from '@/types';
import { clsx } from "clsx";
import { Send } from '@/components/animate-ui/icons/send';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// ============================================================================
// Animation Variants - Premium Springy Physics
// ============================================================================

// User message animates from the center (input area) to the right bubble position
const userMessageVariants: Variants = {
  initial: {
    opacity: 0,
    x: -100, // Move from left (input center) to right
    y: 40,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 200, // Slower, more visible
      damping: 20,
      mass: 1,
      staggerChildren: 0.2, // More delay for text
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

// Slower text drift for the "text slowly moves to the right" effect
const textContentVariants: Variants = {
  initial: {
    x: -30,
    opacity: 0,
  },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.8, // Slower
      ease: [0.2, 0.8, 0.2, 1], // Smooth easing
      delay: 0.2,
    },
  },
};

// Assistant message animates from left side
const assistantMessageVariants: Variants = {
  initial: {
    opacity: 0,
    x: -40,
    y: 20,
    scale: 0.85,
  },
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 18,
      mass: 0.7,
      staggerChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

// Bubble content has its own subtle spring for the "settling" effect
const bubbleContentVariants: Variants = {
  initial: {
    scale: 0.9,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 20,
      mass: 0.5,
    },
  },
};

// Avatar pops in with overshoot
const avatarVariants: Variants = {
  initial: {
    scale: 0,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 600,
      damping: 12,
      mass: 0.4,
      delay: 0.1,
    },
  },
};

// Event card slides up with bounce
const eventCardVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 20,
      mass: 0.6,
    },
  },
};

// ============================================================================
// Types
// ============================================================================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
  event?: CalendarEvent;
  events?: CalendarEvent[];
}

interface ChatViewProps {
  onViewChange?: (view: ViewType) => void;
  onNavigateToday?: () => void;
  onNavigateToEvent?: (date: Date) => void;
  onEventCreated?: (event: CalendarEvent) => void;
  onEventUpdated?: (event: CalendarEvent) => void;
  onEventDeleted?: (event: CalendarEvent) => void;
  calendars?: import('@/types').CalendarCategory[];
}



// ============================================================================
// Message Components
/**
 * Renders a right-aligned user chat message composed of an animated message bubble and a compact avatar.
 *
 * @param content - The text to display inside the user's message bubble
 * @returns The JSX element for the animated user message and avatar
 */

function UserMessage({ content }: { content: string }) {
  return (
    <motion.div
      className="flex justify-end"
      variants={userMessageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div
        variants={bubbleContentVariants}
        className="bg-card text-foreground px-5 py-3 rounded-2xl rounded-tr-sm max-w-[80%] border border-border overflow-hidden"
      >
        <motion.span variants={textContentVariants} className="inline-block">
          {content}
        </motion.span>
      </motion.div>
      <motion.div
        variants={avatarVariants}
        className="ml-3 mt-1 w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-background flex-shrink-0"
      >
        U
      </motion.div>
    </motion.div>
  );
}

/**
 * Renders an assistant chat message with optional event card(s).
 *
 * Displays the message content, colors the text green if it starts with "✅" or red if it starts with "❌", and renders an EventCard when the message contains a single `event` or a list of `events` (for `'queried'` intents).
 *
 * @param message - The chat message to render, possibly containing `event`, `events`, and `intent` metadata.
 * @param onNavigateToEvent - Optional callback invoked with an event's date when an EventCard is activated.
 * @param calendars - Optional calendar category list used to theme rendered EventCard components.
 * @returns A JSX element representing the assistant message and any associated event cards.
 */
function AssistantMessage({
  message,
  onNavigateToEvent,
  calendars = []
}: {
  message: ChatMessage;
  onNavigateToEvent?: (date: Date) => void;
  calendars?: import('@/types').CalendarCategory[];
}) {
  const isSuccess = message.content.startsWith('✅');
  const isError = message.content.startsWith('❌');

  return (
    <motion.div
      className="flex items-start gap-4"
      variants={assistantMessageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div
        variants={avatarVariants}
        className="mt-1 w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center flex-shrink-0"
      >
        <span className="material-symbols-outlined text-muted-foreground text-sm">smart_toy</span>
      </motion.div>

      <motion.div
        variants={bubbleContentVariants}
        className="space-y-3 w-full max-w-[85%]"
      >
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
            }}
            className={clsx(
              "text-foreground whitespace-pre-wrap",
              isSuccess && "text-green-500",
              isError && "text-red-500"
            )}
          >
            {message.content}
          </motion.div>

          {/* Show event card if one was created/updated */}
          {message.event && (
            <motion.div
              variants={eventCardVariants}
              initial="initial"
              animate="animate"
              className="mt-2"
            >
              <EventCard
                event={message.event}
                intent={message.intent}
                onNavigateToEvent={onNavigateToEvent}
                calendars={calendars}
              />
            </motion.div>
          )}

          {/* Show list of events if query result */}
          {message.events && message.events.length > 0 && message.intent === 'queried' && (
            <div className="space-y-2 mt-2">
              {message.events.map((event, index) => (
                <motion.div
                  key={event.id || `event-${index}`}
                  variants={eventCardVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ delay: index * 0.05 }}
                  className="mt-1"
                >
                  <EventCard
                    event={event}
                    compact
                    onNavigateToEvent={onNavigateToEvent}
                    calendars={calendars}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </>
      </motion.div>
    </motion.div>
  );
}

/**
 * Renders a clickable event card styled according to calendar theme and compact mode.
 *
 * @param event - The calendar event to display (title, start/end, all-day flag, recurrence, etc.)
 * @param intent - Optional intent string influencing how multiple events are presented (opaque to this component)
 * @param compact - If true, renders a visually compact variant of the card
 * @param onNavigateToEvent - Optional callback invoked with the event's start date when the card is activated
 * @param calendars - Optional list of calendar categories used to determine theming for the event type
 * @returns A themed, interactive card element representing the provided calendar event
 */
function EventCard({ event, intent, compact, onNavigateToEvent, calendars = [] }: {
  event: CalendarEvent;
  intent?: string;
  compact?: boolean;
  onNavigateToEvent?: (date: Date) => void;
  calendars?: import('@/types').CalendarCategory[];
}) {
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
  const typeBgColor = compact ? 'bg-card/50' : (theme?.bg || 'bg-muted/50');
  const typeHoverBgColor = theme?.hover || 'hover:bg-muted/80';

  return (
    <div
      onClick={() => onNavigateToEvent?.(new Date(event.start))}
      className={clsx(
        "rounded-lg border-l-4 p-3 transition-colors cursor-pointer group",
        typeBorderColor,
        typeBgColor,
        typeHoverBgColor
      )}
      role="button"
      tabIndex={0}
      title="View in calendar"
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-foreground group-hover:underline decoration-foreground/30 underline-offset-4">{event.title}</h4>
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
        </div>
        {event.rrule && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            Recurring
          </span>
        )}

        {/* Hover indicator icon */}
        <span className="material-symbols-outlined text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          arrow_forward
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const ChatView: React.FC<ChatViewProps> = ({
  onViewChange,
  onNavigateToday,
  onNavigateToEvent,
  onEventCreated,
  onEventUpdated,
  onEventDeleted,
  calendars = [],
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, []);

  // Send message
  const handleSend = useCallback(async () => {
    if (isAnimating) return;
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    setIsAnimating(true);

    // Delay message appearance to sync with animation "fly out"
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      }]);
      setInputValue('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }, 400);

    setTimeout(() => setIsAnimating(false), 1200);
  }, [inputValue, isAnimating]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Chat Content Area */}
      <div className="flex-grow overflow-y-auto flex flex-col items-center pt-8 pb-32 px-4 custom-scrollbar">
        <div className="w-full max-w-3xl space-y-6">
          {messages.length === 0 ? (
            // Empty state with springy entrance
            <motion.div
              className="flex flex-col items-center justify-center h-[50vh] text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center mb-4"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                  delay: 0.1,
                }}
              >
                <span className="material-symbols-outlined text-muted-foreground text-3xl">calendar_month</span>
              </motion.div>
              <motion.h2
                className="text-xl font-semibold text-foreground mb-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  delay: 0.2,
                }}
              >
                Calendar Assistant
              </motion.h2>
              <motion.p
                className="text-muted-foreground max-w-md"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                  delay: 0.25,
                }}
              >
                Ask me to create events, find meetings, or manage your schedule.
              </motion.p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {[
                  "Schedule a meeting tomorrow at 2pm",
                  "What's on my calendar this week?",
                  "Create a daily standup at 9am",
                ].map((suggestion, index) => (

                  <motion.div
                    key={suggestion}
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: {
                        type: "spring",
                        stiffness: 400,
                        damping: 20,
                        delay: 0.3 + index * 0.08,
                      }
                    }}
                  >
                    <motion.button
                      onClick={() => {
                        setInputValue(suggestion);
                        textareaRef.current?.focus();
                      }}
                      className="px-3 py-1.5 text-sm text-muted-foreground bg-card border border-border rounded-full hover:bg-accent hover:text-accent-foreground hover:border-accent transition-colors"
                      whileHover={{
                        scale: 1.05,
                        transition: { duration: 0.2 }
                      }}
                      whileTap={{
                        scale: 0.95,
                        transition: { duration: 0.1 }
                      }}
                    >
                      {suggestion}
                    </motion.button>
                  </motion.div>
                ))}

              </div>
            </motion.div>
          ) : (
            // Messages with AnimatePresence for smooth enter/exit
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                message.role === 'user' ? (
                  <UserMessage key={message.id} content={message.content} />
                ) : (
                  <AssistantMessage
                    key={message.id}
                    message={message}
                    onNavigateToEvent={onNavigateToEvent}
                    calendars={calendars}
                  />
                )
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4">
        <div className="w-full max-w-3xl bg-card rounded-[2rem] p-2 shadow-2xl border border-border flex items-center gap-2 relative">

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
                    onClick={() => { onNavigateToday?.(); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[15px] text-foreground hover:bg-accent transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-muted-foreground text-[20px]">today</span>
                    Today
                  </button>
                  <button
                    onClick={() => { onViewChange?.('week'); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[15px] text-foreground hover:bg-accent transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-muted-foreground text-[20px]">view_week</span>
                    Week
                  </button>
                  <button
                    onClick={() => { onViewChange?.('month'); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[15px] text-foreground hover:bg-accent transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-muted-foreground text-[20px]">calendar_month</span>
                    Month
                  </button>
                </div>
              </>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={clsx(
                "w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200",
                isMenuOpen
                  ? "text-foreground rotate-45"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="material-symbols-outlined text-[24px]">add</span>
            </button>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none text-foreground placeholder-muted-foreground resize-none py-3 px-2 text-base"
            placeholder="Ask AI anything..."
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
          />

          {/* Send Button */}
          <div className="flex items-center gap-2 mr-1 flex-shrink-0">
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className={clsx(
                "w-8 h-8 flex items-center justify-center rounded-full transition-colors",
                inputValue.trim()
                  ? "bg-primary text-white hover:brightness-110"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <Send size={18} animate={isAnimating} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;