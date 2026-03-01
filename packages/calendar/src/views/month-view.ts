/**
 * @liteforge/calendar - Month View Renderer
 */

import { effect } from '@liteforge/core'
import type {
  CalendarEvent,
  ResolvedTimeConfig,
  CalendarClasses,
} from '../types.js'
import {
  getMonthCalendarDays,
  isSameMonth,
  isSameDay,
  isToday,
  isWeekend,
  formatWeekday,
} from '../date-utils.js'
import { getClass } from './shared.js'

const MAX_VISIBLE_EVENTS = 3

interface MonthViewOptions<T extends CalendarEvent> {
  date: () => Date
  events: () => T[]
  config: ResolvedTimeConfig
  locale: string
  classes: Partial<CalendarClasses>
  onEventClick: ((event: T) => void) | undefined
  onSlotClick: ((start: Date, end: Date, resourceId?: string) => void) | undefined
  selectable: boolean | undefined
}

export function renderMonthView<T extends CalendarEvent>(
  options: MonthViewOptions<T>
): HTMLDivElement {
  const {
    date,
    events,
    config,
    locale,
    classes,
    onEventClick,
    onSlotClick,
    selectable,
  } = options

  const container = document.createElement('div')
  container.className = getClass('root', classes, 'lf-cal-month-view')

  // Weekday headers
  const header = document.createElement('div')
  header.className = 'lf-cal-month-header'

  // Generate weekday names based on weekStart
  const weekdayNames: string[] = []
  const sampleDate = new Date(2024, 0, 1) // A Monday
  for (let i = 0; i < 7; i++) {
    const dayIndex = (config.weekStart + i) % 7
    // Find a date with this day of week
    const tempDate = new Date(sampleDate)
    tempDate.setDate(tempDate.getDate() + (dayIndex - tempDate.getDay() + 7) % 7)
    weekdayNames.push(formatWeekday(tempDate, locale))
  }

  for (const name of weekdayNames) {
    const cell = document.createElement('div')
    cell.className = 'lf-cal-month-header-cell'
    cell.textContent = name
    header.appendChild(cell)
  }

  container.appendChild(header)

  // Grid
  const grid = document.createElement('div')
  grid.className = getClass('monthGrid', classes, 'lf-cal-month-grid')
  container.appendChild(grid)

  // Reactive rendering
  effect(() => {
    const currentDate = date()
    const allEvents = events()
    const days = getMonthCalendarDays(currentDate, config.weekStart)

    grid.innerHTML = ''

    for (const day of days) {
      const cell = document.createElement('div')
      let cellClass = getClass('monthCell', classes, 'lf-cal-month-cell')

      if (isToday(day)) {
        cellClass += ' lf-cal-month-cell--today'
      }
      if (!isSameMonth(day, currentDate)) {
        cellClass += ' lf-cal-month-cell--other-month'
      }
      if (isWeekend(day)) {
        cellClass += ' lf-cal-month-cell--weekend'
      }

      cell.className = cellClass

      // Day number
      const dayNumber = document.createElement('div')
      dayNumber.className = 'lf-cal-month-day-number'
      dayNumber.textContent = String(day.getDate())
      cell.appendChild(dayNumber)

      // Click on cell
      if (selectable && onSlotClick) {
        cell.style.cursor = 'pointer'
        cell.addEventListener('click', (e) => {
          // Don't trigger if clicking on an event
          if ((e.target as HTMLElement).classList.contains('lf-cal-month-event')) {
            return
          }
          const start = new Date(day)
          start.setHours(config.dayStart, 0, 0, 0)
          const end = new Date(day)
          end.setHours(config.dayStart + 1, 0, 0, 0)
          onSlotClick(start, end)
        })
      }

      // Events for this day
      const dayEvents = allEvents.filter((event) => {
        const eventStart = new Date(event.start)
        const eventEnd = new Date(event.end)
        // Event spans this day
        return (
          (isSameDay(eventStart, day) || eventStart < day) &&
          (isSameDay(eventEnd, day) || eventEnd > day)
        )
      })

      // Sort by start time
      dayEvents.sort((a, b) => a.start.getTime() - b.start.getTime())

      // Events container
      const eventsContainer = document.createElement('div')
      eventsContainer.className = 'lf-cal-month-events'

      const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS)
      const remainingCount = dayEvents.length - MAX_VISIBLE_EVENTS

      for (const event of visibleEvents) {
        const eventEl = document.createElement('div')
        eventEl.className = getClass('monthEvent', classes, 'lf-cal-month-event')
        eventEl.textContent = event.title

        if (event.color) {
          eventEl.style.background = event.color
        }

        if (onEventClick) {
          eventEl.addEventListener('click', (e) => {
            e.stopPropagation()
            onEventClick(event)
          })
        }

        eventsContainer.appendChild(eventEl)
      }

      if (remainingCount > 0) {
        const more = document.createElement('div')
        more.className = getClass('monthMore', classes, 'lf-cal-month-more')
        more.textContent = `+${remainingCount} more`

        // Could show popup with all events on click
        more.addEventListener('click', (e) => {
          e.stopPropagation()
          // For now, just log
          console.log(`${remainingCount} more events on ${day.toDateString()}`)
        })

        eventsContainer.appendChild(more)
      }

      cell.appendChild(eventsContainer)
      grid.appendChild(cell)
    }
  })

  return container
}
