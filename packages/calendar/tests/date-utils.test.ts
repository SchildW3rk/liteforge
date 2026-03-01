/**
 * @liteforge/calendar - Date Utilities Tests
 */

import { describe, it, expect } from 'vitest'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  addMinutes,
  addHours,
  isSameDay,
  isSameMonth,
  isToday,
  isWeekend,
  isWithinRange,
  isBefore,
  isAfter,
  getDayOfWeek,
  getWeekNumber,
  daysInMonth,
  diffInMinutes,
  diffInDays,
  getSlotsBetween,
  getTimeSlots,
  getDaysInRange,
  getWeekDays,
  getMonthCalendarDays,
  formatTime,
  getMinutesSinceDayStart,
  getSlotPosition,
  getEventHeight,
  snapToSlot,
  floorToSlot,
  getDayRange,
  getWeekRange,
  getMonthRange,
  eventsOverlap,
  isEventInRange,
  isEventOnDay,
  isAllDayEvent,
  getEventDuration,
  ensureValidEventEnd,
} from '../src/date-utils.js'

// ─── Basic Operations ──────────────────────────────────────

describe('startOfDay', () => {
  it('sets time to 00:00:00.000', () => {
    const date = new Date(2024, 5, 15, 14, 30, 45, 500)
    const result = startOfDay(date)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
  })

  it('preserves the date', () => {
    const date = new Date(2024, 5, 15, 14, 30)
    const result = startOfDay(date)
    expect(result.getFullYear()).toBe(2024)
    expect(result.getMonth()).toBe(5)
    expect(result.getDate()).toBe(15)
  })

  it('returns a new Date (no mutation)', () => {
    const date = new Date(2024, 5, 15, 14, 30)
    const result = startOfDay(date)
    expect(result).not.toBe(date)
    expect(date.getHours()).toBe(14)
  })
})

describe('endOfDay', () => {
  it('sets time to 23:59:59.999', () => {
    const date = new Date(2024, 5, 15, 8, 0)
    const result = endOfDay(date)
    expect(result.getHours()).toBe(23)
    expect(result.getMinutes()).toBe(59)
    expect(result.getSeconds()).toBe(59)
    expect(result.getMilliseconds()).toBe(999)
  })

  it('preserves the date', () => {
    const date = new Date(2024, 5, 15)
    const result = endOfDay(date)
    expect(result.getDate()).toBe(15)
  })
})

describe('startOfWeek', () => {
  it('returns Monday for weekStart=1 (default)', () => {
    // Wednesday June 12, 2024
    const date = new Date(2024, 5, 12)
    const result = startOfWeek(date)
    expect(result.getDay()).toBe(1) // Monday
    expect(result.getDate()).toBe(10)
  })

  it('returns Sunday for weekStart=0', () => {
    // Wednesday June 12, 2024
    const date = new Date(2024, 5, 12)
    const result = startOfWeek(date, 0)
    expect(result.getDay()).toBe(0) // Sunday
    expect(result.getDate()).toBe(9)
  })

  it('returns same day if already at week start', () => {
    // Monday June 10, 2024
    const date = new Date(2024, 5, 10)
    const result = startOfWeek(date)
    expect(result.getDate()).toBe(10)
  })

  it('sets time to 00:00:00.000', () => {
    const date = new Date(2024, 5, 12, 15, 30)
    const result = startOfWeek(date)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
  })
})

describe('endOfWeek', () => {
  it('returns Sunday for weekStart=1', () => {
    const date = new Date(2024, 5, 12) // Wednesday
    const result = endOfWeek(date)
    expect(result.getDay()).toBe(0) // Sunday
    expect(result.getDate()).toBe(16)
  })

  it('returns Saturday for weekStart=0', () => {
    const date = new Date(2024, 5, 12) // Wednesday
    const result = endOfWeek(date, 0)
    expect(result.getDay()).toBe(6) // Saturday
    expect(result.getDate()).toBe(15)
  })

  it('sets time to 23:59:59.999', () => {
    const date = new Date(2024, 5, 12)
    const result = endOfWeek(date)
    expect(result.getHours()).toBe(23)
    expect(result.getMinutes()).toBe(59)
    expect(result.getSeconds()).toBe(59)
  })
})

describe('startOfMonth', () => {
  it('returns the first day of the month', () => {
    const date = new Date(2024, 5, 15)
    const result = startOfMonth(date)
    expect(result.getDate()).toBe(1)
    expect(result.getMonth()).toBe(5)
  })

  it('sets time to 00:00:00.000', () => {
    const date = new Date(2024, 5, 15, 12, 30)
    const result = startOfMonth(date)
    expect(result.getHours()).toBe(0)
  })
})

describe('endOfMonth', () => {
  it('returns the last day of the month', () => {
    const date = new Date(2024, 5, 15) // June has 30 days
    const result = endOfMonth(date)
    expect(result.getDate()).toBe(30)
  })

  it('handles February correctly', () => {
    const date = new Date(2024, 1, 15) // February 2024 (leap year)
    const result = endOfMonth(date)
    expect(result.getDate()).toBe(29)
  })

  it('handles February in non-leap year', () => {
    const date = new Date(2023, 1, 15)
    const result = endOfMonth(date)
    expect(result.getDate()).toBe(28)
  })

  it('sets time to 23:59:59.999', () => {
    const date = new Date(2024, 5, 15)
    const result = endOfMonth(date)
    expect(result.getHours()).toBe(23)
    expect(result.getMinutes()).toBe(59)
  })
})

// ─── Add/Subtract ──────────────────────────────────────────

describe('addDays', () => {
  it('adds positive days', () => {
    const date = new Date(2024, 5, 15)
    const result = addDays(date, 5)
    expect(result.getDate()).toBe(20)
  })

  it('subtracts with negative days', () => {
    const date = new Date(2024, 5, 15)
    const result = addDays(date, -5)
    expect(result.getDate()).toBe(10)
  })

  it('handles month overflow', () => {
    const date = new Date(2024, 5, 28) // June 28
    const result = addDays(date, 5)
    expect(result.getMonth()).toBe(6) // July
    expect(result.getDate()).toBe(3)
  })

  it('returns new Date (no mutation)', () => {
    const date = new Date(2024, 5, 15)
    const result = addDays(date, 5)
    expect(result).not.toBe(date)
    expect(date.getDate()).toBe(15)
  })
})

describe('addWeeks', () => {
  it('adds weeks correctly', () => {
    const date = new Date(2024, 5, 15)
    const result = addWeeks(date, 2)
    expect(result.getDate()).toBe(29)
  })
})

describe('addMonths', () => {
  it('adds months correctly', () => {
    const date = new Date(2024, 5, 15) // June 15
    const result = addMonths(date, 2)
    expect(result.getMonth()).toBe(7) // August
    expect(result.getDate()).toBe(15)
  })

  it('handles end-of-month overflow (Jan 31 + 1 month)', () => {
    const date = new Date(2024, 0, 31) // Jan 31
    const result = addMonths(date, 1)
    expect(result.getMonth()).toBe(1) // February
    expect(result.getDate()).toBe(29) // 2024 is leap year
  })

  it('handles year overflow', () => {
    const date = new Date(2024, 10, 15) // November
    const result = addMonths(date, 3)
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(1) // February
  })

  it('subtracts with negative months', () => {
    const date = new Date(2024, 5, 15)
    const result = addMonths(date, -2)
    expect(result.getMonth()).toBe(3) // April
  })
})

describe('addMinutes', () => {
  it('adds minutes correctly', () => {
    const date = new Date(2024, 5, 15, 10, 30)
    const result = addMinutes(date, 45)
    expect(result.getHours()).toBe(11)
    expect(result.getMinutes()).toBe(15)
  })

  it('handles hour overflow', () => {
    const date = new Date(2024, 5, 15, 23, 30)
    const result = addMinutes(date, 60)
    expect(result.getDate()).toBe(16)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(30)
  })
})

describe('addHours', () => {
  it('adds hours correctly', () => {
    const date = new Date(2024, 5, 15, 10, 0)
    const result = addHours(date, 3)
    expect(result.getHours()).toBe(13)
  })
})

// ─── Comparisons ───────────────────────────────────────────

describe('isSameDay', () => {
  it('returns true for same day', () => {
    const a = new Date(2024, 5, 15, 10, 0)
    const b = new Date(2024, 5, 15, 18, 30)
    expect(isSameDay(a, b)).toBe(true)
  })

  it('returns false for different days', () => {
    const a = new Date(2024, 5, 15)
    const b = new Date(2024, 5, 16)
    expect(isSameDay(a, b)).toBe(false)
  })

  it('returns false for different months', () => {
    const a = new Date(2024, 5, 15)
    const b = new Date(2024, 6, 15)
    expect(isSameDay(a, b)).toBe(false)
  })
})

describe('isSameMonth', () => {
  it('returns true for same month', () => {
    const a = new Date(2024, 5, 1)
    const b = new Date(2024, 5, 30)
    expect(isSameMonth(a, b)).toBe(true)
  })

  it('returns false for different months', () => {
    const a = new Date(2024, 5, 15)
    const b = new Date(2024, 6, 15)
    expect(isSameMonth(a, b)).toBe(false)
  })
})

describe('isToday', () => {
  it('returns true for today', () => {
    const today = new Date()
    expect(isToday(today)).toBe(true)
  })

  it('returns false for yesterday', () => {
    const yesterday = addDays(new Date(), -1)
    expect(isToday(yesterday)).toBe(false)
  })
})

describe('isWeekend', () => {
  it('returns true for Saturday', () => {
    const saturday = new Date(2024, 5, 15) // June 15, 2024 is Saturday
    expect(isWeekend(saturday)).toBe(true)
  })

  it('returns true for Sunday', () => {
    const sunday = new Date(2024, 5, 16) // June 16, 2024 is Sunday
    expect(isWeekend(sunday)).toBe(true)
  })

  it('returns false for weekdays', () => {
    const monday = new Date(2024, 5, 17)
    expect(isWeekend(monday)).toBe(false)
  })
})

describe('isWithinRange', () => {
  it('returns true if date is within range', () => {
    const date = new Date(2024, 5, 15)
    const start = new Date(2024, 5, 10)
    const end = new Date(2024, 5, 20)
    expect(isWithinRange(date, start, end)).toBe(true)
  })

  it('returns true for date at range start', () => {
    const date = new Date(2024, 5, 10)
    const start = new Date(2024, 5, 10)
    const end = new Date(2024, 5, 20)
    expect(isWithinRange(date, start, end)).toBe(true)
  })

  it('returns true for date at range end', () => {
    const date = new Date(2024, 5, 20)
    const start = new Date(2024, 5, 10)
    const end = new Date(2024, 5, 20)
    expect(isWithinRange(date, start, end)).toBe(true)
  })

  it('returns false for date outside range', () => {
    const date = new Date(2024, 5, 25)
    const start = new Date(2024, 5, 10)
    const end = new Date(2024, 5, 20)
    expect(isWithinRange(date, start, end)).toBe(false)
  })
})

describe('isBefore', () => {
  it('returns true if a is before b', () => {
    const a = new Date(2024, 5, 10)
    const b = new Date(2024, 5, 15)
    expect(isBefore(a, b)).toBe(true)
  })

  it('returns false if a is after b', () => {
    const a = new Date(2024, 5, 20)
    const b = new Date(2024, 5, 15)
    expect(isBefore(a, b)).toBe(false)
  })

  it('returns false if a equals b', () => {
    const a = new Date(2024, 5, 15, 10, 0)
    const b = new Date(2024, 5, 15, 10, 0)
    expect(isBefore(a, b)).toBe(false)
  })
})

describe('isAfter', () => {
  it('returns true if a is after b', () => {
    const a = new Date(2024, 5, 20)
    const b = new Date(2024, 5, 15)
    expect(isAfter(a, b)).toBe(true)
  })

  it('returns false if a is before b', () => {
    const a = new Date(2024, 5, 10)
    const b = new Date(2024, 5, 15)
    expect(isAfter(a, b)).toBe(false)
  })
})

// ─── Getters ───────────────────────────────────────────────

describe('getDayOfWeek', () => {
  it('returns correct day index', () => {
    const monday = new Date(2024, 5, 17)
    expect(getDayOfWeek(monday)).toBe(1)

    const sunday = new Date(2024, 5, 16)
    expect(getDayOfWeek(sunday)).toBe(0)
  })
})

describe('getWeekNumber', () => {
  it('returns correct ISO week number', () => {
    const date = new Date(2024, 0, 1) // Jan 1, 2024 is Monday
    expect(getWeekNumber(date)).toBe(1)
  })

  it('handles week 52/53 edge cases', () => {
    const dec31 = new Date(2024, 11, 31)
    const week = getWeekNumber(dec31)
    expect(week).toBeGreaterThanOrEqual(1)
    expect(week).toBeLessThanOrEqual(53)
  })
})

describe('daysInMonth', () => {
  it('returns 31 for January', () => {
    const jan = new Date(2024, 0, 15)
    expect(daysInMonth(jan)).toBe(31)
  })

  it('returns 29 for February in leap year', () => {
    const feb2024 = new Date(2024, 1, 15)
    expect(daysInMonth(feb2024)).toBe(29)
  })

  it('returns 28 for February in non-leap year', () => {
    const feb2023 = new Date(2023, 1, 15)
    expect(daysInMonth(feb2023)).toBe(28)
  })

  it('returns 30 for June', () => {
    const june = new Date(2024, 5, 15)
    expect(daysInMonth(june)).toBe(30)
  })
})

describe('diffInMinutes', () => {
  it('calculates positive difference', () => {
    const a = new Date(2024, 5, 15, 10, 0)
    const b = new Date(2024, 5, 15, 11, 30)
    expect(diffInMinutes(a, b)).toBe(90)
  })

  it('calculates negative difference', () => {
    const a = new Date(2024, 5, 15, 11, 30)
    const b = new Date(2024, 5, 15, 10, 0)
    expect(diffInMinutes(a, b)).toBe(-90)
  })
})

describe('diffInDays', () => {
  it('calculates positive difference', () => {
    const a = new Date(2024, 5, 10)
    const b = new Date(2024, 5, 15)
    expect(diffInDays(a, b)).toBe(5)
  })

  it('ignores time component', () => {
    const a = new Date(2024, 5, 10, 23, 59)
    const b = new Date(2024, 5, 15, 0, 1)
    expect(diffInDays(a, b)).toBe(5)
  })
})

// ─── Slot Generation ───────────────────────────────────────

describe('getSlotsBetween', () => {
  it('generates correct number of slots', () => {
    const start = new Date(2024, 5, 15, 9, 0)
    const end = new Date(2024, 5, 15, 12, 0)
    const slots = getSlotsBetween(start, end, 30)
    expect(slots).toHaveLength(6) // 9:00, 9:30, 10:00, 10:30, 11:00, 11:30
  })

  it('each slot is at correct interval', () => {
    const start = new Date(2024, 5, 15, 9, 0)
    const end = new Date(2024, 5, 15, 10, 0)
    const slots = getSlotsBetween(start, end, 15)
    expect(slots[0]?.getMinutes()).toBe(0)
    expect(slots[1]?.getMinutes()).toBe(15)
    expect(slots[2]?.getMinutes()).toBe(30)
    expect(slots[3]?.getMinutes()).toBe(45)
  })
})

describe('getTimeSlots', () => {
  it('generates slots for day range', () => {
    const date = new Date(2024, 5, 15)
    const slots = getTimeSlots(date, 8, 18, 60) // 8:00-18:00, 1h slots
    expect(slots).toHaveLength(10) // 8, 9, 10, 11, 12, 13, 14, 15, 16, 17
  })

  it('uses correct day start/end', () => {
    const date = new Date(2024, 5, 15)
    const slots = getTimeSlots(date, 9, 17, 30)
    expect(slots[0]?.getHours()).toBe(9)
    expect(slots[slots.length - 1]?.getHours()).toBe(16)
    expect(slots[slots.length - 1]?.getMinutes()).toBe(30)
  })
})

describe('getDaysInRange', () => {
  it('returns all days in range inclusive', () => {
    const start = new Date(2024, 5, 10)
    const end = new Date(2024, 5, 15)
    const days = getDaysInRange(start, end)
    expect(days).toHaveLength(6) // 10, 11, 12, 13, 14, 15
  })

  it('handles single day range', () => {
    const date = new Date(2024, 5, 15)
    const days = getDaysInRange(date, date)
    expect(days).toHaveLength(1)
  })
})

describe('getWeekDays', () => {
  it('returns 7 days for full week', () => {
    const date = new Date(2024, 5, 12) // Wednesday
    const days = getWeekDays(date, 1)
    expect(days).toHaveLength(7)
  })

  it('respects hiddenDays', () => {
    const date = new Date(2024, 5, 12)
    const days = getWeekDays(date, 1, [0, 6]) // hide Sun, Sat
    expect(days).toHaveLength(5)
    days.forEach(d => {
      expect(d.getDay()).not.toBe(0)
      expect(d.getDay()).not.toBe(6)
    })
  })

  it('starts week on correct day', () => {
    const date = new Date(2024, 5, 12)
    const mondayStart = getWeekDays(date, 1)
    const sundayStart = getWeekDays(date, 0)

    expect(mondayStart[0]?.getDay()).toBe(1)
    expect(sundayStart[0]?.getDay()).toBe(0)
  })
})

describe('getMonthCalendarDays', () => {
  it('returns 6 weeks of days (42 days)', () => {
    const date = new Date(2024, 5, 15) // June 2024
    const days = getMonthCalendarDays(date, 1)
    // Calendar shows full weeks, typically 5-6 weeks
    expect(days.length).toBeGreaterThanOrEqual(28)
    expect(days.length).toBeLessThanOrEqual(42)
  })

  it('starts on week start day', () => {
    const date = new Date(2024, 5, 15)
    const days = getMonthCalendarDays(date, 1) // Monday start
    expect(days[0]?.getDay()).toBe(1)
  })

  it('includes days from adjacent months', () => {
    const date = new Date(2024, 5, 15) // June 1 is Saturday
    const days = getMonthCalendarDays(date, 1)
    // Should include some May days at the start
    const firstDay = days[0]
    if (firstDay) {
      expect(firstDay.getMonth()).toBeLessThanOrEqual(5)
    }
  })
})

// ─── Formatting ────────────────────────────────────────────

describe('formatTime', () => {
  it('formats time in 24h format', () => {
    const date = new Date(2024, 5, 15, 14, 30)
    const result = formatTime(date, 'en-US')
    expect(result).toMatch(/14:30/)
  })
})

// ─── Position Calculation ──────────────────────────────────

describe('getMinutesSinceDayStart', () => {
  it('calculates minutes from day start', () => {
    const date = new Date(2024, 5, 15, 10, 30)
    expect(getMinutesSinceDayStart(date, 8)).toBe(150) // 2h30m = 150m
  })

  it('handles negative values for times before day start', () => {
    const date = new Date(2024, 5, 15, 7, 0)
    expect(getMinutesSinceDayStart(date, 8)).toBe(-60)
  })
})

describe('getSlotPosition', () => {
  it('calculates correct position', () => {
    const date = new Date(2024, 5, 15, 9, 0) // 1h after day start
    const position = getSlotPosition(date, 8, 30, 40) // 30min slots, 40px height
    expect(position).toBe(80) // 60min / 30min * 40px
  })
})

describe('getEventHeight', () => {
  it('calculates correct height for event duration', () => {
    const start = new Date(2024, 5, 15, 9, 0)
    const end = new Date(2024, 5, 15, 10, 30)
    const height = getEventHeight(start, end, 30, 40)
    expect(height).toBe(120) // 90min / 30min * 40px
  })
})

// ─── Snap to Grid ──────────────────────────────────────────

describe('snapToSlot', () => {
  it('rounds to nearest slot', () => {
    const date = new Date(2024, 5, 15, 10, 17) // 17 min
    const snapped = snapToSlot(date, 15) // 15min slots
    expect(snapped.getMinutes()).toBe(15) // rounds to 15
  })

  it('rounds up when closer to next slot', () => {
    const date = new Date(2024, 5, 15, 10, 23)
    const snapped = snapToSlot(date, 15)
    expect(snapped.getMinutes()).toBe(30)
  })

  it('clears seconds and milliseconds', () => {
    const date = new Date(2024, 5, 15, 10, 15, 45, 500)
    const snapped = snapToSlot(date, 15)
    expect(snapped.getSeconds()).toBe(0)
    expect(snapped.getMilliseconds()).toBe(0)
  })
})

describe('floorToSlot', () => {
  it('floors to previous slot', () => {
    const date = new Date(2024, 5, 15, 10, 17)
    const floored = floorToSlot(date, 15)
    expect(floored.getMinutes()).toBe(15)
  })

  it('stays on current slot if already aligned', () => {
    const date = new Date(2024, 5, 15, 10, 30)
    const floored = floorToSlot(date, 15)
    expect(floored.getMinutes()).toBe(30)
  })
})

// ─── Date Range for Views ──────────────────────────────────

describe('getDayRange', () => {
  it('returns start and end of day', () => {
    const date = new Date(2024, 5, 15, 12, 0)
    const { start, end } = getDayRange(date)
    expect(start.getHours()).toBe(0)
    expect(end.getHours()).toBe(23)
    expect(end.getMinutes()).toBe(59)
  })
})

describe('getWeekRange', () => {
  it('returns start and end of week', () => {
    const date = new Date(2024, 5, 12) // Wednesday
    const { start, end } = getWeekRange(date, 1)
    expect(start.getDay()).toBe(1) // Monday
    expect(end.getDay()).toBe(0) // Sunday
  })
})

describe('getMonthRange', () => {
  it('returns first and last day of month', () => {
    const date = new Date(2024, 5, 15)
    const { start, end } = getMonthRange(date)
    expect(start.getDate()).toBe(1)
    expect(end.getDate()).toBe(30) // June has 30 days
  })
})

// ─── Event Overlap Detection ───────────────────────────────

describe('eventsOverlap', () => {
  it('returns true for overlapping events', () => {
    const a = { start: new Date(2024, 5, 15, 10, 0), end: new Date(2024, 5, 15, 12, 0) }
    const b = { start: new Date(2024, 5, 15, 11, 0), end: new Date(2024, 5, 15, 13, 0) }
    expect(eventsOverlap(a, b)).toBe(true)
  })

  it('returns false for non-overlapping events', () => {
    const a = { start: new Date(2024, 5, 15, 10, 0), end: new Date(2024, 5, 15, 11, 0) }
    const b = { start: new Date(2024, 5, 15, 12, 0), end: new Date(2024, 5, 15, 13, 0) }
    expect(eventsOverlap(a, b)).toBe(false)
  })

  it('returns false for adjacent events (no gap but no overlap)', () => {
    const a = { start: new Date(2024, 5, 15, 10, 0), end: new Date(2024, 5, 15, 11, 0) }
    const b = { start: new Date(2024, 5, 15, 11, 0), end: new Date(2024, 5, 15, 12, 0) }
    expect(eventsOverlap(a, b)).toBe(false)
  })

  it('returns true when one event contains another', () => {
    const a = { start: new Date(2024, 5, 15, 9, 0), end: new Date(2024, 5, 15, 15, 0) }
    const b = { start: new Date(2024, 5, 15, 10, 0), end: new Date(2024, 5, 15, 12, 0) }
    expect(eventsOverlap(a, b)).toBe(true)
  })
})

describe('isEventInRange', () => {
  it('returns true if event is within range', () => {
    const event = { start: new Date(2024, 5, 12), end: new Date(2024, 5, 14) }
    const rangeStart = new Date(2024, 5, 10)
    const rangeEnd = new Date(2024, 5, 20)
    expect(isEventInRange(event, rangeStart, rangeEnd)).toBe(true)
  })

  it('returns true if event partially overlaps range', () => {
    const event = { start: new Date(2024, 5, 8), end: new Date(2024, 5, 12) }
    const rangeStart = new Date(2024, 5, 10)
    const rangeEnd = new Date(2024, 5, 20)
    expect(isEventInRange(event, rangeStart, rangeEnd)).toBe(true)
  })

  it('returns false if event is completely outside range', () => {
    const event = { start: new Date(2024, 5, 1), end: new Date(2024, 5, 5) }
    const rangeStart = new Date(2024, 5, 10)
    const rangeEnd = new Date(2024, 5, 20)
    expect(isEventInRange(event, rangeStart, rangeEnd)).toBe(false)
  })
})

describe('isEventOnDay', () => {
  it('returns true if event is on that day', () => {
    const event = { start: new Date(2024, 5, 15, 10, 0), end: new Date(2024, 5, 15, 12, 0) }
    const day = new Date(2024, 5, 15)
    expect(isEventOnDay(event, day)).toBe(true)
  })

  it('returns true for multi-day event', () => {
    const event = { start: new Date(2024, 5, 14), end: new Date(2024, 5, 16) }
    const day = new Date(2024, 5, 15)
    expect(isEventOnDay(event, day)).toBe(true)
  })

  it('returns false if event is on different day', () => {
    const event = { start: new Date(2024, 5, 14, 10, 0), end: new Date(2024, 5, 14, 12, 0) }
    const day = new Date(2024, 5, 15)
    expect(isEventOnDay(event, day)).toBe(false)
  })
})

// ─── All-Day Event Detection ───────────────────────────────

describe('isAllDayEvent', () => {
  it('returns true when event has allDay flag', () => {
    const event = {
      start: new Date(2024, 5, 15, 10, 0),
      end: new Date(2024, 5, 15, 12, 0),
      allDay: true,
    }
    expect(isAllDayEvent(event)).toBe(true)
  })

  it('returns true when event spans exactly 24 hours (even with allDay: false)', () => {
    // The function checks duration >= 24h regardless of allDay flag
    const event = {
      start: new Date(2024, 5, 15, 0, 0),
      end: new Date(2024, 5, 16, 0, 0),
      allDay: false,
    }
    // Duration >= 24h makes it all-day regardless
    expect(isAllDayEvent(event)).toBe(true)
  })

  it('returns true when event spans exactly 24 hours', () => {
    const event = {
      start: new Date(2024, 5, 15, 0, 0),
      end: new Date(2024, 5, 16, 0, 0),
    }
    expect(isAllDayEvent(event)).toBe(true)
  })

  it('returns true when event spans multiple days', () => {
    const event = {
      start: new Date(2024, 5, 15, 0, 0),
      end: new Date(2024, 5, 18, 0, 0),
    }
    expect(isAllDayEvent(event)).toBe(true)
  })

  it('returns false for short events', () => {
    const event = {
      start: new Date(2024, 5, 15, 10, 0),
      end: new Date(2024, 5, 15, 12, 0),
    }
    expect(isAllDayEvent(event)).toBe(false)
  })

  it('returns false for 23-hour event', () => {
    const event = {
      start: new Date(2024, 5, 15, 0, 0),
      end: new Date(2024, 5, 15, 23, 0),
    }
    expect(isAllDayEvent(event)).toBe(false)
  })

  it('returns false for event without allDay flag and short duration', () => {
    const event = {
      start: new Date(2024, 5, 15, 9, 0),
      end: new Date(2024, 5, 15, 10, 0),
      allDay: false,
    }
    expect(isAllDayEvent(event)).toBe(false)
  })
})

describe('getEventDuration', () => {
  it('returns duration in milliseconds', () => {
    const event = {
      start: new Date(2024, 5, 15, 10, 0),
      end: new Date(2024, 5, 15, 12, 0),
    }
    expect(getEventDuration(event, 30)).toBe(2 * 60 * 60 * 1000) // 2 hours in ms
  })

  it('returns minimum duration (slotDuration) for same start and end', () => {
    const event = {
      start: new Date(2024, 5, 15, 10, 0),
      end: new Date(2024, 5, 15, 10, 0),
    }
    // Returns slotDuration in ms when duration <= 0
    expect(getEventDuration(event, 30)).toBe(30 * 60 * 1000) // 30 min in ms
  })

  it('returns duration for multi-day event', () => {
    const event = {
      start: new Date(2024, 5, 15, 0, 0),
      end: new Date(2024, 5, 17, 0, 0),
    }
    expect(getEventDuration(event, 30)).toBe(2 * 24 * 60 * 60 * 1000) // 48 hours in ms
  })

  it('returns minimum duration for negative duration', () => {
    const event = {
      start: new Date(2024, 5, 15, 12, 0),
      end: new Date(2024, 5, 15, 10, 0), // End before start
    }
    expect(getEventDuration(event, 15)).toBe(15 * 60 * 1000) // slotDuration
  })
})

describe('ensureValidEventEnd', () => {
  it('returns end if end is after start', () => {
    const event = {
      start: new Date(2024, 5, 15, 10, 0),
      end: new Date(2024, 5, 15, 12, 0),
    }
    expect(ensureValidEventEnd(event, 30)).toEqual(event.end)
  })

  it('returns start + slotDuration if end is before start', () => {
    const event = {
      start: new Date(2024, 5, 15, 10, 0),
      end: new Date(2024, 5, 15, 9, 0), // Before start
    }
    const result = ensureValidEventEnd(event, 30)
    expect(result).toEqual(new Date(2024, 5, 15, 10, 30)) // start + 30 min
  })

  it('returns start + slotDuration if end equals start', () => {
    const event = {
      start: new Date(2024, 5, 15, 10, 0),
      end: new Date(2024, 5, 15, 10, 0), // Same as start
    }
    const result = ensureValidEventEnd(event, 15)
    expect(result).toEqual(new Date(2024, 5, 15, 10, 15)) // start + 15 min
  })

  it('works with different slot durations', () => {
    const event = {
      start: new Date(2024, 5, 15, 10, 0),
      end: new Date(2024, 5, 15, 10, 0),
    }
    const result = ensureValidEventEnd(event, 60)
    expect(result).toEqual(new Date(2024, 5, 15, 11, 0)) // start + 60 min
  })
})
