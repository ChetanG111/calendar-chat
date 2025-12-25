"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ViewType, CalendarEvent } from '@/types';
import { AnimatePresence } from 'framer-motion';
import { ChatMessage } from '@/components/chat-ui/types';
import { RecurringOption } from '@/components/chat-ui/RecurringEventOptionsBox';
import { UserMessage, AssistantMessage } from '@/components/chat-ui/MessageBubble';
import { ChatInput } from '@/components/chat-ui/ChatInput';
import { ChatWelcome } from '@/components/chat-ui/ChatWelcome';
import type { ConversationState, UIComponentType } from '@/lib/chat';

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

interface ChatAPIResponse {
  success: boolean;
  reply: string | null;
  state: ConversationState;
  ui?: {
    type: string;
    payload: unknown;
  } | null;
  action?: {
    type: string;
    data?: Partial<CalendarEvent>;
    eventId?: string;
    scope?: string;
    criteria?: unknown;
    events?: Partial<CalendarEvent>[];
  } | null;
  error?: string;
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
  const [isLoading, setIsLoading] = useState(false);
  const [conversationState, setConversationState] = useState<ConversationState | null>(null);

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

  // ============================================================================
  // API Communication
  // ============================================================================

  const sendToAPI = useCallback(async (
    messageType: 'text' | 'ui_response',
    currentState: ConversationState | null,
    content?: string,
    uiResponse?: { type: UIComponentType; value: unknown }
  ): Promise<ChatAPIResponse | null> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            type: messageType,
            content,
            uiResponse,
          },
          state: currentState,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[ChatView] API error:', error);
      return null;
    }
  }, []); // No dependencies - state is passed as parameter

  // ============================================================================
  // Process API Response
  // ============================================================================

  const processAPIResponse = useCallback((response: ChatAPIResponse) => {
    // Update conversation state
    if (response.state) {
      setConversationState(response.state);
    }

    // Add assistant message with any UI components
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response.reply || '',
      timestamp: new Date(),
    };

    // Handle actions (CRUD operations)
    if (response.action) {
      switch (response.action.type) {
        case 'create_event':
          if (response.action.data) {
            const newEvent: CalendarEvent = {
              id: crypto.randomUUID(),
              title: response.action.data.title || 'New Event',
              start: response.action.data.start ? new Date(response.action.data.start) : new Date(),
              end: response.action.data.end ? new Date(response.action.data.end) : new Date(),
              type: response.action.data.type || 'default',
              description: response.action.data.description,
              location: response.action.data.location,
              isAllDay: response.action.data.isAllDay,
            };

            // Attach event to the assistant message so it's shown in chat
            assistantMessage.event = newEvent;
            assistantMessage.intent = 'create';
            assistantMessage.content = `✅ Created "${newEvent.title}"`;

            // Actually create the event
            onEventCreated?.(newEvent);
          }
          break;

        case 'update_event':
          // The actual update happens via the UI confirmation
          break;

        case 'delete_event':
          // The actual delete happens via the UI confirmation
          break;

        case 'query_events':
          // Attach the query results to the assistant message
          if (response.action.events && response.action.events.length > 0) {
            // Convert events to proper CalendarEvent format
            assistantMessage.events = response.action.events.map((e: Partial<CalendarEvent>) => ({
              id: e.id || crypto.randomUUID(),
              title: e.title || 'Untitled',
              start: e.start ? new Date(e.start) : new Date(),
              end: e.end ? new Date(e.end) : new Date(),
              type: e.type || 'default',
              description: e.description,
              location: e.location,
              isAllDay: e.isAllDay,
            }));
          }
          break;
      }
    }

    // Handle UI components from the API
    if (response.ui) {
      const uiType = response.ui.type as UIComponentType;
      const payload = response.ui.payload as Record<string, unknown>;

      switch (uiType) {
        case 'scope_selector':
          assistantMessage.recurringOptions = {
            event: payload.event as CalendarEvent,
            actionType: payload.actionType as 'edit' | 'delete',
          };
          break;

        case 'confirm_action_delete':
          assistantMessage.deleteEvent = {
            event: payload.event as CalendarEvent,
          };
          break;

        case 'confirm_action_update':
          assistantMessage.updateEvent = {
            event: payload.event as CalendarEvent,
          };
          break;

        case 'option_list':
          // Convert events to proper CalendarEvent format (handle Date string conversion)
          const rawEvents = payload.events as Partial<CalendarEvent>[] | undefined;
          if (rawEvents && rawEvents.length > 0) {
            assistantMessage.optionList = {
              events: rawEvents.map((e) => ({
                id: e.id || crypto.randomUUID(),
                title: e.title || 'Untitled',
                start: e.start ? new Date(e.start) : new Date(),
                end: e.end ? new Date(e.end) : new Date(),
                type: e.type || 'default',
                description: e.description,
                location: e.location,
                isAllDay: e.isAllDay,
              })),
              action: payload.action as 'update' | 'delete' | undefined,
            };
          }
          break;

        case 'event_card':
          assistantMessage.event = payload.event as CalendarEvent;
          break;

        case 'yes_no':
          assistantMessage.yesno = {
            question: response.reply || 'Please confirm',
          };
          break;
      }
    }

    setMessages(prev => [...prev, assistantMessage]);
  }, [onEventCreated]);

  // ============================================================================
  // UI Response Handlers
  // ============================================================================

  // Handle quiz answer (yes/no/custom)
  const handleQuizAnswer = useCallback(async (messageId: string, answer: 'yes' | 'no' | 'custom') => {
    const responseText = answer === 'custom'
      ? ''
      : answer === 'yes'
        ? 'Yes'
        : 'No';

    // Mark as answered
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isAnswered: true } : m));

    if (responseText) {
      // Add user message
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'user',
        content: responseText,
        timestamp: new Date(),
      }]);

      // Send UI response to API
      setIsLoading(true);
      const response = await sendToAPI('ui_response', conversationState, undefined, {
        type: 'yes_no',
        value: answer === 'yes',
      });
      setIsLoading(false);

      if (response) {
        processAPIResponse(response);
      }
    } else {
      focusInput();
    }
  }, [sendToAPI, processAPIResponse, focusInput, conversationState]);

  // Handle yes/no answer
  const handleYesNoAnswer = useCallback(async (messageId: string, answer: 'yes' | 'no') => {
    const responseText = answer === 'yes' ? 'Yes' : 'No';

    // Mark as answered and add user message
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isAnswered: true } : m).concat([{
      id: crypto.randomUUID(),
      role: 'user',
      content: responseText,
      timestamp: new Date(),
    }]));

    // Send UI response to API
    setIsLoading(true);
    const response = await sendToAPI('ui_response', conversationState, undefined, {
      type: 'yes_no',
      value: answer === 'yes',
    });
    setIsLoading(false);

    if (response) {
      processAPIResponse(response);
    }
  }, [sendToAPI, processAPIResponse, conversationState]);

  // Handle delete event answer
  const handleDeleteEventAnswer = useCallback(async (messageId: string, event: CalendarEvent, answer: 'delete' | 'cancel') => {
    // Mark as answered
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isAnswered: true } : m));

    if (answer === 'delete') {
      // Call the parent delete handler
      onEventDeleted?.(event);

      // Send confirmation to API
      setIsLoading(true);
      const response = await sendToAPI('ui_response', conversationState, undefined, {
        type: 'confirm_action_delete',
        value: true,
      });
      setIsLoading(false);

      if (response) {
        processAPIResponse(response);
      } else {
        // Fallback if API fails
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `✅ Event "${event.title}" has been deleted.`,
          timestamp: new Date(),
        }]);
      }
    } else {
      // Send cancellation to API
      setIsLoading(true);
      const response = await sendToAPI('ui_response', conversationState, undefined, {
        type: 'confirm_action_delete',
        value: false,
      });
      setIsLoading(false);

      if (response) {
        processAPIResponse(response);
      } else {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Event deletion cancelled.',
          timestamp: new Date(),
        }]);
      }
    }
  }, [sendToAPI, processAPIResponse, onEventDeleted, conversationState]);

  // Handle update event answer
  const handleUpdateEventAnswer = useCallback(async (messageId: string, event: CalendarEvent, answer: 'update' | 'cancel') => {
    // Mark as answered
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isAnswered: true } : m));

    if (answer === 'update') {
      // Call the parent update handler
      onEventUpdated?.(event);

      // Send confirmation to API
      setIsLoading(true);
      const response = await sendToAPI('ui_response', conversationState, undefined, {
        type: 'confirm_action_update',
        value: true,
      });
      setIsLoading(false);

      if (response) {
        processAPIResponse(response);
      } else {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `✅ Event "${event.title}" has been updated.`,
          timestamp: new Date(),
        }]);
      }
    } else {
      // Send cancellation to API
      setIsLoading(true);
      const response = await sendToAPI('ui_response', conversationState, undefined, {
        type: 'confirm_action_update',
        value: false,
      });
      setIsLoading(false);

      if (response) {
        processAPIResponse(response);
      } else {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Event update cancelled.',
          timestamp: new Date(),
        }]);
      }
    }
  }, [sendToAPI, processAPIResponse, onEventUpdated, conversationState]);

  // Handle recurring event scope selection
  const handleRecurringAnswer = useCallback(async (messageId: string, event: CalendarEvent, option: RecurringOption) => {
    const labels = {
      single: '**Just this occurrence**',
      future: '**This & Future ones**',
      all: '**The entire series**'
    };

    // Mark as answered and add user message
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isAnswered: true } : m).concat([{
      id: crypto.randomUUID(),
      role: 'user',
      content: labels[option],
      timestamp: new Date(),
    }]));

    // Send scope selection to API
    setIsLoading(true);
    const response = await sendToAPI('ui_response', conversationState, undefined, {
      type: 'scope_selector',
      value: option,
    });
    setIsLoading(false);

    if (response) {
      processAPIResponse(response);
    }
  }, [sendToAPI, processAPIResponse, conversationState]);

  // Handle event selection from option list
  const handleEventSelect = useCallback(async (messageId: string, event: CalendarEvent) => {
    // Mark as answered
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isAnswered: true } : m));

    // Add user message showing selection
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content: `Selected: "${event.title}"`,
      timestamp: new Date(),
    }]);

    // Send selection to API
    setIsLoading(true);
    const response = await sendToAPI('ui_response', conversationState, undefined, {
      type: 'option_list',
      value: event.id,
    });
    setIsLoading(false);

    if (response) {
      processAPIResponse(response);
    }
  }, [sendToAPI, processAPIResponse, conversationState]);

  // ============================================================================
  // Send Message
  // ============================================================================

  const handleSend = useCallback(async () => {
    if (isAnimating || isLoading) return;
    const trimmed = inputValue.trim();
    if (!trimmed && !attachedEvent) return;

    // Capture current state and attached event before any state changes
    const currentState = conversationState;
    const eventToAttach = attachedEvent;
    const messageContent = eventToAttach
      ? `[Regarding event: "${eventToAttach.title}"] ${trimmed}`
      : trimmed;

    // Optimistically update UI immediately
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
      event: eventToAttach || undefined,
    }]);

    // Clear input and attached event immediately
    setInputValue('');
    if (eventToAttach && onClearAttachedEvent) {
      onClearAttachedEvent();
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Send to API
    setIsLoading(true);
    const response = await sendToAPI('text', currentState, messageContent);
    setIsLoading(false);

    if (response) {
      processAPIResponse(response);
    } else {
      // Fallback error message
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }]);
    }
  }, [inputValue, isAnimating, isLoading, attachedEvent, onClearAttachedEvent, sendToAPI, conversationState, processAPIResponse]);

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
                    onUpdateEventAnswer={handleUpdateEventAnswer}
                    onRecurringAnswer={handleRecurringAnswer}
                    onFocusInput={focusInput}
                    onAttachToChat={onAttachEvent}
                    onEventSelect={handleEventSelect}
                  />
                )
              ))}
            </AnimatePresence>
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <div className="animate-pulse">●</div>
              <span>Thinking...</span>
            </div>
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
        isAnimating={isAnimating || isLoading}
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