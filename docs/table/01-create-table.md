---
title: "createTable"
category: "table"
tags: ["table", "createTable", "sort", "filter", "pagination", "selection", "columns"]
related: ["createQuery", "createForm"]
---

# createTable

> Reactive data grid with sorting, filtering, pagination, and row selection.

## Installation

```bash
npm install @liteforge/table
```

## Quick Start

```tsx
import { createTable } from '@liteforge/table'

const table = createTable<User>({
  data: () => users(),
  columns: [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true, filterable: true },
    {
      key: '_actions',
      header: '',
      cell: ({ row }) => <button onclick={() => edit(row)}>Edit</button>,
    },
  ],
  pagination: { pageSize: 20 },
  selection: { enabled: true, mode: 'multi' },
})

// In JSX:
<table.Root />
```

## API Reference

### `createTable<T>(options)` → `TableResult<T>`

**Options (`TableOptions<T>`):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `data` | `() => T[]` | required | Reactive data source |
| `columns` | `ColumnDef<T>[]` | required | Column definitions |
| `pagination` | `PaginationOptions` | — | Enable and configure pagination |
| `search` | `SearchOptions<T>` | — | Enable global search |
| `selection` | `SelectionOptions` | — | Enable row selection |
| `unstyled` | `boolean` | `false` | Skip default CSS injection |
| `styles` | `TableStyles` | — | CSS variable overrides per instance |
| `classes` | `TableClasses` | — | BEM class overrides |

**`ColumnDef<T, TValue>`:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `key` | `keyof T \| string` | required | Data field key or virtual column prefix (`_actions`, `_status`, etc.) |
| `header` | `string` | required | Header text |
| `width` | `number \| string` | — | Column width |
| `sortable` | `boolean` | `false` | Enable column sort |
| `filterable` | `boolean` | `false` | Enable column filter |
| `visible` | `boolean` | `true` | Initial visibility |
| `cell` | `(info: CellContext<T, TValue>) => Node \| Element` | — | Custom cell renderer |
| `headerCell` | `() => Node \| Element` | — | Custom header renderer |

**`CellContext<T, TValue>`:**

| Property | Type | Description |
|----------|------|-------------|
| `getValue` | `() => TValue` | Cell value typed to `T[key]`; `undefined` for virtual columns |
| `renderValue` | `() => TValue \| null` | null-safe `getValue` — returns `null` instead of `undefined` |
| `row` | `T` | The full row object |
| `column` | `ColumnMeta` | `{ key, header, width }` |
| `rowIndex` | `number` | 0-based index in the current paginated view |
| `isSelected` | `boolean` | Whether this row is currently selected |

```ts
// Typed field access via getValue():
{ key: 'status', header: 'Status', cell: ({ getValue }) => statusBadge(getValue()) }
//                                                                       ^ string | undefined

// Full row access:
{ key: '_actions', header: '', cell: ({ row }) => <button onclick={() => edit(row)}>Edit</button> }

// Destructure what you need:
{ key: 'name', cell: ({ getValue, row, isSelected }) => (
  <a class={isSelected ? 'bold' : ''} href={`/users/${row.id}`}>{getValue()}</a>
)}
```

**`PaginationOptions`:**

| Field | Type | Description |
|-------|------|-------------|
| `pageSize` | `number` | Rows per page |
| `pageSizes` | `number[]` | Options for page size selector |
| `labels` | `PaginationLabels` | Custom text for all pagination strings (i18n) |

**`PaginationLabels`** (all fields optional, English defaults):

| Field | Default | Description |
|-------|---------|-------------|
| `showing` | `"Showing"` | Prefix before the range |
| `to` | `"-"` | Range separator |
| `of` | `"of"` | Separator before total count |
| `noResults` | `"No results"` | Shown when row count is 0 |
| `page` | `"Page"` | Prefix in page indicator |
| `pageOf` | `"of"` | Separator in page indicator |
| `previous` | `"← Prev"` | Previous-page button label |
| `next` | `"Next →"` | Next-page button label |
| `perPage` | `"/ page"` | Suffix in page-size options |

```ts
// German example:
pagination: {
  pageSize: 25,
  labels: {
    showing: 'Zeige', to: 'bis', of: 'von',
    noResults: 'Keine Ergebnisse',
    page: 'Seite', pageOf: 'von',
    previous: '← Zurück', next: 'Weiter →',
    perPage: '/ Seite',
  }
}
```

**`SelectionOptions`:**

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | `boolean` | Enable selection |
| `mode` | `'single' \| 'multi'` | Single or multi-select |

**Returns (`TableResult<T>`):**

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `Root` | `ComponentFactory` | The full table component |
| `rows` | `Signal<T[]>` | Current visible (paginated) rows |
| `allFilteredRows` | `Signal<T[]>` | All rows after filter/sort (before pagination) |
| `totalRows` | `Signal<number>` | Total filtered row count |
| `sort` | `Signal<SortState \| null>` | Current sort state |
| `setSort(key, dir?)` | Method | Set sort state |
| `page` | `Signal<number>` | Current page (1-based) |
| `pageSize` | `Signal<number>` | Current page size |
| `setPage(n)` | Method | Go to page |
| `search` | `Signal<string>` | Current search query |
| `setSearch(q)` | Method | Set search query |
| `filters` | `Signal<Record<string, unknown>>` | Column filter values |
| `setFilter(key, value)` | Method | Set a column filter |
| `selected` | `Signal<Set<T>>` | Selected rows |
| `selectAll()` | Method | Select all filtered rows |
| `deselectAll()` | Method | Clear selection |
| `visibleColumns` | `Signal<ColumnDef<T>[]>` | Currently visible columns |
| `toggleColumn(key)` | Method | Show/hide a column |

## Examples

### Search and pagination

```tsx
<input
  value={() => table.search()}
  oninput={(e) => table.setSearch(e.target.value)}
  placeholder="Search..."
/>

<table.Root />

<div>
  Page {() => table.page()} of {() => Math.ceil(table.totalRows() / table.pageSize())}
  <button onclick={() => table.setPage(table.page() - 1)}>Prev</button>
  <button onclick={() => table.setPage(table.page() + 1)}>Next</button>
</div>
```

### Row selection

```tsx
const table = createTable<User>({
  data: () => users(),
  columns: [...],
  selection: { enabled: true, mode: 'multi' },
})

<button onclick={() => deleteSelected(table.selected())}>
  Delete {() => table.selected().size} selected
</button>
<table.Root />
```

## Column type inference — `columnHelper<T>()`

When columns are written as plain objects in a `ColumnDef<T>[]` array, TypeScript cannot infer a literal type for `key`, so `getValue()` returns the union of all field types. Use `columnHelper<T>()` to bind `key` and `TValue` in a single typed call — before the array is created:

```ts
import { createTable, columnHelper } from '@liteforge/table'

const h = columnHelper<Customer>()

createTable<Customer>({
  data: () => customers(),
  columns: [
    h.field('email',  { cell: ({ getValue }) => <span>{getValue() ?? '—'}</span> }),
    //                                                   ^ string | null  ✓
    h.field('total',  { cell: ({ getValue }) => <span>{getValue().toFixed(2)}</span> }),
    //                                                   ^ number  ✓
    h.virtual('_actions', { cell: ({ row }) => <button>{row.name}</button> }),
    //  getValue() is () => never — calling it is a compile-time error
  ],
})
```

- **`h.field(key, def)`** — real field column; `getValue()` returns `T[key]`
- **`h.virtual(key, def)`** — virtual column (no data binding); `getValue()` is `() => never`

Without `columnHelper`, plain object syntax still works — `getValue()` just returns the union of all field types:
```

## Notes

- `data` must be a reactive getter `() => myData()` — not a static array.
- Custom `cell` renderers return a DOM `Node` or `Element` — use JSX or `document.createElement`.
- `_`-prefixed column keys (like `_actions`) are virtual columns with no data binding.
- `unstyled: true` skips the automatic CSS injection — bring your own styles using BEM classes `.lf-table-*`.
