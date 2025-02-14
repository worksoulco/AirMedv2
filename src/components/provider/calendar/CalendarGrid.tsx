import { useState } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import type { CalendarView, CalendarEvent } from '@/types/calendar';
import { EventPopover } from './EventPopover';

interface CalendarGridProps {
  view: CalendarView;
  currentDate: Date;
  events: CalendarEvent[];
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const TIME_SLOTS = HOURS.map(hour => ({
  hour,
  label: format(new Date().setHours(hour, 0, 0, 0), 'h a')
}));

export function CalendarGrid({ view, currentDate, events }: CalendarGridProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    setSelectedEvent(event);
    setPopoverPosition({
      x: e.clientX,
      y: e.clientY
    });
  };

  if (view === 'day') {
    return (
      <div className="h-[calc(100vh-200px)] overflow-y-auto rounded-lg border bg-white">
        <div className="relative grid grid-cols-[48px_1fr]">
          {/* Time Labels */}
          <div className="sticky top-0 z-10 -mt-14 bg-white">
            <div className="h-14" /> {/* Header spacer */}
            {TIME_SLOTS.map(({ hour, label }) => (
              <div
                key={hour}
                className="relative h-20 border-r pr-2 text-right text-sm text-gray-500"
              >
                <span className="absolute -top-3 right-2">{label}</span>
              </div>
            ))}
          </div>

          {/* Events Grid */}
          <div className="relative">
            <div className="sticky top-0 z-10 h-14 border-b bg-white px-4 py-2">
              <h3 className="text-lg font-medium">
                {format(currentDate, 'EEEE, MMMM d')}
              </h3>
            </div>
            <div className="relative">
              {TIME_SLOTS.map(({ hour }) => (
                <div
                  key={hour}
                  className="relative h-20 border-b border-gray-100 last:border-b-0"
                />
              ))}
              {/* Events */}
              <div className="absolute inset-0">
                {events
                  .filter(event => isSameDay(event.start, currentDate))
                  .map(event => {
                    const startHour = event.start.getHours();
                    const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60);
                    const top = (startHour * 80) + (event.start.getMinutes() / 60 * 80);
                    const height = duration * 80;

                    return (
                      <button
                        key={event.id}
                        onClick={(e) => handleEventClick(event, e)}
                        className="absolute left-1 right-1 rounded bg-blue-100 p-2 text-left text-sm hover:bg-blue-200"
                        style={{
                          top: `${top}px`,
                          height: `${height}px`
                        }}
                      >
                        <p className="font-medium text-blue-900">{event.title}</p>
                        <p className="text-xs text-blue-700">
                          {format(event.start, 'h:mm a')} - {format(event.end, 'h:mm a')}
                        </p>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'week') {
    return (
      <div className="h-[calc(100vh-200px)] overflow-y-auto rounded-lg border bg-white">
        <div className="relative grid grid-cols-[48px_repeat(7,1fr)]">
          {/* Time Labels */}
          <div className="sticky top-0 z-10 -mt-14 bg-white">
            <div className="h-14" /> {/* Header spacer */}
            {TIME_SLOTS.map(({ hour, label }) => (
              <div
                key={hour}
                className="relative h-20 border-r pr-2 text-right text-sm text-gray-500"
              >
                <span className="absolute -top-3 right-2">{label}</span>
              </div>
            ))}
          </div>

          {/* Week Grid */}
          {weekDays.map(day => (
            <div key={day.toISOString()} className="relative">
              <div className="sticky top-0 z-10 h-14 border-b border-l bg-white px-2 py-2">
                <p className="text-sm font-medium">{format(day, 'EEE')}</p>
                <p className="text-lg">{format(day, 'd')}</p>
              </div>
              <div className="relative border-l">
                {TIME_SLOTS.map(({ hour }) => (
                  <div
                    key={hour}
                    className="relative h-20 border-b border-gray-100 last:border-b-0"
                  />
                ))}
                {/* Events */}
                <div className="absolute inset-0">
                  {events
                    .filter(event => isSameDay(event.start, day))
                    .map(event => {
                      const startHour = event.start.getHours();
                      const duration = (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60);
                      const top = (startHour * 80) + (event.start.getMinutes() / 60 * 80);
                      const height = duration * 80;

                      return (
                        <button
                          key={event.id}
                          onClick={(e) => handleEventClick(event, e)}
                          className="absolute left-1 right-1 rounded bg-blue-100 p-1 text-left text-sm hover:bg-blue-200"
                          style={{
                            top: `${top}px`,
                            height: `${height}px`
                          }}
                        >
                          <p className="truncate font-medium text-blue-900">{event.title}</p>
                          <p className="truncate text-xs text-blue-700">
                            {format(event.start, 'h:mm a')}
                          </p>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Month view would go here
  return null;
}