"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ViewType, CalendarEvent } from '@/types';
import { clsx } from "clsx";
import { Send } from '@/components/animate-ui/icons/send';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { QuizBox, YesNoBox, EventCard, DeleteEventBox, EventAttachmentChip, RecurringEventOptionsBox, RecurringOption } from '@/components/chat-ui';

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
  quiz?: {
    question: string;
  };
  yesno?: {
    question: string;
  };
  deleteEvent?: {
    event: CalendarEvent;
  };
  recurringOptions?: {
    event: CalendarEvent;
    actionType: 'edit' | 'delete';
  };
  isAnswered?: boolean;
}

interface ChatViewProps {
  onViewChange?: (view: ViewType) => void;
  onNavigateToday?: () => void;
  onNavigateToEvent?: (date: Date) => void;
  onEventCreated?: (event: CalendarEvent) => void;
  onEventUpdated?: (event: CalendarEvent) => void;
  onEventDeleted?: (event: CalendarEvent) => void;
  calendars?: import('@/types').CalendarCategory[];
  attachedEvent?: CalendarEvent | null;
  onClearAttachedEvent?: () => void;
  onAttachEvent?: (event: CalendarEvent) => void;
}



// ============================================================================
// Message Components
// ============================================================================

function FormattedText({ text }: { text: string }) {
  if (!text) return null;

  // Regex for **bold** text and text in "quotes"
  const parts = text.split(/(\*\*.*?\*\*|(?<=^|\s)".*?"(?=\s|$))/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-bold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('"') && part.endsWith('"')) {
          return (
            <span key={i} className="font-semibold text-primary/90">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function UserMessage({
  content,
  event,
  calendars = [],
  onNavigateToEvent
}: {
  content: string;
  event?: CalendarEvent;
  calendars?: import('@/types').CalendarCategory[];
  onNavigateToEvent?: (date: Date) => void;
}) {
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
        {/* Show attached event if present */}
        {event && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2"
          >
            <EventCard
              event={event}
              compact
              calendars={calendars}
              onNavigateToEvent={onNavigateToEvent}
            />
          </motion.div>
        )}
        <motion.span variants={textContentVariants} className="inline-block">
          <FormattedText text={content} />
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

function AssistantMessage({
  message,
  onNavigateToEvent,
  calendars = [],
  onQuizAnswer,
  onYesNoAnswer,
  onDeleteEventAnswer,
  onRecurringAnswer,
  onFocusInput,
  onAttachToChat,
}: {
  message: ChatMessage;
  onNavigateToEvent?: (date: Date) => void;
  calendars?: import('@/types').CalendarCategory[];
  onQuizAnswer?: (messageId: string, answer: 'yes' | 'no' | 'custom') => void;
  onYesNoAnswer?: (messageId: string, answer: 'yes' | 'no') => void;
  onDeleteEventAnswer?: (messageId: string, event: CalendarEvent, answer: 'delete' | 'cancel') => void;
  onRecurringAnswer?: (messageId: string, event: CalendarEvent, option: RecurringOption) => void;
  onFocusInput?: () => void;
  onAttachToChat?: (event: CalendarEvent) => void;
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
          {/* Only show text content if there's no quiz */}
          {!message.quiz && (
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
              <FormattedText text={message.content} />
            </motion.div>
          )}

          {/* Show Quiz Box if present */}
          {message.quiz && (
            <QuizBox
              messageId={message.id}
              question={message.quiz.question}
              onAnswer={(answer) => onQuizAnswer?.(message.id, answer)}
              onFocusInput={onFocusInput || (() => { })}
              disabled={message.isAnswered}
            />
          )}

          {/* Show Yes/No Box if present */}
          {message.yesno && (
            <YesNoBox
              messageId={message.id}
              question={message.yesno.question}
              onAnswer={(answer) => onYesNoAnswer?.(message.id, answer)}
              disabled={message.isAnswered}
            />
          )}

          {/* Show Delete Event Box if present */}
          {message.deleteEvent && (
            <DeleteEventBox
              messageId={message.id}
              event={message.deleteEvent.event}
              calendars={calendars}
              onAnswer={(answer) => onDeleteEventAnswer?.(message.id, message.deleteEvent!.event, answer)}
              disabled={message.isAnswered}
            />
          )}

          {/* Show Recurring Event Options Box if present */}
          {message.recurringOptions && (
            <RecurringEventOptionsBox
              messageId={message.id}
              event={message.recurringOptions.event}
              actionType={message.recurringOptions.actionType}
              calendars={calendars}
              onAnswer={(option) => onRecurringAnswer?.(message.id, message.recurringOptions!.event, option)}
              disabled={message.isAnswered}
            />
          )}

          {/* Show event card if one was created/updated */}
          {message.event && !message.deleteEvent && (
            <motion.div
              variants={eventCardVariants}
              initial="initial"
              animate="animate"
              className="mt-2"
            >
              <EventCard
                event={message.event}
                intent={message.intent}
                compact
                onNavigateToEvent={onNavigateToEvent}
                onAttachToChat={onAttachToChat}
                calendars={calendars}
              />
            </motion.div>
          )}

          {/* Show list of events if present */}
          {message.events && message.events.length > 0 && (
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
                    onAttachToChat={onAttachToChat}
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
  attachedEvent,
  onClearAttachedEvent,
  onAttachEvent,
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

  // Focus the chat input
  const focusInput = useCallback(() => {
    textareaRef.current?.focus();
  }, []);


  // Handle quiz answer
  const handleQuizAnswer = useCallback((messageId: string, answer: 'yes' | 'no' | 'custom') => {
    // Add a user response message
    const responseText = answer === 'custom'
      ? '' // Custom will focus input, user types their own
      : answer === 'yes'
        ? 'Yes'
        : 'No';

    if (responseText) {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isAnswered: true } : m).concat([{
        id: crypto.randomUUID(),
        role: 'user',
        content: responseText,
        timestamp: new Date(),
      }]));
    } else {
      // If it was 'custom', we still mark as answered to disable buttons
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isAnswered: true } : m));
    }
  }, []);

  // Handle yes/no answer
  const handleYesNoAnswer = useCallback((messageId: string, answer: 'yes' | 'no') => {
    const responseText = answer === 'yes' ? 'Yes' : 'No';
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isAnswered: true } : m).concat([{
      id: crypto.randomUUID(),
      role: 'user',
      content: responseText,
      timestamp: new Date(),
    }]));
  }, []);

  // Handle delete event answer
  const handleDeleteEventAnswer = useCallback((messageId: string, event: CalendarEvent, answer: 'delete' | 'cancel') => {
    // Mark the message as answered
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isAnswered: true } : m));

    if (answer === 'delete') {
      // Call the parent delete handler if provided
      onEventDeleted?.(event);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `✅ Event "${event.title}" has been deleted.`,
        timestamp: new Date(),
      }]);
    } else {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Event deletion cancelled.',
        timestamp: new Date(),
      }]);
    }
  }, [onEventDeleted]);

  // Handle recurring event answer
  const handleRecurringAnswer = useCallback((messageId: string, event: CalendarEvent, option: RecurringOption) => {
    const labels = {
      single: '**Just this occurrence**',
      future: '**This & Future ones**',
      all: '**The entire series**'
    };

    // Mark the message as answered
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isAnswered: true } : m).concat([{
      id: crypto.randomUUID(),
      role: 'user',
      content: labels[option],
      timestamp: new Date(),
    }]));

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Applied changes to: **${labels[option]}** for "${event.title}".`,
        timestamp: new Date(),
      }]);
    }, 600);
  }, []);

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

    const isQuizCommand = trimmed.toLowerCase() === 'quiz';
    const isYesNoCommand = trimmed.toLowerCase() === 'yesno';
    const isEventCommand = trimmed.toLowerCase() === 'event';
    const isDeleteCommand = trimmed.toLowerCase() === 'delete';
    const isRecurringCommand = trimmed.toLowerCase() === 'recurring';
    // Test commands for multiple events: event1, event2, event3
    const eventCountMatch = trimmed.toLowerCase().match(/^event([123])$/);
    const eventCount = eventCountMatch ? parseInt(eventCountMatch[1]) : 0;

    setIsAnimating(true);

    // Capture attached event before clearing
    const eventToAttach = attachedEvent;

    // Delay message appearance to sync with animation "fly out"
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
        // Include attached event in the user message
        event: eventToAttach || undefined,
      }]);

      // Clear the attached event after sending
      if (eventToAttach && onClearAttachedEvent) {
        onClearAttachedEvent();
      }
      setInputValue('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      // If quiz command, add assistant message with quiz box
      if (isQuizCommand) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            quiz: {
              question: 'Would you like to create a new event?',
            },
          }]);
        }, 500);
      }

      // If yesno command, add assistant message with yes/no box
      if (isYesNoCommand) {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            yesno: {
              question: 'Are you sure you want to proceed?',
            },
          }]);
        }, 500);
      }

      // If event command, add assistant message with placeholder event
      if (isEventCommand) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(14, 0, 0, 0);
        const tomorrowEnd = new Date(tomorrow);
        tomorrowEnd.setHours(15, 0, 0, 0);

        const placeholderEvent: CalendarEvent = {
          id: 'placeholder-event-' + crypto.randomUUID(),
          title: 'Team Meeting',
          start: tomorrow,
          end: tomorrowEnd,
          type: 'default',
          description: 'Weekly sync with the team to discuss progress and blockers.',
          location: 'Conference Room A',
          isAllDay: false,
        };

        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Here is the event you requested:',
            timestamp: new Date(),
            event: placeholderEvent,
          }]);
        }, 500);
      }

      // If delete command, add assistant message with delete confirmation
      if (isDeleteCommand) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(14, 0, 0, 0);
        const tomorrowEnd = new Date(tomorrow);
        tomorrowEnd.setHours(15, 0, 0, 0);

        const eventToDelete: CalendarEvent = {
          id: 'delete-test-event-' + crypto.randomUUID(),
          title: 'Team Meeting',
          start: tomorrow,
          end: tomorrowEnd,
          type: 'business',
          description: 'Weekly sync with the team.',
          location: 'Conference Room B',
          isAllDay: false,
        };

        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            deleteEvent: {
              event: eventToDelete,
            },
          }]);
        }, 500);
      }

      // If recurring command, add assistant message with recurring options
      if (isRecurringCommand) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        const tomorrowEnd = new Date(tomorrow);
        tomorrowEnd.setHours(11, 0, 0, 0);

        const recurringEvent: CalendarEvent = {
          id: 'recurring-test-event-' + crypto.randomUUID(),
          title: 'Weekly Sync',
          start: tomorrow,
          end: tomorrowEnd,
          type: 'business',
          description: 'Recurring weekly sync.',
          location: 'Virtual Room',
          isAllDay: false,
          rrule: 'FREQ=WEEKLY',
        };

        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            recurringOptions: {
              event: recurringEvent,
              actionType: 'delete',
            },
          }]);
        }, 500);
      }

      // If eventN command (event1, event2, event3), show N placeholder events
      if (eventCount > 0) {
        const placeholderEvents: CalendarEvent[] = [];
        const eventTypes = ['default', 'business', 'personal'];
        const eventTitles = ['Morning Standup', 'Client Call', 'Team Lunch'];
        const eventDescriptions = [
          'Daily sync with the dev team.',
          'Quarterly review with the client.',
          'Casual lunch with the team.',
        ];
        const eventLocations = ['Zoom', 'Conference Room A', 'Cafeteria'];

        for (let i = 0; i < eventCount; i++) {
          const eventDate = new Date();
          eventDate.setDate(eventDate.getDate() + 1);
          eventDate.setHours(9 + i * 3, 0, 0, 0);
          const eventEnd = new Date(eventDate);
          eventEnd.setHours(eventDate.getHours() + 1, 0, 0, 0);

          placeholderEvents.push({
            id: `placeholder-event-${i}-` + crypto.randomUUID(),
            title: eventTitles[i],
            start: eventDate,
            end: eventEnd,
            type: eventTypes[i],
            description: eventDescriptions[i],
            location: eventLocations[i],
            isAllDay: false,
          });
        }

        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Here are ${eventCount} event${eventCount > 1 ? 's' : ''} for you:`,
            timestamp: new Date(),
            events: placeholderEvents,
          }]);
        }, 500);
      }
    }, 400);

    setTimeout(() => setIsAnimating(false), 1200);
  }, [inputValue, isAnimating, attachedEvent, onClearAttachedEvent]);

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
      <div className="flex-grow overflow-y-auto flex flex-col items-center pt-8 pb-40 px-4 custom-scrollbar">
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
                  <UserMessage
                    key={message.id}
                    content={message.content}
                    event={message.event}
                    calendars={calendars}
                    onNavigateToEvent={onNavigateToEvent}
                  />
                ) : (
                  <AssistantMessage
                    key={message.id}
                    message={message}
                    onNavigateToEvent={onNavigateToEvent}
                    calendars={calendars}
                    onQuizAnswer={handleQuizAnswer}
                    onYesNoAnswer={handleYesNoAnswer}
                    onDeleteEventAnswer={handleDeleteEventAnswer}
                    onRecurringAnswer={handleRecurringAnswer}
                    onFocusInput={focusInput}
                    onAttachToChat={onAttachEvent}
                  />
                )
              ))}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Fade Overlay - fades messages before input box */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, hsl(var(--background)) 70%)',
        }}
      />

      {/* Input Area */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center px-4">
        <div className="w-full max-w-3xl bg-card rounded-[2rem] shadow-2xl border border-border relative overflow-hidden">

          {/* Attached Event Chip - shows above input when event is attached */}
          <AnimatePresence>
            {attachedEvent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
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
              placeholder={attachedEvent ? `Ask about "${attachedEvent.title}"...` : "Ask AI anything..."}
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />

            {/* Send Button */}
            <div className="flex items-center gap-2 mr-1 flex-shrink-0">
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() && !attachedEvent}
                className={clsx(
                  "w-8 h-8 flex items-center justify-center rounded-full transition-colors",
                  (inputValue.trim() || attachedEvent)
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
    </div>
  );
};

export default ChatView;