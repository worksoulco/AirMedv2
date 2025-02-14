import { format } from 'date-fns';
import { Calendar as CalendarIcon, Check, X } from 'lucide-react';
import type { CalendarEvent, CalendarIntegration } from '@/types/calendar';

interface CalendarSidebarProps {
  currentDate: Date;
  events: CalendarEvent[];
  integrations: CalendarIntegration[];
  onToggleIntegration: (id: string) => void;
}

export function CalendarSidebar({
  currentDate,
  events,
  integrations,
  onToggleIntegration
}: CalendarSidebarProps) {
  const todayEvents = events.filter(event =>
    format(event.start, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')
  );

  return (
    <div className="space-y-6">
      {/* Mini Calendar would go here */}

      {/* Connected Calendars */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-4 font-medium">Connected Calendars</h2>
        {integrations.length > 0 ? (
          <div className="space-y-2">
            {integrations.map(integration => (
              <button
                key={integration.id}
                onClick={() => onToggleIntegration(integration.id)}
                className="flex w-full items-center justify-between rounded-lg p-2 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      integration.color || 'bg-blue-500'
                    }`}
                  />
                  <span className="text-sm">{integration.name}</span>
                </div>
                {integration.enabled ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-gray-400" />
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-center">
            <CalendarIcon className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              No calendars connected yet
            </p>
          </div>
        )}
      </div>

      {/* Today's Events */}
      <div className="rounded-lg border bg-white p-4">
        <h2 className="mb-4 font-medium">Today's Schedule</h2>
        <div className="space-y-2">
          {todayEvents.length > 0 ? (
            todayEvents.map(event => (
              <div
                key={event.id}
                className="rounded-lg border p-3"
              >
                <p className="font-medium">{event.title}</p>
                <p className="text-sm text-gray-500">
                  {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-gray-500">No events scheduled</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}