/**
 * @liteforge/calendar - createCalendar Implementation
 */

import { signal, computed, effect } from '@liteforge/core'
import type {
  CalendarOptions,
  CalendarResult,
  CalendarEvent,
  CalendarView,
  ResolvedTimeConfig,
  DateRange,
  SlotSelection,
} from './types.js'
import {
  startOfDay,
  addDays,
  addWeeks,
  addMonths,
  getDayRange,
  getWeekRange,
  getMonthRange,
} from './date-utils.js'
import { expandAllRecurring } from './recurring.js'
import { injectCalendarStyles } from './styles.js'
import { renderWeekView } from './views/week-view.js'
import { renderDayView } from './views/day-view.js'
import { renderMonthView } from './views/month-view.js'
import { renderAgendaView } from './views/agenda-view.js'
import { renderToolbar } from './components/toolbar.js'

// ─── Resolve Time Config ───────────────────────────────────

function resolveTimeConfig(config?: CalendarOptions<CalendarEvent>['time']): ResolvedTimeConfig {
  return {
    slotDuration: config?.slotDuration ?? 30,
    dayStart: config?.dayStart ?? 0,
    dayEnd: config?.dayEnd ?? 24,
    weekStart: config?.weekStart ?? 1,
    hiddenDays: config?.hiddenDays ?? [],
    nowIndicator: config?.nowIndicator ?? true,
  }
}

// ─── Calculate Date Range ──────────────────────────────────

function calculateDateRange(date: Date, view: CalendarView, weekStart: number): DateRange {
  switch (view) {
    case 'day':
      return getDayRange(date)
    case 'week':
      return getWeekRange(date, weekStart)
    case 'month': {
      // For month view, we need to include partial weeks
      const monthRange = getMonthRange(date)
      // Extend to full calendar weeks
      const calStart = getWeekRange(monthRange.start, weekStart).start
      const calEnd = getWeekRange(monthRange.end, weekStart).end
      return { start: calStart, end: calEnd }
    }
    case 'agenda':
      // Show current month for agenda
      return getMonthRange(date)
    default:
      return getWeekRange(date, weekStart)
  }
}

// ─── createCalendar ────────────────────────────────────────

export function createCalendar<T extends CalendarEvent>(
  options: CalendarOptions<T>
): CalendarResult<T> {
  const {
    events: eventsSource,
    view: initialView = 'week',
    defaultDate = new Date(),
    time,
    resources: resourcesInput = [],
    editable = false,
    selectable = false,
    onEventClick,
    onEventDrop,
    onEventResize,
    onSlotClick,
    onSlotSelect,
    onViewChange,
    onDateChange,
    eventContent,
    slotContent,
    dayHeaderContent,
    unstyled = false,
    classes,
    locale = 'en-US',
  } = options

  // Inject styles
  if (!unstyled) {
    injectCalendarStyles()
  }

  // Resolve config
  const config = resolveTimeConfig(time)

  // ─── State ───────────────────────────────────────────────

  const currentDateSignal = signal(startOfDay(defaultDate))
  const currentViewSignal = signal<CalendarView>(initialView)

  // Resource visibility
  const resourceVisibility = signal<Record<string, boolean>>(
    Object.fromEntries(resourcesInput.map((r) => [r.id, true]))
  )

  // Selection state
  const selectedEventSignal = signal<T | null>(null)
  const selectedSlotSignal = signal<SlotSelection | null>(null)

  // Local events (for addEvent/updateEvent/removeEvent)
  const localEvents = signal<T[]>([])

  // ─── Computed ────────────────────────────────────────────

  const dateRangeComputed = computed(() => {
    return calculateDateRange(
      currentDateSignal(),
      currentViewSignal(),
      config.weekStart
    )
  })

  const resourcesComputed = computed(() => resourcesInput)

  const visibleResourcesComputed = computed(() => {
    const visibility = resourceVisibility()
    return resourcesInput.filter((r) => visibility[r.id] !== false).map((r) => r.id)
  })

  // Combine source events + local events, expand recurring, filter to range and visible resources
  const visibleEvents = computed(() => {
    const range = dateRangeComputed()
    const sourceEvts = eventsSource()
    const localEvts = localEvents()
    const allEvents = [...sourceEvts, ...localEvts]

    // Expand recurring events
    const expanded = expandAllRecurring(allEvents, range.start, range.end)

    // Filter by visible resources - use visibleResourcesComputed to ensure reactivity
    const visibleRes = visibleResourcesComputed()
    const filtered = expanded.filter((event) => {
      // If event has no resourceId, always show it
      if (!event.resourceId) return true
      // Show event only if its resource is visible
      return visibleRes.includes(event.resourceId)
    })

    return filtered
  })

  // ─── Navigation ──────────────────────────────────────────

  const today = () => {
    currentDateSignal.set(startOfDay(new Date()))
    onDateChange?.(currentDateSignal())
  }

  const next = () => {
    const current = currentDateSignal()
    const view = currentViewSignal()

    let newDate: Date
    switch (view) {
      case 'day':
        newDate = addDays(current, 1)
        break
      case 'week':
        newDate = addWeeks(current, 1)
        break
      case 'month':
      case 'agenda':
        newDate = addMonths(current, 1)
        break
      default:
        newDate = addWeeks(current, 1)
    }

    currentDateSignal.set(newDate)
    onDateChange?.(newDate)
  }

  const prev = () => {
    const current = currentDateSignal()
    const view = currentViewSignal()

    let newDate: Date
    switch (view) {
      case 'day':
        newDate = addDays(current, -1)
        break
      case 'week':
        newDate = addWeeks(current, -1)
        break
      case 'month':
      case 'agenda':
        newDate = addMonths(current, -1)
        break
      default:
        newDate = addWeeks(current, -1)
    }

    currentDateSignal.set(newDate)
    onDateChange?.(newDate)
  }

  const goTo = (date: Date) => {
    currentDateSignal.set(startOfDay(date))
    onDateChange?.(currentDateSignal())
  }

  const setView = (view: CalendarView) => {
    currentViewSignal.set(view)
    onViewChange?.(view, dateRangeComputed())
  }

  // ─── Event Management ────────────────────────────────────

  const getEvent = (id: string): T | undefined => {
    return visibleEvents().find((e: T) => e.id === id)
  }

  const addEvent = (event: T) => {
    localEvents.update((evts: T[]) => [...evts, event])
  }

  const updateEvent = (id: string, changes: Partial<T>) => {
    localEvents.update((evts: T[]) =>
      evts.map((e: T) => (e.id === id ? { ...e, ...changes } : e))
    )
  }

  const removeEvent = (id: string) => {
    localEvents.update((evts: T[]) => evts.filter((e: T) => e.id !== id))
  }

  // ─── Resource Management ─────────────────────────────────

  const showResource = (id: string) => {
    resourceVisibility.update((v: Record<string, boolean>) => ({ ...v, [id]: true }))
  }

  const hideResource = (id: string) => {
    resourceVisibility.update((v: Record<string, boolean>) => ({ ...v, [id]: false }))
  }

  const toggleResource = (id: string) => {
    resourceVisibility.update((v: Record<string, boolean>) => ({ ...v, [id]: !v[id] }))
  }

  // ─── Event Handlers for Views ────────────────────────────

  const handleEventClick = (event: T) => {
    selectedEventSignal.set(event)
    onEventClick?.(event)
  }

  const handleSlotClick = (start: Date, end: Date, resourceId?: string) => {
    selectedSlotSignal.set({ start, end, resourceId })
    onSlotClick?.(start, end, resourceId)
  }

  const handleSlotSelect = (start: Date, end: Date, resourceId?: string) => {
    selectedSlotSignal.set({ start, end, resourceId })
    onSlotSelect?.(start, end, resourceId)
  }

  const handleEventDrop = (event: T, newStart: Date, newEnd: Date, newResourceId?: string) => {
    onEventDrop?.(event, newStart, newEnd, newResourceId)
  }

  const handleEventResize = (event: T, newEnd: Date) => {
    onEventResize?.(event, newEnd)
  }

  // ─── Root Component ──────────────────────────────────────

  const Root = (): Node => {
    const container = document.createElement('div')
    container.className = classes?.root ?? 'lf-cal'

    let currentViewEl: HTMLDivElement | null = null

    // Reactively render the appropriate view
    effect(() => {
      const view = currentViewSignal()

      // Remove old view
      if (currentViewEl) {
        currentViewEl.remove()
      }

      // Render new view
      switch (view) {
        case 'day':
          currentViewEl = renderDayView({
            date: () => currentDateSignal(),
            events: () => visibleEvents(),
            resources: resourcesComputed,
            visibleResources: visibleResourcesComputed,
            config,
            locale,
            classes: classes ?? {},
            eventContent,
            slotContent,
            dayHeaderContent,
            onEventClick: handleEventClick,
            onSlotClick: selectable ? handleSlotClick : undefined,
            onSlotSelect: selectable ? handleSlotSelect : undefined,
            onEventDrop: editable ? handleEventDrop : undefined,
            onEventResize: editable ? handleEventResize : undefined,
            editable,
            selectable,
          })
          break

        case 'week':
          currentViewEl = renderWeekView({
            date: () => currentDateSignal(),
            events: () => visibleEvents(),
            config,
            locale,
            classes: classes ?? {},
            eventContent,
            slotContent,
            dayHeaderContent,
            onEventClick: handleEventClick,
            onSlotClick: selectable ? handleSlotClick : undefined,
            onSlotSelect: selectable ? handleSlotSelect : undefined,
            onEventDrop: editable ? handleEventDrop : undefined,
            onEventResize: editable ? handleEventResize : undefined,
            editable,
            selectable,
          })
          break

        case 'month':
          currentViewEl = renderMonthView({
            date: () => currentDateSignal(),
            events: () => visibleEvents(),
            config,
            locale,
            classes: classes ?? {},
            onEventClick: handleEventClick,
            onSlotClick: selectable ? handleSlotClick : undefined,
            selectable,
          })
          break

        case 'agenda':
          currentViewEl = renderAgendaView({
            dateRange: dateRangeComputed,
            events: () => visibleEvents(),
            resources: resourcesComputed,
            config,
            locale,
            classes: classes ?? {},
            onEventClick: handleEventClick,
          })
          break
      }

      if (currentViewEl) {
        container.appendChild(currentViewEl)
      }
    })

    return container
  }

  // ─── Toolbar Component ───────────────────────────────────

  const Toolbar = (): Node => {
    return renderToolbar({
      currentDate: () => currentDateSignal(),
      currentView: () => currentViewSignal(),
      locale,
      weekStart: config.weekStart,
      classes: classes ?? {},
      onPrev: prev,
      onNext: next,
      onToday: today,
      onViewChange: setView,
    })
  }

  // ─── Return API ──────────────────────────────────────────

  return {
    Root,
    Toolbar,

    // Navigation
    currentDate: () => currentDateSignal(),
    currentView: () => currentViewSignal(),
    dateRange: () => dateRangeComputed(),
    today,
    next,
    prev,
    goTo,
    setView,

    // Events
    events: () => visibleEvents(),
    getEvent,
    addEvent,
    updateEvent,
    removeEvent,

    // Resources
    resources: () => resourcesComputed(),
    visibleResources: () => visibleResourcesComputed(),
    showResource,
    hideResource,
    toggleResource,

    // Selection
    selectedEvent: () => selectedEventSignal(),
    selectedSlot: () => selectedSlotSignal(),
  }
}
