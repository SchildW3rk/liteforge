/**
 * @liteforge/calendar - Calendar State & API Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
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

describe('createCalendar', () => {
  describe('initialization', () => {
    it('creates calendar with default options', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({ events, unstyled: true })

      expect(calendar).toBeDefined()
      expect(calendar.Root).toBeTypeOf('function')
      expect(calendar.Toolbar).toBeTypeOf('function')
      expect(calendar.currentView()).toBe('week') // default view
    })

    it('respects initial view option', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({ events, view: 'month', unstyled: true })

      expect(calendar.currentView()).toBe('month')
    })

    it('respects defaultDate option', () => {
      const events = signal<CalendarEvent[]>([])
      const defaultDate = new Date(2024, 5, 15)
      const calendar = createCalendar({ events, defaultDate, unstyled: true })

      const currentDate = calendar.currentDate()
      expect(currentDate.getFullYear()).toBe(2024)
      expect(currentDate.getMonth()).toBe(5)
      expect(currentDate.getDate()).toBe(15)
    })
  })

  describe('navigation', () => {
    let calendar: ReturnType<typeof createCalendar>
    let dateChanges: Date[]

    beforeEach(() => {
      dateChanges = []
      const events = signal<CalendarEvent[]>([])
      calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15), // June 15, 2024
        view: 'week',
        unstyled: true,
        onDateChange: (date) => dateChanges.push(date),
      })
    })

    it('today() navigates to current date', () => {
      calendar.goTo(new Date(2020, 0, 1)) // Go to past date
      calendar.today()

      const today = new Date()
      const current = calendar.currentDate()
      expect(current.getFullYear()).toBe(today.getFullYear())
      expect(current.getMonth()).toBe(today.getMonth())
      expect(current.getDate()).toBe(today.getDate())
    })

    it('next() advances by one day in day view', () => {
      calendar.setView('day')
      const initialDate = calendar.currentDate().getDate()

      calendar.next()

      expect(calendar.currentDate().getDate()).toBe(initialDate + 1)
    })

    it('next() advances by one week in week view', () => {
      calendar.setView('week')
      const initialTime = calendar.currentDate().getTime()

      calendar.next()

      const diff = calendar.currentDate().getTime() - initialTime
      expect(diff).toBe(7 * 24 * 60 * 60 * 1000) // 7 days in ms
    })

    it('next() advances by one month in month view', () => {
      calendar.setView('month')
      const initialMonth = calendar.currentDate().getMonth()

      calendar.next()

      expect(calendar.currentDate().getMonth()).toBe((initialMonth + 1) % 12)
    })

    it('prev() goes back by one day in day view', () => {
      calendar.setView('day')
      const initialDate = calendar.currentDate().getDate()

      calendar.prev()

      expect(calendar.currentDate().getDate()).toBe(initialDate - 1)
    })

    it('prev() goes back by one week in week view', () => {
      calendar.setView('week')
      const initialTime = calendar.currentDate().getTime()

      calendar.prev()

      const diff = initialTime - calendar.currentDate().getTime()
      expect(diff).toBe(7 * 24 * 60 * 60 * 1000)
    })

    it('goTo() navigates to specific date', () => {
      const targetDate = new Date(2025, 2, 20)

      calendar.goTo(targetDate)

      const current = calendar.currentDate()
      expect(current.getFullYear()).toBe(2025)
      expect(current.getMonth()).toBe(2)
      expect(current.getDate()).toBe(20)
    })

    it('triggers onDateChange callback', () => {
      calendar.next()
      calendar.prev()
      calendar.today()

      expect(dateChanges.length).toBe(3)
    })
  })

  describe('view management', () => {
    let calendar: ReturnType<typeof createCalendar>
    let viewChanges: Array<{ view: string }>

    beforeEach(() => {
      viewChanges = []
      const events = signal<CalendarEvent[]>([])
      calendar = createCalendar({
        events,
        view: 'week',
        unstyled: true,
        onViewChange: (view) => viewChanges.push({ view }),
      })
    })

    it('setView() changes current view', () => {
      calendar.setView('month')
      expect(calendar.currentView()).toBe('month')

      calendar.setView('day')
      expect(calendar.currentView()).toBe('day')

      calendar.setView('agenda')
      expect(calendar.currentView()).toBe('agenda')
    })

    it('triggers onViewChange callback', () => {
      calendar.setView('month')
      calendar.setView('day')

      expect(viewChanges.length).toBe(2)
      expect(viewChanges[0]?.view).toBe('month')
      expect(viewChanges[1]?.view).toBe('day')
    })
  })

  describe('date range calculation', () => {
    it('returns day range for day view', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        view: 'day',
        unstyled: true,
      })

      const range = calendar.dateRange()
      expect(range.start.getDate()).toBe(15)
      expect(range.end.getDate()).toBe(15)
    })

    it('returns week range for week view', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 12), // Wednesday
        view: 'week',
        unstyled: true,
      })

      const range = calendar.dateRange()
      // Week should start Monday (weekStart default is 1)
      expect(range.start.getDay()).toBe(1) // Monday
      expect(range.end.getDay()).toBe(0) // Sunday
    })

    it('returns month range for month view', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15), // June
        view: 'month',
        unstyled: true,
      })

      const range = calendar.dateRange()
      // Month view extends to full calendar weeks
      expect(range.start.getDay()).toBe(1) // Starts on Monday
    })
  })

  describe('event management', () => {
    let calendar: ReturnType<typeof createCalendar>
    let eventsSignal: ReturnType<typeof signal<CalendarEvent[]>>

    beforeEach(() => {
      eventsSignal = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
        createEvent('2', new Date(2024, 5, 16, 14, 0), new Date(2024, 5, 16, 15, 0)),
      ])
      calendar = createCalendar({
        events: eventsSignal,
        defaultDate: new Date(2024, 5, 15),
        view: 'week',
        unstyled: true,
      })
    })

    it('events() returns all visible events', () => {
      const events = calendar.events()
      expect(events.length).toBeGreaterThanOrEqual(2)
    })

    it('getEvent() finds event by id', () => {
      const event = calendar.getEvent('1')
      expect(event).toBeDefined()
      expect(event?.title).toBe('Event 1')
    })

    it('getEvent() returns undefined for non-existent id', () => {
      const event = calendar.getEvent('non-existent')
      expect(event).toBeUndefined()
    })

    it('addEvent() adds new event', () => {
      const initialCount = calendar.events().length
      // Add event on June 15 (within the week of June 10-16)
      const newEvent = createEvent(
        'new',
        new Date(2024, 5, 15, 14, 0),
        new Date(2024, 5, 15, 15, 0)
      )

      calendar.addEvent(newEvent)

      expect(calendar.events().length).toBe(initialCount + 1)
      expect(calendar.getEvent('new')).toBeDefined()
    })

    it('updateEvent() modifies existing event', () => {
      const newEvent = createEvent(
        'update-test',
        new Date(2024, 5, 15, 10, 0),
        new Date(2024, 5, 15, 11, 0)
      )
      calendar.addEvent(newEvent)

      calendar.updateEvent('update-test', { title: 'Updated Title' })

      const updated = calendar.getEvent('update-test')
      expect(updated?.title).toBe('Updated Title')
    })

    it('removeEvent() removes event by id', () => {
      const newEvent = createEvent(
        'remove-test',
        new Date(2024, 5, 15, 10, 0),
        new Date(2024, 5, 15, 11, 0)
      )
      calendar.addEvent(newEvent)
      expect(calendar.getEvent('remove-test')).toBeDefined()

      calendar.removeEvent('remove-test')

      expect(calendar.getEvent('remove-test')).toBeUndefined()
    })
  })

  describe('resource management', () => {
    let calendar: ReturnType<typeof createCalendar>
    const resources: Resource[] = [
      { id: 'room-1', name: 'Room 1' },
      { id: 'room-2', name: 'Room 2' },
      { id: 'room-3', name: 'Room 3' },
    ]

    beforeEach(() => {
      const events = signal<CalendarEvent[]>([])
      calendar = createCalendar({
        events,
        resources,
        unstyled: true,
      })
    })

    it('resources() returns all resources', () => {
      expect(calendar.resources()).toHaveLength(3)
    })

    it('visibleResources() returns all by default', () => {
      expect(calendar.visibleResources()).toHaveLength(3)
    })

    it('hideResource() hides a resource', () => {
      calendar.hideResource('room-2')

      const visible = calendar.visibleResources()
      expect(visible).not.toContain('room-2')
      expect(visible).toContain('room-1')
      expect(visible).toContain('room-3')
    })

    it('showResource() shows a hidden resource', () => {
      calendar.hideResource('room-2')
      calendar.showResource('room-2')

      expect(calendar.visibleResources()).toContain('room-2')
    })

    it('toggleResource() toggles visibility', () => {
      calendar.toggleResource('room-1')
      expect(calendar.visibleResources()).not.toContain('room-1')

      calendar.toggleResource('room-1')
      expect(calendar.visibleResources()).toContain('room-1')
    })

    it('events() filters by resource visibility', () => {
      // Create events with different resourceIds
      const eventsSignal = signal<CalendarEvent[]>([
        createEvent('evt-1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0), {
          resourceId: 'room-1',
        }),
        createEvent('evt-2', new Date(2024, 5, 15, 11, 0), new Date(2024, 5, 15, 12, 0), {
          resourceId: 'room-2',
        }),
        createEvent('evt-3', new Date(2024, 5, 15, 12, 0), new Date(2024, 5, 15, 13, 0), {
          resourceId: 'room-3',
        }),
        createEvent('evt-4', new Date(2024, 5, 15, 13, 0), new Date(2024, 5, 15, 14, 0)),
        // No resourceId - should always be visible
      ])

      const calendarWithEvents = createCalendar({
        events: eventsSignal,
        resources,
        defaultDate: new Date(2024, 5, 15),
        unstyled: true,
      })

      // All events visible initially
      expect(calendarWithEvents.events()).toHaveLength(4)

      // Hide room-1
      calendarWithEvents.hideResource('room-1')
      const visibleAfterHide = calendarWithEvents.events()
      expect(visibleAfterHide).toHaveLength(3)
      expect(visibleAfterHide.find((e) => e.id === 'evt-1')).toBeUndefined()
      expect(visibleAfterHide.find((e) => e.id === 'evt-2')).toBeDefined()
      expect(visibleAfterHide.find((e) => e.id === 'evt-4')).toBeDefined() // No resourceId

      // Show room-1 again
      calendarWithEvents.showResource('room-1')
      expect(calendarWithEvents.events()).toHaveLength(4)
    })
  })

  describe('selection state', () => {
    let calendar: ReturnType<typeof createCalendar>
    let eventClicks: CalendarEvent[]
    let slotClicks: Array<{ start: Date; end: Date; resourceId: string | undefined }>

    beforeEach(() => {
      eventClicks = []
      slotClicks = []
      const events = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
      ])
      calendar = createCalendar({
        events,
        selectable: true,
        unstyled: true,
        onEventClick: (event) => eventClicks.push(event),
        onSlotClick: (start, end, resourceId) =>
          slotClicks.push({ start, end, resourceId }),
      })
    })

    it('selectedEvent() returns null initially', () => {
      expect(calendar.selectedEvent()).toBeNull()
    })

    it('selectedSlot() returns null initially', () => {
      expect(calendar.selectedSlot()).toBeNull()
    })
  })

  describe('recurring events', () => {
    it('expands recurring events within range', () => {
      const events = signal<CalendarEvent[]>([
        {
          id: 'recurring',
          title: 'Daily Standup',
          start: new Date(2024, 5, 10, 9, 0),
          end: new Date(2024, 5, 10, 9, 30),
          recurring: { frequency: 'daily', count: 7 },
        },
      ])
      const calendar = createCalendar({
        events,
        defaultDate: new Date(2024, 5, 15),
        view: 'week',
        unstyled: true,
      })

      const visibleEvents = calendar.events()

      // Should have multiple occurrences within the week
      expect(visibleEvents.length).toBeGreaterThan(1)
    })
  })

  describe('time config', () => {
    it('uses default time config values', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({
        events,
        unstyled: true,
      })

      // Can't directly access config, but calendar should work with defaults
      expect(calendar).toBeDefined()
    })

    it('accepts custom time config', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({
        events,
        time: {
          slotDuration: 15,
          dayStart: 8,
          dayEnd: 18,
          weekStart: 0, // Sunday
          hiddenDays: [0, 6], // Hide weekends
          nowIndicator: false,
        },
        unstyled: true,
      })

      expect(calendar).toBeDefined()
    })
  })

  describe('callbacks', () => {
    it('calls onEventClick when event is clicked', () => {
      const clicks: CalendarEvent[] = []
      const events = signal<CalendarEvent[]>([
        createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
      ])

      createCalendar({
        events,
        onEventClick: (event) => clicks.push(event),
        unstyled: true,
      })

      // Note: Actual click simulation would require DOM, this just tests setup
      expect(clicks).toHaveLength(0) // No clicks yet
    })
  })

  describe('Root component', () => {
    it('returns a Node', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({ events, unstyled: true })

      const root = calendar.Root()

      expect(root).toBeDefined()
      expect(root instanceof Node).toBe(true)
    })

    it('has correct class name', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({ events, unstyled: true })

      const root = calendar.Root() as HTMLElement

      expect(root.className).toBe('lf-cal')
    })

    it('uses custom class from classes option', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({
        events,
        classes: { root: 'my-calendar' },
        unstyled: true,
      })

      const root = calendar.Root() as HTMLElement

      expect(root.className).toBe('my-calendar')
    })
  })

  describe('Toolbar component', () => {
    it('returns a Node', () => {
      const events = signal<CalendarEvent[]>([])
      const calendar = createCalendar({ events, unstyled: true })

      const toolbar = calendar.Toolbar()

      expect(toolbar).toBeDefined()
      expect(toolbar instanceof Node).toBe(true)
    })
  })
})
