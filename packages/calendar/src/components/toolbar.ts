/**
 * @liteforge/calendar - Toolbar Component
 */

import { effect } from '@liteforge/core'
import type { CalendarView, CalendarClasses } from '../types.js'
import {
  formatFullDate,
  formatWeekRange,
  formatMonthYear,
} from '../date-utils.js'
import { getClass } from '../views/shared.js'

interface ToolbarOptions {
  currentDate: () => Date
  currentView: () => CalendarView
  locale: string
  weekStart: number
  classes: Partial<CalendarClasses>
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (view: CalendarView) => void
}

export function renderToolbar(options: ToolbarOptions): HTMLDivElement {
  const {
    currentDate,
    currentView,
    locale,
    weekStart,
    classes,
    onPrev,
    onNext,
    onToday,
    onViewChange,
  } = options

  const toolbar = document.createElement('div')
  toolbar.className = getClass('toolbar', classes, 'lf-cal-toolbar')

  // Navigation
  const nav = document.createElement('div')
  nav.className = getClass('toolbarNav', classes, 'lf-cal-toolbar-nav')

  const prevBtn = document.createElement('button')
  prevBtn.type = 'button'
  prevBtn.textContent = '←'
  prevBtn.title = 'Previous'
  prevBtn.addEventListener('click', onPrev)

  const todayBtn = document.createElement('button')
  todayBtn.type = 'button'
  todayBtn.textContent = 'Today'
  todayBtn.addEventListener('click', onToday)

  const nextBtn = document.createElement('button')
  nextBtn.type = 'button'
  nextBtn.textContent = '→'
  nextBtn.title = 'Next'
  nextBtn.addEventListener('click', onNext)

  nav.appendChild(prevBtn)
  nav.appendChild(todayBtn)
  nav.appendChild(nextBtn)

  toolbar.appendChild(nav)

  // Title
  const title = document.createElement('div')
  title.className = getClass('toolbarTitle', classes, 'lf-cal-toolbar-title')

  // Update title reactively
  effect(() => {
    const date = currentDate()
    const view = currentView()

    switch (view) {
      case 'day':
        title.textContent = formatFullDate(date, locale)
        break
      case 'week':
        title.textContent = formatWeekRange(date, locale, weekStart)
        break
      case 'month':
        title.textContent = formatMonthYear(date, locale)
        break
      case 'agenda':
        title.textContent = formatMonthYear(date, locale)
        break
    }
  })

  toolbar.appendChild(title)

  // View switcher
  const views = document.createElement('div')
  views.className = getClass('toolbarViews', classes, 'lf-cal-toolbar-views')

  const viewButtons: Array<{ view: CalendarView; label: string }> = [
    { view: 'day', label: 'Day' },
    { view: 'week', label: 'Week' },
    { view: 'month', label: 'Month' },
    { view: 'agenda', label: 'Agenda' },
  ]

  const buttonEls: HTMLButtonElement[] = []

  for (const { view, label } of viewButtons) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = label
    btn.dataset.view = view
    btn.addEventListener('click', () => onViewChange(view))
    views.appendChild(btn)
    buttonEls.push(btn)
  }

  // Update active state reactively
  effect(() => {
    const view = currentView()
    for (const btn of buttonEls) {
      btn.classList.toggle('active', btn.dataset.view === view)
    }
  })

  toolbar.appendChild(views)

  return toolbar
}
