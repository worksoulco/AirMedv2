import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Filter, ChevronLeft, ChevronRight, MoreHorizontal, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarGrid } from './CalendarGrid';
import { CalendarSidebar } from './CalendarSidebar';
import { NewAppointmentModal } from './NewAppointmentModal';
import { CalendarIntegrationModal } from './CalendarIntegrationModal';
import { loadProviderData, getTodayAppointments } from '@/lib/provider';
import { getCalendarIntegrations, getCalendarEvents } from '@/lib/calendar';
import type { CalendarEvent, CalendarView } from '@/types/calendar';

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('week');
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showIntegration, setShowIntegration] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [integrations, setIntegrations] = useState(getCalendarIntegrations());
  const provider = loadProviderData();

  useEffect(() => {
    const loadEvents = () => {
      const calendarEvents = getCalendarEvents(currentDate, view);
      const appointments = getTodayAppointments(provider?.id || '');
      
      // Merge calendar events and appointments
      setEvents([...calendarEvents, ...appointments.map(apt => ({
        id: apt.id,
        title: `${apt.type} - ${provider?.patients.find(p => p.id === apt.patientId)?.name}`,
        start: new Date(`${apt.date}T${apt.time}`),
        end: new Date(new Date(`${apt.date}T${apt.time}`).getTime() + apt.duration * 60000),
        type: 'appointment',
        patientId: apt.patientId
      }))]);
    };

    loadEvents();
    window.addEventListener('calendarUpdate', loadEvents);
    window.addEventListener('appointmentUpdate', loadEvents);
    
    return () => {
      window.removeEventListener('calendarUpdate', loadEvents);
      window.removeEventListener('appointmentUpdate', loadEvents);
    };
  }, [currentDate, view, provider]);

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const handleIntegrationComplete = () => {
    setIntegrations(getCalendarIntegrations());
    setShowIntegration(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Calendar Header */}
      <div className="border-b px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-serif text-2xl">Calendar</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('prev')}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate('next')}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-lg font-medium">
                {currentDate.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                  ...(view === 'day' && { day: 'numeric' }),
                  ...(view === 'week' && { day: 'numeric' })
                })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border p-1">
              <Button
                variant={view === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('day')}
              >
                Day
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('week')}
              >
                Week
              </Button>
              <Button
                variant={view === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('month')}
              >
                Month
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowIntegration(true)}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              {integrations.length > 0 ? 'Manage Calendars' : 'Connect Calendar'}
            </Button>
            <Button
              onClick={() => setShowNewAppointment(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Appointment
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Layout */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[280px_1fr]">
        <CalendarSidebar
          currentDate={currentDate}
          events={events}
          integrations={integrations}
          onToggleIntegration={(id) => {
            setIntegrations(integrations.map(i =>
              i.id === id ? { ...i, enabled: !i.enabled } : i
            ));
          }}
        />
        <CalendarGrid
          view={view}
          currentDate={currentDate}
          events={events.filter(event =>
            event.type === 'appointment' ||
            integrations.find(i => i.id === event.calendarId)?.enabled
          )}
        />
      </div>

      {/* Modals */}
      {showNewAppointment && (
        <NewAppointmentModal
          onClose={() => setShowNewAppointment(false)}
          currentDate={currentDate}
        />
      )}

      {showIntegration && (
        <CalendarIntegrationModal
          onClose={() => setShowIntegration(false)}
          onComplete={handleIntegrationComplete}
          integrations={integrations}
        />
      )}
    </div>
  );
}