/**
 * @liteforge/calendar - Date Utilities
 *
 * All date operations from scratch. NO external dependencies.
 * Uses native Date and Intl.DateTimeFormat.
 * All functions return NEW Date objects - never mutate.
 */

// ─── Basic Operations ──────────────────────────────────────

export function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

export function endOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

export function startOfWeek(date: Date, weekStart: number = 1): Date {
  const result = new Date(date)
  const day = result.getDay()
  const diff = (day < weekStart ? 7 : 0) + day - weekStart
  result.setDate(result.getDate() - diff)
  result.setHours(0, 0, 0, 0)
  return result
}

export function endOfWeek(date: Date, weekStart: number = 1): Date {
  const start = startOfWeek(date, weekStart)
  const result = new Date(start)
  result.setDate(result.getDate() + 6)
  result.setHours(23, 59, 59, 999)
  return result
}

export function startOfMonth(date: Date): Date {
  const result = new Date(date)
  result.setDate(1)
  result.setHours(0, 0, 0, 0)
  return result
}

export function endOfMonth(date: Date): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + 1, 0)
  result.setHours(23, 59, 59, 999)
  return result
}

// ─── Add/Subtract ──────────────────────────────────────────

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7)
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  const day = result.getDate()
  result.setMonth(result.getMonth() + months, 1)
  const maxDay = daysInMonth(result)
  result.setDate(Math.min(day, maxDay))
  return result
}

export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date)
  result.setTime(result.getTime() + minutes * 60 * 1000)
  return result
}

export function addHours(date: Date, hours: number): Date {
  return addMinutes(date, hours * 60)
}

// ─── Comparisons ───────────────────────────────────────────

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isSameMonth(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth()
  )
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function isWithinRange(date: Date, start: Date, end: Date): boolean {
  const time = date.getTime()
  return time >= start.getTime() && time <= end.getTime()
}

export function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime()
}

export function isAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime()
}

// ─── Getters ───────────────────────────────────────────────

export function getDayOfWeek(date: Date): number {
  return date.getDay()
}

export function getWeekNumber(date: Date): number {
  // ISO week number
  const target = new Date(date.valueOf())
  const dayNr = (date.getDay() + 6) % 7
  target.setDate(target.getDate() - dayNr + 3)
  const firstThursday = target.valueOf()
  target.setMonth(0, 1)
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7))
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
}

export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

export function diffInMinutes(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60))
}

export function diffInDays(a: Date, b: Date): number {
  const startA = startOfDay(a)
  const startB = startOfDay(b)
  return Math.floor((startB.getTime() - startA.getTime()) / (1000 * 60 * 60 * 24))
}

// ─── Slot Generation ───────────────────────────────────────

export function getSlotsBetween(
  start: Date,
  end: Date,
  slotDuration: number
): Date[] {
  const slots: Date[] = []
  let current = new Date(start)

  while (current < end) {
    slots.push(new Date(current))
    current = addMinutes(current, slotDuration)
  }

  return slots
}

export function getTimeSlots(
  date: Date,
  dayStart: number,
  dayEnd: number,
  slotDuration: number
): Date[] {
  const start = new Date(date)
  start.setHours(dayStart, 0, 0, 0)

  const end = new Date(date)
  end.setHours(dayEnd, 0, 0, 0)

  return getSlotsBetween(start, end, slotDuration)
}

export function getDaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = []
  let current = startOfDay(start)
  const endDay = startOfDay(end)

  while (current <= endDay) {
    days.push(new Date(current))
    current = addDays(current, 1)
  }

  return days
}

export function getWeekDays(date: Date, weekStart: number, hiddenDays: number[] = []): Date[] {
  const start = startOfWeek(date, weekStart)
  const days: Date[] = []

  for (let i = 0; i < 7; i++) {
    const day = addDays(start, i)
    const dayOfWeek = day.getDay()
    if (!hiddenDays.includes(dayOfWeek)) {
      days.push(day)
    }
  }

  return days
}

export function getMonthCalendarDays(date: Date, weekStart: number): Date[] {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const calendarStart = startOfWeek(monthStart, weekStart)
  const calendarEnd = endOfWeek(monthEnd, weekStart)

  return getDaysInRange(calendarStart, calendarEnd)
}

// ─── Formatting ────────────────────────────────────────────

export function formatTime(date: Date, locale: string = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function formatDate(date: Date, locale: string = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date)
}

export function formatDayHeader(date: Date, locale: string = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
  }).format(date)
}

export function formatWeekday(date: Date, locale: string = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
  }).format(date)
}

export function formatDayNumber(date: Date): string {
  return String(date.getDate())
}

export function formatMonthYear(date: Date, locale: string = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatWeekRange(date: Date, locale: string = 'en-US', weekStart: number = 1): string {
  const start = startOfWeek(date, weekStart)
  const end = endOfWeek(date, weekStart)

  const weekNum = getWeekNumber(date)

  if (start.getMonth() === end.getMonth()) {
    return `KW ${weekNum}, ${new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(start)}`
  }

  return `KW ${weekNum}, ${new Intl.DateTimeFormat(locale, { month: 'short' }).format(start)} - ${new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(end)}`
}

export function formatFullDate(date: Date, locale: string = 'en-US'): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

// ─── Position Calculation ──────────────────────────────────

export function getMinutesSinceDayStart(date: Date, dayStart: number): number {
  const hours = date.getHours()
  const minutes = date.getMinutes()
  return (hours - dayStart) * 60 + minutes
}

export function getSlotPosition(
  date: Date,
  dayStart: number,
  slotDuration: number,
  slotHeight: number
): number {
  const minutes = getMinutesSinceDayStart(date, dayStart)
  return (minutes / slotDuration) * slotHeight
}

export function getEventHeight(
  start: Date,
  end: Date,
  slotDuration: number,
  slotHeight: number
): number {
  const minutes = diffInMinutes(start, end)
  return (minutes / slotDuration) * slotHeight
}

// ─── Snap to Grid ──────────────────────────────────────────

export function snapToSlot(date: Date, slotDuration: number): Date {
  const result = new Date(date)
  const minutes = result.getMinutes()
  const snapped = Math.round(minutes / slotDuration) * slotDuration
  result.setMinutes(snapped, 0, 0)
  return result
}

export function floorToSlot(date: Date, slotDuration: number): Date {
  const result = new Date(date)
  const minutes = result.getMinutes()
  const snapped = Math.floor(minutes / slotDuration) * slotDuration
  result.setMinutes(snapped, 0, 0)
  return result
}

// ─── Date Range for Views ──────────────────────────────────

export function getDayRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfDay(date),
    end: endOfDay(date),
  }
}

export function getWeekRange(date: Date, weekStart: number): { start: Date; end: Date } {
  return {
    start: startOfWeek(date, weekStart),
    end: endOfWeek(date, weekStart),
  }
}

export function getMonthRange(date: Date): { start: Date; end: Date } {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  }
}

// ─── Event Overlap Detection ───────────────────────────────

export function eventsOverlap(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date }
): boolean {
  return a.start < b.end && a.end > b.start
}

export function isEventInRange(
  event: { start: Date; end: Date },
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  return event.start < rangeEnd && event.end > rangeStart
}

export function isEventOnDay(
  event: { start: Date; end: Date },
  day: Date
): boolean {
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)
  return isEventInRange(event, dayStart, dayEnd)
}

// ─── All-Day Event Detection ───────────────────────────────

/**
 * Check if an event should be treated as all-day.
 * An event is all-day if:
 * - It has allDay: true, OR
 * - It spans 24 hours or more, OR
 * - start === end (no duration - treat as all-day)
 */
export function isAllDayEvent(event: { start: Date; end: Date; allDay?: boolean }): boolean {
  if (event.allDay) return true

  const durationMs = event.end.getTime() - event.start.getTime()

  // If no duration (start === end), it's effectively invalid - treat as slot-duration event
  // But if duration >= 24 hours, treat as all-day
  const twentyFourHours = 24 * 60 * 60 * 1000
  if (durationMs >= twentyFourHours) return true

  return false
}

/**
 * Get the duration of an event with safety guards.
 * If end <= start, returns slotDuration as minimum.
 */
export function getEventDuration(
  event: { start: Date; end: Date },
  slotDurationMinutes: number
): number {
  const durationMs = event.end.getTime() - event.start.getTime()
  const minDurationMs = slotDurationMinutes * 60 * 1000

  if (durationMs <= 0) return minDurationMs
  return durationMs
}

/**
 * Ensure an event has valid end time.
 * If end <= start, returns start + slotDuration.
 */
export function ensureValidEventEnd(
  event: { start: Date; end: Date },
  slotDurationMinutes: number
): Date {
  if (event.end.getTime() <= event.start.getTime()) {
    return addMinutes(event.start, slotDurationMinutes)
  }
  return event.end
}
