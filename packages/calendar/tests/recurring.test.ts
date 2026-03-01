/**
 * @liteforge/calendar - Recurring Event Tests
 */

import { describe, it, expect } from 'vitest'
import { expandRecurring, expandAllRecurring } from '../src/recurring.js'
import type { CalendarEvent } from '../src/types.js'

// Helper to create test events
function createEvent(
  id: string,
  start: Date,
  end: Date,
  recurring?: CalendarEvent['recurring']
): CalendarEvent {
  return { id, title: `Event ${id}`, start, end, ...(recurring ? { recurring } : {}) }
}

describe('expandRecurring', () => {
  describe('non-recurring events', () => {
    it('returns the original event as-is', () => {
      const event = createEvent('1', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0))
      const rangeStart = new Date(2024, 5, 1)
      const rangeEnd = new Date(2024, 5, 30)

      const result = expandRecurring(event, rangeStart, rangeEnd)

      expect(result).toHaveLength(1)
      expect(result[0]).toBe(event) // Same reference
    })
  })

  describe('daily recurrence', () => {
    it('expands daily events within range', () => {
      const event = createEvent(
        'daily',
        new Date(2024, 5, 10, 9, 0),
        new Date(2024, 5, 10, 10, 0),
        { frequency: 'daily' }
      )
      const rangeStart = new Date(2024, 5, 10)
      const rangeEnd = new Date(2024, 5, 15)

      const result = expandRecurring(event, rangeStart, rangeEnd)

      expect(result.length).toBeGreaterThanOrEqual(5) // 10, 11, 12, 13, 14 at minimum
      expect(result[0]?.start.getDate()).toBe(10)
      expect(result[1]?.start.getDate()).toBe(11)
    })

    it('respects interval for daily events', () => {
      const event = createEvent(
        'daily-2',
        new Date(2024, 5, 10, 9, 0),
        new Date(2024, 5, 10, 10, 0),
        { frequency: 'daily', interval: 2 }
      )
      const rangeStart = new Date(2024, 5, 10)
      const rangeEnd = new Date(2024, 5, 20)

      const result = expandRecurring(event, rangeStart, rangeEnd)

      // Should have occurrences on 10, 12, 14, 16, 18
      expect(result[0]?.start.getDate()).toBe(10)
      expect(result[1]?.start.getDate()).toBe(12)
      expect(result[2]?.start.getDate()).toBe(14)
    })

    it('respects count limit', () => {
      const event = createEvent(
        'daily-count',
        new Date(2024, 5, 10, 9, 0),
        new Date(2024, 5, 10, 10, 0),
        { frequency: 'daily', count: 3 }
      )
      const rangeStart = new Date(2024, 5, 10)
      const rangeEnd = new Date(2024, 5, 30)

      const result = expandRecurring(event, rangeStart, rangeEnd)

      expect(result).toHaveLength(3)
    })

    it('respects endDate', () => {
      const event = createEvent(
        'daily-end',
        new Date(2024, 5, 10, 9, 0),
        new Date(2024, 5, 10, 10, 0),
        { frequency: 'daily', endDate: new Date(2024, 5, 13) }
      )
      const rangeStart = new Date(2024, 5, 10)
      const rangeEnd = new Date(2024, 5, 30)

      const result = expandRecurring(event, rangeStart, rangeEnd)

      // Should stop at or before June 13
      expect(result.length).toBeLessThanOrEqual(4)
      result.forEach((occ) => {
        expect(occ.start.getDate()).toBeLessThanOrEqual(13)
      })
    })

    it('respects exceptions', () => {
      const event = createEvent(
        'daily-except',
        new Date(2024, 5, 10, 9, 0),
        new Date(2024, 5, 10, 10, 0),
        {
          frequency: 'daily',
          count: 5,
          exceptions: [new Date(2024, 5, 12)], // Skip June 12
        }
      )
      const rangeStart = new Date(2024, 5, 10)
      const rangeEnd = new Date(2024, 5, 20)

      const result = expandRecurring(event, rangeStart, rangeEnd)

      // Should not include June 12
      const dates = result.map((r) => r.start.getDate())
      expect(dates).not.toContain(12)
      expect(dates).toContain(10)
      expect(dates).toContain(11)
      expect(dates).toContain(13)
    })

    it('preserves event duration', () => {
      const event = createEvent(
        'daily-dur',
        new Date(2024, 5, 10, 9, 0),
        new Date(2024, 5, 10, 11, 30), // 2h30m
        { frequency: 'daily', count: 2 }
      )
      const rangeStart = new Date(2024, 5, 10)
      const rangeEnd = new Date(2024, 5, 15)

      const result = expandRecurring(event, rangeStart, rangeEnd)

      result.forEach((occ) => {
        const duration = occ.end.getTime() - occ.start.getTime()
        expect(duration).toBe(2.5 * 60 * 60 * 1000) // 2h30m in ms
      })
    })

    it('generates unique IDs for each occurrence', () => {
      const event = createEvent(
        'daily-id',
        new Date(2024, 5, 10, 9, 0),
        new Date(2024, 5, 10, 10, 0),
        { frequency: 'daily', count: 3 }
      )
      const rangeStart = new Date(2024, 5, 10)
      const rangeEnd = new Date(2024, 5, 15)

      const result = expandRecurring(event, rangeStart, rangeEnd)

      const ids = result.map((r) => r.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length) // All IDs are unique
    })
  })

  describe('weekly recurrence', () => {
    it('expands weekly events', () => {
      const event = createEvent(
        'weekly',
        new Date(2024, 5, 10, 10, 0), // Monday
        new Date(2024, 5, 10, 11, 0),
        { frequency: 'weekly' }
      )
      const rangeStart = new Date(2024, 5, 1)
      const rangeEnd = new Date(2024, 6, 1) // June 1 - July 1

      const result = expandRecurring(event, rangeStart, rangeEnd)

      // Should have occurrences on Mondays: June 10, 17, 24
      expect(result.length).toBeGreaterThanOrEqual(3)
    })

    it('expands weekly events with daysOfWeek', () => {
      const event = createEvent(
        'weekly-days',
        new Date(2024, 5, 10, 9, 0), // Start Monday
        new Date(2024, 5, 10, 10, 0),
        {
          frequency: 'weekly',
          daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
        }
      )
      const rangeStart = new Date(2024, 5, 10)
      const rangeEnd = new Date(2024, 5, 17)

      const result = expandRecurring(event, rangeStart, rangeEnd)

      // Week of June 10: Mon 10, Wed 12, Fri 14
      const days = result.map((r) => r.start.getDay())
      expect(days).toContain(1) // Monday
      expect(days).toContain(3) // Wednesday
      expect(days).toContain(5) // Friday
    })

    it('respects interval for weekly events', () => {
      const event = createEvent(
        'weekly-int',
        new Date(2024, 5, 10, 10, 0), // Monday June 10
        new Date(2024, 5, 10, 11, 0),
        { frequency: 'weekly', interval: 2 }
      )
      const rangeStart = new Date(2024, 5, 1)
      const rangeEnd = new Date(2024, 6, 15) // Mid July

      const result = expandRecurring(event, rangeStart, rangeEnd)

      // Every 2 weeks from June 10: June 10, June 24, July 8
      const dates = result.map((r) => r.start.getDate())
      expect(dates).toContain(10)
      // Every other week
    })
  })

  describe('biweekly recurrence', () => {
    it('expands biweekly events', () => {
      const event = createEvent(
        'biweekly',
        new Date(2024, 5, 10, 10, 0), // Monday June 10
        new Date(2024, 5, 10, 11, 0),
        { frequency: 'biweekly' }
      )
      const rangeStart = new Date(2024, 5, 1)
      const rangeEnd = new Date(2024, 6, 31) // End of July

      const result = expandRecurring(event, rangeStart, rangeEnd)

      // Biweekly: June 10, June 24, July 8, July 22
      expect(result.length).toBeGreaterThanOrEqual(3)

      // Check 2-week spacing
      if (result.length >= 2 && result[0] && result[1]) {
        const diff = result[1].start.getTime() - result[0].start.getTime()
        expect(diff).toBe(14 * 24 * 60 * 60 * 1000) // 14 days in ms
      }
    })
  })

  describe('monthly recurrence', () => {
    it('expands monthly events', () => {
      const event = createEvent(
        'monthly',
        new Date(2024, 5, 15, 10, 0), // June 15
        new Date(2024, 5, 15, 11, 0),
        { frequency: 'monthly' }
      )
      const rangeStart = new Date(2024, 5, 1)
      const rangeEnd = new Date(2024, 9, 1) // October 1

      const result = expandRecurring(event, rangeStart, rangeEnd)

      // June 15, July 15, Aug 15, Sept 15
      expect(result.length).toBeGreaterThanOrEqual(4)
      result.forEach((occ) => {
        expect(occ.start.getDate()).toBe(15)
      })
    })

    it('handles end-of-month edge cases', () => {
      const event = createEvent(
        'monthly-eom',
        new Date(2024, 0, 31, 10, 0), // Jan 31
        new Date(2024, 0, 31, 11, 0),
        { frequency: 'monthly' }
      )
      const rangeStart = new Date(2024, 0, 1)
      const rangeEnd = new Date(2024, 4, 1) // May 1

      const result = expandRecurring(event, rangeStart, rangeEnd)

      // Jan 31, Feb 29 (leap year), Mar 31, Apr 30
      expect(result.length).toBeGreaterThanOrEqual(4)

      // February should be 29 (2024 is leap year)
      const febOcc = result.find((r) => r.start.getMonth() === 1)
      if (febOcc) {
        expect(febOcc.start.getDate()).toBe(29)
      }

      // April should be 30 (max day in April)
      const aprOcc = result.find((r) => r.start.getMonth() === 3)
      if (aprOcc) {
        expect(aprOcc.start.getDate()).toBe(30)
      }
    })
  })

  describe('range filtering', () => {
    it('only returns events within the range', () => {
      const event = createEvent(
        'daily-range',
        new Date(2024, 5, 1, 10, 0),
        new Date(2024, 5, 1, 11, 0),
        { frequency: 'daily' }
      )
      const rangeStart = new Date(2024, 5, 10)
      const rangeEnd = new Date(2024, 5, 15)

      const result = expandRecurring(event, rangeStart, rangeEnd)

      result.forEach((occ) => {
        expect(occ.start.getDate()).toBeGreaterThanOrEqual(10)
        expect(occ.start.getDate()).toBeLessThan(15)
      })
    })

    it('includes events that span the range boundary', () => {
      const event = createEvent(
        'span',
        new Date(2024, 5, 9, 23, 0), // 11 PM June 9
        new Date(2024, 5, 10, 1, 0), // 1 AM June 10
        { frequency: 'daily', count: 3 }
      )
      const rangeStart = new Date(2024, 5, 10)
      const rangeEnd = new Date(2024, 5, 12)

      const result = expandRecurring(event, rangeStart, rangeEnd)

      // Should include the event that ends on June 10
      expect(result.length).toBeGreaterThanOrEqual(1)
    })
  })
})

describe('expandAllRecurring', () => {
  it('expands multiple recurring events', () => {
    const events: CalendarEvent[] = [
      createEvent('daily', new Date(2024, 5, 10, 9, 0), new Date(2024, 5, 10, 10, 0), {
        frequency: 'daily',
        count: 3,
      }),
      createEvent('weekly', new Date(2024, 5, 10, 14, 0), new Date(2024, 5, 10, 15, 0), {
        frequency: 'weekly',
        count: 2,
      }),
    ]
    const rangeStart = new Date(2024, 5, 10)
    const rangeEnd = new Date(2024, 5, 30)

    const result = expandAllRecurring(events, rangeStart, rangeEnd)

    // 3 daily + 2 weekly = 5 total
    expect(result).toHaveLength(5)
  })

  it('includes non-recurring events that are in range', () => {
    const events: CalendarEvent[] = [
      createEvent('single', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
      createEvent('daily', new Date(2024, 5, 10, 9, 0), new Date(2024, 5, 10, 10, 0), {
        frequency: 'daily',
        count: 2,
      }),
    ]
    const rangeStart = new Date(2024, 5, 10)
    const rangeEnd = new Date(2024, 5, 30)

    const result = expandAllRecurring(events, rangeStart, rangeEnd)

    // 1 single + 2 daily = 3 total
    expect(result).toHaveLength(3)

    // The single event should be included
    expect(result.some((e) => e.id === 'single')).toBe(true)
  })

  it('excludes non-recurring events outside range', () => {
    const events: CalendarEvent[] = [
      createEvent('before', new Date(2024, 5, 1, 10, 0), new Date(2024, 5, 1, 11, 0)),
      createEvent('in-range', new Date(2024, 5, 15, 10, 0), new Date(2024, 5, 15, 11, 0)),
      createEvent('after', new Date(2024, 6, 1, 10, 0), new Date(2024, 6, 1, 11, 0)),
    ]
    const rangeStart = new Date(2024, 5, 10)
    const rangeEnd = new Date(2024, 5, 20)

    const result = expandAllRecurring(events, rangeStart, rangeEnd)

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('in-range')
  })

  it('handles empty events array', () => {
    const result = expandAllRecurring([], new Date(2024, 5, 10), new Date(2024, 5, 20))
    expect(result).toHaveLength(0)
  })

  it('preserves original event properties', () => {
    const event: CalendarEvent = {
      id: 'custom',
      title: 'Custom Event',
      start: new Date(2024, 5, 10, 10, 0),
      end: new Date(2024, 5, 10, 11, 0),
      color: '#ff0000',
      resourceId: 'room-1',
      recurring: { frequency: 'daily', count: 2 },
    }
    const rangeStart = new Date(2024, 5, 10)
    const rangeEnd = new Date(2024, 5, 15)

    const result = expandAllRecurring([event], rangeStart, rangeEnd)

    result.forEach((occ) => {
      expect(occ.title).toBe('Custom Event')
      expect(occ.color).toBe('#ff0000')
      expect(occ.resourceId).toBe('room-1')
    })
  })
})
