# @liteforge/table

Signals-based data table with sorting, filtering, pagination, and selection for LiteForge.

## Installation

```bash
npm install @liteforge/table @liteforge/core @liteforge/runtime
```

Peer dependencies: `@liteforge/core >= 0.1.0`, `@liteforge/runtime >= 0.1.0`

## Overview

`@liteforge/table` provides a full-featured, reactive data table component. All state is signal-based for automatic reactivity.

## Basic Usage

```tsx
import { createTable } from '@liteforge/table'

const table = createTable({
  data: () => users,
  columns: [
    { key: 'id', header: 'ID', width: 60 },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true }
  ]
})

// In JSX
<table.Root />
```

## API

### createTable

Creates a reactive table instance.

```ts
import { createTable } from '@liteforge/table'

const table = createTable<User>({
  // Data source (signal or getter)
  data: () => usersQuery.data() ?? [],
  
  // Column definitions
  columns: [
    { key: 'id', header: 'ID', width: 60, sortable: true },
    { key: 'name', header: 'Name', sortable: true, filterable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'company.name', header: 'Company', sortable: true },  // Nested access
    {
      key: 'website',
      header: 'Website',
      cell: (value) => <a href={`https://${value}`}>{value}</a>
    },
    {
      key: '_actions',  // Virtual column (no data field)
      header: '',
      cell: (_, row) => (
        <button onclick={() => editUser(row)}>Edit</button>
      )
    }
  ],
  
  // Features
  search: {
    enabled: true,
    columns: ['name', 'email'],
    placeholder: 'Search users...'
  },
  
  filters: {
    'company.name': { type: 'select' }
  },
  
  pagination: {
    pageSize: 20,
    pageSizes: [10, 20, 50, 100]
  },
  
  selection: {
    enabled: true,
    mode: 'multi'  // 'single' | 'multi'
  },
  
  columnToggle: true,
  
  // Callbacks
  onRowClick: (row) => navigate(`/users/${row.id}`),
  rowClass: (row) => row.active ? '' : 'row-inactive'
})
```

### Column Definition

```ts
interface ColumnDef<T> {
  key: string                     // Data field or '_prefix' for virtual
  header: string                  // Column header text
  width?: number | string         // Column width
  sortable?: boolean              // Enable sorting
  filterable?: boolean            // Enable filtering
  visible?: boolean               // Initial visibility (default: true)
  cell?: (value, row) => Node     // Custom cell renderer
  headerCell?: () => Node         // Custom header renderer
}
```

### Table State

All state properties are signals:

```ts
// Sorting
table.sorting()              // { key: string, direction: 'asc' | 'desc' } | null
table.sort('name', 'asc')    // Set sort
table.clearSort()            // Remove sort

// Search
table.searchQuery()          // Current search text
table.setSearch('query')     // Set search text

// Filters
table.filters()              // { 'company.name': 'Acme', ... }
table.setFilter('status', 'active')
table.clearFilter('status')
table.clearAllFilters()

// Pagination
table.page()                 // Current page (0-indexed)
table.setPage(2)
table.nextPage()
table.prevPage()
table.pageSize()             // Items per page
table.setPageSize(50)
table.totalPages()           // Total number of pages
table.totalRows()            // Total rows before pagination

// Selection
table.selected()             // Selected rows
table.selectedCount()        // Number of selected rows
table.selectAll()
table.deselectAll()
table.toggleRow(row)
table.isSelected(row)        // Check if row is selected

// Columns
table.visibleColumns()       // Array of visible column keys
table.showColumn('email')
table.hideColumn('email')
table.toggleColumn('email')

// Processed data
table.rows()                 // Current visible rows (filtered + sorted + paginated)
```

### Filter Types

```ts
const table = createTable({
  data: () => users,
  columns: [...],
  filters: {
    // Text filter (with debounce)
    name: { type: 'text', debounce: 300 },
    
    // Select filter (options auto-generated from data)
    status: { type: 'select' },
    
    // Select with custom options
    role: {
      type: 'select',
      options: [
        { value: 'admin', label: 'Administrator' },
        { value: 'user', label: 'User' }
      ]
    },
    
    // Boolean filter
    active: { type: 'boolean' },
    
    // Number range filter
    age: { type: 'number-range', min: 0, max: 120 }
  }
})
```

### Styling

The table provides three styling layers:

**1. BEM classes (always present):**
```css
.lf-table
.lf-table-header
.lf-table-row
.lf-table-cell
.lf-table-pagination
/* etc. */
```

**2. CSS Variables (override defaults):**
```css
:root {
  --lf-table-border-color: #e5e7eb;
  --lf-table-header-bg: #f9fafb;
  --lf-table-row-hover: #f3f4f6;
  --lf-table-selected-bg: #eff6ff;
}
```

**3. Custom classes (Tailwind, etc.):**
```ts
const table = createTable({
  data: () => users,
  columns: [...],
  classes: {
    root: 'rounded-lg shadow',
    header: 'bg-gray-100',
    row: 'hover:bg-gray-50',
    cell: 'px-4 py-2'
  }
})
```

**4. Unstyled mode:**
```ts
const table = createTable({
  data: () => users,
  columns: [...],
  unstyled: true  // No default styles injected
})
```

## Usage in Components

```tsx
import { createComponent } from '@liteforge/runtime'
import { createQuery } from '@liteforge/query'
import { createTable } from '@liteforge/table'

const UserTable = createComponent({
  component: () => {
    const users = createQuery({
      key: 'users',
      fn: () => fetch('/api/users').then(r => r.json())
    })
    
    const table = createTable({
      data: () => users.data() ?? [],
      columns: [
        { key: 'name', header: 'Name', sortable: true },
        { key: 'email', header: 'Email', sortable: true },
        { key: 'role', header: 'Role', filterable: true },
        {
          key: '_actions',
          header: '',
          cell: (_, row) => (
            <div>
              <button onclick={() => editUser(row)}>Edit</button>
              <button onclick={() => deleteUser(row.id)}>Delete</button>
            </div>
          )
        }
      ],
      search: { enabled: true, columns: ['name', 'email'] },
      pagination: { pageSize: 25 },
      selection: { enabled: true, mode: 'multi' }
    })
    
    const handleBulkDelete = () => {
      const ids = table.selected().map(u => u.id)
      deleteUsers(ids)
      table.deselectAll()
    }
    
    return (
      <div>
        <Show when={() => table.selectedCount() > 0}>
          <button onclick={handleBulkDelete}>
            Delete {() => table.selectedCount()} selected
          </button>
        </Show>
        
        <table.Root />
      </div>
    )
  }
})
```

## Types

```ts
import type {
  TableOptions,
  TableResult,
  ColumnDef,
  TableClasses,
  FilterDef,
  TextFilterDef,
  SelectFilterDef,
  BooleanFilterDef,
  NumberRangeFilterDef,
  SortState,
  SortDirection,
  SearchOptions,
  PaginationOptions,
  SelectionOptions
} from '@liteforge/table'
```

## License

MIT
