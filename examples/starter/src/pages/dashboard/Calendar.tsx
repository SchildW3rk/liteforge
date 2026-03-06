/**
 * Calendar Page - Demonstrates @liteforge/calendar usage
 * 
 * Features:
 * - Full scheduling calendar (not a datepicker!)
 * - Day, Week, Month, Agenda views
 * - Resource columns (therapists/rooms)
 * - Recurring events
 * - Event creation/editing
 * - Navigation and view switching
 */

import { createComponent, Show, For } from 'liteforge';
import { signal, effect } from 'liteforge';
import { createCalendar } from 'liteforge/calendar';
import type { CalendarEvent, Resource, CalendarView } from 'liteforge/calendar';

// =============================================================================
// Sample Data - Therapy Practice Schedule
// =============================================================================

// Resources (therapists/rooms) with working hours
const resources: Resource[] = [
  { 
    id: 'sarah', 
    name: 'Dr. Sarah Miller', 
    color: '#3b82f6',
    workingHours: {
      1: { start: 8, end: 17 },   // Mon
      2: { start: 8, end: 17 },   // Tue
      3: { start: 8, end: 12 },   // Wed (half day)
      4: { start: 8, end: 17 },   // Thu
      5: { start: 8, end: 14 },   // Fri (early finish)
    }
  },
  { 
    id: 'john', 
    name: 'Dr. John Smith', 
    color: '#10b981',
    workingHours: {
      1: { start: 9, end: 18 },   // Mon
      2: { start: 9, end: 18 },   // Tue
      3: { start: 9, end: 18 },   // Wed
      4: { start: 9, end: 18 },   // Thu
      5: { start: 9, end: 15 },   // Fri
    }
  },
  { 
    id: 'room-a', 
    name: 'Room A', 
    color: '#f59e0b',
    // Room available all day
  },
];

// Get current week's Monday
function getThisMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.getFullYear(), now.getMonth(), diff);
}

// Create sample events
function createSampleEvents(): CalendarEvent[] {
  const monday = getThisMonday();
  const events: CalendarEvent[] = [];

  // Individual appointments this week
  events.push({
    id: 'apt-1',
    title: 'Initial Consultation - Anna B.',
    start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 9, 0),
    end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 10, 0),
    resourceId: 'sarah',
    color: '#3b82f6',
  });

  events.push({
    id: 'apt-2',
    title: 'Therapy Session - Michael R.',
    start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 10, 30),
    end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 11, 30),
    resourceId: 'sarah',
    color: '#3b82f6',
  });

  events.push({
    id: 'apt-3',
    title: 'Group Session - Anxiety',
    start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 14, 0),
    end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 15, 30),
    resourceId: 'room-a',
    color: '#f59e0b',
  });

  events.push({
    id: 'apt-4',
    title: 'Couples Therapy - Smith',
    start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 1, 11, 0),
    end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 1, 12, 0),
    resourceId: 'john',
    color: '#10b981',
  });

  events.push({
    id: 'apt-5',
    title: 'Child Session - Emma L.',
    start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 1, 15, 0),
    end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 1, 16, 0),
    resourceId: 'sarah',
    color: '#3b82f6',
  });

  events.push({
    id: 'apt-6',
    title: 'Team Meeting',
    start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 2, 9, 0),
    end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 2, 10, 0),
    resourceId: 'room-a',
    color: '#8b5cf6',
  });

  // ─── Overlapping Events (to test overlap layout) ───────────
  // These 3 events overlap on Tuesday morning to demonstrate column layout
  events.push({
    id: 'overlap-1',
    title: 'Overlap Test A',
    start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 1, 10, 0),
    end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 1, 11, 0),
    resourceId: 'sarah',
    color: '#3b82f6',
  });

  events.push({
    id: 'overlap-2',
    title: 'Overlap Test B',
    start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 1, 10, 30),
    end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 1, 11, 30),
    resourceId: 'sarah',
    color: '#8b5cf6',
  });

  events.push({
    id: 'overlap-3',
    title: 'Overlap Test C',
    start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 1, 10, 15),
    end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 1, 10, 45),
    resourceId: 'sarah',
    color: '#ec4899',
  });

  // Recurring weekly event
  events.push({
    id: 'recurring-1',
    title: 'Weekly Supervision',
    start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3, 16, 0),
    end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3, 17, 0),
    resourceId: 'room-a',
    color: '#ec4899',
    recurring: {
      frequency: 'weekly',
      count: 12,
    },
  });

  // All-day event (properly using allDay flag)
  events.push({
    id: 'allday-1',
    title: 'Training Day',
    start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4),
    end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4, 23, 59),
    allDay: true,
    color: '#6366f1',
  });

  return events;
}

// =============================================================================
// Calendar Page Component
// =============================================================================

export const CalendarPage = createComponent({
  name: 'CalendarPage',

  setup() {
    // Events signal
    const events = signal<CalendarEvent[]>(createSampleEvents());

    // Selected event for modal
    const selectedEvent = signal<CalendarEvent | null>(null);
    const showEventModal = signal(false);

    // Create calendar
    const calendar = createCalendar<CalendarEvent>({
      events,
      resources,
      view: 'week',
      defaultDate: new Date(),
      time: {
        slotDuration: 30,
        dayStart: 8,
        dayEnd: 24,
        weekStart: 1, // Monday
        hiddenDays: [0], // Hide Sundays
        nowIndicator: true,
      },
      editable: true,
      selectable: true,
      locale: 'de-AT', // Austrian German locale
      onEventClick: (event) => {
        selectedEvent.set(event);
        showEventModal.set(true);
      },
      onSlotClick: (start, end, resourceId) => {
        console.log('Slot clicked:', { start, end, resourceId });
        // Could open a "new event" dialog here
        const title = prompt('Neuer Termin:');
        if (title) {
          const newEvent: CalendarEvent = {
            id: `new-${Date.now()}`,
            title,
            start,
            end,
            ...(resourceId ? { resourceId } : {}),
            color: '#3b82f6',
          };
          events.update((evts) => [...evts, newEvent]);
        }
      },
      onEventDrop: (event, newStart, newEnd, newResourceId) => {
        console.log('Event dropped:', { event: event.title, newStart, newEnd, newResourceId });
        // Update the event in our events array
        events.update((evts) =>
          evts.map((e) =>
            e.id === event.id
              ? {
                  ...e,
                  start: newStart,
                  end: newEnd,
                  ...(newResourceId !== undefined ? { resourceId: newResourceId } : {}),
                }
              : e
          )
        );
      },
      onEventResize: (event, newEnd) => {
        console.log('Event resized:', { event: event.title, newEnd });
        // Update the event's end time
        events.update((evts) =>
          evts.map((e) => (e.id === event.id ? { ...e, end: newEnd } : e))
        );
      },
      onViewChange: (view) => {
        console.log('View changed to:', view);
      },
      onDateChange: (date) => {
        console.log('Date changed to:', date);
      },
    });

    const closeModal = () => {
      showEventModal.set(false);
      selectedEvent.set(null);
    };

    const deleteEvent = () => {
      const event = selectedEvent();
      if (event) {
        events.update((evts) => evts.filter((e) => e.id !== event.id));
        closeModal();
      }
    };

    // ESC key handler for modal
    effect(() => {
      if (!showEventModal()) return;
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeModal();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    });

    return {
      calendar,
      events,
      selectedEvent,
      showEventModal,
      closeModal,
      deleteEvent,
    };
  },

  component({ setup }) {
    const { calendar, selectedEvent, showEventModal, closeModal, deleteEvent } = setup;

    // View buttons
    const views: CalendarView[] = ['day', 'week', 'month', 'agenda'];

    return (
      <div class="calendar-page">
        <div class="calendar-header">
          <h1>Therapiepraxis Kalender</h1>
          <p class="page-description">
            Vollständiger Terminkalender mit Ansichten, Ressourcen und wiederkehrenden Terminen.
          </p>
        </div>

        <div class="calendar-toolbar">
          <div class="nav-buttons">
            <button type="button" class="btn btn-nav" onclick={() => calendar.today()}>
              Heute
            </button>
            <button type="button" class="btn btn-nav" onclick={() => calendar.prev()}>
              &lt; Zurück
            </button>
            <button type="button" class="btn btn-nav" onclick={() => calendar.next()}>
              Weiter &gt;
            </button>
          </div>

          <div class="resource-filters">
            {For({
              each: () => resources,
              children: (resource: Resource) => (
                <label class="resource-filter">
                  <input
                    type="checkbox"
                    checked={() => calendar.visibleResources().includes(resource.id)}
                    onchange={() => calendar.toggleResource(resource.id)}
                  />
                  <span
                    class="resource-dot"
                    style={() => `background-color: ${resource.color ?? '#6366f1'}`}
                  />
                  <span class="resource-name">{resource.name}</span>
                </label>
              ),
            })}
          </div>

          <div class="view-buttons">
            {views.map((view) => (
              <button
                type="button"
                class={() => `btn btn-view ${calendar.currentView() === view ? 'active' : ''}`}
                onclick={() => calendar.setView(view)}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div class="calendar-container">
          {calendar.Root()}
        </div>

        {/* Event Detail Modal */}
        {Show({
          when: showEventModal,
          children: () => {
            const event = selectedEvent();
            if (!event) return document.createTextNode('');

            return (
              <div class="modal-overlay" onclick={closeModal}>
                <div class="modal" onclick={(e: Event) => e.stopPropagation()}>
                  <div class="modal-header">
                    <h3>{event.title}</h3>
                    <button type="button" class="close-btn" onclick={closeModal}>
                      &times;
                    </button>
                  </div>
                  <div class="modal-body">
                              <p>
                                      <strong>Beginn:</strong>{' '}
                                      {event.start.toLocaleString('de-AT', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </p>
                                    <p>
                                      <strong>Ende:</strong>{' '}
                                      {event.end.toLocaleString('de-AT', {
                                        weekday: 'short',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </p>
                                    {event.resourceId && (
                                      <p>
                                        <strong>Ressource:</strong> {event.resourceId}
                                      </p>
                                    )}
                                    {event.recurring && (
                                      <p>
                                        <strong>Wiederkehrend:</strong> {event.recurring.frequency}
                                      </p>
                                    )}
                  </div>
                  <div class="modal-footer">
                                    <button type="button" class="btn btn-danger" onclick={deleteEvent}>
                                      Löschen
                                    </button>
                                    <button type="button" class="btn btn-secondary" onclick={closeModal}>
                                      Schließen
                                    </button>
                                  </div>
                </div>
              </div>
            );
          },
        })}

        <style>{`
          .calendar-page {
            padding: 20px;
            height: calc(100vh - 40px);
            display: flex;
            flex-direction: column;
          }

          .calendar-header {
            margin-bottom: 16px;
          }

          .calendar-header h1 {
            margin: 0 0 8px 0;
            color: var(--lf-color-text, #1e293b);
            font-size: 24px;
          }

          .page-description {
            color: var(--lf-color-text-muted, #64748b);
            margin: 0;
          }

          .calendar-toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding: 12px 16px;
            background: var(--lf-color-bg-subtle, #f8fafc);
            border-radius: var(--lf-radius-lg, 8px);
          }

          .nav-buttons,
          .view-buttons,
          .resource-filters {
            display: flex;
            gap: 8px;
            align-items: center;
          }

          .resource-filters {
            gap: 16px;
          }

          .resource-filter {
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            font-size: 14px;
            color: var(--lf-color-text-subtle, #475569);
          }

          .resource-filter input[type="checkbox"] {
            cursor: pointer;
          }

          .resource-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
          }

          .resource-name {
            white-space: nowrap;
          }

          .btn {
            padding: 8px 16px;
            border: 1px solid var(--lf-color-border, #e2e8f0);
            border-radius: var(--lf-radius-md, 6px);
            background: var(--lf-color-surface, #ffffff);
            color: var(--lf-color-text, #374151);
            cursor: pointer;
            font-size: 14px;
            transition: all 0.15s;
          }

          .btn:hover {
            background: var(--lf-color-bg-muted, #f1f5f9);
          }

          .btn-nav {
            color: var(--lf-color-text-subtle, #475569);
          }

          .btn-view {
            color: var(--lf-color-text-muted, #64748b);
          }

          .btn-view.active {
            background: var(--lf-color-accent, #3b82f6);
            color: white;
            border-color: var(--lf-color-accent, #3b82f6);
          }

          .calendar-container {
            flex: 1;
            min-height: 500px;
            border: 1px solid var(--lf-color-border, #e2e8f0);
            border-radius: var(--lf-radius-lg, 8px);
            overflow: hidden;
          }

          /* Modal styles */
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--lf-color-bg-overlay, rgba(0,0,0,0.5));
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .modal {
            background: var(--lf-color-surface, #ffffff);
            border-radius: var(--lf-radius-lg, 12px);
            width: 100%;
            max-width: 400px;
            box-shadow: var(--lf-shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.1));
          }

          .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid var(--lf-color-border, #e2e8f0);
          }

          .modal-header h3 {
            margin: 0;
            font-size: 18px;
            color: var(--lf-color-text, #1e293b);
          }

          .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            color: var(--lf-color-text-muted, #64748b);
            cursor: pointer;
            padding: 0;
            line-height: 1;
          }

          .close-btn:hover {
            color: var(--lf-color-text, #1e293b);
          }

          .modal-body {
            padding: 20px;
          }

          .modal-body p {
            margin: 0 0 12px 0;
            color: var(--lf-color-text-subtle, #475569);
          }

          .modal-body p:last-child {
            margin-bottom: 0;
          }

          .modal-footer {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            padding: 16px 20px;
            border-top: 1px solid var(--lf-color-border, #e2e8f0);
          }

          .btn-danger {
            background: var(--lf-color-danger, #ef4444);
            color: white;
            border-color: var(--lf-color-danger, #ef4444);
          }

          .btn-danger:hover {
            opacity: 0.85;
          }

          .btn-secondary {
            background: var(--lf-color-bg-muted, #f1f5f9);
            color: var(--lf-color-text-subtle, #475569);
            border-color: var(--lf-color-border, #e2e8f0);
          }

          .btn-secondary:hover {
            background: var(--lf-color-bg-subtle, #e2e8f0);
          }
        `}</style>
      </div>
    );
  },
});
