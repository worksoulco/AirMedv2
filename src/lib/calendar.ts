import type { CalendarEvent, CalendarIntegration } from '@/types/calendar';

// Load calendar integrations
export function getCalendarIntegrations(): CalendarIntegration[] {
  const stored = localStorage.getItem('calendarIntegrations');
  return stored ? JSON.parse(stored) : [];
}

// Save calendar integrations
function saveCalendarIntegrations(integrations: CalendarIntegration[]) {
  localStorage.setItem('calendarIntegrations', JSON.stringify(integrations));
  window.dispatchEvent(new Event('calendarUpdate'));
}

// Connect new calendar
export async function connectCalendar(email: string): Promise<CalendarIntegration> {
  // In a real app, this would handle OAuth flow
  // For demo, we'll simulate the connection
  const existingIntegrations = getCalendarIntegrations();
  
  // Check if calendar is already connected
  if (existingIntegrations.some(i => i.email === email)) {
    throw new Error('This calendar is already connected');
  }

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const newIntegration: CalendarIntegration = {
    id: Date.now().toString(),
    name: `${email.split('@')[0]}'s Calendar`,
    email,
    type: 'google',
    color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    enabled: true
  };

  const updatedIntegrations = [...existingIntegrations, newIntegration];
  saveCalendarIntegrations(updatedIntegrations);

  return newIntegration;
}

// Disconnect calendar
export function disconnectCalendar(id: string) {
  const integrations = getCalendarIntegrations();
  const updatedIntegrations = integrations.filter(i => i.id !== id);
  saveCalendarIntegrations(updatedIntegrations);
}

// Get calendar events
export function getCalendarEvents(date: Date, view: 'day' | 'week' | 'month'): CalendarEvent[] {
  // In a real app, this would fetch events from the calendar APIs
  // For demo, we'll generate some sample events
  const events: CalendarEvent[] = [];
  const integrations = getCalendarIntegrations();

  integrations.forEach(integration => {
    // Generate 1-3 random events per calendar
    const numEvents = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < numEvents; i++) {
      const startHour = Math.floor(Math.random() * 8) + 9; // 9 AM to 5 PM
      const duration = Math.floor(Math.random() * 2) + 1; // 1-2 hours
      
      const start = new Date(date);
      start.setHours(startHour, 0, 0, 0);
      
      const end = new Date(start);
      end.setHours(start.getHours() + duration);

      events.push({
        id: `${integration.id}-${i}`,
        title: `Meeting with Client ${i + 1}`,
        start,
        end,
        calendarId: integration.id,
        type: 'event'
      });
    }
  });

  return events;
}