/**
 * @liteforge/calendar - Week View Renderer
 */

import { effect } from '@liteforge/core'
import type {
  CalendarEvent,
  ResolvedTimeConfig,
  CalendarClasses,
} from '../types.js'
import {
  getWeekDays,
  getTimeSlots,
  isToday,
  isWeekend,
  isAllDayEvent,
  addMinutes,
  diffInMinutes,
} from '../date-utils.js'
import {
  calculateOverlaps,
  getTimedEventsForDay,
  renderTimeColumn,
  renderTimeSlots,
  renderEvent,
  renderAllDayRow,
  createNowIndicator,
  getClass,
} from './shared.js'
import { setupSlotSelection } from '../interactions/slot-selection.js'

interface WeekViewOptions<T extends CalendarEvent> {
  date: () => Date
  events: () => T[]
  config: ResolvedTimeConfig
  locale: string
  classes: Partial<CalendarClasses>
  eventContent: ((event: T) => Node) | undefined
  slotContent: ((date: Date, resourceId?: string) => Node | null) | undefined
  dayHeaderContent: ((date: Date) => Node) | undefined
  onEventClick: ((event: T) => void) | undefined
  onSlotClick: ((start: Date, end: Date, resourceId?: string) => void) | undefined
  onSlotSelect: ((start: Date, end: Date, resourceId?: string) => void) | undefined
  onEventDrop: ((event: T, newStart: Date, newEnd: Date, newResourceId?: string) => void) | undefined
  onEventResize: ((event: T, newEnd: Date) => void) | undefined
  editable: boolean | undefined
  selectable: boolean | undefined
}

export function renderWeekView<T extends CalendarEvent>(
  options: WeekViewOptions<T>
): HTMLDivElement {
  const {
    date,
    events,
    config,
    locale,
    classes,
    eventContent,
    slotContent,
    dayHeaderContent,
    onEventClick,
    onSlotClick,
    onSlotSelect,
    onEventDrop,
    onEventResize,
    editable,
    selectable,
  } = options

  const container = document.createElement('div')
  container.className = getClass('root', classes, 'lf-cal-week-view')

  // Header
  const header = document.createElement('div')
  header.className = getClass('header', classes, 'lf-cal-header')

  // Time spacer in header
  const timeSpacer = document.createElement('div')
  timeSpacer.className = 'lf-cal-header-time-spacer'
  header.appendChild(timeSpacer)

  // Day headers - will be populated reactively
  const dayHeaders = document.createElement('div')
  dayHeaders.style.display = 'flex'
  dayHeaders.style.flex = '1'
  header.appendChild(dayHeaders)

  container.appendChild(header)

  // All-day row (inserted after header, before body)
  let allDayRow: HTMLDivElement | null = null

  // Body
  const body = document.createElement('div')
  body.className = getClass('body', classes, 'lf-cal-body')

  // Time column - recreated on date change
  let timeColumnEl: HTMLDivElement | null = null

  // Grid
  const grid = document.createElement('div')
  grid.className = getClass('grid', classes, 'lf-cal-grid')
  body.appendChild(grid)

  container.appendChild(body)

  // Now indicator reference
  let nowIndicator: (HTMLDivElement & { cleanup?: () => void }) | null = null

  // Slot selection cleanup functions
  let slotSelectionCleanups: Array<() => void> = []

  // Day columns reference for drag & drop
  let dayColumnsRef: HTMLElement[] = []
  let daysRef: Date[] = []

  // Reactive rendering
  effect(() => {
    const currentDate = date()
    const days = getWeekDays(currentDate, config.weekStart, config.hiddenDays)
    const allEvents = events()

    // Separate all-day and timed events
    const allDayEvents = allEvents.filter((e) => isAllDayEvent(e))
    const timedEvents = allEvents.filter((e) => !isAllDayEvent(e))

    // Update header
    dayHeaders.innerHTML = ''
    for (const day of days) {
      const headerCell = document.createElement('div')
      let headerClass = getClass('headerCell', classes, 'lf-cal-header-cell')
      if (isToday(day)) headerClass += ' lf-cal-header-cell--today'
      if (isWeekend(day)) headerClass += ' lf-cal-header-cell--weekend'
      headerCell.className = headerClass

      if (dayHeaderContent) {
        headerCell.appendChild(dayHeaderContent(day))
      } else {
        const dayName = document.createElement('div')
        dayName.className = 'lf-cal-header-day-name'
        dayName.textContent = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)

        const dayNumber = document.createElement('div')
        dayNumber.className = 'lf-cal-header-day-number'
        dayNumber.textContent = String(day.getDate())

        headerCell.appendChild(dayName)
        headerCell.appendChild(dayNumber)
      }

      dayHeaders.appendChild(headerCell)
    }

    // Update all-day row
    if (allDayRow) {
      allDayRow.remove()
    }
    allDayRow = renderAllDayRow({
      days,
      events: allDayEvents,
      classes,
      onEventClick,
      hasTimeColumnSpacer: true,
    })
    // Insert after header, before body
    container.insertBefore(allDayRow, body)

    // Update time column
    if (timeColumnEl) {
      timeColumnEl.remove()
    }
    const firstDay = days[0] ?? new Date()
    timeColumnEl = renderTimeColumn(firstDay, config, locale)
    body.insertBefore(timeColumnEl, grid)

    // Update grid
    grid.innerHTML = ''

    // Clean up old now indicator
    if (nowIndicator?.cleanup) {
      nowIndicator.cleanup()
    }
    nowIndicator = null

    // Clean up old slot selection handlers
    for (const cleanup of slotSelectionCleanups) {
      cleanup()
    }
    slotSelectionCleanups = []
    dayColumnsRef = []
    daysRef = days

    for (const day of days) {
      const dayColumn = document.createElement('div')
      let columnClass = getClass('dayColumn', classes, 'lf-cal-day-column')
      if (isToday(day)) columnClass += ' lf-cal-day-column--today'
      if (isWeekend(day)) columnClass += ' lf-cal-day-column--weekend'
      dayColumn.className = columnClass

      // Time slots
      const slotsContainer = renderTimeSlots(day, config)
      dayColumn.appendChild(slotsContainer)

      // Custom slot content
      if (slotContent) {
        const slots = getTimeSlots(day, config.dayStart, config.dayEnd, config.slotDuration)
        for (let i = 0; i < slots.length; i++) {
          const slot = slots[i]
          if (!slot) continue
          const content = slotContent(slot)
          if (content) {
            const slotEl = slotsContainer.children[i] as HTMLElement
            if (slotEl) {
              slotEl.innerHTML = ''
              slotEl.appendChild(content)
            }
          }
        }
      }

      // Set up slot selection (supports both click and drag selection)
      if (selectable && (onSlotClick ?? onSlotSelect)) {
        const slotState = setupSlotSelection({
          slotsContainer,
          day,
          config,
          onSlotClick,
          onSlotSelect,
        })
        slotSelectionCleanups.push(slotState.cleanup)
      }

      // Events for this day (timed events only - all-day events are in the all-day row)
      const dayEvents = getTimedEventsForDay(timedEvents, day)
      const layouts = calculateOverlaps(dayEvents)

      // Events container (for absolute positioning)
      const eventsContainer = document.createElement('div')
      eventsContainer.style.position = 'absolute'
      eventsContainer.style.top = '0'
      eventsContainer.style.left = '0'
      eventsContainer.style.right = '0'
      eventsContainer.style.bottom = '0'
      eventsContainer.style.pointerEvents = 'none'

      for (const layout of layouts) {
        const eventEl = renderEvent(
          layout.event,
          config,
          layout,
          eventContent,
          onEventClick,
          editable,
          // Drag handler - set up proper drag interaction
          editable ? (event, element) => {
            setupEventDragInteraction(event, element, day, dayColumn)
          } : undefined,
          // Resize handler - set up resize interaction
          editable ? (event, element) => {
            setupEventResizeInteraction(event, element, day, dayColumn)
          } : undefined
        )
        eventEl.style.pointerEvents = 'auto'
        eventsContainer.appendChild(eventEl)
      }

      dayColumn.appendChild(eventsContainer)
      dayColumnsRef.push(dayColumn)

      // Now indicator line in every column, dot only on today
      if (config.nowIndicator) {
        const indicator = createNowIndicator(config)
        if (indicator) {
          // Only show dot on today column
          if (!isToday(day)) {
            indicator.classList.add('lf-cal-now-indicator--no-dot')
          }
          eventsContainer.appendChild(indicator)
        }
        // Save reference for cleanup (use the one from today)
        if (isToday(day)) {
          nowIndicator = indicator
        }
      }

      grid.appendChild(dayColumn)
    }
  })

  // ─── Event Drag Interaction ────────────────────────────────

  function setupEventDragInteraction(
    event: T,
    element: HTMLElement,
    _originalDay: Date,
    _dayColumn: HTMLElement
  ): void {
    let isDragging = false
    let startX = 0
    let startY = 0
    let ghostEl: HTMLElement | null = null
    let currentDropTarget: HTMLElement | null = null
    const DRAG_THRESHOLD = 5

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      if ((e.target as HTMLElement).classList.contains('lf-cal-event-resize-handle')) return

      startX = e.clientX
      startY = e.clientY
      isDragging = false

      document.addEventListener('pointermove', handlePointerMove)
      document.addEventListener('pointerup', handlePointerUp)
    }

    const handlePointerMove = (e: PointerEvent) => {
      const deltaX = Math.abs(e.clientX - startX)
      const deltaY = Math.abs(e.clientY - startY)

      if (!isDragging && deltaX < DRAG_THRESHOLD && deltaY < DRAG_THRESHOLD) {
        return
      }

      if (!isDragging) {
        isDragging = true
        element.classList.add('lf-cal-event--dragging')

        // Create ghost
        ghostEl = element.cloneNode(true) as HTMLElement
        ghostEl.classList.add('lf-cal-event--ghost')
        ghostEl.style.position = 'fixed'
        ghostEl.style.zIndex = '10000'
        ghostEl.style.width = `${element.offsetWidth}px`
        ghostEl.style.height = `${element.offsetHeight}px`
        ghostEl.style.opacity = '0.8'
        ghostEl.style.pointerEvents = 'none'
        document.body.appendChild(ghostEl)

        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'grabbing'
      }

      if (ghostEl) {
        ghostEl.style.left = `${e.clientX - ghostEl.offsetWidth / 2}px`
        ghostEl.style.top = `${e.clientY - 10}px`
      }

      // Find drop target
      const dropColumn = findDayColumnAtPosition(e.clientX)
      if (currentDropTarget && currentDropTarget !== dropColumn) {
        currentDropTarget.classList.remove('lf-cal-day-column--drop-target')
      }
      if (dropColumn) {
        dropColumn.classList.add('lf-cal-day-column--drop-target')
        currentDropTarget = dropColumn
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)

      if (!isDragging) return

      element.classList.remove('lf-cal-event--dragging')
      if (ghostEl) {
        ghostEl.remove()
        ghostEl = null
      }
      if (currentDropTarget) {
        currentDropTarget.classList.remove('lf-cal-day-column--drop-target')
      }
      document.body.style.userSelect = ''
      document.body.style.cursor = ''

      // Calculate new position
      if (onEventDrop) {
        const dropColumnIndex = findDayColumnIndexAtPosition(e.clientX)
        if (dropColumnIndex >= 0 && dropColumnIndex < daysRef.length) {
          const newDay = daysRef[dropColumnIndex]
          if (newDay) {
            const newStart = calculateTimeFromY(e.clientY, newDay)
            const duration = diffInMinutes(event.start, event.end)
            const newEnd = addMinutes(newStart, duration)
            onEventDrop(event, newStart, newEnd, undefined)
          }
        }
      }

      isDragging = false
    }

    element.addEventListener('pointerdown', handlePointerDown)
  }

  // ─── Event Resize Interaction ──────────────────────────────

  function setupEventResizeInteraction(
    event: T,
    element: HTMLElement,
    day: Date,
    _dayColumn: HTMLElement
  ): void {
    // Find resize handle (created by renderEvent)
    const resizeHandle = element.querySelector('.lf-cal-event-resize-handle') as HTMLElement | null
    if (!resizeHandle) {
      return
    }

    let isResizing = false

    const handleResizeDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      e.stopPropagation()
      e.preventDefault()

      isResizing = true
      element.classList.add('lf-cal-event--resizing')
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'ns-resize'

      document.addEventListener('pointermove', handleResizeMove)
      document.addEventListener('pointerup', handleResizeUp)
    }

    const handleResizeMove = (e: PointerEvent) => {
      if (!isResizing) return

      const newEnd = calculateTimeFromY(e.clientY, day)
      const minEnd = addMinutes(event.start, config.slotDuration)
      const clampedEnd = newEnd < minEnd ? minEnd : newEnd

      // Update visual height
      const slotHeight = 40
      const startMinutes = (event.start.getHours() - config.dayStart) * 60 + event.start.getMinutes()
      const endMinutes = (clampedEnd.getHours() - config.dayStart) * 60 + clampedEnd.getMinutes()
      const durationMinutes = endMinutes - startMinutes
      const newHeight = (durationMinutes / config.slotDuration) * slotHeight
      element.style.height = `${Math.max(newHeight, slotHeight / 2)}px`
    }

    const handleResizeUp = (e: PointerEvent) => {
      document.removeEventListener('pointermove', handleResizeMove)
      document.removeEventListener('pointerup', handleResizeUp)

      if (!isResizing) return

      element.classList.remove('lf-cal-event--resizing')
      document.body.style.userSelect = ''
      document.body.style.cursor = ''

      if (onEventResize) {
        const newEnd = calculateTimeFromY(e.clientY, day)
        const minEnd = addMinutes(event.start, config.slotDuration)
        const clampedEnd = newEnd < minEnd ? minEnd : newEnd
        onEventResize(event, clampedEnd)
      }

      isResizing = false
    }

    resizeHandle.addEventListener('pointerdown', handleResizeDown)
  }

  // ─── Helper Functions ──────────────────────────────────────

  function findDayColumnAtPosition(x: number): HTMLElement | null {
    for (const column of dayColumnsRef) {
      const rect = column.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right) {
        return column
      }
    }
    return null
  }

  function findDayColumnIndexAtPosition(x: number): number {
    for (let i = 0; i < dayColumnsRef.length; i++) {
      const column = dayColumnsRef[i]
      if (!column) continue
      const rect = column.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right) {
        return i
      }
    }
    return -1
  }

  function calculateTimeFromY(y: number, day: Date): Date {
    const column = dayColumnsRef[0]
    if (!column) return day

    const rect = column.getBoundingClientRect()
    const relativeY = y - rect.top
    const slotHeight = 40
    const totalSlots = (config.dayEnd - config.dayStart) * (60 / config.slotDuration)

    const slotIndex = Math.floor(relativeY / slotHeight)
    const clampedIndex = Math.max(0, Math.min(slotIndex, totalSlots - 1))

    const minutesFromStart = clampedIndex * config.slotDuration
    const hours = config.dayStart + Math.floor(minutesFromStart / 60)
    const minutes = minutesFromStart % 60

    const result = new Date(day)
    result.setHours(hours, minutes, 0, 0)
    return result
  }

  // Cleanup on unmount
  const originalRemove = container.remove.bind(container)
  container.remove = () => {
    if (nowIndicator?.cleanup) {
      nowIndicator.cleanup()
    }
    for (const cleanup of slotSelectionCleanups) {
      cleanup()
    }
    originalRemove()
  }

  return container
}
