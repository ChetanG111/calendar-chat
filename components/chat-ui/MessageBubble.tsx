import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from "clsx";
import { CalendarEvent } from '@/types';
import { ChatMessage } from './types';
import { QuizBox } from './QuizBox';
import { YesNoBox } from './YesNoBox';
import { EventCard } from './EventCard';
import { DeleteEventBox } from './DeleteEventBox';
import { RecurringEventOptionsBox, RecurringOption } from './RecurringEventOptionsBox';
import {
  userMessageVariants,
  assistantMessageVariants,
  bubbleContentVariants,
  textContentVariants,
  avatarVariants,
  eventCardVariants
} from './animations';

// ============================================================================
// Message Components
// ============================================================================

export function FormattedText({ text }: { text: string }) {
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

export function UserMessage({
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

export function AssistantMessage({
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
