export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'event' | 'appointment';
  calendarId?: string;
  patientId?: string;
}

export interface CalendarIntegration {
  id: string;
  name: string;
  email: string;
  type: 'google' | 'outlook' | 'apple';
  color?: string;
  enabled: boolean;
}

export type CalendarView = 'day' | 'week' | 'month';