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
  isLoading?: boolean;
}

interface ChatViewProps {
  onViewChange?: (view: ViewType) => void;
  onNavigateToday?: () => void;
  onNavigateToEvent?: (date: Date) => void;
  onEventCreated?: (event: CalendarEvent) => void;
  onEventUpdated?: (event: CalendarEvent) => void;
  onEventDeleted?: (event: CalendarEvent) => void;
}

// ============================================================================
// Chat API Client
// ============================================================================

async function sendChatMessage(message: string, conversationId: string): Promise<{
  message: string;
  intent: string;
  intentId?: string;
  event?: CalendarEvent;
  events?: CalendarEvent[];
  conversationId: string;
}> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      conversationId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      currentTime: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send message');
  }

  return response.json();
}

// ============================================================================
// Message Components
// ============================================================================

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
        className="bg-surface-dark text-gray-100 px-5 py-3 rounded-2xl rounded-tr-sm max-w-[80%] border border-border-dark overflow-hidden"
      >
        <motion.span variants={textContentVariants} className="inline-block">
          {content}
        </motion.span>
      </motion.div>
      <motion.div
        variants={avatarVariants}
        className="ml-3 mt-1 w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-black flex-shrink-0"
      >
        U
      </motion.div>
    </motion.div>
  );
}

function AssistantMessage({ message, onNavigateToEvent }: { message: ChatMessage; onNavigateToEvent?: (date: Date) => void }) {
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
        className="mt-1 w-8 h-8 rounded-full bg-surface-dark border border-border-dark flex items-center justify-center flex-shrink-0"
      >
        {message.isLoading ? (
          <span className="material-symbols-outlined text-gray-400 text-sm animate-spin">progress_activity</span>
        ) : (
          <span className="material-symbols-outlined text-gray-400 text-sm">smart_toy</span>
        )}
      </motion.div>

      <motion.div
        variants={bubbleContentVariants}
        className="space-y-3 w-full max-w-[85%]"
      >
        {message.isLoading ? (
          <motion.div
            className="flex items-center gap-2 text-gray-400"
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <span className="text-sm">Thinking...</span>
          </motion.div>
        ) : (
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
                "text-gray-200 whitespace-pre-wrap",
                isSuccess && "text-green-300",
                isError && "text-red-300"
              )}
            >
              {message.content}
            </motion.div>

            {/* Show event card if one was created/updated */}
            {message.event && (
              <motion.div variants={eventCardVariants}>
                <EventCard
                  event={message.event}
                  intent={message.intent}
                  onNavigateToEvent={onNavigateToEvent}
                />
              </motion.div>
            )}

            {/* Show list of events if query result */}
            {message.events && message.events.length > 0 && message.intent === 'queried' && (
              <div className="space-y-2 mt-2">
                {message.events.map((event, index) => (
                  <motion.div
                    key={event.id || index}
                    variants={eventCardVariants}
                    initial="initial"
                    animate="animate"
                    transition={{ delay: index * 0.05 }}
                  >
                    <EventCard
                      event={event}
                      compact
                      onNavigateToEvent={onNavigateToEvent}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function EventCard({ event, intent, compact, onNavigateToEvent }: {
  event: CalendarEvent;
  intent?: string;
  compact?: boolean;
  onNavigateToEvent?: (date: Date) => void;
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

  const typeColors: Record<string, string> = {
    business: 'border-blue-500 bg-blue-500/10 hover:bg-blue-500/20',
    personal: 'border-red-500 bg-red-500/10 hover:bg-red-500/20',
    meetings: 'border-orange-500 bg-orange-500/10 hover:bg-orange-500/20',
    holiday: 'border-green-500 bg-green-500/10 hover:bg-green-500/20',
  };

  return (
    <div
      onClick={() => onNavigateToEvent?.(new Date(event.start))}
      className={clsx(
        "rounded-lg border-l-4 p-3 transition-colors cursor-pointer group",
        typeColors[event.type] || typeColors.personal,
        compact ? 'bg-surface-dark/50' : 'bg-surface-dark'
      )}
      role="button"
      tabIndex={0}
      title="View in calendar"
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-white group-hover:underline decoration-white/30 underline-offset-4">{event.title}</h4>
          <p className="text-sm text-gray-400 mt-0.5">
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
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
            Recurring
          </span>
        )}

        {/* Hover indicator icon */}
        <span className="material-symbols-outlined text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
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
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [conversationId] = useState(() => crypto.randomUUID());

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
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Add loading placeholder
    const loadingId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: loadingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    }]);

    try {
      const response = await sendChatMessage(trimmed, conversationId);

      // Replace loading with actual response
      setMessages(prev => prev.map(msg =>
        msg.id === loadingId
          ? {
            id: loadingId,
            role: 'assistant' as const,
            content: response.message,
            timestamp: new Date(),
            intent: response.intent,
            event: response.event,
            events: response.events,
          }
          : msg
      ));

      // Trigger callbacks based on intent
      if (response.intent === 'created' && response.event && onEventCreated) {
        onEventCreated(response.event);
      } else if (response.intent === 'updated' && response.event && onEventUpdated) {
        onEventUpdated(response.event);
      } else if (response.intent === 'deleted' && response.event && onEventDeleted) {
        onEventDeleted(response.event);
      }

    } catch (error) {
      // Replace loading with error
      setMessages(prev => prev.map(msg =>
        msg.id === loadingId
          ? {
            id: loadingId,
            role: 'assistant' as const,
            content: `❌ ${error instanceof Error ? error.message : 'Something went wrong'}`,
            timestamp: new Date(),
          }
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, conversationId, onEventCreated, onEventUpdated, onEventDeleted]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div className="flex flex-col h-full bg-background-dark relative overflow-hidden">
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
                className="w-16 h-16 rounded-full bg-surface-dark border border-border-dark flex items-center justify-center mb-4"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                  delay: 0.1,
                }}
              >
                <span className="material-symbols-outlined text-gray-400 text-3xl">calendar_month</span>
              </motion.div>
              <motion.h2
                className="text-xl font-semibold text-white mb-2"
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
                className="text-gray-400 max-w-md"
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
                      className="px-3 py-1.5 text-sm text-gray-300 bg-surface-dark border border-border-dark rounded-full hover:bg-white/5 transition-colors"
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
        <div className="w-full max-w-3xl bg-surface-dark rounded-[2rem] p-2 shadow-2xl border border-border-dark flex items-center gap-2 relative">

          {/* Add Button & Menu */}
          <div className="relative flex-shrink-0 ml-1">
            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute bottom-12 left-0 w-52 bg-zinc-800/95 backdrop-blur-sm border border-zinc-700 rounded-2xl shadow-2xl z-50 overflow-hidden py-1.5 mb-2 transform origin-bottom-left animate-in fade-in zoom-in-95 duration-200">
                  <button
                    onClick={() => { onNavigateToday?.(); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[15px] text-gray-200 hover:bg-white/10 transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-gray-400 text-[20px]">today</span>
                    Today
                  </button>
                  <button
                    onClick={() => { onViewChange?.('week'); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[15px] text-gray-200 hover:bg-white/10 transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-gray-400 text-[20px]">view_week</span>
                    Week
                  </button>
                  <button
                    onClick={() => { onViewChange?.('month'); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[15px] text-gray-200 hover:bg-white/10 transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-gray-400 text-[20px]">calendar_month</span>
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
                  ? "text-white rotate-45"
                  : "text-gray-400 hover:text-white"
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
            className="flex-1 bg-transparent border-0 focus:ring-0 focus:outline-none text-white placeholder-gray-500 resize-none py-3 px-2 text-base"
            placeholder="Ask AI anything..."
            rows={1}
            style={{ minHeight: '44px', maxHeight: '120px' }}
            disabled={isLoading}
          />

          {/* Send Button */}
          <div className="flex items-center gap-2 mr-1 flex-shrink-0">
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className={clsx(
                "w-8 h-8 flex items-center justify-center rounded-full transition-colors",
                inputValue.trim() && !isLoading
                  ? "bg-primary text-white hover:brightness-110"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              )}
            >
              <Send size={18} animateOnHover />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatView;