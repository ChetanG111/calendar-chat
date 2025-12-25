import { CalendarEvent } from '@/types';

export interface ChatMessage {
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
  updateEvent?: {
    event: CalendarEvent;
  };
  recurringOptions?: {
    event: CalendarEvent;
    actionType: 'edit' | 'delete';
  };
  optionList?: {
    events: CalendarEvent[];
    action?: 'update' | 'delete';
  };
  isAnswered?: boolean;
}
