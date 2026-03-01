/**
 * @liteforge/calendar - Agenda View Renderer
 *
 * Simple chronological list grouped by day.
 * Only shows days that have events.
 */

import { effect } from '@liteforge/core'
import type {
  CalendarEvent,
  Resource,
  ResolvedTimeConfig,
  CalendarClasses,
  DateRange,
} from '../types.js'
import {
  getDaysInRange,
  formatFullDate,
  formatTime,
  isToday,
} from '../date-utils.js'
import { getClass } from './shared.js'

interface AgendaViewOptions<T extends CalendarEvent> {
  dateRange: () => DateRange
  events: () => T[]
  resources: () => Resource[]
  config: ResolvedTimeConfig
  locale: string
  classes: Partial<CalendarClasses>
  onEventClick: ((event: T) => void) | undefined
}

export function renderAgendaView<T extends CalendarEvent>(
  options: AgendaViewOptions<T>
): HTMLDivElement {
  const {
    dateRange,
    events,
    resources,
    config: _config,
    locale,
    classes,
    onEventClick,
  } = options

  const container = document.createElement('div')
  container.className = getClass('root', classes, 'lf-cal-agenda')

  // Reactive rendering
  effect(() => {
    const range = dateRange()
    const allEvents = events()
    const allResources = resources()

    container.innerHTML = ''

    // Group events by day
    const eventsByDay = new Map<string, T[]>()

    for (const event of allEvents) {
      const dayKeyStr = event.start.toISOString().split('T')[0] ?? ''
      if (!eventsByDay.has(dayKeyStr)) {
        eventsByDay.set(dayKeyStr, [])
      }
      eventsByDay.get(dayKeyStr)!.push(event)
    }

    // Sort each day's events by start time
    for (const dayEvts of eventsByDay.values()) {
      dayEvts.sort((a, b) => a.start.getTime() - b.start.getTime())
    }

    // Get all days in range and render those with events
    const days = getDaysInRange(range.start, range.end)

    let hasAnyEvents = false

    for (const day of days) {
      const dayKey = day.toISOString().split('T')[0] ?? ''
      const dayEvents = eventsByDay.get(dayKey)

      if (!dayEvents || dayEvents.length === 0) continue

      hasAnyEvents = true

      // Day group
      const dayGroup = document.createElement('div')
      dayGroup.className = getClass('agendaDay', classes, 'lf-cal-agenda-day')

      // Day header
      const dayHeader = document.createElement('div')
      let headerClass = getClass('agendaDayHeader', classes, 'lf-cal-agenda-day-header')
      if (isToday(day)) {
        headerClass += ' lf-cal-agenda-day-header--today'
      }
      dayHeader.className = headerClass
      dayHeader.textContent = formatFullDate(day, locale)
      dayGroup.appendChild(dayHeader)

      // Events list
      for (const event of dayEvents) {
        const item = document.createElement('div')
        item.className = getClass('agendaItem', classes, 'lf-cal-agenda-item')

        // Time
        const timeEl = document.createElement('div')
        timeEl.className = 'lf-cal-agenda-item-time'
        timeEl.textContent = `${formatTime(event.start, locale)} - ${formatTime(event.end, locale)}`
        item.appendChild(timeEl)

        // Color indicator
        const indicator = document.createElement('div')
        indicator.className = 'lf-cal-agenda-item-indicator'

        // Find resource color
        const resource = event.resourceId
          ? allResources.find((r) => r.id === event.resourceId)
          : undefined
        indicator.style.background = event.color ?? resource?.color ?? '#3b82f6'
        item.appendChild(indicator)

        // Content
        const content = document.createElement('div')
        content.className = 'lf-cal-agenda-item-content'

        const title = document.createElement('div')
        title.className = 'lf-cal-agenda-item-title'
        title.textContent = event.title
        content.appendChild(title)

        // Details (resource name, status, etc.)
        const details: string[] = []
        if (resource) {
          details.push(resource.name)
        }
        if (event.status) {
          details.push(event.status)
        }

        if (details.length > 0) {
          const detailsEl = document.createElement('div')
          detailsEl.className = 'lf-cal-agenda-item-details'
          detailsEl.textContent = details.join(' • ')
          content.appendChild(detailsEl)
        }

        item.appendChild(content)

        // Click handler
        if (onEventClick) {
          item.addEventListener('click', () => {
            onEventClick(event)
          })
        }

        dayGroup.appendChild(item)
      }

      container.appendChild(dayGroup)
    }

    // Empty state
    if (!hasAnyEvents) {
      const empty = document.createElement('div')
      empty.className = 'lf-cal-empty'
      empty.textContent = 'No events in this period'
      container.appendChild(empty)
    }
  })

  return container
}
