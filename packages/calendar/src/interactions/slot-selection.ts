/**
 * @liteforge/calendar - Slot Selection Interaction
 *
 * Enables selecting time ranges by clicking and dragging on empty slots.
 */

import type { ResolvedTimeConfig } from '../types.js'
import { addMinutes } from '../date-utils.js'

export interface SlotSelectionOptions {
  slotsContainer: HTMLElement
  day: Date
  config: ResolvedTimeConfig
  resourceId?: string | undefined
  onSlotClick?: ((start: Date, end: Date, resourceId?: string) => void) | undefined
  onSlotSelect?: ((start: Date, end: Date, resourceId?: string) => void) | undefined
}

export interface SlotSelectionState {
  isSelecting: boolean
  startSlot: Date | null
  currentSlot: Date | null
  cleanup: () => void
}

/**
 * Calculate slot time from Y position within the slots container.
 */
function getSlotTimeFromY(
  y: number,
  containerRect: DOMRect,
  day: Date,
  config: ResolvedTimeConfig
): Date {
  const relativeY = y - containerRect.top
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
 * Highlight slots between start and current selection.
 */
function highlightSlots(
  slotsContainer: HTMLElement,
  startSlot: Date,
  endSlot: Date,
  config: ResolvedTimeConfig
): void {
  // Clear existing highlights
  clearHighlights(slotsContainer)

  const slots = slotsContainer.children
  const startMinutes = (startSlot.getHours() - config.dayStart) * 60 + startSlot.getMinutes()
  const endMinutes = (endSlot.getHours() - config.dayStart) * 60 + endSlot.getMinutes()

  const minMinutes = Math.min(startMinutes, endMinutes)
  const maxMinutes = Math.max(startMinutes, endMinutes)

  const startIndex = Math.floor(minMinutes / config.slotDuration)
  const endIndex = Math.floor(maxMinutes / config.slotDuration)

  for (let i = startIndex; i <= endIndex && i < slots.length; i++) {
    const slot = slots[i]
    if (slot) {
      slot.classList.add('lf-cal-time-slot--selected')
    }
  }
}

/**
 * Clear all slot highlights.
 */
function clearHighlights(slotsContainer: HTMLElement): void {
  const slots = slotsContainer.querySelectorAll('.lf-cal-time-slot--selected')
  slots.forEach((slot) => {
    slot.classList.remove('lf-cal-time-slot--selected')
  })
}

/**
 * Set up slot selection interaction on a slots container.
 */
export function setupSlotSelection(options: SlotSelectionOptions): SlotSelectionState {
  const { slotsContainer, day, config, resourceId, onSlotClick, onSlotSelect } = options

  const state: SlotSelectionState = {
    isSelecting: false,
    startSlot: null,
    currentSlot: null,
    cleanup: () => {},
  }

  let containerRect: DOMRect | null = null

  const handlePointerDown = (e: PointerEvent) => {
    // Only handle left click
    if (e.button !== 0) return

    // Ignore clicks on events
    const target = e.target as HTMLElement
    if (target.closest('.lf-cal-event')) return

    containerRect = slotsContainer.getBoundingClientRect()
    const startTime = getSlotTimeFromY(e.clientY, containerRect, day, config)

    state.isSelecting = true
    state.startSlot = startTime
    state.currentSlot = startTime

    // Highlight initial slot
    highlightSlots(slotsContainer, startTime, startTime, config)

    // Prevent text selection during drag
    document.body.style.userSelect = 'none'

    // Capture pointer for tracking (not available in all test environments)
    if (target.setPointerCapture) {
      target.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: PointerEvent) => {
    if (!state.isSelecting || !state.startSlot || !containerRect) return

    const currentTime = getSlotTimeFromY(e.clientY, containerRect, day, config)
    state.currentSlot = currentTime

    // Update highlight
    highlightSlots(slotsContainer, state.startSlot, currentTime, config)
  }

  const handlePointerUp = (_e: PointerEvent) => {
    if (!state.isSelecting || !state.startSlot) {
      state.isSelecting = false
      return
    }

    const endTime = state.currentSlot ?? state.startSlot

    // Determine start and end (swap if needed)
    let finalStart = state.startSlot
    let finalEnd = addMinutes(endTime, config.slotDuration)

    if (finalStart > endTime) {
      finalStart = endTime
      finalEnd = addMinutes(state.startSlot, config.slotDuration)
    }

    // Clear selection state
    state.isSelecting = false
    state.startSlot = null
    state.currentSlot = null
    document.body.style.userSelect = ''

    // Clear highlights
    clearHighlights(slotsContainer)

    // Determine if this was a click or drag
    const wasClick = finalStart.getTime() === endTime.getTime()

    if (wasClick && onSlotClick) {
      onSlotClick(finalStart, finalEnd, resourceId)
    } else if (!wasClick && onSlotSelect) {
      onSlotSelect(finalStart, finalEnd, resourceId)
    } else if (onSlotClick) {
      // Fallback: treat drag as click for the range
      onSlotClick(finalStart, finalEnd, resourceId)
    }
  }

  const handlePointerCancel = () => {
    state.isSelecting = false
    state.startSlot = null
    state.currentSlot = null
    document.body.style.userSelect = ''
    clearHighlights(slotsContainer)
  }

  // Attach listeners
  slotsContainer.addEventListener('pointerdown', handlePointerDown)
  slotsContainer.addEventListener('pointermove', handlePointerMove)
  slotsContainer.addEventListener('pointerup', handlePointerUp)
  slotsContainer.addEventListener('pointercancel', handlePointerCancel)

  // Store cleanup function
  state.cleanup = () => {
    slotsContainer.removeEventListener('pointerdown', handlePointerDown)
    slotsContainer.removeEventListener('pointermove', handlePointerMove)
    slotsContainer.removeEventListener('pointerup', handlePointerUp)
    slotsContainer.removeEventListener('pointercancel', handlePointerCancel)
    clearHighlights(slotsContainer)
  }

  return state
}
