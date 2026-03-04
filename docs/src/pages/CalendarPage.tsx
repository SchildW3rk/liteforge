import { createComponent } from 'liteforge';
import { createCalendar } from 'liteforge/calendar';
import type { CalendarEvent } from 'liteforge/calendar';
import { signal } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import type { ApiRow } from '../components/ApiTable.js';

// ─── Live example ─────────────────────────────────────────────────────────────

let _apptCounter = 10;

function CalendarLiveExample(): Node {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  function d(dayOffset: number, hour: number, minute = 0): Date {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + dayOffset);
    dt.setHours(hour, minute, 0, 0);
    return dt;
  }

  const appointments = signal<CalendarEvent[]>([
    { id: '1', title: 'Anna — Check-up',     start: d(0, 9),  end: d(0, 9, 30),  resourceId: 'anna', color: '#6366f1' },
    { id: '2', title: 'Tom — Consultation',  start: d(1, 11), end: d(1, 12),     resourceId: 'tom',  color: '#10b981' },
    { id: '3', title: 'Anna — Follow-up',    start: d(2, 14), end: d(2, 14, 30), resourceId: 'anna', color: '#6366f1' },
    { id: '4', title: 'Tom — Review',        start: d(3, 10), end: d(3, 11),     resourceId: 'tom',  color: '#10b981' },
  ]);

  const calendar = createCalendar({
    events: () => appointments(),
    view: 'week',
    locale: 'de-AT',
    editable: true,
    selectable: true,
    resources: [
      { id: 'anna', name: 'Anna Müller', color: '#6366f1' },
      { id: 'tom',  name: 'Tom Weber',   color: '#10b981' },
    ],
    time: { dayStart: 8, dayEnd: 18, slotDuration: 30, weekStart: 1 },
    onSlotClick: (start, end) => {
      const id = String(++_apptCounter);
      appointments.update(list => [
        ...list,
        { id, title: 'New Appointment', start, end, color: '#f59e0b' },
      ]);
    },
    onEventDrop: (event, newStart, newEnd, resourceId) => {
      appointments.update(list =>
        list.map(a => {
          if (a.id !== event.id) return a;
          const updated: CalendarEvent = { ...a, start: newStart, end: newEnd };
          if (resourceId !== undefined) updated.resourceId = resourceId;
          return updated;
        })
      );
    },
    onEventResize: (event, newEnd) => {
      appointments.update(list =>
        list.map(a => a.id === event.id ? { ...a, end: newEnd } : a)
      );
    },
  });

  const toolbar = calendar.Toolbar();
  const root = calendar.Root();

  return (
    <div style="height:520px;display:flex;flex-direction:column;gap:8px">
      {toolbar}
      <div style="flex:1;min-height:0">{root}</div>
    </div>
  );
}

const LIVE_CODE = `const appointments = signal<Appointment[]>([
  { id: '1', title: 'Anna — Check-up', start: d(0, 9), end: d(0, 9, 30), resourceId: 'anna' },
]);

const calendar = createCalendar({
  events: () => appointments(),
  view: 'week',
  locale: 'de-AT',
  editable: true,
  selectable: true,
  resources: [
    { id: 'anna', name: 'Anna Müller', color: '#6366f1' },
    { id: 'tom',  name: 'Tom Weber',   color: '#10b981' },
  ],
  time: { dayStart: 8, dayEnd: 18, slotDuration: 30, weekStart: 1 },
  onSlotClick: (start, end) => {
    appointments.update(list => [...list, { id: nextId(), title: 'New Appointment', start, end }]);
  },
  onEventDrop: (event, newStart, newEnd, resourceId) => {
    appointments.update(list =>
      list.map(a => a.id === event.id ? { ...a, start: newStart, end: newEnd, resourceId } : a)
    );
  },
});

calendar.Toolbar()
calendar.Root()`;

const SETUP_CODE = `import { createCalendar } from 'liteforge/calendar';
import { signal } from 'liteforge';

interface Appointment {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId?: string;
}

const appointments = signal<Appointment[]>([
  {
    id: '1',
    title: 'Anna Müller — Check-up',
    start: new Date('2025-03-10T09:00'),
    end:   new Date('2025-03-10T09:30'),
    resourceId: 'dr-fischer',
  },
]);

const calendar = createCalendar({
  events: () => appointments(),
  view: 'week',
  locale: 'de-AT',
  time: { dayStart: 8, dayEnd: 18, slotDuration: 30, weekStart: 1 },
  editable:   true,
  selectable: true,
});

calendar.Toolbar()  // prev/next/today + view switcher
calendar.Root()     // the calendar grid`;

const RESOURCES_CODE = `const calendar = createCalendar({
  events: () => appointments(),
  view: 'day',  // day view with resource columns
  resources: [
    { id: 'dr-fischer', name: 'Dr. Fischer', color: '#6366f1' },
    { id: 'dr-weber',   name: 'Dr. Weber',   color: '#10b981' },
    { id: 'room-1',     name: 'Room 1',      color: '#f59e0b' },
  ],
  editable: true,
});

// Toggle resource visibility
calendar.toggleResource('room-1');`;

const EVENTS_CODE = `const calendar = createCalendar({
  events: () => appointments(),
  editable:   true,
  selectable: true,

  onEventDrop: (event, newStart, newEnd, resourceId) => {
    appointments.update(list =>
      list.map(a => a.id === event.id
        ? { ...a, start: newStart, end: newEnd, resourceId }
        : a
      )
    );
  },

  onEventResize: (event, newEnd) => {
    appointments.update(list =>
      list.map(a => a.id === event.id ? { ...a, end: newEnd } : a)
    );
  },

  onSlotClick: (start, end, resourceId) => {
    openCreateModal({ start, end, resourceId });
  },

  onEventClick: (event) => {
    openEditModal(event);
  },
});`;

const RECURRING_CODE = `const dailyStandup: CalendarEvent = {
  id: 'standup',
  title: 'Daily Standup',
  start: new Date('2025-03-10T09:00'),
  end:   new Date('2025-03-10T09:15'),
  recurring: {
    freq: 'daily',
    interval: 1,
    until: new Date('2025-04-30'),
    excludeDates: [new Date('2025-03-25')],  // skip Good Friday
  },
};`;

const NAVIGATION_CODE = `// Programmatic navigation
calendar.next();             // next week/month/day
calendar.prev();
calendar.today();
calendar.goToDate(new Date('2025-06-01'));

// Change view
calendar.setView('month');   // 'day' | 'week' | 'month' | 'agenda'

// Current state
calendar.currentDate()       // Signal<Date>
calendar.currentView()       // Signal<CalendarView>`;

const CALENDAR_API: ApiRow[] = [
  { name: 'events', type: '() => CalendarEvent[]', description: 'Reactive event source — re-renders when signal changes' },
  { name: 'view', type: "'day' | 'week' | 'month' | 'agenda'", default: "'week'", description: 'Initial calendar view' },
  { name: 'resources', type: 'Resource[]', description: 'People or rooms shown as columns in day view' },
  { name: 'editable', type: 'boolean', default: 'false', description: 'Enable drag & drop and event resizing' },
  { name: 'selectable', type: 'boolean', default: 'false', description: 'Enable slot selection to create events' },
  { name: 'locale', type: 'string', default: "'en-US'", description: 'Locale for date/time formatting (e.g. de-AT)' },
  { name: 'time', type: 'TimeConfig', description: 'dayStart, dayEnd (hours), slotDuration (minutes), weekStart (0=Sun, 1=Mon)' },
  { name: 'onEventDrop', type: '(event, newStart, newEnd, resourceId?) => void', description: 'Called when an event is dragged to a new time slot' },
  { name: 'onEventResize', type: '(event, newEnd) => void', description: 'Called when an event is resized' },
  { name: 'onSlotClick', type: '(start, end, resourceId?) => void', description: 'Called when an empty slot is clicked' },
];

export const CalendarPage = createComponent({
  name: 'CalendarPage',
  component() {
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/calendar</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">Calendar</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            Scheduling calendar with Day, Week, Month, and Agenda views.
            Supports resource columns (therapists, rooms), drag & drop, event resizing, and recurring events.
          </p>
          <CodeBlock code={`pnpm add @liteforge/calendar`} language="bash" />
          <CodeBlock code={`import { createCalendar } from 'liteforge/calendar';`} language="typescript" />
        </div>

        <DocSection
          title="Live example"
          id="live"
          description="Week view with 2 resources. Click an empty slot to add an event, drag events to move them."
        >
          <LiveExample
            title="Calendar — drag & drop, resources, week view"
            description="Click empty slots to create events"
            component={CalendarLiveExample}
            code={LIVE_CODE}
          />
        </DocSection>

        <DocSection
          title="createCalendar()"
          id="setup"
          description="Pass events as a reactive function and configure the view, locale, and time range."
        >
          <div>
            <CodeBlock code={SETUP_CODE} language="typescript" />
            <ApiTable rows={CALENDAR_API} />
          </div>
        </DocSection>

        <DocSection
          title="Resources"
          id="resources"
          description="In day view, resources (doctors, rooms) appear as parallel columns. Events are assigned to a resource via resourceId."
        >
          <CodeBlock code={RESOURCES_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Event handlers"
          id="event-handlers"
          description="Handle drag & drop, resize, slot click, and event click to create/update your event signal."
        >
          <CodeBlock code={EVENTS_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Recurring events"
          id="recurring"
          description="Define recurring rules with frequency, interval, end date, and exclude dates."
        >
          <CodeBlock code={RECURRING_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Navigation & view switching"
          id="navigation"
          description="All navigation is programmatic — or use calendar.Toolbar() for a built-in toolbar with prev/next/today and view selector."
        >
          <CodeBlock code={NAVIGATION_CODE} language="typescript" />
        </DocSection>

      </div>
    );
  },
});
