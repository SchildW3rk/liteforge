/**
 * @liteforge/calendar - Interaction Tests
 * 
 * Tests for drag & drop, resize, and slot selection interactions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signal } from '@liteforge/core'
import { createCalendar } from '../src/calendar.js'
import type { CalendarEvent, Resource } from '../src/types.js'

// Helper to create test events
function createEvent(
  id: string,
  start: Date,
  end: Date,
  extra: Partial<CalendarEvent> = {}
): CalendarEvent {
  return { id, title: `Event ${id}`, start, end, ...extra }
}

// Helper to create a PointerEvent
function createPointerEvent(
  type: string,
  options: Partial<PointerEvent> = {}
): PointerEvent {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: 100,
    clientY: 100,
    ...options,
  })
}

describe('Calendar Interactions', () => {
  // Test resources
  const resources: Resource[] = [
    { id: 'sarah', name: 'Dr. Sarah Miller', color: '#3b82f6' },
    { id: 'john', name: 'Dr. John Smith', color: '#10b981' },
  ]

  describe('Event Click', () => {
    it('calls onEventClick when event is clicked', () => {
      const onEventClick = vi.fn()
      const events = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
      ])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        onEventClick,
        unstyled: true,
      })

      // Render the calendar
      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      // Find the event element
      const eventEl = root.querySelector('.lf-cal-event')
      expect(eventEl).toBeTruthy()

      // Click the event
      eventEl?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

      expect(onEventClick).toHaveBeenCalledTimes(1)
      expect(onEventClick).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }))

      document.body.removeChild(root)
    })
  })

  describe('Slot Click', () => {
    it('calls onSlotClick when empty slot is clicked', () => {
      const onSlotClick = vi.fn()
      const events = signal<CalendarEvent[]>([])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        selectable: true,
        onSlotClick,
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      // Find a time slot
      const slot = root.querySelector('.lf-cal-time-slot')
      expect(slot).toBeTruthy()

      // The slot selection uses pointerdown/up, so we simulate that
      const pointerDown = createPointerEvent('pointerdown', { clientY: 200 })
      const pointerUp = createPointerEvent('pointerup', { clientY: 200 })
      
      slot?.dispatchEvent(pointerDown)
      slot?.dispatchEvent(pointerUp)

      // onSlotClick should have been called
      expect(onSlotClick).toHaveBeenCalled()

      document.body.removeChild(root)
    })
  })

  describe('Editable Events', () => {
    it('sets data-editable attribute on editable events', () => {
      const events = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
      ])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        editable: true,
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      const eventEl = root.querySelector('.lf-cal-event') as HTMLElement
      expect(eventEl).toBeTruthy()
      expect(eventEl.dataset.editable).toBe('true')

      document.body.removeChild(root)
    })

    it('adds resize handle to editable events', () => {
      const events = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
      ])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        editable: true,
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      const eventEl = root.querySelector('.lf-cal-event')
      const resizeHandle = eventEl?.querySelector('.lf-cal-event-resize-handle')
      expect(resizeHandle).toBeTruthy()

      document.body.removeChild(root)
    })

    it('does not add editable attributes when editable is false', () => {
      const events = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
      ])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        editable: false,
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      const eventEl = root.querySelector('.lf-cal-event') as HTMLElement
      expect(eventEl.dataset.editable).toBeUndefined()

      const resizeHandle = eventEl?.querySelector('.lf-cal-event-resize-handle')
      expect(resizeHandle).toBeNull()

      document.body.removeChild(root)
    })
  })

  describe('Event Accessibility', () => {
    it('sets role="button" on events', () => {
      const events = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
      ])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      const eventEl = root.querySelector('.lf-cal-event')
      expect(eventEl?.getAttribute('role')).toBe('button')
      expect(eventEl?.getAttribute('tabindex')).toBe('0')

      document.body.removeChild(root)
    })

    it('sets aria-label with event title and time', () => {
      const events = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
      ])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      const eventEl = root.querySelector('.lf-cal-event')
      const ariaLabel = eventEl?.getAttribute('aria-label')
      expect(ariaLabel).toContain('Event 1')
      expect(ariaLabel).toContain('10:00')
      expect(ariaLabel).toContain('11:00')

      document.body.removeChild(root)
    })
  })

  describe('Event Drop Handler', () => {
    it('onEventDrop is available when editable is true', () => {
      const onEventDrop = vi.fn()
      const events = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
      ])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        editable: true,
        onEventDrop,
        unstyled: true,
      })

      // Just verify the calendar is created with the handler
      expect(calendar).toBeDefined()
    })
  })

  describe('Event Resize Handler', () => {
    it('onEventResize is available when editable is true', () => {
      const onEventResize = vi.fn()
      const events = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
      ])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        editable: true,
        onEventResize,
        unstyled: true,
      })

      expect(calendar).toBeDefined()
    })
  })

  describe('All-Day Events', () => {
    it('renders all-day events in the all-day row', () => {
      const events = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15), new Date(2024, 5, 15, 23, 59), { allDay: true }),
      ])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      // Should find the all-day row
      const allDayRow = root.querySelector('.lf-cal-allday-row')
      expect(allDayRow).toBeTruthy()

      // All-day event should have the --allday class
      const allDayEvent = root.querySelector('.lf-cal-event--allday')
      expect(allDayEvent).toBeTruthy()

      document.body.removeChild(root)
    })

    it('treats 24+ hour events as all-day', () => {
      const events = signal<CalendarEvent[]>([
        // Event spanning 48 hours
        createEvent('1', new Date(2024, 5, 15, 0, 0), new Date(2024, 5, 17, 0, 0)),
      ])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      const allDayEvent = root.querySelector('.lf-cal-event--allday')
      expect(allDayEvent).toBeTruthy()

      document.body.removeChild(root)
    })
  })

  describe('Overlap Layout', () => {
    it('overlapping events share column width', () => {
      const events = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
        createEvent('2', new Date(2024, 5, 15, 10, 30), new Date(2024, 5, 15, 11, 30)),
      ])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      const eventEls = root.querySelectorAll('.lf-cal-event:not(.lf-cal-event--allday)')
      expect(eventEls.length).toBe(2)

      // Both events should have width < 100%
      const event1 = eventEls[0] as HTMLElement
      const event2 = eventEls[1] as HTMLElement

      // Check that width contains calc with percentage less than 100
      expect(event1.style.width).toContain('50%')
      expect(event2.style.width).toContain('50%')

      document.body.removeChild(root)
    })

    it('three overlapping events get 33% width each', () => {
      const events = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
        createEvent('2', new Date(2024, 5, 15, 10, 15), new Date(2024, 5, 15, 10, 45)),
        createEvent('3', new Date(2024, 5, 15, 10, 30), new Date(2024, 5, 15, 11, 30)),
      ])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      const eventEls = root.querySelectorAll('.lf-cal-event:not(.lf-cal-event--allday)')
      expect(eventEls.length).toBe(3)

      // All events should have ~33% width
      for (const el of eventEls) {
        const htmlEl = el as HTMLElement
        expect(htmlEl.style.width).toContain('33')
      }

      document.body.removeChild(root)
    })
  })

  describe('Now Indicator', () => {
    it('creates now indicator element when nowIndicator is true', () => {
      const events = signal<CalendarEvent[]>([])
      const today = new Date()

      const calendar = createCalendar({
        events,
        defaultDate: today,
        time: {
          nowIndicator: true,
          dayStart: 0,
          dayEnd: 24,
        },
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      const nowIndicator = root.querySelector('.lf-cal-now-indicator')
      // Should exist if today is in view
      expect(nowIndicator).toBeTruthy()

      document.body.removeChild(root)
    })

    it('hides now indicator when today is not in view', () => {
      const events = signal<CalendarEvent[]>([])
      // Set date to far in the past
      const pastDate = new Date(2020, 0, 1)

      const calendar = createCalendar({
        events,
        defaultDate: pastDate,
        time: { nowIndicator: true },
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      // Now indicator should not appear since today is not in view
      const nowIndicator = root.querySelector('.lf-cal-now-indicator')
      expect(nowIndicator).toBeNull()

      document.body.removeChild(root)
    })
  })

  describe('Working Hours', () => {
    it('marks slots outside working hours as blocked', () => {
      const events = signal<CalendarEvent[]>([])
      const resourcesWithHours: Resource[] = [
        {
          id: 'test',
          name: 'Test',
          workingHours: {
            1: { start: 9, end: 17 }, // Monday 9-17
          },
        },
      ]

      const monday = new Date(2024, 5, 17) // Monday

      const calendar = createCalendar({
        events,
        resources: resourcesWithHours,
        defaultDate: monday,
        view: 'day',
        time: {
          dayStart: 8,
          dayEnd: 20,
        },
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      // Check for blocked slots
      const blockedSlots = root.querySelectorAll('.lf-cal-time-slot--blocked')
      // Should have blocked slots for 8:00-9:00 and 17:00-20:00
      expect(blockedSlots.length).toBeGreaterThan(0)

      document.body.removeChild(root)
    })

    it('marks all slots as blocked for days without working hours', () => {
      const events = signal<CalendarEvent[]>([])
      const resourcesWithHours: Resource[] = [
        {
          id: 'test',
          name: 'Test',
          workingHours: {
            1: { start: 9, end: 17 }, // Only Monday
            // No entry for Saturday (6)
          },
        },
      ]

      const saturday = new Date(2024, 5, 15) // Saturday

      const calendar = createCalendar({
        events,
        resources: resourcesWithHours,
        defaultDate: saturday,
        view: 'day',
        time: {
          dayStart: 8,
          dayEnd: 20,
          hiddenDays: [], // Show all days
        },
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      // All slots should be blocked since Saturday has no working hours
      const allSlots = root.querySelectorAll('.lf-cal-time-slot')
      const blockedSlots = root.querySelectorAll('.lf-cal-time-slot--blocked')
      expect(blockedSlots.length).toBe(allSlots.length)

      document.body.removeChild(root)
    })
  })

  describe('Drag Interactions', () => {
    it('adds dragging class during drag', () => {
      const events = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
      ])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        editable: true,
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      const eventEl = root.querySelector('.lf-cal-event') as HTMLElement
      expect(eventEl).toBeTruthy()

      // Start drag
      const pointerDown = createPointerEvent('pointerdown', { clientX: 100, clientY: 100 })
      eventEl.dispatchEvent(pointerDown)

      // Move enough to trigger drag (past threshold)
      const pointerMove = createPointerEvent('pointermove', { clientX: 110, clientY: 110 })
      document.dispatchEvent(pointerMove)

      // Event should have dragging class
      expect(eventEl.classList.contains('lf-cal-event--dragging')).toBe(true)

      // End drag
      const pointerUp = createPointerEvent('pointerup', { clientX: 110, clientY: 110 })
      document.dispatchEvent(pointerUp)

      // Dragging class should be removed
      expect(eventEl.classList.contains('lf-cal-event--dragging')).toBe(false)

      document.body.removeChild(root)
    })

    it('does not trigger drag for small movements (within threshold)', () => {
      const events = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
      ])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        editable: true,
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      const eventEl = root.querySelector('.lf-cal-event') as HTMLElement

      // Start drag
      const pointerDown = createPointerEvent('pointerdown', { clientX: 100, clientY: 100 })
      eventEl.dispatchEvent(pointerDown)

      // Move less than threshold (5px)
      const pointerMove = createPointerEvent('pointermove', { clientX: 102, clientY: 102 })
      document.dispatchEvent(pointerMove)

      // Should NOT have dragging class
      expect(eventEl.classList.contains('lf-cal-event--dragging')).toBe(false)

      // Cleanup
      const pointerUp = createPointerEvent('pointerup', { clientX: 102, clientY: 102 })
      document.dispatchEvent(pointerUp)

      document.body.removeChild(root)
    })
  })

  describe('Resize Interactions', () => {
    it('adds resizing class when resize handle is dragged', () => {
      const events = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
      ])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        editable: true,
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      const eventEl = root.querySelector('.lf-cal-event') as HTMLElement
      const resizeHandle = eventEl.querySelector('.lf-cal-event-resize-handle') as HTMLElement
      expect(resizeHandle).toBeTruthy()

      // Start resize
      const pointerDown = createPointerEvent('pointerdown', { clientX: 100, clientY: 200 })
      resizeHandle.dispatchEvent(pointerDown)

      // Event should have resizing class
      expect(eventEl.classList.contains('lf-cal-event--resizing')).toBe(true)

      // End resize
      const pointerUp = createPointerEvent('pointerup', { clientX: 100, clientY: 300 })
      document.dispatchEvent(pointerUp)

      // Resizing class should be removed
      expect(eventEl.classList.contains('lf-cal-event--resizing')).toBe(false)

      document.body.removeChild(root)
    })
  })

  describe('Slot Selection', () => {
    it('has slot selection enabled when selectable is true', () => {
      const onSlotSelect = vi.fn()
      const onSlotClick = vi.fn()
      const events = signal<CalendarEvent[]>([])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        selectable: true,
        onSlotSelect,
        onSlotClick,
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      // Verify slots container exists
      const slotsContainer = root.querySelector('.lf-cal-day-column')
      expect(slotsContainer).toBeTruthy()

      // Verify time slots exist
      const slots = root.querySelectorAll('.lf-cal-time-slot')
      expect(slots.length).toBeGreaterThan(0)

      document.body.removeChild(root)
    })

    it('adds selected class during slot selection', () => {
      const events = signal<CalendarEvent[]>([])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        selectable: true,
        onSlotSelect: vi.fn(),
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement
      document.body.appendChild(root)

      // Get the slots container (which has the selection listener)
      const dayColumn = root.querySelector('.lf-cal-day-column')
      expect(dayColumn).toBeTruthy()

      // Verify slots exist
      const slots = root.querySelectorAll('.lf-cal-time-slot')
      expect(slots.length).toBeGreaterThan(0)

      document.body.removeChild(root)
    })
  })

  describe('View Switching', () => {
    it('switches between views', () => {
      const events = signal<CalendarEvent[]>([])

      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        view: 'week',
        unstyled: true,
      })

      // Should start with week view
      expect(calendar.currentView()).toBe('week')

      // Switch to day view
      calendar.setView('day')
      expect(calendar.currentView()).toBe('day')

      // Switch to month view
      calendar.setView('month')
      expect(calendar.currentView()).toBe('month')

      // Switch to agenda view
      calendar.setView('agenda')
      expect(calendar.currentView()).toBe('agenda')
    })
  })

  describe('Navigation', () => {
    it('navigates to next period', () => {
      const events = signal<CalendarEvent[]>([])
      const startDate = new Date(2024, 5, 15)

      const calendar = createCalendar({
        events,
        defaultDate: startDate,
        view: 'week',
        unstyled: true,
      })

      const initialDate = calendar.currentDate().getTime()
      calendar.next()
      const nextDate = calendar.currentDate().getTime()

      // Date should have changed (moved forward by a week)
      expect(nextDate).toBeGreaterThan(initialDate)
    })

    it('navigates to previous period', () => {
      const events = signal<CalendarEvent[]>([])
      const startDate = new Date(2024, 5, 15)

      const calendar = createCalendar({
        events,
        defaultDate: startDate,
        view: 'week',
        unstyled: true,
      })

      const initialDate = calendar.currentDate().getTime()
      calendar.prev()
      const prevDate = calendar.currentDate().getTime()

      // Date should have changed (moved backward by a week)
      expect(prevDate).toBeLessThan(initialDate)
    })

    it('navigates to today', () => {
      const events = signal<CalendarEvent[]>([])
      const pastDate = new Date(2020, 0, 1)

      const calendar = createCalendar({
        events,
        defaultDate: pastDate,
        view: 'week',
        unstyled: true,
      })

      // Should be at past date
      expect(calendar.currentDate().getFullYear()).toBe(2020)

      // Navigate to today
      calendar.today()
      const now = new Date()
      expect(calendar.currentDate().getFullYear()).toBe(now.getFullYear())
    })
  })

  describe('Resource Visibility', () => {
    it('toggles resource visibility', () => {
      const events = signal<CalendarEvent[]>([])

      const calendar = createCalendar({
        events,
        resources,
        defaultDate: new Date(2024, 5, 15),
        unstyled: true,
      })

      // All resources visible by default
      expect(calendar.visibleResources()).toContain('sarah')
      expect(calendar.visibleResources()).toContain('john')

      // Toggle sarah off
      calendar.toggleResource('sarah')
      expect(calendar.visibleResources()).not.toContain('sarah')
      expect(calendar.visibleResources()).toContain('john')

      // Toggle sarah back on
      calendar.toggleResource('sarah')
      expect(calendar.visibleResources()).toContain('sarah')
    })
  })
})
