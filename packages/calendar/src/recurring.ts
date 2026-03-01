/**
 * @liteforge/calendar - Recurring Event Expansion
 *
 * Expands recurring events into individual occurrences within a date range.
 */

import type { CalendarEvent, RecurringRule } from './types.js'
import {
  addDays,
  addWeeks,
  addMonths,
  isSameDay,
  isBefore,
  isAfter,
  startOfDay,
} from './date-utils.js'

/**
 * Check if a date is in the exceptions list
 */
function isException(date: Date, exceptions: Date[] | undefined): boolean {
  if (!exceptions || exceptions.length === 0) return false
  return exceptions.some((ex) => isSameDay(date, ex))
}

/**
 * Get the next occurrence date based on frequency
 */
function getNextOccurrence(
  current: Date,
  rule: RecurringRule,
  eventStart: Date
): Date {
  const interval = rule.interval ?? 1

  switch (rule.frequency) {
    case 'daily':
      return addDays(current, interval)

    case 'weekly':
      return addWeeks(current, interval)

    case 'biweekly':
      return addWeeks(current, 2 * interval)

    case 'monthly': {
      // Keep the same day of month
      const next = addMonths(current, interval)
      const targetDay = eventStart.getDate()
      const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
      next.setDate(Math.min(targetDay, maxDay))
      return next
    }

    default:
      return addDays(current, interval)
  }
}

/**
 * Get all days of week for a weekly recurring event
 */
function getWeeklyOccurrences(
  weekStart: Date,
  daysOfWeek: number[],
  eventStart: Date
): Date[] {
  const occurrences: Date[] = []
  const startHour = eventStart.getHours()
  const startMinute = eventStart.getMinutes()

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i)
    const dayOfWeek = day.getDay()

    if (daysOfWeek.includes(dayOfWeek)) {
      const occurrence = new Date(day)
      occurrence.setHours(startHour, startMinute, 0, 0)
      occurrences.push(occurrence)
    }
  }

  return occurrences
}

/**
 * Expand a recurring event into individual occurrences within a date range.
 */
export function expandRecurring<T extends CalendarEvent>(
  event: T,
  rangeStart: Date,
  rangeEnd: Date
): T[] {
  const rule = event.recurring
  if (!rule) return [event]

  const occurrences: T[] = []
  const eventDuration = event.end.getTime() - event.start.getTime()
  let count = 0
  const maxCount = rule.count ?? 1000 // Safety limit
  const endDate = rule.endDate ? startOfDay(rule.endDate) : null

  // For weekly events with specific days
  if (rule.frequency === 'weekly' && rule.daysOfWeek && rule.daysOfWeek.length > 0) {
    // Start from the week containing event.start
    let currentWeekStart = startOfDay(event.start)
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay())

    while (count < maxCount) {
      // Check if we've passed the end date
      if (endDate && isAfter(currentWeekStart, endDate)) break

      // Get all occurrences for this week
      const weekOccurrences = getWeeklyOccurrences(
        currentWeekStart,
        rule.daysOfWeek,
        event.start
      )

      for (const occurrenceStart of weekOccurrences) {
        // Skip if before event start
        if (isBefore(occurrenceStart, event.start)) continue

        // Check end conditions
        if (endDate && isAfter(occurrenceStart, endDate)) break
        if (count >= maxCount) break

        // Skip exceptions
        if (isException(occurrenceStart, rule.exceptions)) continue

        // Check if within view range
        const occurrenceEnd = new Date(occurrenceStart.getTime() + eventDuration)
        if (occurrenceEnd > rangeStart && occurrenceStart < rangeEnd) {
          occurrences.push({
            ...event,
            id: `${event.id}_${occurrenceStart.toISOString().split('T')[0]}`,
            start: occurrenceStart,
            end: occurrenceEnd,
          })
        }

        count++
      }

      // Move to next week (accounting for interval)
      const interval = rule.interval ?? 1
      currentWeekStart = addWeeks(currentWeekStart, interval)

      // Safety: stop if we're way past the range
      if (isAfter(currentWeekStart, addWeeks(rangeEnd, 52))) break
    }

    return occurrences
  }

  // For other frequencies (daily, biweekly, monthly)
  let currentStart = new Date(event.start)

  while (count < maxCount) {
    // Check end conditions
    if (endDate && isAfter(currentStart, endDate)) break

    // Skip exceptions
    if (!isException(currentStart, rule.exceptions)) {
      // Check if within view range
      const currentEnd = new Date(currentStart.getTime() + eventDuration)
      if (currentEnd > rangeStart && currentStart < rangeEnd) {
        occurrences.push({
          ...event,
          id: `${event.id}_${currentStart.toISOString().split('T')[0]}`,
          start: new Date(currentStart),
          end: currentEnd,
        })
      }
    }

    count++
    currentStart = getNextOccurrence(currentStart, rule, event.start)

    // Safety: stop if we're way past the range
    if (isAfter(currentStart, addMonths(rangeEnd, 12))) break
  }

  return occurrences
}

/**
 * Expand all recurring events in an array
 */
export function expandAllRecurring<T extends CalendarEvent>(
  events: T[],
  rangeStart: Date,
  rangeEnd: Date
): T[] {
  const result: T[] = []

  for (const event of events) {
    if (event.recurring) {
      result.push(...expandRecurring(event, rangeStart, rangeEnd))
    } else {
      // Non-recurring: just check if in range
      if (event.end > rangeStart && event.start < rangeEnd) {
        result.push(event)
      }
    }
  }

  return result
}
