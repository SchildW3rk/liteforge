/**
 * @liteforge/calendar - Toolbar Component
 */

import { signal, effect } from '@liteforge/core'
import type { CalendarView, CalendarClasses, CalendarTranslations, Resource, ToolbarConfig, CalendarSizeClass } from '../types.js'
import {
  formatFullDate,
  formatWeekRange,
  formatMonthYear,
} from '../date-utils.js'
import { getClass } from '../views/shared.js'
import { getQuarterLabel } from '../views/quarter-view.js'

interface ToolbarOptions {
  currentDate: () => Date
  currentView: () => CalendarView
  locale: string
  weekStart: number
  classes: Partial<CalendarClasses>
  translations: CalendarTranslations
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onViewChange: (view: CalendarView) => void
  resources?: Resource[]
  visibleResources?: () => string[]
  onToggleResource?: (id: string) => void
  weekendsVisible?: () => boolean
  onToggleWeekends?: () => void
  toolbarConfig?: ToolbarConfig | undefined
  sizeClass?: () => CalendarSizeClass
  onExport?: () => void
  onImport?: (file: File) => void
  onPrint?: () => void
  miniCalendarVisible?: () => boolean
  onToggleMiniCalendar?: () => void
}

/** Position a fixed dropdown menu below its toggle button, flipping left if it would overflow viewport */
function positionDropdown(btn: HTMLElement, menu: HTMLElement): void {
  const r = btn.getBoundingClientRect()
  const menuW = menu.offsetWidth || 180
  const spaceRight = window.innerWidth - r.left
  menu.style.top = `${r.bottom + 4}px`
  menu.style.left = spaceRight < menuW + 8
    ? `${Math.max(4, r.right - menuW)}px`
    : `${r.left}px`
}

export function renderToolbar(options: ToolbarOptions): HTMLDivElement {
  const {
    currentDate,
    currentView,
    locale,
    weekStart,
    classes,
    translations: t,
    onPrev,
    onNext,
    onToday,
    onViewChange,
    resources = [],
    visibleResources,
    onToggleResource,
    weekendsVisible,
    onToggleWeekends,
    toolbarConfig,
    sizeClass,
    onExport,
    onImport,
    onPrint,
    miniCalendarVisible,
    onToggleMiniCalendar,
  } = options

  const toolbar = document.createElement('div')
  toolbar.className = getClass('toolbar', classes, 'lf-cal-toolbar')
  toolbar.setAttribute('role', 'toolbar')
  toolbar.setAttribute('aria-label', t.calendar ?? 'Calendar')

  if (sizeClass) {
    effect(() => { toolbar.dataset.size = sizeClass() })
  }

  // Navigation
  const nav = document.createElement('div')
  nav.className = getClass('toolbarNav', classes, 'lf-cal-toolbar-nav')
  nav.setAttribute('role', 'group')
  nav.setAttribute('aria-label', t.navigation ?? 'Navigation')

  const prevBtn = document.createElement('button')
  prevBtn.type = 'button'
  prevBtn.textContent = t.prev
  prevBtn.setAttribute('aria-label', t.previousPeriod ?? 'Previous')
  prevBtn.addEventListener('click', onPrev)

  const todayBtn = document.createElement('button')
  todayBtn.type = 'button'
  todayBtn.textContent = t.today
  todayBtn.setAttribute('aria-label', t.today)
  todayBtn.addEventListener('click', onToday)

  const nextBtn = document.createElement('button')
  nextBtn.type = 'button'
  nextBtn.textContent = t.next
  nextBtn.setAttribute('aria-label', t.nextPeriod ?? 'Next')
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
      case 'resource-day':
      case 'timeline':
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
      case 'quarter':
        title.textContent = getQuarterLabel(date, locale)
        break
      case 'year':
        title.textContent = String(date.getFullYear())
        break
    }
  })

  toolbar.appendChild(title)

  // Weekend toggle — rendered before view/resource dropdowns so layout is stable
  // (visibility:hidden keeps its space when irrelevant to avoid toolbar jumping)
  if (onToggleWeekends && weekendsVisible && toolbarConfig?.showWeekendToggle !== false) {
    const weekendBtn = document.createElement('button')
    weekendBtn.type = 'button'
    weekendBtn.className = 'lf-cal-toolbar-weekend-toggle'
    weekendBtn.title = 'Toggle weekends'
    weekendBtn.addEventListener('click', onToggleWeekends)

    effect(() => {
      const view = currentView()
      const visible = weekendsVisible()
      const relevant = view === 'week' || view === 'month'
      weekendBtn.style.visibility = relevant ? '' : 'hidden'
      weekendBtn.textContent = visible ? t.hideWeekends : t.showWeekends
      weekendBtn.classList.toggle('lf-cal-toolbar-weekend-toggle--active', !visible)
      weekendBtn.setAttribute('aria-pressed', String(!visible))
    })

    toolbar.appendChild(weekendBtn)
  }

  // View switcher
  const viewDefs: Array<{ view: CalendarView; label: string }> = [
    { view: 'day', label: t.day },
    { view: 'resource-day', label: t.resourceDay },
    { view: 'week', label: t.week },
    { view: 'month', label: t.month },
    { view: 'agenda', label: t.agenda },
    { view: 'timeline', label: t.timeline },
    { view: 'quarter', label: t.quarter },
    { view: 'year', label: t.year },
  ]

  if (toolbarConfig?.viewDisplay === 'dropdown') {
    // ── Dropdown mode ────────────────────────────────────────────────────────
    const viewDropWrapper = document.createElement('div')
    viewDropWrapper.className = 'lf-cal-toolbar-view-dropdown'

    const viewDropMenuId = 'lf-cal-view-drop-menu'

    const viewDropBtn = document.createElement('button')
    viewDropBtn.type = 'button'
    viewDropBtn.className = 'lf-cal-toolbar-view-dropdown-toggle'
    viewDropBtn.setAttribute('aria-haspopup', 'listbox')
    viewDropBtn.setAttribute('aria-expanded', 'false')
    viewDropBtn.setAttribute('aria-controls', viewDropMenuId)
    viewDropBtn.setAttribute('aria-label', t.viewSelector ?? 'Select view')

    const viewDropLabel = document.createElement('span')
    const viewDropChevron = document.createElement('span')
    viewDropChevron.className = 'lf-cal-toolbar-res-dropdown-chevron'
    viewDropChevron.setAttribute('aria-hidden', 'true')
    viewDropChevron.textContent = '▾'
    viewDropBtn.appendChild(viewDropLabel)
    viewDropBtn.appendChild(viewDropChevron)

    const viewDropMenu = document.createElement('div')
    viewDropMenu.id = viewDropMenuId
    viewDropMenu.className = 'lf-cal-toolbar-res-dropdown-menu'
    viewDropMenu.setAttribute('role', 'listbox')
    viewDropMenu.setAttribute('aria-label', t.viewSelector ?? 'Select view')
    viewDropMenu.style.display = 'none'
    document.body.appendChild(viewDropMenu)

    const viewDropOpen = signal(false)

    effect(() => {
      const view = currentView()
      const found = viewDefs.find(v => v.view === view)
      viewDropLabel.textContent = found ? found.label : view
    })

    effect(() => {
      const open = viewDropOpen()
      if (open) positionDropdown(viewDropBtn, viewDropMenu)
      viewDropMenu.style.display = open ? 'block' : 'none'
      viewDropChevron.style.transform = open ? 'rotate(180deg)' : ''
      viewDropBtn.setAttribute('aria-expanded', String(open))
    })

    viewDropBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      viewDropOpen.update(v => !v)
    })

    const closeViewDrop = (e: MouseEvent) => {
      if (!viewDropWrapper.contains(e.target as Node) && !viewDropMenu.contains(e.target as Node)) {
        viewDropOpen.set(false)
      }
    }
    document.addEventListener('click', closeViewDrop)

    for (const { view, label } of viewDefs) {
      const item = document.createElement('button')
      item.type = 'button'
      item.className = 'lf-cal-toolbar-res-dropdown-item'
      item.setAttribute('role', 'option')
      item.dataset.view = view
      item.textContent = label
      item.addEventListener('click', () => {
        onViewChange(view)
        viewDropOpen.set(false)
      })
      viewDropMenu.appendChild(item)
    }

    // Active indicator in dropdown items
    effect(() => {
      const view = currentView()
      for (const item of Array.from(viewDropMenu.querySelectorAll<HTMLElement>('[data-view]'))) {
        const isActive = item.dataset.view === view
        item.classList.toggle('lf-cal-toolbar-view-item--active', isActive)
        item.setAttribute('aria-selected', String(isActive))
      }
    })

    viewDropWrapper.appendChild(viewDropBtn)
    toolbar.appendChild(viewDropWrapper)
  } else {
    // ── Buttons mode (default) ────────────────────────────────────────────────
    const views = document.createElement('div')
    views.className = getClass('toolbarViews', classes, 'lf-cal-toolbar-views')
    views.setAttribute('role', 'group')
    views.setAttribute('aria-label', t.viewSelector ?? 'Select view')

    const buttonEls: HTMLButtonElement[] = []

    for (const { view, label } of viewDefs) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.textContent = label
      btn.dataset.view = view
      btn.setAttribute('aria-pressed', 'false')
      btn.addEventListener('click', () => onViewChange(view))
      views.appendChild(btn)
      buttonEls.push(btn)
    }

    effect(() => {
      const view = currentView()
      for (const btn of buttonEls) {
        const isActive = btn.dataset.view === view
        btn.classList.toggle('active', isActive)
        btn.setAttribute('aria-pressed', String(isActive))
      }
    })

    toolbar.appendChild(views)
  }

  // Resource toggles (only if resources provided)
  if (resources.length > 0 && onToggleResource && visibleResources) {
    if (toolbarConfig?.resourceDisplay === 'dropdown') {
      // ── Dropdown mode ──────────────────────────────────────────────────────
      const dropdownLabel = toolbarConfig?.resourceDropdownLabel ?? t.resourceDay
      const resMenuId = 'lf-cal-res-drop-menu'

      const wrapper = document.createElement('div')
      wrapper.className = 'lf-cal-toolbar-res-dropdown'

      const toggleBtn = document.createElement('button')
      toggleBtn.type = 'button'
      toggleBtn.className = 'lf-cal-toolbar-res-dropdown-toggle'
      toggleBtn.setAttribute('aria-haspopup', 'listbox')
      toggleBtn.setAttribute('aria-expanded', 'false')
      toggleBtn.setAttribute('aria-controls', resMenuId)

      const labelSpan = document.createElement('span')
      labelSpan.textContent = dropdownLabel
      const chevron = document.createElement('span')
      chevron.className = 'lf-cal-toolbar-res-dropdown-chevron'
      chevron.setAttribute('aria-hidden', 'true')
      chevron.textContent = '▾'
      toggleBtn.appendChild(labelSpan)
      toggleBtn.appendChild(chevron)

      // Menu is appended to body so it escapes any overflow:hidden parent
      const menu = document.createElement('div')
      menu.id = resMenuId
      menu.className = 'lf-cal-toolbar-res-dropdown-menu'
      menu.setAttribute('role', 'listbox')
      menu.setAttribute('aria-multiselectable', 'true')
      menu.setAttribute('aria-label', dropdownLabel)
      document.body.appendChild(menu)

      const openState = signal(false)

      effect(() => {
        const open = openState()
        if (open) positionDropdown(toggleBtn, menu)
        menu.style.display = open ? 'block' : 'none'
        chevron.style.transform = open ? 'rotate(180deg)' : ''
        toggleBtn.setAttribute('aria-expanded', String(open))
      })

      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        openState.update(v => !v)
      })

      // Close on outside click
      const closeOnOutside = (e: MouseEvent) => {
        if (!wrapper.contains(e.target as Node) && !menu.contains(e.target as Node)) {
          openState.set(false)
        }
      }
      document.addEventListener('click', closeOnOutside)
      // Note: cleanup would require onCleanup — acceptable leak for long-lived toolbar

      // Build menu items
      const resourceBtns = new Map<string, { row: HTMLElement; check: HTMLElement }>()

      for (const resource of resources) {
        const row = document.createElement('button')
        row.type = 'button'
        row.className = 'lf-cal-toolbar-res-dropdown-item'
        row.setAttribute('role', 'option')
        row.setAttribute('aria-label', resource.name)
        row.addEventListener('click', (e) => {
          e.stopPropagation()
          onToggleResource(resource.id)
        })

        const check = document.createElement('span')
        check.className = 'lf-cal-toolbar-res-dropdown-check'
        check.setAttribute('aria-hidden', 'true')

        const dot = document.createElement('span')
        dot.className = 'lf-cal-toolbar-resource-dot'
        dot.setAttribute('aria-hidden', 'true')
        if (resource.color) dot.style.background = resource.color

        const name = document.createElement('span')
        name.textContent = resource.name

        row.appendChild(check)
        row.appendChild(dot)
        row.appendChild(name)
        menu.appendChild(row)
        resourceBtns.set(resource.id, { row, check })
      }

      // Reactively update check marks + hidden state
      effect(() => {
        const visible = visibleResources()
        for (const [id, { row, check }] of resourceBtns) {
          const isVisible = visible.includes(id)
          check.textContent = isVisible ? '✓' : ''
          row.classList.toggle('lf-cal-toolbar-res-dropdown-item--hidden', !isVisible)
          row.setAttribute('aria-selected', String(isVisible))
        }
      })

      wrapper.appendChild(toggleBtn)
      toolbar.appendChild(wrapper)
    } else {
      // ── Inline mode (default) ──────────────────────────────────────────────
      const resourcesEl = document.createElement('div')
      resourcesEl.className = 'lf-cal-toolbar-resources'
      resourcesEl.setAttribute('role', 'group')
      resourcesEl.setAttribute('aria-label', t.resources ?? 'Resources')

      const resourceBtns = new Map<string, HTMLButtonElement>()

      for (const resource of resources) {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'lf-cal-toolbar-resource'
        btn.title = resource.name
        btn.setAttribute('aria-label', resource.name)
        btn.setAttribute('aria-pressed', 'true')
        btn.addEventListener('click', () => onToggleResource(resource.id))

        const dot = document.createElement('span')
        dot.className = 'lf-cal-toolbar-resource-dot'
        dot.setAttribute('aria-hidden', 'true')
        if (resource.color) dot.style.background = resource.color

        const label = document.createElement('span')
        label.textContent = resource.name

        btn.appendChild(dot)
        btn.appendChild(label)
        resourcesEl.appendChild(btn)
        resourceBtns.set(resource.id, btn)
      }

      effect(() => {
        const visible = visibleResources()
        for (const [id, btn] of resourceBtns) {
          const isVisible = visible.includes(id)
          btn.classList.toggle('lf-cal-toolbar-resource--hidden', !isVisible)
          btn.setAttribute('aria-pressed', String(isVisible))
        }
      })

      toolbar.appendChild(resourcesEl)
    }
  }

  // ── "⋮ More" actions dropdown ─────────────────────────────────────────────

  const showMoreMenu = toolbarConfig?.showMoreMenu !== false // default: true
  if (showMoreMenu && (onExport || onImport || onPrint || onToggleMiniCalendar)) {
    const moreWrapper = document.createElement('div')
    moreWrapper.className = 'lf-cal-toolbar-more-wrapper'

    const moreMenuId = 'lf-cal-more-menu'

    const moreBtn = document.createElement('button')
    moreBtn.type = 'button'
    moreBtn.className = 'lf-cal-toolbar-more-btn'
    moreBtn.setAttribute('aria-haspopup', 'menu')
    moreBtn.setAttribute('aria-expanded', 'false')
    moreBtn.setAttribute('aria-controls', moreMenuId)
    moreBtn.setAttribute('aria-label', t.moreActions ?? 'More')

    const moreBtnText = document.createElement('span')
    moreBtnText.textContent = '⋮'
    moreBtnText.setAttribute('aria-hidden', 'true')
    moreBtn.appendChild(moreBtnText)

    const moreMenu = document.createElement('div')
    moreMenu.id = moreMenuId
    moreMenu.className = 'lf-cal-toolbar-more-menu'
    moreMenu.setAttribute('role', 'menu')
    moreMenu.setAttribute('aria-label', t.moreActions ?? 'More')
    moreMenu.style.display = 'none'
    document.body.appendChild(moreMenu)

    const moreOpen = signal(false)

    effect(() => {
      const open = moreOpen()
      if (open) positionDropdown(moreBtn, moreMenu)
      moreMenu.style.display = open ? 'block' : 'none'
      moreBtn.setAttribute('aria-expanded', String(open))
    })

    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      moreOpen.update(v => !v)
    })

    const closeModeMenu = (e: MouseEvent) => {
      if (!moreWrapper.contains(e.target as Node) && !moreMenu.contains(e.target as Node)) {
        moreOpen.set(false)
      }
    }
    document.addEventListener('click', closeModeMenu)

    const addMenuItem = (label: string, onClick: () => void): void => {
      const item = document.createElement('button')
      item.type = 'button'
      item.className = 'lf-cal-toolbar-more-item'
      item.setAttribute('role', 'menuitem')
      item.textContent = label
      item.addEventListener('click', () => {
        moreOpen.set(false)
        onClick()
      })
      moreMenu.appendChild(item)
    }

    if (onExport) addMenuItem(t.exportIcal ?? 'Export (.ics)', onExport)

    // Import: hidden file input, menuitem click triggers it
    if (onImport) {
      const fileInput = document.createElement('input')
      fileInput.type = 'file'
      fileInput.accept = '.ics'
      fileInput.style.display = 'none'
      fileInput.addEventListener('change', () => {
        const file = fileInput.files?.[0]
        if (file) {
          onImport(file)
          fileInput.value = '' // reset so same file can be re-imported
        }
      })
      moreMenu.appendChild(fileInput)

      const item = document.createElement('button')
      item.type = 'button'
      item.className = 'lf-cal-toolbar-more-item'
      item.setAttribute('role', 'menuitem')
      item.textContent = t.importIcal ?? 'Import (.ics)'
      item.addEventListener('click', () => {
        moreOpen.set(false)
        fileInput.click()
      })
      moreMenu.appendChild(item)
    }

    if (onPrint) addMenuItem(t.print ?? 'Print', onPrint)

    if (onToggleMiniCalendar) {
      const miniCalItem = document.createElement('button')
      miniCalItem.type = 'button'
      miniCalItem.className = 'lf-cal-toolbar-more-item'
      miniCalItem.setAttribute('role', 'menuitem')
      // label updates reactively based on current visibility
      effect(() => {
        const visible = miniCalendarVisible ? miniCalendarVisible() : true
        miniCalItem.textContent = visible
          ? (t.hideMiniCalendar ?? 'Hide mini calendar')
          : (t.toggleMiniCalendar ?? 'Show mini calendar')
      })
      miniCalItem.addEventListener('click', () => {
        moreOpen.set(false)
        onToggleMiniCalendar()
      })
      moreMenu.appendChild(miniCalItem)
    }

    moreWrapper.appendChild(moreBtn)
    toolbar.appendChild(moreWrapper)
  }

  // ── Mobile view-selector dropdown ─────────────────────────────────────────

  const viewButtons2: Array<{ view: CalendarView; label: string }> = [
    { view: 'day', label: t.day },
    { view: 'resource-day', label: t.resourceDay },
    { view: 'week', label: t.week },
    { view: 'month', label: t.month },
    { view: 'agenda', label: t.agenda },
    { view: 'timeline', label: t.timeline },
    { view: 'quarter', label: t.quarter },
    { view: 'year', label: t.year },
  ]

  const mobileViewSel = document.createElement('div')
  mobileViewSel.className = 'lf-cal-toolbar-mobile-view-sel'

  const mobileMenuId = 'lf-cal-mobile-view-menu'

  const mobileBtn = document.createElement('button')
  mobileBtn.type = 'button'
  mobileBtn.className = 'lf-cal-toolbar-mobile-view-btn'
  mobileBtn.setAttribute('aria-haspopup', 'listbox')
  mobileBtn.setAttribute('aria-expanded', 'false')
  mobileBtn.setAttribute('aria-controls', mobileMenuId)
  mobileBtn.setAttribute('aria-label', t.viewSelector ?? 'Select view')

  const mobileBtnLabel = document.createElement('span')
  const mobileBtnChevron = document.createElement('span')
  mobileBtnChevron.setAttribute('aria-hidden', 'true')
  mobileBtnChevron.textContent = '▾'
  mobileBtn.appendChild(mobileBtnLabel)
  mobileBtn.appendChild(mobileBtnChevron)

  // Update label reactively
  effect(() => {
    const view = currentView()
    const found = viewButtons2.find(vb => vb.view === view)
    mobileBtnLabel.textContent = found ? found.label : view
  })

  const mobileMenu = document.createElement('div')
  mobileMenu.id = mobileMenuId
  mobileMenu.className = 'lf-cal-toolbar-mobile-view-menu'
  mobileMenu.setAttribute('role', 'listbox')
  mobileMenu.setAttribute('aria-label', t.viewSelector ?? 'Select view')
  mobileMenu.style.display = 'none'

  const mobileMenuOpen = signal(false)

  effect(() => {
    const open = mobileMenuOpen()
    mobileMenu.style.display = open ? 'block' : 'none'
    mobileBtn.setAttribute('aria-expanded', String(open))
  })

  mobileBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    mobileMenuOpen.update(v => !v)
  })

  const closeMenuOnOutside = (e: MouseEvent) => {
    if (!mobileViewSel.contains(e.target as Node)) {
      mobileMenuOpen.set(false)
    }
  }
  document.addEventListener('click', closeMenuOnOutside)

  const mobileItemEls: Array<{ item: HTMLButtonElement; view: CalendarView }> = []
  for (const { view, label } of viewButtons2) {
    const item = document.createElement('button')
    item.type = 'button'
    item.className = 'lf-cal-toolbar-mobile-view-item'
    item.setAttribute('role', 'option')
    item.setAttribute('aria-selected', 'false')
    item.dataset.view = view
    item.textContent = label
    item.addEventListener('click', () => {
      onViewChange(view)
      mobileMenuOpen.set(false)
    })
    mobileMenu.appendChild(item)
    mobileItemEls.push({ item, view })
  }

  // Reactive aria-selected for mobile menu items
  effect(() => {
    const view = currentView()
    for (const { item, view: v } of mobileItemEls) {
      item.setAttribute('aria-selected', String(v === view))
    }
  })

  mobileViewSel.appendChild(mobileBtn)
  mobileViewSel.appendChild(mobileMenu)
  toolbar.appendChild(mobileViewSel)

  return toolbar
}
