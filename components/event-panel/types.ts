import { CalendarEvent, CalendarCategory } from '@/types';

export type EventPanelMode = 'view' | 'edit' | 'create';

export interface EventPanelProps {
    isOpen: boolean;
    mode: EventPanelMode;
    event?: CalendarEvent;
    initialData?: Partial<CalendarEvent>;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onSave: (event: Partial<CalendarEvent>) => void;
    onChatAboutEvent?: (event: CalendarEvent) => void;
    calendars?: CalendarCategory[];
}
