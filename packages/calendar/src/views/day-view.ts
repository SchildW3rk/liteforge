/**
 * @liteforge/calendar - Day View Renderer
 *
 * Day view with optional resource columns (therapists/rooms).
 * Without resources: single day column.
 * With resources: one column per visible resource.
 */

import { effect } from '@liteforge/core'
import type {
  CalendarEvent,
  Resource,
  ResolvedTimeConfig,
  CalendarClasses,
} from '../types.js'
import {
  getTimeSlots,
  formatFullDate,
  isToday,
  isAllDayEvent,
  addMinutes,
  diffInMinutes,
} from '../date-utils.js'
import {
  calculateOverlaps,
  getTimedEventsForDay,
  getEventsForResource,
  renderTimeColumn,
  renderTimeSlots,
  renderEvent,
  renderAllDayRow,
  createNowIndicator,
  getClass,
} from './shared.js'
import { setupSlotSelection } from '../interactions/slot-selection.js'

interface DayViewOptions<T extends CalendarEvent> {
  date: () => Date
  events: () => T[]
  resources: () => Resource[]
  visibleResources: () => string[]
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

export function renderDayView<T extends CalendarEvent>(
  options: DayViewOptions<T>
): HTMLDivElement {
  const {
    date,
    events,
    resources,
    visibleResources,
    config,
    locale,
    classes,
    eventContent,
    slotContent,
    onEventClick,
    onSlotClick,
    onSlotSelect,
    onEventDrop,
    onEventResize,
    editable,
    selectable,
  } = options

  const container = document.createElement('div')
  container.className = getClass('root', classes, 'lf-cal-day-view')

  // Header
  const header = document.createElement('div')
  header.className = getClass('header', classes, 'lf-cal-header')

  // Time spacer
  const timeSpacer = document.createElement('div')
  timeSpacer.className = 'lf-cal-header-time-spacer'
  header.appendChild(timeSpacer)

  // Resource/day headers container
  const headersContainer = document.createElement('div')
  headersContainer.style.display = 'flex'
  headersContainer.style.flex = '1'
  header.appendChild(headersContainer)

  container.appendChild(header)

  // All-day row
  let allDayRow: HTMLDivElement | null = null

  // Body
  const body = document.createElement('div')
  body.className = getClass('body', classes, 'lf-cal-body')

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

  // Day column reference for drag
  let dayColumnRef: HTMLElement | null = null
  let currentDateRef: Date = new Date()

  // Reactive rendering
  effect(() => {
    const currentDate = date()
    const allEvents = events()
    const allResources = resources()
    const visible = visibleResources()

    // Separate all-day and timed events
    const allDayEvents = allEvents.filter((e) => isAllDayEvent(e))
    const timedEvents = allEvents.filter((e) => !isAllDayEvent(e))

    // Get resources to display
    const displayResources = allResources.length > 0
      ? allResources.filter((r) => visible.includes(r.id))
      : null

    // Update headers
    headersContainer.innerHTML = ''

    if (displayResources && displayResources.length > 0) {
      // Resource columns
      for (const resource of displayResources) {
        const headerCell = document.createElement('div')
        headerCell.className = getClass('headerCell', classes, 'lf-cal-header-cell')
        headerCell.style.borderLeft = `3px solid ${resource.color ?? '#3b82f6'}`

        const nameEl = document.createElement('div')
        nameEl.className = 'lf-cal-header-day-name'
        nameEl.textContent = resource.name

        if (resource.role) {
          const roleEl = document.createElement('div')
          roleEl.style.fontSize = '11px'
          roleEl.style.opacity = '0.7'
          roleEl.textContent = resource.role
          headerCell.appendChild(nameEl)
          headerCell.appendChild(roleEl)
        } else {
          headerCell.appendChild(nameEl)
        }

        headersContainer.appendChild(headerCell)
      }
    } else {
      // Single day header
      const headerCell = document.createElement('div')
      let headerClass = getClass('headerCell', classes, 'lf-cal-header-cell')
      if (isToday(currentDate)) headerClass += ' lf-cal-header-cell--today'
      headerCell.className = headerClass
      headerCell.textContent = formatFullDate(currentDate, locale)
      headersContainer.appendChild(headerCell)
    }

    // Update all-day row
    if (allDayRow) {
      allDayRow.remove()
    }
    allDayRow = renderAllDayRow({
      days: [currentDate],
      events: allDayEvents,
      classes,
      onEventClick,
      hasTimeColumnSpacer: true,
    })
    container.insertBefore(allDayRow, body)

    // Update time column
    if (timeColumnEl) {
      timeColumnEl.remove()
    }
    timeColumnEl = renderTimeColumn(currentDate, config, locale)
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
    currentDateRef = currentDate

    if (displayResources && displayResources.length > 0) {
      // Render resource columns
      for (const resource of displayResources) {
        const resourceColumn = document.createElement('div')
        resourceColumn.className = getClass('resourceColumn', classes, 'lf-cal-resource-column')

        // Time slots
        const slotsContainer = renderTimeSlots(currentDate, config, resource)
        resourceColumn.appendChild(slotsContainer)

        // Custom slot content
        if (slotContent) {
          const slots = getTimeSlots(currentDate, config.dayStart, config.dayEnd, config.slotDuration)
          for (let i = 0; i < slots.length; i++) {
            const slot = slots[i]
            if (!slot) continue
            const content = slotContent(slot, resource.id)
            if (content) {
              const slotEl = slotsContainer.children[i] as HTMLElement
              if (slotEl) {
                slotEl.innerHTML = ''
                slotEl.appendChild(content)
              }
            }
          }
        }

        // Set up slot selection for this resource
        if (selectable && (onSlotClick ?? onSlotSelect)) {
          const slotState = setupSlotSelection({
            slotsContainer,
            day: currentDate,
            config,
            resourceId: resource.id,
            onSlotClick,
            onSlotSelect,
          })
          slotSelectionCleanups.push(slotState.cleanup)
        }

        // Events for this resource (timed events only)
        const dayEvents = getTimedEventsForDay(timedEvents, currentDate)
        const resourceEvents = getEventsForResource(dayEvents, resource.id)
        const layouts = calculateOverlaps(resourceEvents)

        // Events container
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
            // Drag handler
            editable ? (event, element) => {
              setupEventDragInteraction(event, element, currentDate, resourceColumn, resource.id)
            } : undefined,
            // Resize handler  
            editable ? (event, element) => {
              setupEventResizeInteraction(event, element, currentDate, resourceColumn)
            } : undefined
          )
          eventEl.style.pointerEvents = 'auto'
          if (resource.color) {
            eventEl.style.background = resource.color
          }
          eventsContainer.appendChild(eventEl)
        }

        resourceColumn.appendChild(eventsContainer)

        // Now indicator (only in first column for today)
        if (resource === displayResources[0] && isToday(currentDate) && config.nowIndicator) {
          nowIndicator = createNowIndicator(config)
          if (nowIndicator) {
            nowIndicator.style.left = '0'
            nowIndicator.style.right = 'auto'
            nowIndicator.style.width = '100%'
            grid.style.position = 'relative'
            // We'll add the indicator to the grid instead
          }
        }

        grid.appendChild(resourceColumn)
      }

      // Add now indicator to span all resource columns
      if (nowIndicator) {
        grid.appendChild(nowIndicator)
      }
    } else {
      // Single day column (no resources)
      const dayColumn = document.createElement('div')
      let columnClass = getClass('dayColumn', classes, 'lf-cal-day-column')
      if (isToday(currentDate)) columnClass += ' lf-cal-day-column--today'
      dayColumn.className = columnClass

      // Time slots
      const slotsContainer = renderTimeSlots(currentDate, config)
      dayColumn.appendChild(slotsContainer)

      // Custom slot content
      if (slotContent) {
        const slots = getTimeSlots(currentDate, config.dayStart, config.dayEnd, config.slotDuration)
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

      // Set up slot selection
      if (selectable && (onSlotClick ?? onSlotSelect)) {
        const slotState = setupSlotSelection({
          slotsContainer,
          day: currentDate,
          config,
          onSlotClick,
          onSlotSelect,
        })
        slotSelectionCleanups.push(slotState.cleanup)
      }

      dayColumnRef = dayColumn

      // Events for this day (timed events only - all-day events are in the all-day row)
      const dayEvents = getTimedEventsForDay(timedEvents, currentDate)
      const layouts = calculateOverlaps(dayEvents)

      // Events container
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
          // Drag handler
          editable ? (event, element) => {
            setupEventDragInteraction(event, element, currentDate, dayColumn, undefined)
          } : undefined,
          // Resize handler
          editable ? (event, element) => {
            setupEventResizeInteraction(event, element, currentDate, dayColumn)
          } : undefined
        )
        eventEl.style.pointerEvents = 'auto'
        eventsContainer.appendChild(eventEl)
      }

      dayColumn.appendChild(eventsContainer)

      // Now indicator
      if (isToday(currentDate) && config.nowIndicator) {
        nowIndicator = createNowIndicator(config)
        if (nowIndicator) {
          eventsContainer.appendChild(nowIndicator)
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
    _dayColumn: HTMLElement,
    resourceId: string | undefined
  ): void {
    let isDragging = false
    let startX = 0
    let startY = 0
    let ghostEl: HTMLElement | null = null
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
      document.body.style.userSelect = ''
      document.body.style.cursor = ''

      // Calculate new position
      if (onEventDrop && dayColumnRef) {
        const newStart = calculateTimeFromY(e.clientY, currentDateRef, dayColumnRef)
        const duration = diffInMinutes(event.start, event.end)
        const newEnd = addMinutes(newStart, duration)
        onEventDrop(event, newStart, newEnd, resourceId)
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
      if (!isResizing || !dayColumnRef) return

      const newEnd = calculateTimeFromY(e.clientY, day, dayColumnRef)
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

      if (!isResizing || !dayColumnRef) return

      element.classList.remove('lf-cal-event--resizing')
      document.body.style.userSelect = ''
      document.body.style.cursor = ''

      if (onEventResize) {
        const newEnd = calculateTimeFromY(e.clientY, day, dayColumnRef)
        const minEnd = addMinutes(event.start, config.slotDuration)
        const clampedEnd = newEnd < minEnd ? minEnd : newEnd
        onEventResize(event, clampedEnd)
      }

      isResizing = false
    }

    resizeHandle.addEventListener('pointerdown', handleResizeDown)
  }

  // ─── Helper Functions ──────────────────────────────────────

  function calculateTimeFromY(y: number, day: Date, column: HTMLElement): Date {
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

  // Cleanup
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
