export type ViewType = 'day' | 'week' | 'month' | 'chat';

export interface CalendarEvent {
  id: string;
  eventId?: string;
  title: string;
  start: Date;
  end: Date;
  startDate?: string;  // YYYY-MM-DD format - the date portion of start
  endDate?: string;    // YYYY-MM-DD format - the date portion of end
  type: string;
  description?: string;
  location?: string;
  guests?: string[];
  meetLink?: string;
  isAllDay?: boolean;
  rrule?: string;
  timezone?: string;
}

export interface CalendarTheme {
  primary: string;
  bg: string;
  border: string;
  text: string;
  dot: string;
  hover: string;
  solidBg: string;
}

export interface CalendarCategory {
  id: string;
  label: string;
  colorName: string;
  theme: CalendarTheme;
  icon: string;
  checked: boolean;
  isDefault?: boolean;
}

export const THEME_COLORS: Record<string, CalendarTheme> = {
  blue: { primary: 'blue', bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-100', dot: 'bg-blue-500', hover: 'hover:bg-blue-500/30', solidBg: 'bg-blue-500' },
  red: { primary: 'red', bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-100', dot: 'bg-red-500', hover: 'hover:bg-red-500/30', solidBg: 'bg-red-500' },
  orange: { primary: 'orange', bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-100', dot: 'bg-orange-500', hover: 'hover:bg-orange-500/30', solidBg: 'bg-orange-500' },
  green: { primary: 'green', bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-100', dot: 'bg-green-500', hover: 'hover:bg-green-500/30', solidBg: 'bg-green-500' },
  purple: { primary: 'purple', bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-100', dot: 'bg-purple-500', hover: 'hover:bg-purple-500/30', solidBg: 'bg-purple-500' },
  pink: { primary: 'pink', bg: 'bg-pink-500/20', border: 'border-pink-500', text: 'text-pink-100', dot: 'bg-pink-500', hover: 'hover:bg-pink-500/30', solidBg: 'bg-pink-500' },
  yellow: { primary: 'yellow', bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-100', dot: 'bg-yellow-500', hover: 'hover:bg-yellow-500/30', solidBg: 'bg-yellow-500' },
  cyan: { primary: 'cyan', bg: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-100', dot: 'bg-cyan-500', hover: 'hover:bg-cyan-500/30', solidBg: 'bg-cyan-500' },
  gray: { primary: 'gray', bg: 'bg-gray-500/20', border: 'border-gray-500', text: 'text-gray-100', dot: 'bg-gray-500', hover: 'hover:bg-gray-500/30', solidBg: 'bg-gray-500' },
  indigo: { primary: 'indigo', bg: 'bg-indigo-500/20', border: 'border-indigo-500', text: 'text-indigo-100', dot: 'bg-indigo-500', hover: 'hover:bg-indigo-500/30', solidBg: 'bg-indigo-500' },
};

export const getThemeForColor = (color: string): CalendarTheme => {
  return THEME_COLORS[color] || THEME_COLORS.blue;
};

export const DEFAULT_CALENDARS: CalendarCategory[] = [
  { id: 'default', label: 'Default', colorName: 'blue', theme: THEME_COLORS.blue, icon: 'check', checked: true, isDefault: true },
  { id: 'business', label: 'Business', colorName: 'indigo', theme: THEME_COLORS.indigo, icon: 'check', checked: true },
  { id: 'personal', label: 'Personal', colorName: 'red', theme: THEME_COLORS.red, icon: 'check', checked: true },
];

export const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    title: 'Design Sprint (Day 3)',
    start: new Date(2025, 11, 16, 9, 0), // Dec 16 2025
    end: new Date(2025, 11, 16, 17, 0),
    type: 'default',
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
    type: 'business'
  },
  {
    id: '4',
    title: 'Agent OS Setup',
    start: new Date(2025, 11, 19, 18, 45),
    end: new Date(2025, 11, 19, 20, 0),
    type: 'business'
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
    type: 'default'
  },
  {
    id: '7',
    title: 'Plan whole week',
    start: new Date(2025, 11, 16, 18, 45),
    end: new Date(2025, 11, 16, 20, 0),
    type: 'personal'
  }
];