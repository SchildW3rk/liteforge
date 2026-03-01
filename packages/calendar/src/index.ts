/**
 * @liteforge/calendar
 *
 * Signals-based scheduling calendar with day/week/month/agenda views,
 * resources (therapists/rooms), drag & drop, and recurring events.
 */

export { createCalendar } from './calendar.js'

export type {
  // Main types
  CalendarOptions,
  CalendarResult,
  CalendarEvent,
  CalendarView,
  CalendarClasses,

  // Resource types
  Resource,
  WorkingHours,

  // Time config
  TimeConfig,
  ResolvedTimeConfig,

  // Recurring
  RecurringRule,

  // State types
  DateRange,
  SlotSelection,
  OverlapLayout,
  RenderedEvent,
} from './types.js'

// Date utilities (exported for advanced usage)
export {
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
  formatDate,
  formatDayHeader,
  formatWeekday,
  formatDayNumber,
  formatMonthYear,
  formatWeekRange,
  formatFullDate,
  snapToSlot,
  floorToSlot,
  eventsOverlap,
  isEventInRange,
  isEventOnDay,
  isAllDayEvent,
  getEventDuration,
  ensureValidEventEnd,
} from './date-utils.js'

// Recurring event expansion
export { expandRecurring, expandAllRecurring } from './recurring.js'

// Style injection (for advanced usage)
export { injectCalendarStyles, resetCalendarStylesInjection } from './styles.js'
