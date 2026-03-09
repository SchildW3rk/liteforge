/**
 * Calendar Page - Demonstrates @liteforge/calendar usage
 *
 * Features:
 * - Full scheduling calendar (not a datepicker!)
 * - Day, Week, Month, Agenda views
 * - Resource columns (therapists/rooms)
 * - Recurring events
 * - Event creation via slot click / drag-select (with snap indicator badge)
 * - @liteforge/modal integration for event detail + create modals
 * - @liteforge/toast for live-update notifications
 * - Auto locale-based translations (locale: 'de-AT' → German)
 */

import { createComponent } from 'liteforge';
import { signal } from 'liteforge';
import { createCalendar, startOfWeek } from 'liteforge/calendar';
import { tooltip } from 'liteforge/tooltip';
import { createModal } from 'liteforge/modal';
import { toast } from 'liteforge/toast';
import type { CalendarEvent, Resource, RecurringRule } from 'liteforge/calendar';

// =============================================================================
// Sample Data - Therapy Practice Schedule
// =============================================================================

const resources: Resource[] = [
  {
    id: 'sarah',
    name: 'Dr. Sarah Miller',
    color: '#3b82f6',
    workingHours: {
      1: { start: 8, end: 17 }, 2: { start: 8, end: 17 },
      3: { start: 8, end: 12 }, 4: { start: 8, end: 17 }, 5: { start: 8, end: 14 },
    },
  },
  {
    id: 'john',
    name: 'Dr. John Smith',
    color: '#10b981',
    workingHours: {
      1: { start: 9, end: 18 }, 2: { start: 9, end: 18 },
      3: { start: 9, end: 18 }, 4: { start: 9, end: 18 }, 5: { start: 9, end: 15 },
    },
  },
  {
    id: 'elena',
    name: 'Dr. Elena Kovač',
    color: '#8b5cf6',
    workingHours: {
      1: { start: 8, end: 16 }, 2: { start: 8, end: 16 },
      3: { start: 8, end: 16 }, 4: { start: 8, end: 16 }, 5: { start: 8, end: 13 },
    },
  },
  {
    id: 'room-a',
    name: 'Gruppenraum A',
    color: '#f97316',
  },
];

// ─── Session types ────────────────────────────────────────────────────────────
const SESSION_TYPES = [
  { label: 'Erstgespräch',          duration: 60 },
  { label: 'Einzeltherapie',        duration: 50 },
  { label: 'Paartherapie',          duration: 80 },
  { label: 'Kindertherapie',        duration: 45 },
  { label: 'Verhaltenstherapie',    duration: 50 },
  { label: 'Traumatherapie',        duration: 60 },
  { label: 'Krisenintervention',    duration: 30 },
  { label: 'Supervision',           duration: 60 },
  { label: 'Verlaufskontrolle',     duration: 25 },
  { label: 'Gruppentherapie',       duration: 90 },
];

const PATIENT_NAMES = [
  'Anna B.', 'Michael R.', 'Emma L.', 'Felix K.', 'Maria S.',
  'Jonas W.', 'Laura P.', 'David H.', 'Sophie M.', 'Lukas F.',
  'Hannah T.', 'Noah G.', 'Mia Z.', 'Elias N.', 'Lena D.',
  'Paul C.', 'Julia V.', 'Leon X.', 'Klara J.', 'Tim A.',
];

function createSampleEvents(): CalendarEvent[] {
  const monday = startOfWeek(new Date(), 1);
  const events: CalendarEvent[] = [];
  let idCounter = 1;

  const therapists = [
    { id: 'sarah', color: '#3b82f6', dayStart: 8,  dayEnd: 17 },
    { id: 'john',  color: '#10b981', dayStart: 9,  dayEnd: 18 },
    { id: 'elena', color: '#8b5cf6', dayStart: 8,  dayEnd: 16 },
  ];

  // Seed-based pseudo-random for reproducible data
  let seed = 42;
  const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;

  // Mon–Fri: generate 3–4 appointments per therapist per day
  for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
    const day = new Date(monday); day.setDate(day.getDate() + dayOffset);

    for (const t of therapists) {
      // Friday: skip ~40% of therapists
      if (dayOffset === 4 && rand() < 0.4) continue;

      let cursor = t.dayStart * 60 + 30 + Math.floor(rand() * 30);
      const endMinutes = (dayOffset === 4 ? t.dayEnd - 2 : t.dayEnd) * 60 - 60;
      let count = 0;

      while (cursor + 25 < endMinutes && count < 4) {
        const session = pick(SESSION_TYPES);
        const dur = session.duration;
        const startH = Math.floor(cursor / 60);
        const startM = cursor % 60;
        const endMin = cursor + dur;
        const endH = Math.floor(endMin / 60);
        const endMm = endMin % 60;

        if (endH > Math.floor(endMinutes / 60)) break;

        const patient = pick(PATIENT_NAMES);
        events.push({
          id: `e-${idCounter++}`,
          title: `${session.label} — ${patient}`,
          start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), startH, startM),
          end:   new Date(day.getFullYear(), day.getMonth(), day.getDate(), endH, endMm),
          resourceId: t.id,
          color: t.color,
        });

        // 15–30 min break between sessions
        cursor = endMin + 15 + Math.floor(rand() * 15);
        count++;
      }
    }

    // 1 group session per day in Gruppenraum A
    const groupStart = 10 + Math.floor(rand() * 3);
    events.push({
      id: `e-${idCounter++}`,
      title: `Gruppentherapie — Angst & Stress`,
      start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), groupStart, 0),
      end:   new Date(day.getFullYear(), day.getMonth(), day.getDate(), groupStart + 1, 30),
      resourceId: 'room-a',
      color: '#f97316',
      indicators: [
        { icon: '⚠', tooltip: 'Neue Serie noch nicht erstellt', color: '#ef4444' },
        { icon: '★', tooltip: 'Priorität hoch', color: '#f59e0b' },
      ],
    });
  }

  // All-day events
  const fri = new Date(monday); fri.setDate(fri.getDate() + 4);
  events.push({
    id: 'e-allday-1',
    title: 'Fortbildungstag',
    start: new Date(fri.getFullYear(), fri.getMonth(), fri.getDate(), 0, 0),
    end:   new Date(fri.getFullYear(), fri.getMonth(), fri.getDate(), 23, 59),
    color: '#6366f1',
    allDay: true,
  });

  const wed = new Date(monday); wed.setDate(wed.getDate() + 2);
  events.push({
    id: 'e-allday-2',
    title: 'Praxis-Jubiläum 🎉',
    start: new Date(wed.getFullYear(), wed.getMonth(), wed.getDate(), 0, 0),
    end:   new Date(wed.getFullYear(), wed.getMonth(), wed.getDate(), 23, 59),
    color: '#ec4899',
    allDay: true,
  });

  // Recurring: Daily Standup + Weekly Team Meeting
  events.push({
    id: 'e-rec-1',
    title: 'Daily Standup',
    start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 8, 0),
    end:   new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 8, 15),
    color: '#64748b',
    recurring: { frequency: 'daily', interval: 1 },
  });
  events.push({
    id: 'e-rec-2',
    title: 'Wöchentliche Teambesprechung',
    start: new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 12, 0),
    end:   new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 13, 0),
    color: '#8b5cf6',
    recurring: { frequency: 'weekly', interval: 1 },
  });

  return events;
}

// =============================================================================
// Mock WebSocket Simulator
// =============================================================================

const SIM_RESOURCES = [
  { id: 'sarah', name: 'Dr. Sarah Miller', color: '#3b82f6' },
  { id: 'john',  name: 'Dr. John Smith',   color: '#10b981' },
  { id: 'elena', name: 'Dr. Elena Kovač',  color: '#8b5cf6' },
];

const SIM_SESSIONS = [
  'Erstgespräch', 'Einzeltherapie', 'Paartherapie',
  'Verhaltenstherapie', 'Traumatherapie', 'Verlaufskontrolle',
];

const SIM_PATIENTS = [
  'Anna B.', 'Michael R.', 'Emma L.', 'Felix K.', 'Maria S.',
  'Jonas W.', 'Laura P.', 'Sophie M.', 'Lukas F.', 'Hannah T.',
];

let _simCounter = 9000;

function simRand(): number { return Math.random(); }
function simPick<T>(arr: T[]): T { return arr[Math.floor(simRand() * arr.length)]!; }

export interface SimState {
  running: boolean;
  flash: boolean; // true for 400ms after each mutation
}

class MockCalendarSocket {
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _eventsSignal: ReturnType<typeof signal<CalendarEvent[]>>;
  private _state: ReturnType<typeof signal<SimState>>;

  constructor(
    eventsSignal: ReturnType<typeof signal<CalendarEvent[]>>,
    state: ReturnType<typeof signal<SimState>>,
  ) {
    this._eventsSignal = eventsSignal;
    this._state = state;
  }

  start(): void {
    this._state.update(s => ({ ...s, running: true }));
    this._schedule();
    document.addEventListener('visibilitychange', this._onVisibility);
  }

  stop(): void {
    this._state.update(s => ({ ...s, running: false }));
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    document.removeEventListener('visibilitychange', this._onVisibility);
  }

  private _onVisibility = (): void => {
    if (document.hidden) {
      // Tab hidden — pause timer
      if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    } else {
      // Tab visible again — clear stale toasts, resume
      toast.dismissAll();
      this._schedule();
    }
  };

  private _schedule(): void {
    const delay = 2000 + simRand() * 2000; // 2–4s
    this._timer = setTimeout(() => {
      if (!this._state().running) return;
      this._fire();
      this._schedule();
    }, delay);
  }

  private _notify(msg: string): void {
    // Flash the indicator
    this._state.update(s => ({ ...s, flash: true }));
    setTimeout(() => this._state.update(s => ({ ...s, flash: false })), 400);
    // Replace any existing sim-toast so they don't stack
    toast.dismissAll();
    toast.info(msg, { duration: 3000 });
  }

  private _fire(): void {
    const roll = simRand();
    const evts = this._eventsSignal();
    // Only non-recurring, non-allDay events for update/delete to keep it clean
    const mutableEvts = evts.filter(e => !e.recurring && !e.allDay);

    if (roll < 0.10 && mutableEvts.length > 0) {
      // 10%: create all-day
      const res = simPick(SIM_RESOURCES);
      const monday = startOfWeek(new Date(), 1);
      const dayOff = Math.floor(simRand() * 5);
      const day = new Date(monday); day.setDate(day.getDate() + dayOff);
      const newEvt: CalendarEvent = {
        id: `sim-${++_simCounter}`,
        title: `Fortbildung — ${res.name}`,
        start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0),
        end:   new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59),
        resourceId: res.id,
        color: res.color,
        allDay: true,
      };
      this._eventsSignal.update(e => [...e, newEvt]);
      this._notify(`${res.name} — Ganztag hinzugefügt`);

    } else if (roll < 0.40 || mutableEvts.length === 0) {
      // 40%: create regular event (or fallback if no mutable)
      const res = simPick(SIM_RESOURCES);
      const session = simPick(SIM_SESSIONS);
      const patient = simPick(SIM_PATIENTS);
      const monday = startOfWeek(new Date(), 1);
      const dayOff = Math.floor(simRand() * 5);
      const day = new Date(monday); day.setDate(day.getDate() + dayOff);
      const startH = 8 + Math.floor(simRand() * 10);
      const startM = simRand() < 0.5 ? 0 : 30;
      const dur = 30 + Math.floor(simRand() * 3) * 15; // 30/45/60 min
      const endMin = startH * 60 + startM + dur;
      const newEvt: CalendarEvent = {
        id: `sim-${++_simCounter}`,
        title: `${session} — ${patient}`,
        start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), startH, startM),
        end:   new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(endMin / 60), endMin % 60),
        resourceId: res.id,
        color: res.color,
      };
      this._eventsSignal.update(e => [...e, newEvt]);
      const fmtT = `${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}`;
      this._notify(`${res.name} — Neuer Termin ${fmtT}`);

    } else if (roll < 0.70 && mutableEvts.length > 0) {
      // 30%: shift existing event ±30–60 min
      const target = simPick(mutableEvts);
      const shiftMin = (simRand() < 0.5 ? 1 : -1) * (30 + Math.floor(simRand() * 3) * 15);
      const newStart = new Date(target.start.getTime() + shiftMin * 60000);
      const newEnd   = new Date(target.end.getTime()   + shiftMin * 60000);
      // Keep within day bounds (8–22)
      if (newStart.getHours() >= 8 && newEnd.getHours() <= 22) {
        this._eventsSignal.update(e =>
          e.map(ev => ev.id === target.id ? { ...ev, start: newStart, end: newEnd } : ev)
        );
        const dir = shiftMin > 0 ? `+${shiftMin}min` : `${shiftMin}min`;
        const title = target.title.split('—')[0]?.trim() ?? target.title;
        this._notify(`${title} — verschoben ${dir}`);
      }

    } else if (mutableEvts.length > 0) {
      // 20%: delete
      const target = simPick(mutableEvts);
      this._eventsSignal.update(e => e.filter(ev => ev.id !== target.id));
      const title = target.title.split('—')[0]?.trim() ?? target.title;
      this._notify(`${title} — gelöscht`);
    }
  }
}

// =============================================================================
// Calendar Page Component
// =============================================================================

export const CalendarPage = createComponent({
  name: 'CalendarPage',

  setup() {
    const events = signal<CalendarEvent[]>(createSampleEvents());

    // ── Helpers ────────────────────────────────────────────────────────────────

    const fmtDate = new Intl.DateTimeFormat('de-AT', {
      weekday: 'short', day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
    const fmtTime = new Intl.DateTimeFormat('de-AT', { hour: '2-digit', minute: '2-digit' });

    const formatSlotRange = (start: Date, end: Date) =>
      `${fmtDate.format(start)} – ${fmtTime.format(end)}`;

    // ── Calendar instance ──────────────────────────────────────────────────────
    // Defined first so modals can reference calendar.clearSelectedEvent directly.

    const calendar = createCalendar<CalendarEvent>({
      events,
      resources,
      view: 'week',
      defaultDate: new Date(),
      time: {
        slotDuration: 15,
        dayStart: 6,
        dayEnd: 21,
        weekStart: 1,
        hiddenDays: [0],
        nowIndicator: true,
      },
      editable: true,
      selectable: true,
      selection: {
        snapIndicator: true,
        maxDuration: 60,
        snapSteps: [15, 30, 45, 60, 90],
      },
      locale: 'de-AT',
      responsive: {
        mobileBp: 768,
        mobileView: 'day',
      },
      toolbar: {
        resourceDisplay: 'dropdown',
        resourceDropdownLabel: 'Ressourcen',
        viewDisplay: 'dropdown',
      },
      onEventClick: (event) => {
        detailModal.open({ event });
      },
      onSlotClick: (start, end, resourceId) => {
        createEventModal.open({ start, end, ...(resourceId ? { resourceId } : {}) });
      },
      onSlotSelect: (start, end, resourceId) => {
        createEventModal.open({ start, end, ...(resourceId ? { resourceId } : {}) });
      },
      onEventDrop: (event, newStart, newEnd, newResourceId) => {
        events.update(evts =>
          evts.map(e =>
            e.id === event.id
              ? { ...e, start: newStart, end: newEnd,
                  ...(newResourceId !== undefined ? { resourceId: newResourceId } : {}) }
              : e
          )
        );
      },
      onEventResize: (event, newEnd) => {
        events.update(evts =>
          evts.map(e => e.id === event.id ? { ...e, end: newEnd } : e)
        );
      },
      eventTooltip: {
        fn: tooltip,
        delay: 400,
        position: 'top',
      },
    });

    // Expose for browser console testing (dev only)
    if (import.meta.env.DEV) (window as Record<string, unknown>)._cal = calendar;

    // ── Detail modal — view / delete an existing event ─────────────────────────

    const detailModal = createModal<{ event: CalendarEvent }>({
      config: { size: 'sm', closeOnEsc: true, closeOnBackdrop: true, onClose: () => calendar.clearSelectedEvent() },
      component: ({ event }) => {
        const deleteAndClose = () => {
          events.update(evts => evts.filter(e => e.id !== event.id));
          detailModal.close();
        };

        return (
          <div class="cal-modal-body">
            <h3 class="cal-modal-title">{event.title}</h3>
            <dl class="cal-event-details">
              <dt>Beginn</dt>
              <dd>{fmtDate.format(event.start)}</dd>
              <dt>Ende</dt>
              <dd>{fmtDate.format(event.end)}</dd>
              {event.resourceId
                ? <><dt>Ressource</dt><dd>{event.resourceId}</dd></>
                : null}
              {event.recurring ? (
                <>
                  <dt>Wiederkehrend</dt>
                  <dd>{
                    event.recurring.frequency === 'weekly' && event.recurring.interval === 2
                      ? 'Alle 2 Wochen'
                      : ({
                          daily: 'Täglich', weekly: 'Wöchentlich',
                          biweekly: 'Alle 2 Wochen', monthly: 'Monatlich', yearly: 'Jährlich',
                        }[event.recurring.frequency] ?? event.recurring.frequency)
                  }{event.recurring.byDay && event.recurring.byDay.length > 0
                    ? ` (${event.recurring.byDay.map(d => d.day).join(', ')})`
                    : ''
                  }{event.recurring.count ? `, ${event.recurring.count}×` : ''
                  }{event.recurring.until ? `, bis ${new Intl.DateTimeFormat('de-AT').format(event.recurring.until)}` : ''
                  }</dd>
                </>
              ) : null}
            </dl>
            <div class="cal-modal-footer">
              <button class="cal-btn cal-btn--danger" onclick={deleteAndClose}>
                Löschen
              </button>
              <button class="cal-btn cal-btn--ghost" onclick={() => detailModal.close()}>
                Schließen
              </button>
            </div>
          </div>
        );
      },
    });

    // ── Create modal — new event from slot click / drag-select ─────────────────

    interface SlotData { start: Date; end: Date; resourceId?: string }

    type RecFreq = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly'
    type RecEndMode = 'never' | 'count' | 'until'

    const WEEKDAYS: Array<{ key: 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU'; label: string }> = [
      { key: 'MO', label: 'Mo' }, { key: 'TU', label: 'Di' }, { key: 'WE', label: 'Mi' },
      { key: 'TH', label: 'Do' }, { key: 'FR', label: 'Fr' }, { key: 'SA', label: 'Sa' },
      { key: 'SU', label: 'So' },
    ]

    const newTitle    = signal('')
    const recFreq     = signal<RecFreq>('none')
    const recDays     = signal<string[]>([])   // selected Weekday keys when freq=weekly
    const recEndMode  = signal<RecEndMode>('never')
    const recCount    = signal(10)
    const recUntil    = signal('')             // ISO date string

    const resetRec = () => {
      recFreq.set('none')
      recDays.set([])
      recEndMode.set('never')
      recCount.set(10)
      recUntil.set('')
    }

    const createEventModal = createModal<SlotData>({
      config: { size: 'sm', closeOnEsc: true, closeOnBackdrop: true },
      component: (slot) => {
        newTitle.set('')
        resetRec()

        const toggleDay = (key: string) => {
          recDays.update(days =>
            days.includes(key) ? days.filter(d => d !== key) : [...days, key]
          )
        }

        const buildRecurring = () => {
          const freq = recFreq()
          if (freq === 'none') return undefined

          const rule: RecurringRule = {
            frequency: freq === 'biweekly' ? 'weekly' : freq,
            ...(freq === 'biweekly' ? { interval: 2 } : {}),
          }

          if (freq === 'weekly') {
            const days = recDays()
            if (days.length > 0) {
              rule.byDay = days.map(d => ({ day: d as 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU' }))
            }
          }

          const endMode = recEndMode()
          if (endMode === 'count') {
            rule.count = Math.max(1, recCount())
          } else if (endMode === 'until' && recUntil()) {
            rule.until = new Date(recUntil())
          }

          return rule
        }

        const save = () => {
          const title = newTitle().trim()
          if (!title) return
          const recurring = buildRecurring()
          events.update(evts => [
            ...evts,
            {
              id: `new-${Date.now()}`,
              title,
              start: slot.start,
              end: slot.end,
              ...(slot.resourceId ? { resourceId: slot.resourceId } : {}),
              color: '#3b82f6',
              ...(recurring ? { recurring } : {}),
            },
          ])
          createEventModal.close()
          newTitle.set('')
          resetRec()
        }

        // ISO date string for 'until' default: 4 weeks from slot.start
        const defaultUntil = new Date(slot.start)
        defaultUntil.setDate(defaultUntil.getDate() + 28)
        const defaultUntilStr = defaultUntil.toISOString().slice(0, 10)

        return (
          <div class="cal-modal-body">
            <h3 class="cal-modal-title">Neuer Termin</h3>
            <p class="cal-slot-range">{formatSlotRange(slot.start, slot.end)}</p>

            {/* Title */}
            <div class="cal-field">
              <label class="cal-label">Titel</label>
              <input
                class="cal-input"
                type="text"
                placeholder="Terminbezeichnung eingeben…"
                value={() => newTitle()}
                oninput={(e: Event) => newTitle.set((e.target as HTMLInputElement).value)}
                onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') save(); }}
                autofocus
              />
            </div>

            {/* Recurrence frequency */}
            <div class="cal-field">
              <label class="cal-label">Wiederholung</label>
              <select
                class="cal-input cal-select"
                value={() => recFreq()}
                onchange={(e: Event) => {
                  const v = (e.target as HTMLSelectElement).value as RecFreq
                  recFreq.set(v)
                  // Reset end mode when switching away from weekly
                  if (v !== 'weekly') recDays.set([])
                }}
              >
                <option value="none">Keine</option>
                <option value="daily">Täglich</option>
                <option value="weekly">Wöchentlich</option>
                <option value="biweekly">Alle 2 Wochen</option>
                <option value="monthly">Monatlich</option>
              </select>
            </div>

            {/* Weekday picker — only for weekly */}
            {() => recFreq() === 'weekly' ? (
              <div class="cal-field">
                <label class="cal-label">Wochentage</label>
                <div class="cal-weekday-row">
                  {WEEKDAYS.map(({ key, label }) => (
                    <button
                      type="button"
                      class={() => `cal-day-btn${recDays().includes(key) ? ' cal-day-btn--active' : ''}`}
                      onclick={() => toggleDay(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* End condition — only when freq is set */}
            {() => recFreq() !== 'none' ? (
              <div class="cal-field">
                <label class="cal-label">Ende</label>
                <div class="cal-end-row">
                  <label class="cal-radio-label">
                    <input
                      type="radio"
                      name="rec-end"
                      value="never"
                      checked={() => recEndMode() === 'never'}
                      onchange={() => recEndMode.set('never')}
                    /> Nie
                  </label>
                  <label class="cal-radio-label">
                    <input
                      type="radio"
                      name="rec-end"
                      value="count"
                      checked={() => recEndMode() === 'count'}
                      onchange={() => recEndMode.set('count')}
                    /> Nach
                    <input
                      class="cal-input cal-count-input"
                      type="number"
                      min="1"
                      max="365"
                      value={() => recCount()}
                      oninput={(e: Event) => recCount.set(Number((e.target as HTMLInputElement).value))}
                      onclick={() => recEndMode.set('count')}
                    />
                    Terminen
                  </label>
                  <label class="cal-radio-label">
                    <input
                      type="radio"
                      name="rec-end"
                      value="until"
                      checked={() => recEndMode() === 'until'}
                      onchange={() => {
                        recEndMode.set('until')
                        if (!recUntil()) recUntil.set(defaultUntilStr)
                      }}
                    /> Am
                    <input
                      class="cal-input cal-date-input"
                      type="date"
                      value={() => recUntil() || defaultUntilStr}
                      oninput={(e: Event) => {
                        recEndMode.set('until')
                        recUntil.set((e.target as HTMLInputElement).value)
                      }}
                    />
                  </label>
                </div>
              </div>
            ) : null}

            <div class="cal-modal-footer">
              <button class="cal-btn cal-btn--ghost" onclick={() => createEventModal.close()}>
                Abbrechen
              </button>
              <button class="cal-btn cal-btn--primary" onclick={save}>
                Speichern
              </button>
            </div>
          </div>
        );
      },
    });

    // ── Mock WebSocket simulator ───────────────────────────────────────────────

    const simState = signal<SimState>({ running: false, flash: false });
    const socket = new MockCalendarSocket(events, simState);
    // autostart disabled — click "Simulation starten" to enable

    const toggleSim = () => {
      if (simState().running) socket.stop(); else socket.start();
    };

    // Expose for browser console testing (dev only)
    if (import.meta.env.DEV) (window as Record<string, unknown>)._cal = calendar;

    return { calendar, simState, toggleSim };
  },

  component({ setup }) {
    const { calendar, simState, toggleSim } = setup;

    return (
      <div class="calendar-page">
        <div class="calendar-header">
          <div class="calendar-header-row">
            <div>
              <h1>Therapiepraxis Kalender</h1>
              <p class="page-description">
                Vollständiger Terminkalender mit Ansichten, Ressourcen und wiederkehrenden Terminen.
              </p>
            </div>
            {/* Live simulation indicator */}
            <div class="cal-live-wrapper">
              <div class={() => `cal-live-indicator${simState().running ? '' : ' cal-live-indicator--off'}`}>
                <span class={() => [
                  'cal-live-dot',
                  !simState().running ? 'cal-live-dot--off' : '',
                  simState().flash ? 'cal-live-dot--flash' : '',
                ].filter(Boolean).join(' ')} />
                <span class="cal-live-label">Live</span>
              </div>
              <button class="cal-live-btn" onclick={toggleSim}>
                {() => simState().running ? 'Simulation stoppen' : 'Simulation starten'}
              </button>
            </div>
          </div>
        </div>

        <div class={() => `calendar-body${calendar.sizeClass() === 'mobile' ? ' calendar-body--mobile' : ''}`}>
          {/* Sidebar with MiniCalendar — hidden on mobile or when toggled off */}
          <aside
            class="calendar-sidebar"
            style={() => calendar.miniCalendarVisible() ? '' : 'display:none'}
          >
            {calendar.MiniCalendar()}
          </aside>

          {/* Main calendar */}
          <div class="calendar-container">
            {calendar.Toolbar()}
            {calendar.MobileResourceBar()}
            {calendar.Root()}
          </div>
        </div>

        <style>{`
          .calendar-page {
            padding: 20px;
            flex: 1;
            min-height: 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          .calendar-header { margin-bottom: 16px; }
          .calendar-header-row {
            display: flex; align-items: flex-start;
            justify-content: space-between; gap: 16px;
          }
          .calendar-header h1 {
            margin: 0 0 8px 0;
            color: var(--lf-color-text, #1e293b);
            font-size: 24px;
          }
          .page-description { color: var(--lf-color-text-muted, #64748b); margin: 0; }

          /* Live indicator */
          .cal-live-wrapper {
            display: flex; align-items: center; gap: 10px; flex-shrink: 0; padding-top: 4px;
          }
          .cal-live-indicator {
            display: flex; align-items: center; gap: 6px;
            font-size: 12px; font-weight: 600;
            color: #22c55e;
            transition: color 0.2s;
          }
          .cal-live-indicator--off { color: var(--lf-color-text-muted, #94a3b8); }
          .cal-live-dot {
            width: 8px; height: 8px; border-radius: 50%;
            background: #22c55e;
            box-shadow: 0 0 0 0 rgba(34,197,94,0.5);
            animation: cal-pulse 2s infinite;
            transition: background 0.15s;
            flex-shrink: 0;
          }
          .cal-live-dot--off {
            background: var(--lf-color-border, #cbd5e1);
            animation: none;
            box-shadow: none;
          }
          .cal-live-dot--flash {
            background: #f59e0b !important;
            box-shadow: 0 0 0 4px rgba(245,158,11,0.3);
            animation: none;
          }
          @keyframes cal-pulse {
            0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
            70%  { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
            100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
          }
          .cal-live-label { line-height: 1; }
          .cal-live-btn {
            padding: 5px 12px; font-size: 12px; font-weight: 500;
            border: 1px solid var(--lf-color-border, #e2e8f0);
            border-radius: 6px; cursor: pointer;
            background: var(--lf-color-bg-muted, #f1f5f9);
            color: var(--lf-color-text-subtle, #475569);
          }
          .cal-live-btn:hover { background: var(--lf-color-bg-subtle, #e2e8f0); }

          .calendar-body {
            flex: 1; min-height: 0;
            display: flex;
            gap: 16px;
          }
          .calendar-sidebar {
            width: 238px;
            flex-shrink: 0;
            padding: 14px;
            background: var(--lf-cal-header-bg, #f8fafc);
            border: 1px solid var(--lf-cal-border, #e2e8f0);
            border-radius: var(--lf-cal-border-radius, 10px);
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
            overflow-y: auto;
            align-self: flex-start;
            max-height: 100%;
          }
          .calendar-container {
            flex: 1; min-height: 0; min-width: 0;
            display: flex; flex-direction: column;
            border: 1px solid var(--lf-cal-border, #e2e8f0);
            border-radius: var(--lf-cal-border-radius, 10px);
            overflow: hidden;
          }

          /* Mobile layout */
          .calendar-body--mobile .calendar-sidebar {
            display: none;
          }
          .calendar-body--mobile {
            gap: 0;
          }
          /* Hide resource tab-bar on desktop */
          .lf-cal-mobile-res-bar { display: none; }
          .calendar-body--mobile .lf-cal-mobile-res-bar { display: flex; }
          @media (max-width: 768px) {
            .calendar-page { padding: 8px; }
            .calendar-header { margin-bottom: 8px; }
            .calendar-header h1 { font-size: 18px; }
            .calendar-header-row { flex-wrap: wrap; gap: 8px; }
            .page-description { display: none; }
          }

          /* Modal content */
          .cal-modal-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
          .cal-modal-title { margin: 0; font-size: 18px; color: var(--lf-color-text, #1e293b); }
          .cal-event-details {
            display: grid; grid-template-columns: auto 1fr; gap: 4px 12px;
            margin: 0; font-size: 14px;
          }
          .cal-event-details dt { color: var(--lf-color-text-muted, #64748b); font-weight: 500; }
          .cal-event-details dd { margin: 0; color: var(--lf-color-text, #1e293b); }
          .cal-slot-range { margin: 0; font-size: 13px; color: var(--lf-color-text-muted, #64748b); }
          .cal-field { display: flex; flex-direction: column; gap: 6px; }
          .cal-label { font-size: 13px; font-weight: 500; color: var(--lf-color-text, #1e293b); }
          .cal-input {
            padding: 8px 12px;
            border: 1px solid var(--lf-color-border, #e2e8f0);
            border-radius: 6px; font-size: 14px;
            color: var(--lf-color-text, #1e293b);
            background: var(--lf-color-bg, #ffffff);
            outline: none; width: 100%; box-sizing: border-box;
          }
          .cal-input:focus {
            border-color: var(--lf-color-primary, #3b82f6);
            box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
          }
          .cal-modal-footer { display: flex; justify-content: flex-end; gap: 10px; }
          .cal-btn {
            padding: 8px 16px; border-radius: 6px; font-size: 14px;
            font-weight: 500; cursor: pointer; border: 1px solid transparent;
          }
          .cal-btn--primary {
            background: var(--lf-color-primary, #3b82f6); color: #fff;
            border-color: var(--lf-color-primary, #3b82f6);
          }
          .cal-btn--primary:hover { opacity: 0.9; }
          .cal-btn--danger {
            background: var(--lf-color-danger, #ef4444); color: #fff;
            border-color: var(--lf-color-danger, #ef4444);
          }
          .cal-btn--danger:hover { opacity: 0.85; }
          .cal-btn--ghost {
            background: var(--lf-color-bg-muted, #f1f5f9);
            color: var(--lf-color-text-subtle, #475569);
            border-color: var(--lf-color-border, #e2e8f0);
          }
          .cal-btn--ghost:hover { background: var(--lf-color-bg-subtle, #e2e8f0); }

          /* Recurrence UI */
          .cal-select { cursor: pointer; }
          .cal-weekday-row { display: flex; gap: 6px; flex-wrap: wrap; }
          .cal-day-btn {
            width: 34px; height: 34px; border-radius: 50%; font-size: 12px; font-weight: 500;
            border: 1px solid var(--lf-color-border, #e2e8f0);
            background: var(--lf-color-bg-muted, #f1f5f9);
            color: var(--lf-color-text-subtle, #475569);
            cursor: pointer; transition: background 0.12s, color 0.12s, border-color 0.12s;
          }
          .cal-day-btn--active {
            background: var(--lf-color-primary, #3b82f6);
            border-color: var(--lf-color-primary, #3b82f6);
            color: #fff;
          }
          .cal-day-btn:hover:not(.cal-day-btn--active) { background: var(--lf-color-bg-subtle, #e2e8f0); }
          .cal-end-row { display: flex; flex-direction: column; gap: 8px; }
          .cal-radio-label {
            display: flex; align-items: center; gap: 6px;
            font-size: 13px; color: var(--lf-color-text, #1e293b); cursor: pointer;
          }
          .cal-count-input {
            width: 54px; padding: 4px 8px; text-align: center;
            display: inline-block; margin: 0;
          }
          .cal-date-input {
            flex: 1; padding: 4px 8px; font-size: 13px;
            display: inline-block; margin: 0; min-width: 0;
          }
        `}</style>
      </div>
    );
  },
});
