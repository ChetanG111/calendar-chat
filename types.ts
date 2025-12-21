export type ViewType = 'day' | 'week' | 'month' | 'chat';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'business' | 'personal' | 'meetings' | 'holiday';
  description?: string;
  location?: string;
  guests?: string[];
  meetLink?: string;
  isAllDay?: boolean;
  rrule?: string;
  timezone?: string;
}

export interface CalendarCategory {
  id: string;
  label: string;
  color: string; // Tailwind class mostly or hex
  icon: string;
  checked: boolean;
}

export const EVENT_THEMES = {
  business: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-100', dot: 'bg-blue-500', hover: 'hover:bg-blue-500/30', solidBg: 'bg-blue-500' },
  personal: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-100', dot: 'bg-red-500', hover: 'hover:bg-red-500/30', solidBg: 'bg-red-500' },
  meetings: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-100', dot: 'bg-orange-500', hover: 'hover:bg-orange-500/30', solidBg: 'bg-orange-500' },
  holiday: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-100', dot: 'bg-green-500', hover: 'hover:bg-green-500/30', solidBg: 'bg-green-500' },
};

export const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    title: 'Design Sprint (Day 3)',
    start: new Date(2025, 11, 16, 9, 0), // Dec 16 2025
    end: new Date(2025, 11, 16, 17, 0),
    type: 'business',
    isAllDay: true
  },
  {
    id: '2',
    title: 'Imp 5M Qs',
    start: new Date(2025, 11, 16, 12, 0),
    end: new Date(2025, 11, 16, 13, 0),
    type: 'personal'
  },
  {
    id: '3',
    title: 'Whop App 1',
    start: new Date(2025, 11, 15, 18, 15),
    end: new Date(2025, 11, 15, 19, 0),
    type: 'meetings'
  },
  {
    id: '4',
    title: 'Agent OS Setup',
    start: new Date(2025, 11, 19, 18, 45),
    end: new Date(2025, 11, 19, 20, 0),
    type: 'meetings'
  },
  {
    id: '5',
    title: 'CPDS CIE-2 MCQs',
    start: new Date(2025, 11, 17, 19, 0),
    end: new Date(2025, 11, 17, 20, 0),
    type: 'business'
  },
  {
    id: '6',
    title: 'Create NotebookLM Summaries',
    start: new Date(2025, 11, 19, 10, 0),
    end: new Date(2025, 11, 19, 10, 45),
    type: 'personal'
  },
  {
    id: '7',
    title: 'Plan whole week',
    start: new Date(2025, 11, 16, 18, 45),
    end: new Date(2025, 11, 16, 20, 0),
    type: 'personal'
  }
];

export const CALENDAR_CATEGORIES: CalendarCategory[] = [
  { id: 'business', label: 'Business', color: 'bg-blue-500', icon: 'check', checked: true },
  { id: 'personal', label: 'Personal', color: 'bg-red-500', icon: 'check', checked: true },
  { id: 'meetings', label: 'Meetings', color: 'bg-orange-500', icon: 'check', checked: true },
  { id: 'holidays', label: 'Holidays', color: 'bg-green-500', icon: 'check', checked: true },
];