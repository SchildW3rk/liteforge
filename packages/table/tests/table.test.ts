/**
 * @liteforge/table - Comprehensive Test Suite
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { signal } from '@liteforge/core'
import { createTable, resetStylesInjection } from '../src/index.js'
import type { ColumnDef } from '../src/types.js'

// ─── Test Data ─────────────────────────────────────────────

interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user' | 'editor'
  active: boolean
  company: { name: string }
}

const testUsers: User[] = [
  { id: 1, name: 'Alice', email: 'alice@test.com', role: 'admin', active: true, company: { name: 'Acme' } },
  { id: 2, name: 'Bob', email: 'bob@test.com', role: 'user', active: false, company: { name: 'Corp' } },
  { id: 3, name: 'Charlie', email: 'charlie@test.com', role: 'editor', active: true, company: { name: 'Acme' } },
  { id: 4, name: 'Diana', email: 'diana@test.com', role: 'user', active: true, company: { name: 'Tech' } },
  { id: 5, name: 'Eve', email: 'eve@test.com', role: 'admin', active: false, company: { name: 'Corp' } },
]

const basicColumns: ColumnDef<User>[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email', sortable: true },
  { key: 'role', header: 'Role', sortable: true, filterable: true },
  { key: 'active', header: 'Active' },
]

// ─── Setup ─────────────────────────────────────────────────

beforeEach(() => {
  document.body.innerHTML = ''
  resetStylesInjection()
})

afterEach(() => {
  document.body.innerHTML = ''
})

// ─── Basic Rendering ───────────────────────────────────────

describe('createTable - Basic Rendering', () => {
  it('creates a table with columns and data', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      unstyled: true,
    })

    const root = table.Root()
    document.body.appendChild(root)

    const tableEl = document.querySelector('table')
    expect(tableEl).toBeDefined()

    const headers = document.querySelectorAll('th')
    expect(headers.length).toBe(5)
    expect(headers[0].textContent).toContain('ID')
    expect(headers[1].textContent).toContain('Name')

    const rows = document.querySelectorAll('tbody tr')
    expect(rows.length).toBe(5)
  })

  it('renders cell content correctly', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    const cells = document.querySelectorAll('tbody tr:first-child td')
    expect(cells[0].textContent).toBe('1')
    expect(cells[1].textContent).toBe('Alice')
    expect(cells[2].textContent).toBe('alice@test.com')
  })

  it('shows empty state when no data', () => {
    const table = createTable({
      data: () => [],
      columns: basicColumns,
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    const emptyCell = document.querySelector('.lf-table-empty')
    expect(emptyCell).toBeDefined()
    expect(emptyCell?.textContent).toBe('No data available')
  })

  it('supports custom cell renderers', () => {
    const columns: ColumnDef<User>[] = [
      { key: 'name', header: 'Name' },
      {
        key: 'active',
        header: 'Active',
        cell: (value) => {
          const span = document.createElement('span')
          span.className = value ? 'badge-active' : 'badge-inactive'
          span.textContent = value ? 'Yes' : 'No'
          return span
        },
      },
    ]

    const table = createTable({
      data: () => testUsers,
      columns,
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    const badge = document.querySelector('.badge-active')
    expect(badge).toBeDefined()
    expect(badge?.textContent).toBe('Yes')
  })

  it('supports virtual columns with _ prefix', () => {
    const columns: ColumnDef<User>[] = [
      { key: 'name', header: 'Name' },
      {
        key: '_actions',
        header: 'Actions',
        cell: (_, row) => {
          const btn = document.createElement('button')
          btn.textContent = `Edit ${row.name}`
          btn.className = 'action-btn'
          return btn
        },
      },
    ]

    const table = createTable({
      data: () => testUsers,
      columns,
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    const btn = document.querySelector('.action-btn')
    expect(btn).toBeDefined()
    expect(btn?.textContent).toBe('Edit Alice')
  })

  it('supports nested property access with dot notation', () => {
    const columns: ColumnDef<User>[] = [
      { key: 'name', header: 'Name' },
      { key: 'company.name', header: 'Company' },
    ]

    const table = createTable({
      data: () => testUsers,
      columns,
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    const cells = document.querySelectorAll('tbody tr:first-child td')
    expect(cells[1].textContent).toBe('Acme')
  })
})

// ─── Reactive Data ─────────────────────────────────────────

describe('createTable - Reactive Data', () => {
  it('updates rows when data signal changes', async () => {
    const users = signal<User[]>(testUsers.slice(0, 2))

    const table = createTable({
      data: () => users(),
      columns: basicColumns,
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    let rows = document.querySelectorAll('tbody tr')
    expect(rows.length).toBe(2)

    // Update data
    users.set(testUsers)

    // Wait for effect to run
    await new Promise(r => setTimeout(r, 0))

    rows = document.querySelectorAll('tbody tr')
    expect(rows.length).toBe(5)
  })

  it('exposes rows() signal with current visible data', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      unstyled: true,
    })

    expect(table.rows()).toEqual(testUsers)
    expect(table.totalRows()).toBe(5)
  })
})

// ─── Sorting ───────────────────────────────────────────────

describe('createTable - Sorting', () => {
  it('returns null sorting state initially', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      unstyled: true,
    })

    expect(table.sorting()).toBeNull()
  })

  it('sorts ascending when sort() called', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      unstyled: true,
    })

    table.sort('name')

    expect(table.sorting()).toEqual({ key: 'name', direction: 'asc' })
    expect(table.rows()[0].name).toBe('Alice')
    expect(table.rows()[4].name).toBe('Eve')
  })

  it('toggles to descending on second sort call', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      unstyled: true,
    })

    table.sort('name')
    table.sort('name')

    expect(table.sorting()).toEqual({ key: 'name', direction: 'desc' })
    expect(table.rows()[0].name).toBe('Eve')
  })

  it('clears sorting on third sort call', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      unstyled: true,
    })

    table.sort('name')
    table.sort('name')
    table.sort('name')

    expect(table.sorting()).toBeNull()
  })

  it('allows explicit direction parameter', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      unstyled: true,
    })

    table.sort('name', 'desc')

    expect(table.sorting()).toEqual({ key: 'name', direction: 'desc' })
  })

  it('clearSort() removes sorting', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      unstyled: true,
    })

    table.sort('name')
    expect(table.sorting()).not.toBeNull()

    table.clearSort()
    expect(table.sorting()).toBeNull()
  })

  it('sorts numbers correctly', () => {
    const table = createTable({
      data: () => testUsers,
      columns: [{ key: 'id', header: 'ID', sortable: true }],
      unstyled: true,
    })

    table.sort('id', 'desc')

    expect(table.rows()[0].id).toBe(5)
    expect(table.rows()[4].id).toBe(1)
  })

  it('adds sort classes to header cells', async () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    table.sort('name')
    await new Promise(r => setTimeout(r, 0))

    const nameHeader = document.querySelectorAll('th')[1]
    expect(nameHeader.className).toContain('lf-table-header-cell--sorted-asc')
  })
})

// ─── Search ────────────────────────────────────────────────

describe('createTable - Search', () => {
  it('renders search input when enabled', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      search: { enabled: true },
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    const searchInput = document.querySelector('.lf-table-search-input')
    expect(searchInput).toBeDefined()
  })

  it('filters rows by search query', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      search: { enabled: true },
      unstyled: true,
    })

    table.setSearch('alice')

    expect(table.rows().length).toBe(1)
    expect(table.rows()[0].name).toBe('Alice')
    expect(table.filteredRows()).toBe(1)
  })

  it('searches only specified columns', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      search: { enabled: true, columns: ['email'] },
      unstyled: true,
    })

    // 'alice' is in name, but we only search email
    table.setSearch('alice')
    expect(table.rows().length).toBe(1) // alice@test.com matches

    table.setSearch('Alice')
    expect(table.rows().length).toBe(1) // case insensitive
  })

  it('searchQuery() returns current search value', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      search: { enabled: true },
      unstyled: true,
    })

    expect(table.searchQuery()).toBe('')

    table.setSearch('test')
    expect(table.searchQuery()).toBe('test')
  })

  it('clears search with clearAllFilters()', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      search: { enabled: true },
      unstyled: true,
    })

    table.setSearch('alice')
    expect(table.rows().length).toBe(1)

    table.clearAllFilters()
    expect(table.searchQuery()).toBe('')
    expect(table.rows().length).toBe(5)
  })
})

// ─── Column Filters ────────────────────────────────────────

describe('createTable - Column Filters', () => {
  it('filters by select filter', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      filters: {
        role: { type: 'select' },
      },
      unstyled: true,
    })

    table.setFilter('role', 'admin')

    expect(table.rows().length).toBe(2)
    expect(table.rows().every(u => u.role === 'admin')).toBe(true)
  })

  it('filters by boolean filter', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      filters: {
        active: { type: 'boolean' },
      },
      unstyled: true,
    })

    table.setFilter('active', true)

    expect(table.rows().length).toBe(3)
    expect(table.rows().every(u => u.active)).toBe(true)
  })

  it('filters by text filter', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      filters: {
        name: { type: 'text' },
      },
      unstyled: true,
    })

    table.setFilter('name', 'a')

    // Alice, Charlie, Diana all have 'a' in name
    expect(table.rows().length).toBe(3)
  })

  it('combines multiple filters', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      filters: {
        role: { type: 'select' },
        active: { type: 'boolean' },
      },
      unstyled: true,
    })

    table.setFilter('role', 'admin')
    table.setFilter('active', true)

    // Only Alice is admin + active
    expect(table.rows().length).toBe(1)
    expect(table.rows()[0].name).toBe('Alice')
  })

  it('clears individual filter', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      filters: {
        role: { type: 'select' },
      },
      unstyled: true,
    })

    table.setFilter('role', 'admin')
    expect(table.rows().length).toBe(2)

    table.clearFilter('role')
    expect(table.rows().length).toBe(5)
  })

  it('filters() returns current filter state', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      filters: {
        role: { type: 'select' },
      },
      unstyled: true,
    })

    table.setFilter('role', 'admin')

    expect(table.filters()).toEqual({ role: 'admin' })
  })
})

// ─── Pagination ────────────────────────────────────────────

describe('createTable - Pagination', () => {
  it('paginates data correctly', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      pagination: { pageSize: 2 },
      unstyled: true,
    })

    expect(table.rows().length).toBe(2)
    expect(table.page()).toBe(1)
    expect(table.pageSize()).toBe(2)
    expect(table.pageCount()).toBe(3)
    expect(table.totalRows()).toBe(5)
    expect(table.filteredRows()).toBe(5)
  })

  it('navigates to next/prev page', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      pagination: { pageSize: 2 },
      unstyled: true,
    })

    expect(table.rows()[0].name).toBe('Alice')

    table.nextPage()
    expect(table.page()).toBe(2)
    expect(table.rows()[0].name).toBe('Charlie')

    table.prevPage()
    expect(table.page()).toBe(1)
    expect(table.rows()[0].name).toBe('Alice')
  })

  it('setPage() navigates directly', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      pagination: { pageSize: 2 },
      unstyled: true,
    })

    table.setPage(3)
    expect(table.page()).toBe(3)
    expect(table.rows()[0].name).toBe('Eve')
  })

  it('clamps page to valid range', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      pagination: { pageSize: 2 },
      unstyled: true,
    })

    table.setPage(100)
    expect(table.page()).toBe(3)

    table.setPage(-5)
    expect(table.page()).toBe(1)
  })

  it('setPageSize() changes page size and resets to page 1', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      pagination: { pageSize: 2, pageSizes: [2, 5] },
      unstyled: true,
    })

    table.setPage(2)
    expect(table.page()).toBe(2)

    table.setPageSize(5)
    expect(table.pageSize()).toBe(5)
    expect(table.page()).toBe(1)
    expect(table.rows().length).toBe(5)
  })

  it('renders pagination controls', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      pagination: { pageSize: 2 },
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    const pagination = document.querySelector('.lf-table-pagination')
    expect(pagination).toBeDefined()

    const info = document.querySelector('.lf-table-pagination-info')
    expect(info?.textContent).toContain('1-2')
  })

  it('resets to page 1 when filter changes', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      pagination: { pageSize: 2 },
      search: { enabled: true },
      unstyled: true,
    })

    table.setPage(2)
    expect(table.page()).toBe(2)

    table.setSearch('alice')
    expect(table.page()).toBe(1)
  })
})

// ─── Selection ─────────────────────────────────────────────

describe('createTable - Selection', () => {
  it('supports multi-select mode', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      selection: { enabled: true, mode: 'multi' },
      unstyled: true,
    })

    expect(table.selected()).toEqual([])
    expect(table.selectedCount()).toBe(0)

    table.toggleRow(testUsers[0])
    expect(table.selectedCount()).toBe(1)
    expect(table.isSelected(testUsers[0])).toBe(true)

    table.toggleRow(testUsers[1])
    expect(table.selectedCount()).toBe(2)

    table.toggleRow(testUsers[0])
    expect(table.selectedCount()).toBe(1)
    expect(table.isSelected(testUsers[0])).toBe(false)
  })

  it('supports single-select mode', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      selection: { enabled: true, mode: 'single' },
      unstyled: true,
    })

    table.toggleRow(testUsers[0])
    expect(table.selectedCount()).toBe(1)

    table.toggleRow(testUsers[1])
    expect(table.selectedCount()).toBe(1)
    expect(table.isSelected(testUsers[0])).toBe(false)
    expect(table.isSelected(testUsers[1])).toBe(true)
  })

  it('selectAll() selects all visible rows', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      selection: { enabled: true, mode: 'multi' },
      pagination: { pageSize: 2 },
      unstyled: true,
    })

    table.selectAll()
    expect(table.selectedCount()).toBe(2) // Only current page
  })

  it('deselectAll() clears selection', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      selection: { enabled: true, mode: 'multi' },
      unstyled: true,
    })

    table.selectAll()
    expect(table.selectedCount()).toBe(5)

    table.deselectAll()
    expect(table.selectedCount()).toBe(0)
  })

  it('renders selection checkboxes in multi mode', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      selection: { enabled: true, mode: 'multi' },
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    const headerCheckbox = document.querySelector('thead input[type="checkbox"]')
    expect(headerCheckbox).toBeDefined()

    const rowCheckboxes = document.querySelectorAll('tbody input[type="checkbox"]')
    expect(rowCheckboxes.length).toBe(5)
  })

  it('renders radio buttons in single mode', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      selection: { enabled: true, mode: 'single' },
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    const radios = document.querySelectorAll('tbody input[type="radio"]')
    expect(radios.length).toBe(5)
  })

  it('adds selected class to selected rows', async () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      selection: { enabled: true, mode: 'multi' },
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    table.toggleRow(testUsers[0])
    await new Promise(r => setTimeout(r, 0))

    const firstRow = document.querySelector('tbody tr')
    expect(firstRow?.className).toContain('lf-table-row--selected')
  })
})

// ─── Column Visibility ─────────────────────────────────────

describe('createTable - Column Visibility', () => {
  it('respects initial visible: false', () => {
    const columns: ColumnDef<User>[] = [
      { key: 'name', header: 'Name' },
      { key: 'email', header: 'Email', visible: false },
    ]

    const table = createTable({
      data: () => testUsers,
      columns,
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    const headers = document.querySelectorAll('th')
    expect(headers.length).toBe(1)
    expect(headers[0].textContent).toContain('Name')
  })

  it('visibleColumns() returns list of visible column keys', () => {
    const columns: ColumnDef<User>[] = [
      { key: 'name', header: 'Name' },
      { key: 'email', header: 'Email', visible: false },
      { key: 'role', header: 'Role' },
    ]

    const table = createTable({
      data: () => testUsers,
      columns,
      unstyled: true,
    })

    expect(table.visibleColumns()).toEqual(['name', 'role'])
  })

  it('showColumn() makes a hidden column visible', async () => {
    const columns: ColumnDef<User>[] = [
      { key: 'name', header: 'Name' },
      { key: 'email', header: 'Email', visible: false },
    ]

    const table = createTable({
      data: () => testUsers,
      columns,
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    table.showColumn('email')
    await new Promise(r => setTimeout(r, 0))

    const headers = document.querySelectorAll('th')
    expect(headers.length).toBe(2)
  })

  it('hideColumn() hides a visible column', async () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    table.hideColumn('email')
    await new Promise(r => setTimeout(r, 0))

    expect(table.visibleColumns()).not.toContain('email')
  })

  it('toggleColumn() toggles visibility', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      unstyled: true,
    })

    expect(table.visibleColumns()).toContain('email')

    table.toggleColumn('email')
    expect(table.visibleColumns()).not.toContain('email')

    table.toggleColumn('email')
    expect(table.visibleColumns()).toContain('email')
  })

  it('renders column toggle dropdown when enabled', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      columnToggle: true,
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    const toggleBtn = document.querySelector('.lf-table-column-toggle-btn')
    expect(toggleBtn).toBeDefined()
    expect(toggleBtn?.textContent).toBe('Columns')
  })
})

// ─── Dynamic Columns ───────────────────────────────────────

describe('createTable - Dynamic Columns', () => {
  it('supports columns as signal/getter', async () => {
    const cols = signal<ColumnDef<User>[]>([
      { key: 'name', header: 'Name' },
    ])

    const table = createTable({
      data: () => testUsers,
      columns: () => cols(),
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    let headers = document.querySelectorAll('th')
    expect(headers.length).toBe(1)

    cols.set([
      { key: 'name', header: 'Name' },
      { key: 'email', header: 'Email' },
    ])

    await new Promise(r => setTimeout(r, 0))

    headers = document.querySelectorAll('th')
    expect(headers.length).toBe(2)
  })
})

// ─── Row Events ────────────────────────────────────────────

describe('createTable - Row Events', () => {
  it('calls onRowClick when row is clicked', async () => {
    const onClick = vi.fn()

    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      onRowClick: onClick,
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    const firstRow = document.querySelector('tbody tr') as HTMLElement
    firstRow.click()

    expect(onClick).toHaveBeenCalledWith(testUsers[0])
  })

  it('calls onRowDoubleClick on double-click', async () => {
    const onDblClick = vi.fn()

    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      onRowDoubleClick: onDblClick,
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    const firstRow = document.querySelector('tbody tr') as HTMLElement
    firstRow.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))

    expect(onDblClick).toHaveBeenCalledWith(testUsers[0])
  })

  it('applies rowClass function to rows', async () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      rowClass: (row) => row.active ? 'row-active' : 'row-inactive',
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    const firstRow = document.querySelector('tbody tr')
    expect(firstRow?.className).toContain('row-active')

    const secondRow = document.querySelectorAll('tbody tr')[1]
    expect(secondRow?.className).toContain('row-inactive')
  })
})

// ─── Styling ───────────────────────────────────────────────

describe('createTable - Styling', () => {
  it('injects default styles when not unstyled', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      unstyled: false,
    })

    document.body.appendChild(table.Root())

    const styleEl = document.getElementById('lf-table-styles')
    expect(styleEl).toBeDefined()
  })

  it('does not inject styles when unstyled: true', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    const styleEl = document.getElementById('lf-table-styles')
    expect(styleEl).toBeNull()
  })

  it('applies custom classes when provided', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      classes: {
        root: 'custom-root',
        row: 'custom-row',
      },
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    const root = document.querySelector('.custom-root')
    expect(root).toBeDefined()

    const row = document.querySelector('.custom-row')
    expect(row).toBeDefined()
  })

  it('uses default lf-table-* classes when no override', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    expect(document.querySelector('.lf-table')).toBeDefined()
    expect(document.querySelector('.lf-table-row')).toBeDefined()
    expect(document.querySelector('.lf-table-cell')).toBeDefined()
  })

  it('applies even/odd row classes', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    const rows = document.querySelectorAll('tbody tr')
    expect(rows[0].className).toContain('lf-table-row--even')
    expect(rows[1].className).toContain('lf-table-row--odd')
  })
})

// ─── Data Pipeline ─────────────────────────────────────────

describe('createTable - Data Pipeline', () => {
  it('filter → sort → paginate order is correct', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      search: { enabled: true, columns: ['name'] },  // Only search name column
      pagination: { pageSize: 2 },
      unstyled: true,
    })

    // Filter first: keep only names with 'li' (Alice, Charlie)
    table.setSearch('li')
    expect(table.filteredRows()).toBe(2)

    // Sort by name desc: Charlie, Alice
    table.sort('name', 'desc')
    expect(table.rows()[0].name).toBe('Charlie')

    // Paginate: first 2 are Charlie, Alice
    expect(table.rows().length).toBe(2)
    expect(table.rows()[1].name).toBe('Alice')
  })

  it('filteredRows() reflects post-filter count', () => {
    const table = createTable({
      data: () => testUsers,
      columns: basicColumns,
      search: { enabled: true, columns: ['name'] },  // Only search name column
      unstyled: true,
    })

    expect(table.totalRows()).toBe(5)
    expect(table.filteredRows()).toBe(5)

    table.setSearch('xyz')  // No name contains 'xyz'
    expect(table.totalRows()).toBe(5)
    expect(table.filteredRows()).toBe(0)
  })
})

// ─── Edge Cases ────────────────────────────────────────────

describe('createTable - Edge Cases', () => {
  it('handles null/undefined values gracefully', () => {
    const dataWithNulls = [
      { id: 1, name: null, email: undefined },
      { id: 2, name: 'Bob', email: 'bob@test.com' },
    ]

    const table = createTable({
      data: () => dataWithNulls as unknown as User[],
      columns: [
        { key: 'name', header: 'Name', sortable: true },
        { key: 'email', header: 'Email' },
      ],
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    // Should not crash
    const cells = document.querySelectorAll('tbody tr:first-child td')
    expect(cells[0].textContent).toBe('')
    expect(cells[1].textContent).toBe('')

    // Sorting should handle null (nulls sort to end in ascending)
    table.sort('name', 'asc')
    // Bob comes first (has value), null comes last
    expect(table.rows()[0].name).toBe('Bob')
    expect(table.rows()[1].name).toBeNull()
  })

  it('handles empty columns array', () => {
    const table = createTable({
      data: () => testUsers,
      columns: [],
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    const headers = document.querySelectorAll('th')
    expect(headers.length).toBe(0)
  })

  it('handles rapidly changing data', async () => {
    const users = signal<User[]>([])

    const table = createTable({
      data: () => users(),
      columns: basicColumns,
      unstyled: true,
    })

    document.body.appendChild(table.Root())

    // Rapid updates
    for (let i = 0; i < 10; i++) {
      users.set(testUsers.slice(0, i % 5 + 1))
    }

    await new Promise(r => setTimeout(r, 50))

    // Should stabilize
    expect(table.rows().length).toBe(5) // Last update: slice(0, 5)
  })
})
