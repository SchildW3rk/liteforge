/**
 * /demo/calendar — Fullscreen standalone calendar demo
 *
 * - No docs layout (no sidebar, no header)
 * - Calendar starts empty, simulation auto-starts and fills it gradually
 * - Slim top bar with back link and badge
 */
import { createComponent, signal } from 'liteforge';
import { Link } from '@liteforge/router';
import { createCalendar, startOfWeek } from '@liteforge/calendar';
import { tooltip } from '@liteforge/tooltip';
import { toast } from '@liteforge/toast';
import type { CalendarEvent, Resource } from '@liteforge/calendar';

// ─── Resources ────────────────────────────────────────────────────────────────

const DEMO_RESOURCES: Resource[] = [
  { id: 'anna',  name: 'Dr. Anna Müller', color: '#6366f1', workingHours: { 1: { start: 8, end: 17 }, 2: { start: 8, end: 17 }, 3: { start: 8, end: 12 }, 4: { start: 8, end: 17 }, 5: { start: 8, end: 14 } } },
  { id: 'tom',   name: 'Dr. Tom Weber',   color: '#10b981', workingHours: { 1: { start: 9, end: 18 }, 2: { start: 9, end: 18 }, 3: { start: 9, end: 18 }, 4: { start: 9, end: 18 }, 5: { start: 9, end: 15 } } },
  { id: 'clara', name: 'Dr. Clara Bauer', color: '#f59e0b', workingHours: { 1: { start: 8, end: 16 }, 2: { start: 8, end: 16 }, 3: { start: 8, end: 16 }, 4: { start: 8, end: 16 }, 5: { start: 8, end: 13 } } },
];

const SESSION_TYPES = [
  { label: 'Initial Consult',  duration: 60 },
  { label: 'Therapy Session',  duration: 50 },
  { label: 'Follow-up',        duration: 30 },
  { label: 'Group Therapy',    duration: 90 },
  { label: 'Crisis Support',   duration: 30 },
  { label: 'Review',           duration: 25 },
];

const PATIENTS = [
  'A. Brown', 'M. Rivera', 'E. Lewis', 'F. Kim', 'S. Patel',
  'J. Wong',  'L. Park',   'D. Hill',  'H. Tran', 'N. Garcia',
];

// ─── Simulator ────────────────────────────────────────────────────────────────

let _simCounter = 1;
const simRand = () => Math.random();
const simPick = <T,>(arr: T[]): T => arr[Math.floor(simRand() * arr.length)]!;

interface SimState { running: boolean; flash: boolean; count: number }

class CalendarSimulator {
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
    this._schedule(800); // first event fires quickly
    document.addEventListener('visibilitychange', this._onVisibility);
  }

  stop(): void {
    this._state.update(s => ({ ...s, running: false }));
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    document.removeEventListener('visibilitychange', this._onVisibility);
  }

  private _onVisibility = (): void => {
    if (document.hidden) {
      if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    } else {
      toast.dismissAll();
      this._schedule(1000);
    }
  };

  private _schedule(delay?: number): void {
    const count = this._state().count;
    // Early fill: fast bursts, slows down after calendar has ~15 events
    const d = delay ?? (count < 8 ? 900 + simRand() * 600 : count < 15 ? 1500 + simRand() * 1000 : 2000 + simRand() * 2000);
    this._timer = setTimeout(() => {
      if (!this._state().running) return;
      this._fire();
      this._schedule();
    }, d);
  }

  private _notify(msg: string): void {
    this._state.update(s => ({ ...s, flash: true }));
    setTimeout(() => this._state.update(s => ({ ...s, flash: false })), 400);
    toast.dismissAll();
    toast.info(msg, { duration: 2500 });
  }

  private _fire(): void {
    const evts = this._eventsSignal();
    const mutable = evts.filter(e => !e.recurring && !e.allDay);
    const count = this._state().count;

    // While calendar is still filling up (< 20 events), only add — no delete/shift
    const roll = simRand();
    const fillMode = count < 20;

    if (!fillMode && roll < 0.25 && mutable.length > 0) {
      // 25%: shift ±30–60 min
      const target = simPick(mutable);
      const shiftMin = (simRand() < 0.5 ? 1 : -1) * (30 + Math.floor(simRand() * 3) * 15);
      const newStart = new Date(target.start.getTime() + shiftMin * 60000);
      const newEnd   = new Date(target.end.getTime()   + shiftMin * 60000);
      if (newStart.getHours() >= 8 && newEnd.getHours() <= 22) {
        this._eventsSignal.update(e =>
          e.map(ev => ev.id === target.id ? { ...ev, start: newStart, end: newEnd } : ev)
        );
        const dir = shiftMin > 0 ? `+${shiftMin}min` : `${shiftMin}min`;
        const title = target.title.split('—')[0]?.trim() ?? target.title;
        this._notify(`${title} shifted ${dir}`);
        return;
      }
    }

    if (!fillMode && roll < 0.40 && mutable.length > 5) {
      // 15%: delete (only when calendar has enough events)
      const target = simPick(mutable);
      this._eventsSignal.update(e => e.filter(ev => ev.id !== target.id));
      const title = target.title.split('—')[0]?.trim() ?? target.title;
      this._notify(`${title} removed`);
      this._state.update(s => ({ ...s, count: s.count - 1 }));
      return;
    }

    // Add new event (always when filling, ~60% after)
    const res = simPick(DEMO_RESOURCES);
    const session = simPick(SESSION_TYPES);
    const patient = simPick(PATIENTS);
    const monday = startOfWeek(new Date(), 1);
    const dayOff = Math.floor(simRand() * 5);
    const day = new Date(monday); day.setDate(day.getDate() + dayOff);
    const startH = 8 + Math.floor(simRand() * 10);
    const startM = simRand() < 0.5 ? 0 : 30;
    const dur = session.duration;
    const endMin = startH * 60 + startM + dur;
    const newEvt: CalendarEvent = {
      id: `sim-${++_simCounter}`,
      title: `${session.label} — ${patient}`,
      start: new Date(day.getFullYear(), day.getMonth(), day.getDate(), startH, startM),
      end:   new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(endMin / 60), endMin % 60),
      resourceId: res.id,
      ...(res.color ? { color: res.color } : {}),
    };
    this._eventsSignal.update(e => [...e, newEvt]);
    const fmtT = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
    this._notify(`${res.name} — ${fmtT}`);
    this._state.update(s => ({ ...s, count: s.count + 1 }));
  }
}

// ─── Page component ───────────────────────────────────────────────────────────

let _apptCounter = 5000;

export const CalendarDemoPage = createComponent({
  name: 'CalendarDemoPage',

  setup() {
    // Start empty — fills via simulation
    const events = signal<CalendarEvent[]>([]);
    const simState = signal<SimState>({ running: false, flash: false, count: 0 });
    const sim = new CalendarSimulator(events, simState);

    const calendar = createCalendar({
      events: () => events(),
      view: 'week',
      locale: 'en-US',
      editable: true,
      selectable: true,
      resources: DEMO_RESOURCES,
      time: { dayStart: 7, dayEnd: 20, slotDuration: 15, weekStart: 1, nowIndicator: true },
      selection: { snapIndicator: true },
      responsive: { mobileBp: 768, mobileView: 'day' },
      toolbar: {
        showMoreMenu: false,
        viewDisplay: 'dropdown',
        resourceDisplay: 'dropdown',
      },
      eventTooltip: { fn: tooltip, delay: 300, position: 'top' },
      onEventConflict: (_event, conflicts) => conflicts.length > 0 ? 'warn' : 'allow',
      onSlotClick: (start, end, resourceId) => {
        const id = String(++_apptCounter);
        const newEvt: CalendarEvent = { id, title: 'New Appointment', start, end, color: '#64748b' };
        if (resourceId !== undefined) newEvt.resourceId = resourceId;
        events.update(list => [...list, newEvt]);
        simState.update(s => ({ ...s, count: s.count + 1 }));
        toast.success(`Created ${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`, { duration: 2000 });
      },
      onEventDrop: (event, newStart, newEnd, resourceId) => {
        events.update(list =>
          list.map(a => {
            if (a.id !== event.id) return a;
            const updated: CalendarEvent = { ...a, start: newStart, end: newEnd };
            if (resourceId !== undefined) updated.resourceId = resourceId;
            return updated;
          })
        );
      },
      onEventResize: (event, newEnd) => {
        events.update(list => list.map(a => a.id === event.id ? { ...a, end: newEnd } : a));
      },
      onEventClick: (event) => {
        calendar.clearSelectedEvent();
        toast.info(event.title, { duration: 2000 });
      },
    });

    // Auto-start simulation on mount
    sim.start();

    return { calendar, sim, simState, events };
  },

  destroyed({ setup }) {
    setup.sim.stop();
  },

  component({ setup }) {
    const { calendar, sim, simState, events } = setup;

    return (
      <div class="lf-demo-shell">
        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <header class="lf-demo-topbar">
          <div class="lf-demo-topbar-left">
            {Link({
              href: '/',
              class: 'lf-demo-logo',
              children: (
                <span class="lf-demo-wordmark">LiteForge</span>
              ),
            })}
            <span class="lf-demo-badge">@liteforge/calendar</span>
          </div>

          <div class="lf-demo-topbar-right">
            {/* Live indicator */}
            <div class={() => `lf-demo-live${simState().running ? ' lf-demo-live--on' : ''}`}>
              <span class={() => [
                'lf-demo-dot',
                !simState().running ? 'lf-demo-dot--off' : '',
                simState().flash    ? 'lf-demo-dot--flash' : '',
              ].filter(Boolean).join(' ')} />
              <span class="lf-demo-live-label">
                {() => simState().running
                  ? `Live — ${events().length} events`
                  : 'Paused'
                }
              </span>
            </div>

            <button
              type="button"
              class="lf-demo-sim-btn"
              onclick={() => simState().running ? sim.stop() : sim.start()}
            >
              {() => simState().running ? '⏸ Pause' : '▶ Simulate'}
            </button>

            {Link({
              href: '/calendar',
              class: 'lf-demo-back',
              children: '← Docs',
            })}
          </div>
        </header>

        {/* ── Calendar body ─────────────────────────────────────────────── */}
        <div class={() => `lf-demo-body${calendar.sizeClass() === 'mobile' ? ' lf-demo-body--mobile' : ''}`}>
          <aside
            class="lf-demo-mini"
            style={() => calendar.miniCalendarVisible() ? '' : 'display:none'}
          >
            {calendar.MiniCalendar()}
          </aside>

          <div class="lf-demo-cal">
            {calendar.Toolbar()}
            {calendar.MobileResourceBar()}
            {calendar.Root()}
          </div>
        </div>

        <style>{`
          /* ── Shell ── */
          .lf-demo-shell {
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: var(--surface-base, #0f172a);
            color: var(--content-primary, #f1f5f9);
          }

          /* ── Top bar ── */
          .lf-demo-topbar {
            height: 44px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 14px;
            border-bottom: 1px solid var(--line-default, #1e293b);
            background: var(--surface-raised, #0f172a);
            gap: 12px;
          }
          .lf-demo-topbar-left {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .lf-demo-topbar-right {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .lf-demo-logo {
            text-decoration: none;
            display: flex;
            align-items: center;
          }
          .lf-demo-wordmark {
            font-size: 14px;
            font-weight: 700;
            letter-spacing: -0.01em;
            color: var(--content-primary, #f1f5f9);
          }
          .lf-demo-badge {
            font-size: 10px;
            font-family: monospace;
            padding: 2px 7px;
            border-radius: 4px;
            background: var(--badge-indigo-bg, rgba(99,102,241,0.15));
            color: var(--badge-indigo-text, #a5b4fc);
            border: 1px solid var(--badge-indigo-border, rgba(99,102,241,0.3));
            white-space: nowrap;
          }
          .lf-demo-back {
            font-size: 12px;
            font-weight: 500;
            color: var(--content-muted, #64748b);
            text-decoration: none;
            padding: 3px 8px;
            border-radius: 5px;
            border: 1px solid var(--line-default, #1e293b);
            white-space: nowrap;
            transition: color 0.15s, border-color 0.15s;
          }
          .lf-demo-back:hover {
            color: var(--content-primary, #f1f5f9);
            border-color: var(--content-muted, #64748b);
          }

          /* ── Live indicator ── */
          .lf-demo-live {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 11px;
            font-weight: 600;
            color: var(--content-muted, #64748b);
            transition: color 0.2s;
          }
          .lf-demo-live--on { color: #22c55e; }
          .lf-demo-dot {
            width: 7px; height: 7px;
            border-radius: 50%;
            background: #22c55e;
            flex-shrink: 0;
            transition: background 0.15s;
            animation: lf-demo-pulse 2s infinite;
          }
          .lf-demo-dot--off {
            background: var(--content-subtle, #334155);
            animation: none;
          }
          .lf-demo-dot--flash {
            background: #f59e0b !important;
            box-shadow: 0 0 0 4px rgba(245,158,11,0.25);
            animation: none;
          }
          @keyframes lf-demo-pulse {
            0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
            70%  { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
            100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
          }
          .lf-demo-live-label { white-space: nowrap; }

          .lf-demo-sim-btn {
            font-size: 11px;
            font-weight: 500;
            padding: 3px 10px;
            border-radius: 5px;
            border: 1px solid var(--line-default, #1e293b);
            background: transparent;
            color: var(--content-secondary, #94a3b8);
            cursor: pointer;
            white-space: nowrap;
            transition: background 0.15s, color 0.15s;
          }
          .lf-demo-sim-btn:hover {
            background: var(--surface-overlay, #1e293b);
            color: var(--content-primary, #f1f5f9);
          }

          /* ── Calendar body ── */
          .lf-demo-body {
            flex: 1;
            min-height: 0;
            display: flex;
            gap: 12px;
            padding: 12px;
            overflow: hidden;
          }
          .lf-demo-mini {
            width: 230px;
            flex-shrink: 0;
            padding: 12px;
            background: var(--lf-cal-header-bg, #1e293b);
            border: 1px solid var(--lf-cal-border, #334155);
            border-radius: 10px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            overflow-y: auto;
            align-self: flex-start;
            max-height: 100%;
          }
          .lf-demo-cal {
            flex: 1;
            min-height: 0;
            min-width: 0;
            display: flex;
            flex-direction: column;
            border: 1px solid var(--lf-cal-border, #334155);
            border-radius: 10px;
            overflow: hidden;
          }

          /* ── Mobile ── */
          .lf-demo-body--mobile .lf-demo-mini { display: none; }
          .lf-demo-body--mobile { gap: 0; padding: 8px; }
          .lf-cal-mobile-res-bar { display: none; }
          .lf-demo-body--mobile .lf-cal-mobile-res-bar { display: flex; }

          @media (max-width: 600px) {
            .lf-demo-badge { display: none; }
            .lf-demo-live-label { display: none; }
            .lf-demo-topbar { padding: 0 10px; gap: 8px; }
          }
        `}</style>
      </div>
    );
  },
});
