/**
 * @liteforge/calendar - Event Resize Interaction
 *
 * Enables resizing events by dragging the bottom edge.
 */

import type { CalendarEvent, ResolvedTimeConfig } from '../types.js'
import { addMinutes } from '../date-utils.js'

export interface ResizeOptions<T extends CalendarEvent> {
  dayColumn: HTMLElement
  day: Date
  config: ResolvedTimeConfig
  onEventResize?: (event: T, newEnd: Date) => void
}

export interface ResizeState<T extends CalendarEvent> {
  isResizing: boolean
  event: T | null
  eventElement: HTMLElement | null
  originalEnd: Date | null
  startY: number
  cleanup: () => void
}

/**
 * Calculate new end time based on resize position.
 */
function calculateNewEnd(
  y: number,
  dayColumn: HTMLElement,
  day: Date,
  config: ResolvedTimeConfig,
  eventStart: Date
): Date {
  const rect = dayColumn.getBoundingClientRect()
  const relativeY = y - rect.top
  const slotHeight = 40 // CSS variable --lf-cal-slot-height default
  const totalSlots = (config.dayEnd - config.dayStart) * (60 / config.slotDuration)

  // Calculate which slot index we're in
  const slotIndex = Math.floor(relativeY / slotHeight)
  const clampedIndex = Math.max(0, Math.min(slotIndex, totalSlots - 1))

  // Convert to time
  const minutesFromStart = (clampedIndex + 1) * config.slotDuration
  const hours = config.dayStart + Math.floor(minutesFromStart / 60)
  const minutes = minutesFromStart % 60

  const newEnd = new Date(day)
  newEnd.setHours(hours, minutes, 0, 0)

  // Ensure minimum duration of 1 slot
  const minEnd = addMinutes(eventStart, config.slotDuration)
  if (newEnd < minEnd) {
    return minEnd
  }

  return newEnd
}

/**
 * Set up resize for an event element.
 */
export function setupEventResize<T extends CalendarEvent>(
  eventElement: HTMLElement,
  resizeHandle: HTMLElement,
  event: T,
  options: ResizeOptions<T>
): ResizeState<T> {
  const { dayColumn, day, config, onEventResize } = options

  const state: ResizeState<T> = {
    isResizing: false,
    event: null,
    eventElement: null,
    originalEnd: null,
    startY: 0,
    cleanup: () => {},
  }

  let previewEndTime: Date | null = null

  const handlePointerDown = (e: PointerEvent) => {
    // Only handle left click
    if (e.button !== 0) return

    e.stopPropagation()
    e.preventDefault()

    state.isResizing = true
    state.event = event
    state.eventElement = eventElement
    state.originalEnd = new Date(event.end)
    state.startY = e.clientY

    // Mark as resizing
    eventElement.classList.add('lf-cal-event--resizing')

    // Prevent text selection
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'ns-resize'

    // Add listeners
    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
  }

  const handlePointerMove = (e: PointerEvent) => {
    if (!state.isResizing || !state.event || !state.eventElement) return

    // Calculate new end time
    previewEndTime = calculateNewEnd(e.clientY, dayColumn, day, config, state.event.start)

    // Update visual height
    const slotHeight = 40
    const startMinutes =
      (state.event.start.getHours() - config.dayStart) * 60 + state.event.start.getMinutes()
    const endMinutes =
      (previewEndTime.getHours() - config.dayStart) * 60 + previewEndTime.getMinutes()
    const durationMinutes = endMinutes - startMinutes

    const newHeight = (durationMinutes / config.slotDuration) * slotHeight
    state.eventElement.style.height = `${Math.max(newHeight, slotHeight / 2)}px`
  }

  const handlePointerUp = (_e: PointerEvent) => {
    // Clean up listeners
    document.removeEventListener('pointermove', handlePointerMove)
    document.removeEventListener('pointerup', handlePointerUp)

    if (!state.isResizing || !state.event || !previewEndTime) {
      resetState()
      return
    }

    // Remove resizing class
    if (state.eventElement) {
      state.eventElement.classList.remove('lf-cal-event--resizing')
    }

    // Call resize handler
    if (onEventResize && state.event) {
      onEventResize(state.event, previewEndTime)
    }

    resetState()
  }

  const resetState = () => {
    state.isResizing = false
    state.event = null
    state.eventElement = null
    state.originalEnd = null
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    previewEndTime = null
  }

  // Attach listener to resize handle
  resizeHandle.addEventListener('pointerdown', handlePointerDown)

  // Store cleanup
  state.cleanup = () => {
    resizeHandle.removeEventListener('pointerdown', handlePointerDown)
    document.removeEventListener('pointermove', handlePointerMove)
    document.removeEventListener('pointerup', handlePointerUp)
    resetState()
  }

  return state
}
