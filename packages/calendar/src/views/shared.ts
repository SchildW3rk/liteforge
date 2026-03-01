/**
 * @liteforge/calendar - Shared View Utilities
 */

import type {
  CalendarEvent,
  Resource,
  ResolvedTimeConfig,
  OverlapLayout,
  CalendarClasses,
} from '../types.js'
import {
  getTimeSlots,
  formatTime,
  getSlotPosition,
  getEventHeight,
  isEventOnDay,
  isAllDayEvent,
} from '../date-utils.js'

// ─── Overlap Calculation ───────────────────────────────────

export function calculateOverlaps<T extends CalendarEvent>(
  events: T[]
): OverlapLayout<T>[] {
  if (events.length === 0) return []

  // Sort by start time, then by duration (longer first)
  const sorted = [...events].sort((a, b) => {
    const startDiff = a.start.getTime() - b.start.getTime()
    if (startDiff !== 0) return startDiff
    // Longer events first
    const aDur = a.end.getTime() - a.start.getTime()
    const bDur = b.end.getTime() - b.start.getTime()
    return bDur - aDur
  })

  const layouts: OverlapLayout<T>[] = []
  const columns: { end: Date; column: number }[] = []

  for (const event of sorted) {
    // Find the first available column
    let column = 0
    let placed = false

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i]
      if (col && col.end <= event.start) {
        // This column is free
        columns[i] = { end: event.end, column: i }
        column = i
        placed = true
        break
      }
    }

    if (!placed) {
      // Need a new column
      column = columns.length
      columns.push({ end: event.end, column })
    }

    layouts.push({
      event,
      column,
      totalColumns: 0, // Will calculate after
    })
  }

  // Calculate total columns for each group
  // Group events that overlap with each other
  for (const layout of layouts) {
    const overlapping = layouts.filter(
      (other) =>
        layout.event.start < other.event.end &&
        layout.event.end > other.event.start
    )
    const maxColumn = overlapping.length > 0
      ? Math.max(...overlapping.map((l) => l.column))
      : 0
    layout.totalColumns = maxColumn + 1
  }

  return layouts
}

// ─── Event Filtering ───────────────────────────────────────

export function getEventsForDay<T extends CalendarEvent>(
  events: T[],
  day: Date,
  resourceId?: string
): T[] {
  return events.filter((event) => {
    if (!isEventOnDay(event, day)) return false
    if (resourceId !== undefined && event.resourceId !== resourceId) return false
    return true
  })
}

/**
 * Get only timed (non-all-day) events for a specific day.
 */
export function getTimedEventsForDay<T extends CalendarEvent>(
  events: T[],
  day: Date,
  resourceId?: string
): T[] {
  return getEventsForDay(events, day, resourceId).filter(
    (event) => !isAllDayEvent(event)
  )
}

/**
 * Get only all-day events for a specific day.
 */
export function getAllDayEventsForDay<T extends CalendarEvent>(
  events: T[],
  day: Date,
  resourceId?: string
): T[] {
  return getEventsForDay(events, day, resourceId).filter((event) =>
    isAllDayEvent(event)
  )
}

export function getEventsForResource<T extends CalendarEvent>(
  events: T[],
  resourceId: string
): T[] {
  return events.filter((event) => event.resourceId === resourceId)
}

// ─── Time Slot Rendering ───────────────────────────────────

export function renderTimeColumn(
  date: Date,
  config: ResolvedTimeConfig,
  locale: string
): HTMLDivElement {
  const column = document.createElement('div')
  column.className = 'lf-cal-time-column'

  const slots = getTimeSlots(date, config.dayStart, config.dayEnd, config.slotDuration)

  for (const slot of slots) {
    const label = document.createElement('div')
    label.className = 'lf-cal-time-label'

    // Only show label on the hour
    if (slot.getMinutes() === 0) {
      label.textContent = formatTime(slot, locale)
    }

    column.appendChild(label)
  }

  return column
}

export function renderTimeSlots(
  date: Date,
  config: ResolvedTimeConfig,
  resource?: Resource
): HTMLDivElement {
  const container = document.createElement('div')
  container.style.position = 'relative'

  const slots = getTimeSlots(date, config.dayStart, config.dayEnd, config.slotDuration)
  const dayOfWeek = date.getDay()

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    if (!slot) continue

    const slotEl = document.createElement('div')

    let slotClass = 'lf-cal-time-slot'
    if (slot.getMinutes() === 0) {
      slotClass += ' lf-cal-time-slot--hour'
    }

    // Check if blocked (outside working hours)
    if (resource?.workingHours) {
      const workingHours = resource.workingHours[dayOfWeek]
      if (!workingHours) {
        slotClass += ' lf-cal-time-slot--blocked'
      } else {
        const hour = slot.getHours()
        if (hour < workingHours.start || hour >= workingHours.end) {
          slotClass += ' lf-cal-time-slot--blocked'
        }
      }
    }

    slotEl.className = slotClass
    container.appendChild(slotEl)
  }

  return container
}

// ─── Event Rendering ───────────────────────────────────────

export function renderEvent<T extends CalendarEvent>(
  event: T,
  config: ResolvedTimeConfig,
  layout: OverlapLayout<T>,
  customContent?: (event: T) => Node,
  onClick?: (event: T) => void,
  editable?: boolean,
  onDragStart?: (event: T, element: HTMLElement) => void,
  onResizeStart?: (event: T, element: HTMLElement) => void
): HTMLDivElement {
  const eventEl = document.createElement('div')
  eventEl.className = 'lf-cal-event'
  eventEl.dataset.eventId = event.id
  
  // ARIA attributes for accessibility
  eventEl.setAttribute('role', 'button')
  eventEl.setAttribute('tabindex', '0')
  eventEl.setAttribute('aria-label', `${event.title}, ${formatTime(event.start)} - ${formatTime(event.end)}`)
  eventEl.title = event.title // Native tooltip with full title

  // Position
  const slotHeight = 40 // CSS variable --lf-cal-slot-height default
  const top = getSlotPosition(event.start, config.dayStart, config.slotDuration, slotHeight)
  const height = getEventHeight(event.start, event.end, config.slotDuration, slotHeight)

  eventEl.style.top = `${top}px`
  eventEl.style.height = `${Math.max(height, 20)}px`

  // Overlap positioning
  const width = 100 / layout.totalColumns
  const left = layout.column * width
  eventEl.style.left = `calc(${left}% + 2px)`
  eventEl.style.width = `calc(${width}% - 4px)`

  // Color
  if (event.color) {
    eventEl.style.background = event.color
  }

  // Content
  if (customContent) {
    eventEl.appendChild(customContent(event))
  } else {
    const titleEl = document.createElement('div')
    titleEl.className = 'lf-cal-event-title'
    titleEl.textContent = event.title

    const timeEl = document.createElement('div')
    timeEl.className = 'lf-cal-event-time'
    timeEl.textContent = `${formatTime(event.start)} - ${formatTime(event.end)}`

    eventEl.appendChild(titleEl)
    eventEl.appendChild(timeEl)
  }

  // Click handler
  if (onClick) {
    eventEl.addEventListener('click', (e) => {
      e.stopPropagation()
      onClick(event)
    })
  }

  // Drag & resize
  const isEditable = event.editable !== false && editable
  if (isEditable) {
    eventEl.dataset.editable = 'true'

    // Create resize handle if onResizeStart is provided
    if (onResizeStart) {
      const resizeHandle = document.createElement('div')
      resizeHandle.className = 'lf-cal-event-resize-handle'
      eventEl.appendChild(resizeHandle)
    }

    // Call setup functions IMMEDIATELY - they will add their own pointerdown handlers
    // This is called during element creation, before user interaction
    if (onDragStart) {
      onDragStart(event, eventEl)
    }
    if (onResizeStart) {
      onResizeStart(event, eventEl)
    }
  }

  return eventEl
}

// ─── All-Day Event Rendering ───────────────────────────────

export function renderAllDayEvent<T extends CalendarEvent>(
  event: T,
  onClick?: (event: T) => void
): HTMLDivElement {
  const eventEl = document.createElement('div')
  eventEl.className = 'lf-cal-event lf-cal-event--allday'
  eventEl.dataset.eventId = event.id

  // Color
  if (event.color) {
    eventEl.style.background = event.color
  }

  // Title only for all-day events
  const titleEl = document.createElement('div')
  titleEl.className = 'lf-cal-event-title'
  titleEl.textContent = event.title
  eventEl.appendChild(titleEl)

  // Click handler
  if (onClick) {
    eventEl.addEventListener('click', (e) => {
      e.stopPropagation()
      onClick(event)
    })
  }

  return eventEl
}

export interface AllDayRowOptions<T extends CalendarEvent> {
  days: Date[]
  events: T[]
  classes: Partial<CalendarClasses>
  onEventClick: ((event: T) => void) | undefined
  hasTimeColumnSpacer: boolean | undefined
}

export function renderAllDayRow<T extends CalendarEvent>(
  options: AllDayRowOptions<T>
): HTMLDivElement {
  const { days, events, classes, onEventClick, hasTimeColumnSpacer = true } = options

  const row = document.createElement('div')
  row.className = getClass('header', classes, 'lf-cal-allday-row')

  // Time column spacer (to align with time column below)
  if (hasTimeColumnSpacer) {
    const spacer = document.createElement('div')
    spacer.className = 'lf-cal-allday-label'
    spacer.textContent = 'All-day'
    row.appendChild(spacer)
  }

  // Container for day cells
  const cellsContainer = document.createElement('div')
  cellsContainer.className = 'lf-cal-allday-cells'

  for (const day of days) {
    const cell = document.createElement('div')
    cell.className = 'lf-cal-allday-cell'

    // Get all-day events for this day
    const dayAllDayEvents = events.filter((event) => isAllDayEvent(event) && isEventOnDay(event, day))

    for (const event of dayAllDayEvents) {
      const eventEl = renderAllDayEvent(event, onEventClick)
      cell.appendChild(eventEl)
    }

    cellsContainer.appendChild(cell)
  }

  row.appendChild(cellsContainer)
  return row
}

// ─── Now Indicator ─────────────────────────────────────────

export function createNowIndicator(
  config: ResolvedTimeConfig
): HTMLDivElement | null {
  if (!config.nowIndicator) return null

  const indicator = document.createElement('div')
  indicator.className = 'lf-cal-now-indicator'

  const updatePosition = () => {
    const now = new Date()
    const slotHeight = 40
    const top = getSlotPosition(now, config.dayStart, config.slotDuration, slotHeight)
    indicator.style.top = `${top}px`

    // Hide if outside day range
    const hour = now.getHours()
    if (hour < config.dayStart || hour >= config.dayEnd) {
      indicator.style.display = 'none'
    } else {
      indicator.style.display = 'block'
    }
  }

  updatePosition()

  // Update every minute
  const intervalId = setInterval(updatePosition, 60000)

  // Store cleanup function
  ;(indicator as HTMLDivElement & { cleanup?: () => void }).cleanup = () => {
    clearInterval(intervalId)
  }

  return indicator
}

// ─── CSS Class Helpers ─────────────────────────────────────

export function getClass(
  name: keyof CalendarClasses,
  classes: Partial<CalendarClasses> | undefined,
  defaultClass: string
): string {
  return classes?.[name] ?? defaultClass
}
