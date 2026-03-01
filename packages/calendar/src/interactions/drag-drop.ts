/**
 * @liteforge/calendar - Drag & Drop Interaction
 *
 * Enables moving events by dragging them to a new time slot.
 */

import type { CalendarEvent, ResolvedTimeConfig } from '../types.js'
import { addMinutes, diffInMinutes } from '../date-utils.js'

export interface DragDropOptions<T extends CalendarEvent> {
  dayColumns: HTMLElement[]
  days: Date[]
  config: ResolvedTimeConfig
  resourceIds?: string[]
  onEventDrop?: (event: T, newStart: Date, newEnd: Date, newResourceId?: string) => void
}

export interface DragState<T extends CalendarEvent> {
  isDragging: boolean
  event: T | null
  originalElement: HTMLElement | null
  ghostElement: HTMLElement | null
  originalStart: Date | null
  originalEnd: Date | null
  originalResourceId: string | undefined
  startX: number
  startY: number
  cleanup: () => void
}

const DRAG_THRESHOLD = 5 // pixels

/**
 * Create a ghost element for dragging.
 */
function createGhostElement(original: HTMLElement): HTMLElement {
  const ghost = original.cloneNode(true) as HTMLElement
  ghost.classList.add('lf-cal-event--ghost')
  ghost.style.position = 'fixed'
  ghost.style.zIndex = '10000'
  ghost.style.width = `${original.offsetWidth}px`
  ghost.style.height = `${original.offsetHeight}px`
  ghost.style.opacity = '0.8'
  ghost.style.pointerEvents = 'none'
  ghost.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)'
  return ghost
}

/**
 * Calculate new event time based on drop position.
 */
function calculateNewTime(
  y: number,
  dayColumn: HTMLElement,
  day: Date,
  config: ResolvedTimeConfig
): Date {
  const rect = dayColumn.getBoundingClientRect()
  const relativeY = y - rect.top
  const slotHeight = 40 // CSS variable --lf-cal-slot-height default
  const totalSlots = (config.dayEnd - config.dayStart) * (60 / config.slotDuration)

  // Calculate which slot index we're in
  const slotIndex = Math.floor(relativeY / slotHeight)
  const clampedIndex = Math.max(0, Math.min(slotIndex, totalSlots - 1))

  // Convert to time
  const minutesFromStart = clampedIndex * config.slotDuration
  const hours = config.dayStart + Math.floor(minutesFromStart / 60)
  const minutes = minutesFromStart % 60

  const result = new Date(day)
  result.setHours(hours, minutes, 0, 0)
  return result
}

/**
 * Find which day column the pointer is over.
 */
function findDayColumnAtX(
  x: number,
  dayColumns: HTMLElement[]
): { column: HTMLElement; index: number } | null {
  for (let i = 0; i < dayColumns.length; i++) {
    const column = dayColumns[i]
    if (!column) continue
    const rect = column.getBoundingClientRect()
    if (x >= rect.left && x <= rect.right) {
      return { column, index: i }
    }
  }
  return null
}

/**
 * Set up drag & drop for an event element.
 */
export function setupEventDrag<T extends CalendarEvent>(
  eventElement: HTMLElement,
  event: T,
  options: DragDropOptions<T>
): DragState<T> {
  const { dayColumns, days, config, resourceIds, onEventDrop } = options

  const state: DragState<T> = {
    isDragging: false,
    event: null,
    originalElement: null,
    ghostElement: null,
    originalStart: null,
    originalEnd: null,
    originalResourceId: undefined,
    startX: 0,
    startY: 0,
    cleanup: () => {},
  }

  let thresholdMet = false
  let currentDropTarget: HTMLElement | null = null

  const handlePointerDown = (e: PointerEvent) => {
    // Only handle left click
    if (e.button !== 0) return

    // Ignore if clicking resize handle
    if ((e.target as HTMLElement).classList.contains('lf-cal-event-resize-handle')) {
      return
    }

    state.event = event
    state.originalElement = eventElement
    state.originalStart = new Date(event.start)
    state.originalEnd = new Date(event.end)
    state.originalResourceId = event.resourceId
    state.startX = e.clientX
    state.startY = e.clientY
    thresholdMet = false

    // Add listeners for move/up
    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
  }

  const handlePointerMove = (e: PointerEvent) => {
    if (!state.event || !state.originalElement) return

    const deltaX = Math.abs(e.clientX - state.startX)
    const deltaY = Math.abs(e.clientY - state.startY)

    // Check threshold
    if (!thresholdMet && (deltaX < DRAG_THRESHOLD && deltaY < DRAG_THRESHOLD)) {
      return
    }

    if (!thresholdMet) {
      thresholdMet = true
      state.isDragging = true

      // Create ghost element
      state.ghostElement = createGhostElement(state.originalElement)
      document.body.appendChild(state.ghostElement)

      // Mark original as dragging
      state.originalElement.classList.add('lf-cal-event--dragging')

      // Prevent text selection
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'grabbing'
    }

    if (!state.ghostElement) return

    // Move ghost
    state.ghostElement.style.left = `${e.clientX - state.ghostElement.offsetWidth / 2}px`
    state.ghostElement.style.top = `${e.clientY - 10}px`

    // Find drop target
    const dayColumnInfo = findDayColumnAtX(e.clientX, dayColumns)

    // Clear previous drop target
    if (currentDropTarget && currentDropTarget !== dayColumnInfo?.column) {
      currentDropTarget.classList.remove('lf-cal-day-column--drop-target')
    }

    // Highlight new drop target
    if (dayColumnInfo) {
      dayColumnInfo.column.classList.add('lf-cal-day-column--drop-target')
      currentDropTarget = dayColumnInfo.column
    } else {
      currentDropTarget = null
    }
  }

  const handlePointerUp = (e: PointerEvent) => {
    // Clean up listeners
    document.removeEventListener('pointermove', handlePointerMove)
    document.removeEventListener('pointerup', handlePointerUp)

    if (!state.isDragging || !state.event || !state.originalStart || !state.originalEnd) {
      resetState()
      return
    }

    // Remove ghost
    if (state.ghostElement) {
      state.ghostElement.remove()
      state.ghostElement = null
    }

    // Remove dragging class
    if (state.originalElement) {
      state.originalElement.classList.remove('lf-cal-event--dragging')
    }

    // Clear drop target
    if (currentDropTarget) {
      currentDropTarget.classList.remove('lf-cal-day-column--drop-target')
    }

    // Calculate new position
    const dayColumnInfo = findDayColumnAtX(e.clientX, dayColumns)
    if (dayColumnInfo) {
      const dayIndex = dayColumnInfo.index
      const day = days[dayIndex]
      if (day) {
        const newStart = calculateNewTime(e.clientY, dayColumnInfo.column, day, config)

        // Calculate new end based on original duration
        const durationMinutes = diffInMinutes(state.originalStart, state.originalEnd)
        const newEnd = addMinutes(newStart, durationMinutes)

        // Get new resource ID if we have resources
        const newResourceId = resourceIds?.[dayIndex]

        // Call drop handler
        if (onEventDrop) {
          onEventDrop(state.event, newStart, newEnd, newResourceId)
        }
      }
    }

    resetState()
  }

  const resetState = () => {
    state.isDragging = false
    state.event = null
    state.originalElement = null
    state.originalStart = null
    state.originalEnd = null
    state.originalResourceId = undefined
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    thresholdMet = false
    currentDropTarget = null
  }

  // Attach listener
  eventElement.addEventListener('pointerdown', handlePointerDown)

  // Store cleanup
  state.cleanup = () => {
    eventElement.removeEventListener('pointerdown', handlePointerDown)
    document.removeEventListener('pointermove', handlePointerMove)
    document.removeEventListener('pointerup', handlePointerUp)
    if (state.ghostElement) {
      state.ghostElement.remove()
    }
    if (currentDropTarget) {
      currentDropTarget.classList.remove('lf-cal-day-column--drop-target')
    }
    resetState()
  }

  return state
}
