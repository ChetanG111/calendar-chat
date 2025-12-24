"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ViewType, CalendarEvent } from '@/types';
import { AnimatePresence } from 'framer-motion';
import { ChatMessage } from '@/components/chat-ui/types';
import { RecurringOption } from '@/components/chat-ui/RecurringEventOptionsBox';
import { UserMessage, AssistantMessage } from '@/components/chat-ui/MessageBubble';
import { ChatInput } from '@/components/chat-ui/ChatInput';
import { ChatWelcome } from '@/components/chat-ui/ChatWelcome';

// ============================================================================
// Types
// ============================================================================

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
      focusInput();
    }
  }, [focusInput]);

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

  // Send message
  const handleSend = useCallback(async () => {
    if (isAnimating) return;
    const trimmed = inputValue.trim();
    if (!trimmed && !attachedEvent) return;

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

      // Reset textarea height via ref
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

  // Handle suggestion click from welcome screen
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setInputValue(suggestion);
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Chat Content Area */}
      <div className="flex-grow overflow-y-auto flex flex-col items-center pt-8 pb-40 px-4 custom-scrollbar">
        <div className="w-full max-w-3xl space-y-6">
          {messages.length === 0 ? (
            <ChatWelcome onSuggestionClick={handleSuggestionClick} />
          ) : (
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
      <ChatInput
        ref={textareaRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onSend={handleSend}
        isAnimating={isAnimating}
        attachedEvent={attachedEvent}
        onClearAttachedEvent={onClearAttachedEvent}
        calendars={calendars}
        onViewChange={onViewChange}
        onNavigateToday={onNavigateToday}
      />
    </div>
  );
};

export default ChatView;
