import { createComponent, signal, effect, use } from 'liteforge';
import { createCalendar, startOfWeek } from 'liteforge/calendar';
import { tooltip } from 'liteforge/tooltip';
import { toast } from 'liteforge/toast';
import type { CalendarEvent, Resource } from 'liteforge/calendar';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import type { ApiRow } from '../components/ApiTable.js';
import { setToc } from '../toc.js';

// ─── Resources ────────────────────────────────────────────────────────────────

const DEMO_RESOURCES: Resource[] = [
  { id: 'anna',  name: 'Dr. Anna Müller', color: '#6366f1', workingHours: { 1: { start: 8, end: 17 }, 2: { start: 8, end: 17 }, 3: { start: 8, end: 12 }, 4: { start: 8, end: 17 }, 5: { start: 8, end: 14 } } },
  { id: 'tom',   name: 'Dr. Tom Weber',   color: '#10b981', workingHours: { 1: { start: 9, end: 18 }, 2: { start: 9, end: 18 }, 3: { start: 9, end: 18 }, 4: { start: 9, end: 18 }, 5: { start: 9, end: 15 } } },
  { id: 'clara', name: 'Dr. Clara Bauer', color: '#f59e0b', workingHours: { 1: { start: 8, end: 16 }, 2: { start: 8, end: 16 }, 3: { start: 8, end: 16 }, 4: { start: 8, end: 16 }, 5: { start: 8, end: 13 } } },
]

// ─── Sample events ────────────────────────────────────────────────────────────

const SESSION_TYPES = [
  { label: 'Initial Consult',  duration: 60 },
  { label: 'Therapy Session',  duration: 50 },
  { label: 'Follow-up',        duration: 30 },
  { label: 'Group Therapy',    duration: 90 },
  { label: 'Crisis Support',   duration: 30 },
  { label: 'Review',           duration: 25 },
]
const PATIENTS = [
  'A. Brown', 'M. Rivera', 'E. Lewis', 'F. Kim', 'S. Patel',
  'J. Wong', 'L. Park',   'D. Hill',  'H. Tran', 'N. Garcia',
]

function createSampleEvents(): CalendarEvent[] {
  const monday = startOfWeek(new Date(), 1)
  const events: CalendarEvent[] = []
  let id = 1

  // d(day, h, m) → Date helper
  const d = (day: number, h: number, m = 0) => {
    const dt = new Date(monday)
    dt.setDate(monday.getDate() + day)
    dt.setHours(h, m, 0, 0)
    return dt
  }

  // ── Fixed schedule — easy to read, no overlap chaos ──────────────────────
  // Anna: indigo
  const anna = '#6366f1'
  events.push({ id: `e-${id++}`, title: 'Initial Consult — A. Brown',  start: d(0,  9),    end: d(0, 10),    resourceId: 'anna', color: anna })
  events.push({ id: `e-${id++}`, title: 'Therapy — M. Rivera',         start: d(0, 11),    end: d(0, 11,50), resourceId: 'anna', color: anna })
  events.push({ id: `e-${id++}`, title: 'Follow-up — E. Lewis',        start: d(1,  9,30), end: d(1, 10),    resourceId: 'anna', color: anna })
  events.push({ id: `e-${id++}`, title: 'Crisis Support — F. Kim',     start: d(1, 14),    end: d(1, 14,30), resourceId: 'anna', color: anna, indicators: [{ icon: '⚠', tooltip: 'Double-booked', color: '#ef4444' }] })
  events.push({ id: `e-${id++}`, title: 'Therapy — S. Patel',          start: d(2, 10),    end: d(2, 10,50), resourceId: 'anna', color: anna })
  events.push({ id: `e-${id++}`, title: 'Review — J. Wong',            start: d(3,  9),    end: d(3,  9,25), resourceId: 'anna', color: anna })
  events.push({ id: `e-${id++}`, title: 'Group Therapy',               start: d(3, 10,30), end: d(3, 12),    resourceId: 'anna', color: anna })
  events.push({ id: `e-${id++}`, title: 'Initial Consult — L. Park',   start: d(4, 10),    end: d(4, 11),    resourceId: 'anna', color: anna })

  // Tom: emerald
  const tom = '#10b981'
  events.push({ id: `e-${id++}`, title: 'Therapy — D. Hill',           start: d(0, 10),    end: d(0, 10,50), resourceId: 'tom', color: tom })
  events.push({ id: `e-${id++}`, title: 'Review — H. Tran',            start: d(0, 13),    end: d(0, 13,25), resourceId: 'tom', color: tom })
  events.push({ id: `e-${id++}`, title: 'Initial Consult — N. Garcia', start: d(1, 10),    end: d(1, 11),    resourceId: 'tom', color: tom })
  events.push({ id: `e-${id++}`, title: 'Therapy — A. Brown',          start: d(2,  9),    end: d(2,  9,50), resourceId: 'tom', color: tom })
  events.push({ id: `e-${id++}`, title: 'Follow-up — M. Rivera',       start: d(2, 13,30), end: d(2, 14),    resourceId: 'tom', color: tom })
  events.push({ id: `e-${id++}`, title: 'Group Therapy',               start: d(3, 14),    end: d(3, 15,30), resourceId: 'tom', color: tom })
  events.push({ id: `e-${id++}`, title: 'Crisis Support — E. Lewis',   start: d(4,  9),    end: d(4,  9,30), resourceId: 'tom', color: tom })

  // Clara: amber
  const clara = '#f59e0b'
  events.push({ id: `e-${id++}`, title: 'Therapy — F. Kim',            start: d(0,  9,30), end: d(0, 10,20), resourceId: 'clara', color: clara })
  events.push({ id: `e-${id++}`, title: 'Initial Consult — S. Patel',  start: d(1,  9),    end: d(1, 10),    resourceId: 'clara', color: clara })
  events.push({ id: `e-${id++}`, title: 'Follow-up — J. Wong',         start: d(1, 14,30), end: d(1, 15),    resourceId: 'clara', color: clara })
  events.push({ id: `e-${id++}`, title: 'Therapy — L. Park',           start: d(2, 11),    end: d(2, 11,50), resourceId: 'clara', color: clara })
  events.push({ id: `e-${id++}`, title: 'Review — D. Hill',            start: d(3, 10),    end: d(3, 10,25), resourceId: 'clara', color: clara })
  events.push({ id: `e-${id++}`, title: 'Initial Consult — H. Tran',   start: d(4,  9),    end: d(4, 10),    resourceId: 'clara', color: clara })

  // All-day events
  const fri = new Date(monday); fri.setDate(monday.getDate() + 4)
  events.push({ id: 'e-allday-1', title: 'Training Day', start: new Date(fri.getFullYear(), fri.getMonth(), fri.getDate(), 0, 0), end: new Date(fri.getFullYear(), fri.getMonth(), fri.getDate(), 23, 59), color: '#6366f1', allDay: true })

  const wed = new Date(monday); wed.setDate(monday.getDate() + 2)
  events.push({ id: 'e-allday-2', title: 'Team Offsite', start: new Date(wed.getFullYear(), wed.getMonth(), wed.getDate(), 0, 0), end: new Date(wed.getFullYear(), wed.getMonth(), wed.getDate(), 23, 59), color: '#ec4899', allDay: true })

  // Recurring
  events.push({ id: 'e-rec-1', title: 'Daily Standup', start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 8, 0), end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 8, 15), color: '#64748b', recurring: { frequency: 'daily', interval: 1 } })
  events.push({ id: 'e-rec-2', title: 'Weekly Team Sync', start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 12, 0), end: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 13, 0), color: '#8b5cf6', recurring: { frequency: 'weekly', interval: 1 } })

  return events
}

// ─── Simulator ────────────────────────────────────────────────────────────────

const SIM_RESOURCES = DEMO_RESOURCES
const SIM_SESSIONS  = SESSION_TYPES.map(s => s.label)
const SIM_PATIENTS  = PATIENTS

let _simCounter = 9000
const simRand = () => Math.random()
const simPick = <T,>(arr: T[]): T => arr[Math.floor(simRand() * arr.length)]!

interface SimState { running: boolean; flash: boolean }

class MockCalendarSocket {
  private _timer: ReturnType<typeof setTimeout> | null = null
  private _eventsSignal: ReturnType<typeof signal<CalendarEvent[]>>
  private _state: ReturnType<typeof signal<SimState>>

  constructor(
    eventsSignal: ReturnType<typeof signal<CalendarEvent[]>>,
    state: ReturnType<typeof signal<SimState>>,
  ) {
    this._eventsSignal = eventsSignal
    this._state = state
  }

  start(): void {
    this._state.update(s => ({ ...s, running: true }))
    this._schedule()
    document.addEventListener('visibilitychange', this._onVisibility)
  }

  stop(): void {
    this._state.update(s => ({ ...s, running: false }))
    if (this._timer) { clearTimeout(this._timer); this._timer = null }
    document.removeEventListener('visibilitychange', this._onVisibility)
  }

  private _onVisibility = (): void => {
    if (document.hidden) {
      if (this._timer) { clearTimeout(this._timer); this._timer = null }
    } else {
      toast.dismissAll()
      this._schedule()
    }
  }

  private _schedule(): void {
    const delay = 2000 + simRand() * 2000
    this._timer = setTimeout(() => {
      if (!this._state().running) return
      this._fire()
      this._schedule()
    }, delay)
  }

  private _notify(msg: string): void {
    this._state.update(s => ({ ...s, flash: true }))
    setTimeout(() => this._state.update(s => ({ ...s, flash: false })), 400)
    toast.dismissAll()
    toast.info(msg, { duration: 3000 })
  }

  private _fire(): void {
    const roll = simRand()
    const evts = this._eventsSignal()
    const mutable = evts.filter(e => !e.recurring && !e.allDay)

    if (roll < 0.10 && mutable.length > 0) {
      // 10%: all-day event
      const res = simPick(SIM_RESOURCES)
      const monday = startOfWeek(new Date(), 1)
      const dayOff = Math.floor(simRand() * 5)
      const day = new Date(monday); day.setDate(day.getDate() + dayOff)
      const newEvt: CalendarEvent = {
        id: `sim-${++_simCounter}`,
        title: `Training — ${res.name}`,
        start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0),
        end:   new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59),
        resourceId: res.id,
        ...(res.color ? { color: res.color } : {}),
        allDay: true,
      }
      this._eventsSignal.update(e => [...e, newEvt])
      this._notify(`${res.name} — All-day added`)

    } else if (roll < 0.45 || mutable.length === 0) {
      // 35%: create timed event
      const res = simPick(SIM_RESOURCES)
      const session = simPick(SIM_SESSIONS)
      const patient = simPick(SIM_PATIENTS)
      const monday = startOfWeek(new Date(), 1)
      const dayOff = Math.floor(simRand() * 5)
      const day = new Date(monday); day.setDate(day.getDate() + dayOff)
      const startH = 8 + Math.floor(simRand() * 10)
      const startM = simRand() < 0.5 ? 0 : 30
      const dur = 30 + Math.floor(simRand() * 3) * 15
      const endMin = startH * 60 + startM + dur
      const newEvt: CalendarEvent = {
        id: `sim-${++_simCounter}`,
        title: `${session} — ${patient}`,
        start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), startH, startM),
        end:   new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(endMin / 60), endMin % 60),
        resourceId: res.id,
        ...(res.color ? { color: res.color } : {}),
      }
      this._eventsSignal.update(e => [...e, newEvt])
      const fmtT = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`
      this._notify(`${res.name} — New event ${fmtT}`)

    } else if (roll < 0.75 && mutable.length > 0) {
      // 30%: shift ±30–60 min
      const target = simPick(mutable)
      const shiftMin = (simRand() < 0.5 ? 1 : -1) * (30 + Math.floor(simRand() * 3) * 15)
      const newStart = new Date(target.start.getTime() + shiftMin * 60000)
      const newEnd   = new Date(target.end.getTime()   + shiftMin * 60000)
      if (newStart.getHours() >= 8 && newEnd.getHours() <= 22) {
        this._eventsSignal.update(e =>
          e.map(ev => ev.id === target.id ? { ...ev, start: newStart, end: newEnd } : ev)
        )
        const dir = shiftMin > 0 ? `+${shiftMin}min` : `${shiftMin}min`
        const title = target.title.split('—')[0]?.trim() ?? target.title
        this._notify(`${title} — shifted ${dir}`)
      }

    } else if (mutable.length > 0) {
      // 25%: delete
      const target = simPick(mutable)
      this._eventsSignal.update(e => e.filter(ev => ev.id !== target.id))
      const title = target.title.split('—')[0]?.trim() ?? target.title
      this._notify(`${title} — removed`)
    }
  }
}

// ─── Live example ─────────────────────────────────────────────────────────────

let _apptCounter = 5000

function CalendarLiveExample(): Node {
  const events = signal<CalendarEvent[]>(createSampleEvents())
  const simState = signal<SimState>({ running: false, flash: false })
  const socket = new MockCalendarSocket(events, simState)

  const calendar = createCalendar({
    events: () => events(),
    view: 'week',
    locale: 'en-US',
    editable: true,
    selectable: true,
    resources: DEMO_RESOURCES,
    time: { dayStart: 8, dayEnd: 19, slotDuration: 30, weekStart: 1 },
    selection: { snapIndicator: true },
    toolbar: {
      showMoreMenu: false,
      showWeekendToggle: false,
      viewDisplay: 'dropdown',
      resourceDisplay: 'dropdown',
    },
    eventTooltip: { fn: tooltip, delay: 300, position: 'top' },
    onEventConflict: (_event, conflicts) => conflicts.length > 0 ? 'warn' : 'allow',
    onSlotClick: (start, end, resourceId) => {
      const id = String(++_apptCounter)
      const newEvt: CalendarEvent = { id, title: 'New Appointment', start, end, color: '#64748b' }
      if (resourceId !== undefined) newEvt.resourceId = resourceId
      events.update(list => [...list, newEvt])
      toast.success(`Created at ${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`, { duration: 2000 })
    },
    onEventDrop: (event, newStart, newEnd, resourceId) => {
      events.update(list =>
        list.map(a => {
          if (a.id !== event.id) return a
          const updated: CalendarEvent = { ...a, start: newStart, end: newEnd }
          if (resourceId !== undefined) updated.resourceId = resourceId
          return updated
        })
      )
    },
    onEventResize: (event, newEnd) => {
      events.update(list =>
        list.map(a => a.id === event.id ? { ...a, end: newEnd } : a)
      )
    },
    onEventClick: (event) => {
      calendar.clearSelectedEvent()
      toast.info(event.title, { duration: 2000 })
    },
  })

  // ── Simulate button — injected into toolbar nav row ────────────────────────
  const simDot = document.createElement('div')
  simDot.style.cssText = 'width:6px;height:6px;border-radius:50%;background:#475569;flex-shrink:0;transition:background 0.15s'

  const simLabel = document.createElement('span')
  simLabel.textContent = 'Simulate'

  const simBtn = document.createElement('button')
  simBtn.type = 'button'
  simBtn.style.cssText = 'display:inline-flex;align-items:center;gap:5px;padding:0 10px;height:28px;border-radius:5px;border:1px solid var(--lf-cal-border,#e2e8f0);background:transparent;color:var(--lf-cal-header-color,#374151);font-size:12px;font-family:inherit;cursor:pointer;white-space:nowrap;flex-shrink:0;margin-left:auto'
  simBtn.appendChild(simDot)
  simBtn.appendChild(simLabel)

  let simRunning = false
  simBtn.addEventListener('click', () => {
    simRunning = !simRunning
    if (simRunning) socket.start()
    else socket.stop()
  })

  effect(() => {
    const { running, flash } = simState()
    simRunning = running
    simLabel.textContent = running ? 'Stop' : 'Simulate'
    simDot.style.background = flash ? '#22c55e' : running ? '#f59e0b' : '#475569'
    simBtn.style.opacity = running ? '1' : '0.7'
  })

  // Inject into .lf-cal-toolbar-nav (same flex row as prev/today/next)
  const calToolbarEl = calendar.Toolbar() as HTMLElement
  const navEl = calToolbarEl.querySelector('.lf-cal-toolbar-nav') as HTMLElement | null
  if (navEl) {
    navEl.style.flex = '1'  // stretch nav row to full toolbar width
    navEl.appendChild(simBtn)
  } else {
    calToolbarEl.appendChild(simBtn)
  }

  const gridWrap = document.createElement('div')
  gridWrap.style.cssText = 'flex:1;min-height:0;overflow:hidden'
  gridWrap.appendChild(calendar.Root() as Node)

  // Fixed-height wrapper — calendar fills it, LiveExample p-5 expands to this height
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'height:480px;display:flex;flex-direction:column;overflow:hidden'
  wrapper.appendChild(calToolbarEl)
  wrapper.appendChild(gridWrap)

  return wrapper
}

// ─── Code snippets ────────────────────────────────────────────────────────────

const SETUP_CODE = `import { createCalendar } from '@liteforge/calendar';
import { signal } from '@liteforge/core';

const events = signal<CalendarEvent[]>([
  {
    id: '1',
    title: 'Initial Consult — A. Brown',
    start: new Date('2025-03-10T09:00'),
    end:   new Date('2025-03-10T10:00'),
    resourceId: 'dr-anna',
  },
]);

const calendar = createCalendar({
  events: () => events(),
  view: 'week',               // 'day' | 'week' | 'month' | 'agenda' | 'timeline'
  locale: 'en-US',
  time: { dayStart: 8, dayEnd: 18, slotDuration: 30, weekStart: 1 },
  editable:   true,           // drag & drop + resize
  selectable: true,           // slot click / drag-select
});

// Render: place these anywhere in your DOM
calendar.Toolbar()   // prev / next / today + view switcher
calendar.Root()      // calendar grid`

const RESOURCES_CODE = `const calendar = createCalendar({
  events: () => events(),
  view: 'day',   // resource columns appear in day view
  resources: [
    { id: 'anna',  name: 'Dr. Anna Müller', color: '#6366f1',
      workingHours: { 1: { start: 8, end: 17 }, 2: { start: 8, end: 17 } } },
    { id: 'tom',   name: 'Dr. Tom Weber',   color: '#10b981' },
    { id: 'clara', name: 'Dr. Clara Bauer', color: '#f59e0b' },
  ],
  editable: true,
});

// Toggle resource visibility
calendar.toggleResource('anna');
calendar.visibleResources();   // Signal<string[]>

// Resource-day view (day with resource columns):
calendar.setView('resource-day');`

const RECURRING_CODE = `// Daily standup — every weekday
const standup: CalendarEvent = {
  id: 'standup',
  title: 'Daily Standup',
  start: new Date('2025-03-10T09:00'),
  end:   new Date('2025-03-10T09:15'),
  recurring: {
    frequency: 'daily',
    interval:  1,
    byDay: [{ day: 'MO' }, { day: 'TU' }, { day: 'WE' }, { day: 'TH' }, { day: 'FR' }],
    until: new Date('2025-06-30'),
    exceptions: [new Date('2025-04-18')],  // skip Good Friday
  },
};

// Monthly — first Monday of each month
const monthlyReview: CalendarEvent = {
  id: 'review',
  title: 'Monthly Review',
  start: new Date('2025-03-03T10:00'),
  end:   new Date('2025-03-03T11:00'),
  recurring: {
    frequency: 'monthly',
    byDay: [{ day: 'MO', nth: 1 }],
  },
};`

const DRAG_CODE = `const calendar = createCalendar({
  events: () => events(),
  editable:   true,   // enables drag & drop + resize globally
  selectable: true,   // enables slot click / drag-select

  onEventDrop: (event, newStart, newEnd, resourceId) => {
    events.update(list =>
      list.map(a => a.id !== event.id ? a : {
        ...a, start: newStart, end: newEnd,
        ...(resourceId !== undefined ? { resourceId } : {}),
      })
    );
  },

  onEventResize: (event, newEnd) => {
    events.update(list =>
      list.map(a => a.id === event.id ? { ...a, end: newEnd } : a)
    );
  },

  // Slot drag-select — fires when user releases after dragging
  onSlotSelect: (start, end, resourceId) => {
    openCreateModal({ start, end, resourceId });
  },

  // Single slot click
  onSlotClick: (start, end, resourceId) => {
    openCreateModal({ start, end, resourceId });
  },

  // Optional: snap duration badge while dragging
  selection: { snapIndicator: true, maxDuration: 120 },
});`

const CONFLICT_CODE = `const calendar = createCalendar({
  events: () => events(),
  editable: true,

  onEventConflict: (event, conflicts) => {
    if (event.resourceId === 'room-a') return 'allow';  // rooms: always allow
    if (conflicts.length > 2) return 'prevent';         // hard limit
    return 'warn';  // show red outline via data-conflict="true"
  },
});

// CSS for the conflict indicator is already included:
// .lf-cal-event[data-conflict="true"] {
//   outline: 2px solid var(--lf-cal-color-danger, #ef4444);
//   outline-offset: -2px;
// }`

const INDICATORS_CODE = `const event: CalendarEvent = {
  id: '1',
  title: 'Therapy — E. Lewis',
  start: new Date('2025-03-10T10:00'),
  end:   new Date('2025-03-10T11:00'),
  indicators: [
    { icon: '⚠', tooltip: 'Double-booked', color: '#ef4444' },
    { icon: '★', tooltip: 'High priority',  color: '#f59e0b' },
    // SVG string or pre-built Node also accepted
    { icon: '<svg .../>',  tooltip: 'Video call', color: '#3b82f6' },
  ],
};`

const TOOLTIP_CODE = `import { tooltip } from '@liteforge/tooltip';
import { createCalendar } from '@liteforge/calendar';

const calendar = createCalendar({
  events: () => events(),

  eventTooltip: {
    fn: tooltip,           // any function: (el, opts) => () => void
    delay: 300,
    position: 'top',

    // Optional: fully custom tooltip content (receives the event)
    render: (event) => {
      const el = document.createElement('div');
      el.innerHTML = \`<strong>\${event.title}</strong><br/>\${event.start.toLocaleTimeString()}\`;
      return el;
    },
  },
});`

const ICAL_CODE = `// Export all visible events as an .ics string
const ics = calendar.exportICal({ calendarName: 'My Calendar', timezone: 'Europe/Vienna' });

// Trigger browser download
calendar.downloadICal({ filename: 'schedule.ics' });

// Import from string
const result = calendar.importICal(icsString);
console.log(result.events);   // CalendarEvent[]
console.log(result.errors);   // parse errors

// Import from file input
const file = fileInput.files[0];
const result = await calendar.importICalFile(file);

// mapImportedEvent — populate T-specific fields after parsing
const calendar = createCalendar<Appointment>({
  events: () => appointments(),
  mapImportedEvent: (e) => ({ ...e, category: 'imported', status: 'confirmed' }),
});`

const LOCALE_CODE = `// Locale controls date/time formatting via Intl
const calendar = createCalendar({
  events: () => events(),
  locale: 'de-AT',    // German (Austria) — week starts Monday by default

  // Override any translation string
  translations: {
    today: 'Heute',
    prev:  'Zurück',
    next:  'Weiter',
    week:  'Woche',
    month: 'Monat',
    allDay: 'Ganztag',
    more: (n) => \`+\${n} weitere\`,
  },
});`

const RESPONSIVE_CODE = `const calendar = createCalendar({
  events: () => events(),

  // Responsive breakpoints (container width, not viewport)
  responsive: {
    mobileBp: 640,          // below 640px → mobile
    tabletBp: 1024,         // below 1024px → tablet
    mobileView: 'day',      // auto-switch to day view on mobile
  },

  // Read current size class reactively
  // calendar.sizeClass() → 'mobile' | 'tablet' | 'desktop'
});

// Mobile resource tab-bar
calendar.MobileResourceBar()   // place below Toolbar on small screens`

const NAVIGATION_CODE = `// Programmatic navigation
calendar.next();             // next period
calendar.prev();             // previous period
calendar.today();            // jump to today
calendar.goTo(new Date());   // jump to any date

// Switch views
calendar.setView('month');   // 'day' | 'week' | 'month' | 'agenda' | 'timeline'

// Read state (signals)
calendar.currentDate()       // Signal<Date>
calendar.currentView()       // Signal<CalendarView>
calendar.dateRange()         // Signal<{ start: Date; end: Date }>

// Events API
calendar.addEvent(newEvent);
calendar.updateEvent(id, { title: 'Updated' });
calendar.removeEvent(id);
calendar.getEvent(id);

// Print
calendar.print({ view: 'week', title: 'This Week' });`

// ─── Page ─────────────────────────────────────────────────────────────────────

export const CalendarPage = createComponent({
  name: 'CalendarPage',
  component() {
    const { t } = use('i18n');

    const getOptionsApi = (): ApiRow[] => [
      { name: 'events',           type: '() => T[]',                        description: t('calendar.apiEvents') },
      { name: 'view',             type: "CalendarView",                      default: "'week'",    description: t('calendar.apiView') },
      { name: 'defaultDate',      type: 'Date',                             default: 'today',     description: t('calendar.apiDefaultDate') },
      { name: 'resources',        type: 'Resource[]',                       description: t('calendar.apiResources') },
      { name: 'editable',         type: 'boolean',                          default: 'false',     description: t('calendar.apiEditable') },
      { name: 'selectable',       type: 'boolean',                          default: 'false',     description: t('calendar.apiSelectable') },
      { name: 'selection',        type: 'SelectionConfig',                  description: t('calendar.apiSelection') },
      { name: 'locale',           type: 'string',                           default: "'en-US'",   description: t('calendar.apiLocale') },
      { name: 'time',             type: 'TimeConfig',                       description: t('calendar.apiTime') },
      { name: 'eventTooltip',     type: 'EventTooltipConfig',               description: t('calendar.apiEventTooltip') },
      { name: 'onEventConflict',  type: "(event, conflicts) => 'allow' | 'warn' | 'prevent'", description: t('calendar.apiOnEventConflict') },
      { name: 'onEventDrop',      type: '(event, newStart, newEnd, resourceId?) => void', description: t('calendar.apiOnEventDrop') },
      { name: 'onEventResize',    type: '(event, newEnd) => void',          description: t('calendar.apiOnEventResize') },
      { name: 'onSlotClick',      type: '(start, end, resourceId?) => void', description: t('calendar.apiOnSlotClick') },
      { name: 'onSlotSelect',     type: '(start, end, resourceId?) => void', description: t('calendar.apiOnSlotSelect') },
      { name: 'onEventClick',     type: '(event) => void',                  description: t('calendar.apiOnEventClick') },
      { name: 'onViewChange',     type: '(view, dateRange) => void',        description: t('calendar.apiOnViewChange') },
      { name: 'translations',     type: 'Partial<CalendarTranslations>',    description: t('calendar.apiTranslations') },
      { name: 'responsive',       type: 'ResponsiveConfig',                 description: t('calendar.apiResponsive') },
      { name: 'eventContent',     type: '(event) => Node',                  description: t('calendar.apiEventContent') },
      { name: 'slotContent',      type: '(date, resourceId?) => Node | null', description: t('calendar.apiSlotContent') },
      { name: 'mapImportedEvent', type: '(event: CalendarEvent) => T',      description: t('calendar.apiMapImportedEvent') },
      { name: 'unstyled',         type: 'boolean',                          default: 'false',     description: t('calendar.apiUnstyledOpt') },
      { name: 'classes',          type: 'Partial<CalendarClasses>',         description: t('calendar.apiClasses') },
      { name: 'timelineOptions',  type: 'TimelineOptions',                  description: t('calendar.apiTimelineOptions') },
    ];

    const getEventApi = (): ApiRow[] => [
      { name: 'id',         type: 'string',            description: t('calendar.apiEventId') },
      { name: 'title',      type: 'string',            description: t('calendar.apiEventTitle') },
      { name: 'start',      type: 'Date',              description: t('calendar.apiEventStart') },
      { name: 'end',        type: 'Date',              description: t('calendar.apiEventEnd') },
      { name: 'resourceId', type: 'string',            description: t('calendar.apiEventResourceId') },
      { name: 'color',      type: 'string',            description: t('calendar.apiEventColor') },
      { name: 'allDay',     type: 'boolean',           description: t('calendar.apiEventAllDay') },
      { name: 'editable',   type: 'boolean',           description: "Per-event editable override — false disables drag & drop even when calendar.editable = true" },
      { name: 'recurring',  type: 'RecurringRule',     description: t('calendar.apiEventRecurring') },
      { name: 'indicators', type: 'EventIndicator[]',  description: t('calendar.apiEventIndicators') },
    ];

    const getResultApi = (): ApiRow[] => [
      { name: 'Root()',              type: '() => Node',     description: t('calendar.apiResultRoot') },
      { name: 'Toolbar()',           type: '() => Node',     description: t('calendar.apiResultToolbar') },
      { name: 'MiniCalendar()',      type: '() => Node',     description: t('calendar.apiResultMiniCalendar') },
      { name: 'MobileResourceBar()', type: '() => Node',     description: t('calendar.apiResultMobileResourceBar') },
      { name: 'currentDate()',        type: '() => Date',     description: t('calendar.apiResultCurrentDate') },
      { name: 'currentView()',        type: '() => CalendarView', description: t('calendar.apiResultCurrentView') },
      { name: 'dateRange()',          type: '() => DateRange', description: t('calendar.apiResultDateRange') },
      { name: 'sizeClass()',          type: "() => 'mobile' | 'tablet' | 'desktop'", description: t('calendar.apiResultSizeClass') },
      { name: 'next() / prev() / today()', type: '() => void', description: t('calendar.apiResultNavigation') },
      { name: 'goTo(date)',           type: '(date: Date) => void', description: t('calendar.apiResultGoTo') },
      { name: 'setView(view)',        type: '(view: CalendarView) => void', description: t('calendar.apiResultSetView') },
      { name: 'addEvent(event)',      type: '(event: T) => void', description: t('calendar.apiResultAddEvent') },
      { name: 'updateEvent(id, changes)', type: '(id: string, changes: Partial<T>) => void', description: t('calendar.apiResultUpdateEvent') },
      { name: 'removeEvent(id)',      type: '(id: string) => void', description: t('calendar.apiResultRemoveEvent') },
      { name: 'exportICal(opts?)',    type: '() => string',  description: t('calendar.apiResultExportICal') },
      { name: 'downloadICal(opts?)',  type: '() => void',    description: t('calendar.apiResultDownloadICal') },
      { name: 'importICal(str)',      type: '(str: string) => ICalImportResult', description: t('calendar.apiResultImportICal') },
      { name: 'print(opts?)',         type: '(opts?: PrintOptions) => void', description: t('calendar.apiResultPrint') },
      { name: 'selectedEvent()',      type: '() => T | null', description: t('calendar.apiResultSelectedEvent') },
      { name: 'clearSelectedEvent()', type: '() => void',    description: t('calendar.apiResultClearSelectedEvent') },
      { name: 'toggleWeekends()',     type: '() => void',    description: t('calendar.apiResultToggleWeekends') },
      { name: 'toggleMiniCalendar()', type: '() => void',    description: t('calendar.apiResultToggleMiniCalendar') },
    ];

    setToc([
      { id: 'live',       label: () => t('calendar.live'),              level: 2 },
      { id: 'setup',      label: () => t('calendar.createCalendar'),    level: 2 },
      { id: 'resources',  label: () => t('calendar.resources'),         level: 2 },
      { id: 'recurring',  label: () => t('calendar.recurring'),         level: 2 },
      { id: 'drag-drop',  label: () => t('calendar.dragDrop'),          level: 2 },
      { id: 'conflict',   label: () => t('calendar.conflict'),          level: 2 },
      { id: 'indicators', label: () => t('calendar.indicators'),        level: 2 },
      { id: 'tooltips',   label: () => t('calendar.tooltips'),          level: 2 },
      { id: 'ical',       label: () => t('calendar.ical'),              level: 2 },
      { id: 'locale',     label: () => t('calendar.locale'),            level: 2 },
      { id: 'responsive', label: () => t('calendar.responsive'),        level: 2 },
      { id: 'navigation', label: () => t('calendar.navigation'),        level: 2 },
      { id: 'api-event',  label: () => t('calendar.apiCalendarEvent'),  level: 2 },
      { id: 'api-result', label: () => t('calendar.apiResult'),         level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/calendar</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('calendar.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-2xl">
            {() => t('calendar.subtitle')}
          </p>
          <CodeBlock code="pnpm add @liteforge/calendar" language="bash" />
          <CodeBlock code="import { createCalendar } from '@liteforge/calendar';" language="typescript" />
        </div>

        <DocSection title={() => t('calendar.live')} id="live" description={() => t('calendar.liveDesc')}>
          <LiveExample
            title={() => t('calendar.liveTitle')}
            component={CalendarLiveExample}
            code={SETUP_CODE}
          />
        </DocSection>

        <DocSection title={() => t('calendar.createCalendar')} id="setup" description={() => t('calendar.createCalendarDesc')}>
          <div>
            <CodeBlock code={SETUP_CODE} language="typescript" />
            <ApiTable rows={() => getOptionsApi()} />
          </div>
        </DocSection>

        <DocSection title={() => t('calendar.resources')} id="resources" description={() => t('calendar.resourcesDesc')}>
          <CodeBlock code={RESOURCES_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.recurring')} id="recurring" description={() => t('calendar.recurringDesc')}>
          <CodeBlock code={RECURRING_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.dragDrop')} id="drag-drop" description={() => t('calendar.dragDropDesc')}>
          <CodeBlock code={DRAG_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.conflict')} id="conflict" description={() => t('calendar.conflictDesc')}>
          <CodeBlock code={CONFLICT_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.indicators')} id="indicators" description={() => t('calendar.indicatorsDesc')}>
          <CodeBlock code={INDICATORS_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.tooltips')} id="tooltips" description={() => t('calendar.tooltipsDesc')}>
          <CodeBlock code={TOOLTIP_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.ical')} id="ical" description={() => t('calendar.icalDesc')}>
          <CodeBlock code={ICAL_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.locale')} id="locale" description={() => t('calendar.localeDesc')}>
          <CodeBlock code={LOCALE_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.responsive')} id="responsive" description={() => t('calendar.responsiveDesc')}>
          <CodeBlock code={RESPONSIVE_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.navigation')} id="navigation" description={() => t('calendar.navigationDesc')}>
          <CodeBlock code={NAVIGATION_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.apiCalendarEvent')} id="api-event" description={() => t('calendar.apiCalendarEventDesc')}>
          <ApiTable rows={() => getEventApi()} />
        </DocSection>

        <DocSection title={() => t('calendar.apiResult')} id="api-result" description={() => t('calendar.apiResultDesc')}>
          <ApiTable rows={() => getResultApi()} />
        </DocSection>
      </div>
    )
  },
})
