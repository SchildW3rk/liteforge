/**
 * @liteforge/table - createTable Implementation
 *
 * Signals-based data table with sorting, filtering, pagination, and selection.
 * Uses computed() pipeline for efficient fine-grained updates.
 */

import { signal, computed, effect } from '@liteforge/core'
import type {
  TableOptions,
  TableResult,
  TableStyles,
  SortState,
  SortDirection,
  FilterDef,
  CellContext,
} from './types.js'
import { injectDefaultStyles } from './styles.js'

// ─── Utility Functions ─────────────────────────────────────

/**
 * Extract column key as a string.
 * ColumnDef.key can be keyof T (which may include number | symbol in rare cases),
 * but in practice all table column keys are strings.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function colKey(col: { key: any }): string {
  return String(col.key)
}

/**
 * Get nested property value using dot notation
 * e.g., getNestedValue(obj, 'company.name') → obj.company.name
 */
function getNestedValue<T>(obj: T, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current === null || current === undefined) return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return current
}

/**
 * Compare two values for sorting
 */
function compareValues(a: unknown, b: unknown, direction: SortDirection): number {
  const mult = direction === 'asc' ? 1 : -1

  // Handle null/undefined
  if (a === null || a === undefined) return mult
  if (b === null || b === undefined) return -mult

  // String comparison
  if (typeof a === 'string' && typeof b === 'string') {
    return mult * a.localeCompare(b)
  }

  // Number comparison
  if (typeof a === 'number' && typeof b === 'number') {
    return mult * (a - b)
  }

  // Boolean comparison
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return mult * (a === b ? 0 : a ? -1 : 1)
  }

  // Fallback: convert to string
  return mult * String(a).localeCompare(String(b))
}

/**
 * Check if a value matches a search query (case-insensitive)
 */
function matchesSearch(value: unknown, query: string): boolean {
  if (value === null || value === undefined) return false
  return String(value).toLowerCase().includes(query.toLowerCase())
}

/**
 * Check if a row matches a column filter
 */
function matchesFilter(
  value: unknown,
  filterValue: unknown,
  filterDef: FilterDef
): boolean {
  if (filterValue === null || filterValue === undefined || filterValue === '') {
    return true // No filter applied
  }

  switch (filterDef.type) {
    case 'text':
      return matchesSearch(value, String(filterValue))

    case 'select':
      return value === filterValue

    case 'boolean':
      return value === filterValue

    case 'number-range': {
      const numValue = typeof value === 'number' ? value : Number(value)
      const range = filterValue as { min?: number; max?: number }
      if (isNaN(numValue)) return false
      if (range.min !== undefined && numValue < range.min) return false
      if (range.max !== undefined && numValue > range.max) return false
      return true
    }

    default:
      return true
  }
}

/**
 * Debounce a function
 */
function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  delay: number
): (...args: TArgs) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  return (...args: TArgs) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// ─── createTable ───────────────────────────────────────────

export function createTable<T>(options: TableOptions<T>): TableResult<T> {
  const {
    data,
    columns: columnsInput,
    search: searchOptions,
    filters: filterDefs = {},
    pagination: paginationOptions,
    selection: selectionOptions,
    columnToggle = false,
    onRowClick,
    onRowDoubleClick,
    rowClass,
    unstyled = false,
    styles,
    classes = {},
  } = options

  // Inject default styles if not unstyled
  if (!unstyled) {
    injectDefaultStyles()
  }

  // ─── Internal State (Signals) ────────────────────────────

  // Columns can be static or reactive
  const getColumns = typeof columnsInput === 'function'
    ? columnsInput
    : () => columnsInput

  // Column visibility map
  const columnVisibility = signal<Record<string, boolean>>({})

  // Initialize column visibility from column definitions
  const initVisibility = () => {
    const cols = getColumns()
    const visibility: Record<string, boolean> = {}
    for (const col of cols) {
      visibility[colKey(col)] = col.visible !== false
    }
    columnVisibility.set(visibility)
  }
  initVisibility()

  // Sorting state
  const sortingState = signal<SortState | null>(null)

  // Search query
  const searchQueryState = signal('')

  // Column filters state
  const filtersState = signal<Record<string, unknown>>({})

  // Pagination state
  const currentPage = signal(1)
  const currentPageSize = signal(paginationOptions?.pageSize ?? 10)

  // Selection state (Set of row references)
  const selectedRows = signal<Set<T>>(new Set())

  // ─── Computed Data Pipeline ──────────────────────────────

  // Step 1: Apply search and column filters
  const filteredData = computed(() => {
    let rows = data()
    const query = searchQueryState()
    const activeFilters = filtersState()
    const cols = getColumns()

    // Apply global search
    if (searchOptions?.enabled && query.trim()) {
      const searchCols = searchOptions.columns ?? cols.map(c => String(c.key) as keyof T & string)
      rows = rows.filter(row =>
        searchCols.some(k =>
          matchesSearch(getNestedValue(row, k as string), query)
        )
      )
    }

    // Apply column filters
    for (const [key, filterValue] of Object.entries(activeFilters)) {
      const filterDef = filterDefs[key]
      if (!filterDef) continue

      rows = rows.filter(row => {
        const value = getNestedValue(row, key)
        return matchesFilter(value, filterValue, filterDef)
      })
    }

    return rows
  })

  // Step 2: Apply sorting
  const sortedData = computed(() => {
    const rows = filteredData()
    const sort = sortingState()

    if (!sort) return rows

    return [...rows].sort((a, b) => {
      const aVal = getNestedValue(a, sort.key)
      const bVal = getNestedValue(b, sort.key)
      return compareValues(aVal, bVal, sort.direction)
    })
  })

  // Step 3: Apply pagination
  const paginatedData = computed(() => {
    const rows = sortedData()

    if (!paginationOptions) return rows

    const page = currentPage()
    const size = currentPageSize()
    const start = (page - 1) * size
    return rows.slice(start, start + size)
  })

  // ─── Computed Metadata ───────────────────────────────────

  const totalRowsComputed = computed(() => data().length)
  const filteredRowsComputed = computed(() => filteredData().length)
  const pageCountComputed = computed(() => {
    if (!paginationOptions) return 1
    const filtered = filteredRowsComputed()
    const size = currentPageSize()
    return Math.max(1, Math.ceil(filtered / size))
  })

  const visibleColumnsComputed = computed(() => {
    const cols = getColumns()
    const visibility = columnVisibility()
    return cols.filter(c => visibility[colKey(c)] !== false).map(c => colKey(c))
  })

  const selectedComputed = computed(() => Array.from(selectedRows()))
  const selectedCountComputed = computed(() => selectedRows().size)

  // ─── Reset page when filters/search change ───────────────

  effect(() => {
    // Subscribe to filter changes
    searchQueryState()
    filtersState()
    // Reset to page 1
    currentPage.set(1)
  })

  // ─── API Methods ─────────────────────────────────────────

  // Sorting
  const sort = (key: string, direction?: SortDirection) => {
    const current = sortingState()

    if (direction) {
      sortingState.set({ key, direction })
    } else if (!current || current.key !== key) {
      sortingState.set({ key, direction: 'asc' })
    } else if (current.direction === 'asc') {
      sortingState.set({ key, direction: 'desc' })
    } else {
      sortingState.set(null)
    }
  }

  const clearSort = () => sortingState.set(null)

  // Search
  const setSearch = (query: string) => {
    if (!searchOptions?.enabled) {
      console.warn(
        '[LiteForge/table] setSearch() called but search is not enabled. ' +
        'Pass search: { enabled: true, columns: [...] } to createTable().'
      )
    }
    searchQueryState.set(query)
  }

  // Filters
  const setFilter = (key: string, value: unknown) => {
    filtersState.update((f: Record<string, unknown>) => ({ ...f, [key]: value }))
  }

  const clearFilter = (key: string) => {
    filtersState.update((f: Record<string, unknown>) => {
      const next = { ...f }
      delete next[key]
      return next
    })
  }

  const clearAllFilters = () => {
    filtersState.set({})
    searchQueryState.set('')
  }

  // Pagination
  const setPage = (page: number) => {
    const max = pageCountComputed()
    currentPage.set(Math.max(1, Math.min(page, max)))
  }

  const nextPage = () => setPage(currentPage() + 1)
  const prevPage = () => setPage(currentPage() - 1)

  const setPageSize = (size: number) => {
    currentPageSize.set(size)
    currentPage.set(1) // Reset to first page
  }

  // Selection
  const isSelected = (row: T): boolean => selectedRows().has(row)

  const toggleRow = (row: T) => {
    selectedRows.update((set: Set<T>) => {
      const next = new Set(set)
      if (selectionOptions?.mode === 'single') {
        // Single mode: clear others, toggle this one
        if (next.has(row)) {
          next.clear()
        } else {
          next.clear()
          next.add(row)
        }
      } else {
        // Multi mode: toggle
        if (next.has(row)) {
          next.delete(row)
        } else {
          next.add(row)
        }
      }
      return next
    })
  }

  const selectAll = () => {
    if (selectionOptions?.mode === 'single') return
    selectedRows.set(new Set(paginatedData()))
  }

  const deselectAll = () => {
    selectedRows.set(new Set())
  }

  // Column visibility
  const showColumn = (key: string) => {
    columnVisibility.update((v: Record<string, boolean>) => ({ ...v, [key]: true }))
  }

  const hideColumn = (key: string) => {
    columnVisibility.update((v: Record<string, boolean>) => ({ ...v, [key]: false }))
  }

  const toggleColumn = (key: string) => {
    columnVisibility.update((v: Record<string, boolean>) => ({ ...v, [key]: !v[key] }))
  }

  // ─── Root Component ──────────────────────────────────────

  // Explicit mapping from TableStyles keys to CSS custom property names.
  // Typed as ReadonlyArray so TypeScript narrows the tuple types correctly.
  const STYLE_TOKEN_MAP: ReadonlyArray<readonly [keyof TableStyles, string]> = [
    ['bg',               '--lf-table-bg'],
    ['border',           '--lf-table-border'],
    ['borderRadius',     '--lf-table-border-radius'],
    ['headerBg',         '--lf-table-header-bg'],
    ['headerColor',      '--lf-table-header-color'],
    ['headerFontWeight', '--lf-table-header-font-weight'],
    ['rowBg',            '--lf-table-row-bg'],
    ['rowBgHover',       '--lf-table-row-bg-hover'],
    ['rowBgSelected',    '--lf-table-row-bg-selected'],
    ['rowBgStriped',     '--lf-table-row-bg-striped'],
    ['cellPadding',      '--lf-table-cell-padding'],
    ['cellColor',        '--lf-table-cell-color'],
    ['cellFontSize',     '--lf-table-cell-font-size'],
    ['accentColor',      '--lf-table-sort-icon-active'],
    ['sortIconColor',    '--lf-table-sort-icon-color'],
    ['paginationBg',     '--lf-table-pagination-bg'],
    ['searchBorder',     '--lf-table-search-border'],
    ['searchFocus',      '--lf-table-search-focus'],
  ] as const

  const Root = (): Node => {
    const container = document.createElement('div')
    container.className = classes.root ?? 'lf-table'

    // Apply per-instance style token overrides (Layer 2)
    if (styles !== undefined) {
      for (const [key, cssVar] of STYLE_TOKEN_MAP) {
        const value = styles[key]
        if (value !== undefined) {
          container.style.setProperty(cssVar, value)
        }
      }
    }

    // Search input
    if (searchOptions?.enabled) {
      const searchDiv = document.createElement('div')
      searchDiv.className = classes.search ?? 'lf-table-search'

      const searchInput = document.createElement('input')
      searchInput.type = 'text'
      searchInput.placeholder = searchOptions.placeholder ?? 'Search...'
      searchInput.className = classes.searchInput ?? 'lf-table-search-input'

      // Debounced search handler
      const handleSearch = debounce((value: string) => {
        setSearch(value)
      }, 300)

      searchInput.addEventListener('input', () => {
        handleSearch(searchInput.value)
      })

      // Sync initial value
      effect(() => {
        const query = searchQueryState()
        if (searchInput.value !== query) {
          searchInput.value = query
        }
      })

      searchDiv.appendChild(searchInput)
      container.appendChild(searchDiv)
    }

    // Column toggle dropdown
    if (columnToggle) {
      const toggleDiv = document.createElement('div')
      toggleDiv.className = classes.columnToggle ?? 'lf-table-column-toggle'

      const toggleBtn = document.createElement('button')
      toggleBtn.textContent = 'Columns'
      toggleBtn.className = 'lf-table-column-toggle-btn'

      const dropdown = document.createElement('div')
      dropdown.className = 'lf-table-column-toggle-dropdown'
      dropdown.style.display = 'none'

      toggleBtn.addEventListener('click', () => {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none'
      })

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!toggleDiv.contains(e.target as Node)) {
          dropdown.style.display = 'none'
        }
      })

      // Render column checkboxes
      effect(() => {
        const cols = getColumns()
        const visibility = columnVisibility()
        dropdown.innerHTML = ''

        for (const col of cols) {
          if (colKey(col).startsWith('_')) continue // Skip virtual columns

          const label = document.createElement('label')
          label.className = 'lf-table-column-toggle-item'

          const checkbox = document.createElement('input')
          checkbox.type = 'checkbox'
          checkbox.checked = visibility[colKey(col)] !== false
          checkbox.addEventListener('change', () => {
            toggleColumn(colKey(col))
          })

          const text = document.createTextNode(col.header)

          label.appendChild(checkbox)
          label.appendChild(text)
          dropdown.appendChild(label)
        }
      })

      toggleDiv.appendChild(toggleBtn)
      toggleDiv.appendChild(dropdown)
      container.appendChild(toggleDiv)
    }

    // Column filters row (if any columns are filterable)
    const filterableCols = getColumns().filter(c => c.filterable && filterDefs[colKey(c)])
    if (filterableCols.length > 0) {
      const filtersDiv = document.createElement('div')
      filtersDiv.className = classes.filters ?? 'lf-table-filters'

      for (const col of filterableCols) {
        const filterDef = filterDefs[colKey(col)]
        if (!filterDef) continue

        const filterWrapper = document.createElement('div')
        filterWrapper.className = 'lf-table-filter-item'

        const filterLabel = document.createElement('label')
        filterLabel.textContent = col.header

        if (filterDef.type === 'text') {
          const input = document.createElement('input')
          input.type = 'text'
          input.placeholder = `Filter ${col.header}...`

          const handleInput = debounce((value: string) => {
            setFilter(colKey(col), value || undefined)
          }, filterDef.debounce ?? 300)

          input.addEventListener('input', () => handleInput(input.value))
          filterWrapper.appendChild(filterLabel)
          filterWrapper.appendChild(input)
        } else if (filterDef.type === 'select') {
          const select = document.createElement('select')

          // Generate options from data if not provided
          effect(() => {
            const opts = filterDef.options ?? [...new Set(data().map(row =>
              String(getNestedValue(row, colKey(col)) ?? '')
            ))].filter(Boolean).sort()

            select.innerHTML = '<option value="">All</option>'
            for (const opt of opts) {
              const option = document.createElement('option')
              option.value = opt
              option.textContent = opt
              select.appendChild(option)
            }
          })

          select.addEventListener('change', () => {
            setFilter(colKey(col), select.value || undefined)
          })

          filterWrapper.appendChild(filterLabel)
          filterWrapper.appendChild(select)
        } else if (filterDef.type === 'boolean') {
          const select = document.createElement('select')
          select.innerHTML = `
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          `
          select.addEventListener('change', () => {
            if (select.value === '') {
              clearFilter(colKey(col))
            } else {
              setFilter(colKey(col), select.value === 'true')
            }
          })

          filterWrapper.appendChild(filterLabel)
          filterWrapper.appendChild(select)
        }

        filtersDiv.appendChild(filterWrapper)
      }

      container.appendChild(filtersDiv)
    }

    // Table container (for horizontal scroll)
    const tableContainer = document.createElement('div')
    tableContainer.className = 'lf-table-container'

    // Table element
    const table = document.createElement('table')
    table.className = classes.table ?? 'lf-table-element'

    // Thead
    const thead = document.createElement('thead')
    thead.className = classes.header ?? 'lf-table-header'

    const headerRow = document.createElement('tr')
    headerRow.className = classes.headerRow ?? 'lf-table-header-row'

    // Selection header cell (checkbox for multi-select)
    if (selectionOptions?.enabled && selectionOptions.mode === 'multi') {
      const selectTh = document.createElement('th')
      selectTh.className = 'lf-table-header-cell lf-table-header-cell--select'

      const selectAll_checkbox = document.createElement('input')
      selectAll_checkbox.type = 'checkbox'
      selectAll_checkbox.title = 'Select all'

      // Update checkbox state reactively
      effect(() => {
        const rows = paginatedData()
        const selected = selectedRows()
        const allSelected = rows.length > 0 && rows.every((r: T) => selected.has(r))
        const someSelected = rows.some((r: T) => selected.has(r))
        selectAll_checkbox.checked = allSelected
        selectAll_checkbox.indeterminate = someSelected && !allSelected
      })

      selectAll_checkbox.addEventListener('change', () => {
        if (selectAll_checkbox.checked) {
          selectAll()
        } else {
          deselectAll()
        }
      })

      selectTh.appendChild(selectAll_checkbox)
      headerRow.appendChild(selectTh)
    } else if (selectionOptions?.enabled && selectionOptions.mode === 'single') {
      // Empty cell for single selection radio column
      const selectTh = document.createElement('th')
      selectTh.className = 'lf-table-header-cell lf-table-header-cell--select'
      headerRow.appendChild(selectTh)
    }

    // Render header cells reactively
    effect(() => {
      // Remove old header cells (keep selection cell if present)
      const selectionCellCount = selectionOptions?.enabled ? 1 : 0
      while (headerRow.children.length > selectionCellCount) {
        headerRow.removeChild(headerRow.lastChild!)
      }

      const cols = getColumns()
      const visibility = columnVisibility()
      const currentSort = sortingState()

      for (const col of cols) {
        if (visibility[colKey(col)] === false) continue

        const th = document.createElement('th')
        let thClass = classes.headerCell ?? 'lf-table-header-cell'

        if (col.sortable) {
          thClass += ' lf-table-header-cell--sortable'
          if (currentSort?.key === colKey(col)) {
            thClass += ` lf-table-header-cell--sorted-${currentSort.direction}`
          }
        }
        th.className = thClass

        if (col.width) {
          th.style.width = typeof col.width === 'number' ? `${col.width}px` : col.width
        }

        // Header content
        if (col.headerCell) {
          th.appendChild(col.headerCell())
        } else {
          const headerText = document.createElement('span')
          headerText.textContent = col.header
          th.appendChild(headerText)

          // Sort icon
          if (col.sortable) {
            const sortIcon = document.createElement('span')
            sortIcon.className = 'lf-table-sort-icon'
            if (currentSort?.key === colKey(col)) {
              sortIcon.textContent = currentSort.direction === 'asc' ? ' ▲' : ' ▼'
            } else {
              sortIcon.textContent = ' ⇅'
            }
            th.appendChild(sortIcon)
          }
        }

        // Click to sort
        if (col.sortable) {
          th.style.cursor = 'pointer'
          th.addEventListener('click', () => sort(colKey(col)))
        }

        headerRow.appendChild(th)
      }
    })

    thead.appendChild(headerRow)
    table.appendChild(thead)

    // Tbody
    const tbody = document.createElement('tbody')
    tbody.className = classes.body ?? 'lf-table-body'

    // Render body rows reactively
    effect(() => {
      tbody.innerHTML = ''

      const rows = paginatedData()
      const cols = getColumns()
      const visibility = columnVisibility()
      const selected = selectedRows()

      if (rows.length === 0) {
        // Empty state
        const emptyRow = document.createElement('tr')
        const emptyCell = document.createElement('td')
        emptyCell.className = classes.empty ?? 'lf-table-empty'
        emptyCell.colSpan = cols.filter(c => visibility[colKey(c)] !== false).length +
          (selectionOptions?.enabled ? 1 : 0)
        emptyCell.textContent = 'No data available'
        emptyRow.appendChild(emptyCell)
        tbody.appendChild(emptyRow)
        return
      }

      rows.forEach((row: T, index: number) => {
        const tr = document.createElement('tr')
        let rowClasses = classes.row ?? 'lf-table-row'
        rowClasses += index % 2 === 0 ? ' lf-table-row--even' : ' lf-table-row--odd'

        if (selected.has(row)) {
          rowClasses += ` ${classes.rowSelected ?? 'lf-table-row--selected'}`
        }

        if (rowClass) {
          const customClass = rowClass(row)
          if (customClass) rowClasses += ` ${customClass}`
        }

        tr.className = rowClasses

        // Row click handlers
        if (onRowClick) {
          tr.style.cursor = 'pointer'
          tr.addEventListener('click', (e) => {
            // Don't trigger on selection checkbox click
            if ((e.target as HTMLElement).tagName === 'INPUT') return
            onRowClick(row)
          })
        }

        if (onRowDoubleClick) {
          tr.addEventListener('dblclick', () => onRowDoubleClick(row))
        }

        // Selection cell
        if (selectionOptions?.enabled) {
          const selectTd = document.createElement('td')
          selectTd.className = 'lf-table-cell lf-table-cell--select'

          if (selectionOptions.mode === 'multi') {
            const checkbox = document.createElement('input')
            checkbox.type = 'checkbox'
            checkbox.checked = selected.has(row)
            checkbox.addEventListener('change', () => toggleRow(row))
            selectTd.appendChild(checkbox)
          } else {
            const radio = document.createElement('input')
            radio.type = 'radio'
            radio.name = 'lf-table-select'
            radio.checked = selected.has(row)
            radio.addEventListener('change', () => toggleRow(row))
            selectTd.appendChild(radio)
          }

          tr.appendChild(selectTd)
        }

        // Data cells
        for (const col of cols) {
          if (visibility[colKey(col)] === false) continue

          const td = document.createElement('td')
          td.className = classes.cell ?? 'lf-table-cell'

          // Get value (undefined for virtual columns)
          const value = colKey(col).startsWith('_')
            ? undefined
            : getNestedValue(row, colKey(col))

          if (col.cell) {
            const info: CellContext<T, unknown> = {
              getValue: () => value,
              renderValue: () => value ?? null,
              row,
              column: { key: colKey(col), header: col.header, width: col.width },
              rowIndex: index,
              isSelected: selected.has(row),
            }
            const rendered = col.cell(info as never)
            td.appendChild(rendered)
          } else {
            // Default: text content
            td.textContent = value === null || value === undefined
              ? ''
              : String(value)
          }

          tr.appendChild(td)
        }

        tbody.appendChild(tr)
      })
    })

    table.appendChild(tbody)
    tableContainer.appendChild(table)
    container.appendChild(tableContainer)

    // Pagination
    if (paginationOptions) {
      const lbl = paginationOptions.labels ?? {}
      const lblShowing   = lbl.showing   ?? 'Showing'
      const lblTo        = lbl.to        ?? '-'
      const lblOf        = lbl.of        ?? 'of'
      const lblNoResults = lbl.noResults ?? 'No results'
      const lblPage      = lbl.page      ?? 'Page'
      const lblPageOf    = lbl.pageOf    ?? 'of'
      const lblPrevious  = lbl.previous  ?? '← Prev'
      const lblNext      = lbl.next      ?? 'Next →'
      const lblPerPage   = lbl.perPage   ?? '/ page'

      const paginationDiv = document.createElement('div')
      paginationDiv.className = classes.pagination ?? 'lf-table-pagination'

      // Info: "Showing 1-10 of 100"
      const infoSpan = document.createElement('span')
      infoSpan.className = classes.paginationInfo ?? 'lf-table-pagination-info'

      effect(() => {
        const page = currentPage()
        const size = currentPageSize()
        const total = filteredRowsComputed()
        const start = (page - 1) * size + 1
        const end = Math.min(page * size, total)

        if (total === 0) {
          infoSpan.textContent = lblNoResults
        } else {
          infoSpan.textContent = `${lblShowing} ${start}${lblTo}${end} ${lblOf} ${total}`
        }
      })

      paginationDiv.appendChild(infoSpan)

      // Controls
      const controlsDiv = document.createElement('div')
      controlsDiv.className = classes.paginationControls ?? 'lf-table-pagination-controls'

      const prevBtn = document.createElement('button')
      prevBtn.textContent = lblPrevious
      prevBtn.addEventListener('click', prevPage)

      const pageInfo = document.createElement('span')
      effect(() => {
        pageInfo.textContent = `${lblPage} ${currentPage()} ${lblPageOf} ${pageCountComputed()}`
      })

      const nextBtn = document.createElement('button')
      nextBtn.textContent = lblNext
      nextBtn.addEventListener('click', nextPage)

      // Disable buttons at boundaries
      effect(() => {
        prevBtn.disabled = currentPage() <= 1
        nextBtn.disabled = currentPage() >= pageCountComputed()
      })

      controlsDiv.appendChild(prevBtn)
      controlsDiv.appendChild(pageInfo)
      controlsDiv.appendChild(nextBtn)
      paginationDiv.appendChild(controlsDiv)

      // Page size selector
      if (paginationOptions.pageSizes && paginationOptions.pageSizes.length > 1) {
        const sizeSelect = document.createElement('select')
        sizeSelect.className = 'lf-table-pagination-sizes'

        for (const size of paginationOptions.pageSizes) {
          const option = document.createElement('option')
          option.value = String(size)
          option.textContent = `${size} ${lblPerPage}`
          sizeSelect.appendChild(option)
        }

        effect(() => {
          sizeSelect.value = String(currentPageSize())
        })

        sizeSelect.addEventListener('change', () => {
          setPageSize(Number(sizeSelect.value))
        })

        paginationDiv.appendChild(sizeSelect)
      }

      container.appendChild(paginationDiv)
    }

    return container
  }

  // ─── Return Table API ────────────────────────────────────

  return {
    Root,

    // Sorting
    sorting: () => sortingState(),
    sort,
    clearSort,

    // Search
    search: () => searchQueryState(),
    setSearch,

    // Filters
    filters: () => filtersState(),
    setFilter,
    clearFilter,
    clearAllFilters,

    // Pagination
    page: () => currentPage(),
    pageSize: () => currentPageSize(),
    pageCount: () => pageCountComputed(),
    totalRows: () => totalRowsComputed(),
    filteredRows: () => filteredRowsComputed(),
    setPage,
    nextPage,
    prevPage,
    setPageSize,

    // Selection
    selected: () => selectedComputed(),
    selectedCount: () => selectedCountComputed(),
    isSelected,
    toggleRow,
    selectAll,
    deselectAll,

    // Column visibility
    visibleColumns: () => visibleColumnsComputed(),
    showColumn,
    hideColumn,
    toggleColumn,

    // Data access
    rows: () => paginatedData(),
  }
}
