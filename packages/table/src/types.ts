/**
 * @liteforge/table - Type Definitions
 */

// ─── Filter Definitions ────────────────────────────────────

export interface TextFilterDef {
  type: 'text'
  debounce?: number
}

export interface SelectFilterDef {
  type: 'select'
  options?: string[]
}

export interface BooleanFilterDef {
  type: 'boolean'
}

export interface NumberRangeFilterDef {
  type: 'number-range'
  min?: number
  max?: number
}

export type FilterDef =
  | TextFilterDef
  | SelectFilterDef
  | BooleanFilterDef
  | NumberRangeFilterDef

// ─── Column Meta ───────────────────────────────────────────

/** Static column metadata — available inside every cell renderer */
export interface ColumnMeta {
  /** Field key as a string */
  key: string
  /** Header label */
  header: string
  /** Configured column width, if set */
  width: number | string | undefined
}

// ─── Cell Context ──────────────────────────────────────────

/**
 * The single argument passed to every `cell` renderer.
 * `TValue` is inferred from the column `key` — no casts needed.
 *
 * ```ts
 * { key: 'email', cell: ({ getValue, row }) => <span>{getValue()}</span> }
 * //                                                    ^ string | null ✓
 * ```
 */
export interface CellContext<T, TValue> {
  /** Returns the cell value, typed to T[key] for real fields, undefined for virtual columns */
  getValue: () => TValue
  /** null-safe getValue — returns null instead of undefined */
  renderValue: () => TValue | null
  /** The full row object */
  row: T
  /** Static column metadata */
  column: ColumnMeta
  /** 0-based index of this row in the current paginated view */
  rowIndex: number
  /** Whether this row is currently selected */
  isSelected: boolean
}

// ─── Column Definition ─────────────────────────────────────

export interface ColumnDef<T, TValue = T extends object ? T[keyof T] : unknown> {
  /** Field key in data OR '_prefix' for virtual columns */
  key: keyof T | (string & {})
  /** Display header text */
  header: string
  /** Column width (px number or CSS string like '20%') */
  width?: number | string
  /** Enable sorting on this column (default: false) */
  sortable?: boolean
  /** Enable column filter (default: false) */
  filterable?: boolean
  /** Initial visibility (default: true) */
  visible?: boolean
  /**
   * Custom cell renderer — receives a CellContext with getValue() typed to TValue.
   * TValue is inferred from the column key automatically.
   */
  cell?: (info: CellContext<T, TValue>) => Node | Element
  /** Custom header renderer */
  headerCell?: () => Node | Element
}

// ─── Sorting ───────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc'

export interface SortState {
  key: string
  direction: SortDirection
}

// ─── Search Options ────────────────────────────────────────

export interface SearchOptions<T> {
  enabled: boolean
  placeholder?: string
  columns?: Array<keyof T & string>
}

// ─── Pagination Options ────────────────────────────────────

export interface PaginationLabels {
  /** Text before the range, e.g. "Showing". Default: `"Showing"` */
  showing?: string
  /** Range separator, e.g. "-". Default: `"-"` */
  to?: string
  /** Text before total count, e.g. "of". Default: `"of"` */
  of?: string
  /** Text shown when there are no results. Default: `"No results"` */
  noResults?: string
  /** Prefix for page indicator, e.g. "Page". Default: `"Page"` */
  page?: string
  /** Separator between current and total pages, e.g. "of". Default: `"of"` */
  pageOf?: string
  /** Label for the previous-page button. Default: `"← Prev"` */
  previous?: string
  /** Label for the next-page button. Default: `"Next →"` */
  next?: string
  /** Suffix appended to each page-size option, e.g. "/ page". Default: `"/ page"` */
  perPage?: string
}

export interface PaginationOptions {
  pageSize: number
  pageSizes?: number[]
  labels?: PaginationLabels
}

// ─── Selection Options ─────────────────────────────────────

export interface SelectionOptions {
  enabled: boolean
  mode: 'single' | 'multi'
}

// ─── Style Token Overrides ─────────────────────────────────

/**
 * Per-instance CSS variable overrides (Layer 2).
 * Each key maps to a `--lf-table-*` CSS custom property that is set as an
 * inline style on the table's root element, scoping the override to that
 * instance only.
 */
export interface TableStyles {
  /** Table background color — --lf-table-bg */
  bg?: string
  /** Border color — --lf-table-border */
  border?: string
  /** Border radius — --lf-table-border-radius */
  borderRadius?: string

  /** Header background — --lf-table-header-bg */
  headerBg?: string
  /** Header text color — --lf-table-header-color */
  headerColor?: string
  /** Header font weight — --lf-table-header-font-weight */
  headerFontWeight?: string

  /** Row background — --lf-table-row-bg */
  rowBg?: string
  /** Row hover background — --lf-table-row-bg-hover */
  rowBgHover?: string
  /** Selected row background — --lf-table-row-bg-selected */
  rowBgSelected?: string
  /** Striped row background — --lf-table-row-bg-striped */
  rowBgStriped?: string

  /** Cell padding — --lf-table-cell-padding */
  cellPadding?: string
  /** Cell text color — --lf-table-cell-color */
  cellColor?: string
  /** Cell font size — --lf-table-cell-font-size */
  cellFontSize?: string

  /** Accent / interactive color (sort icons active, button focus) — --lf-table-sort-icon-active */
  accentColor?: string

  /** Inactive sort icon color — --lf-table-sort-icon-color */
  sortIconColor?: string

  /** Pagination footer background — --lf-table-pagination-bg */
  paginationBg?: string

  /** Search input border — --lf-table-search-border */
  searchBorder?: string
  /** Search input focus ring — --lf-table-search-focus */
  searchFocus?: string
}

// ─── CSS Classes Override ──────────────────────────────────

export interface TableClasses {
  root: string
  table: string
  header: string
  headerRow: string
  headerCell: string
  body: string
  row: string
  rowSelected: string
  cell: string
  pagination: string
  paginationInfo: string
  paginationControls: string
  search: string
  searchInput: string
  empty: string
  loading: string
  columnToggle: string
  filters: string
}

// ─── Table Options ─────────────────────────────────────────

export interface TableOptions<T> {
  /** Reactive data source - Signal or getter */
  data: () => T[]
  /** Column definitions - static array or Signal for dynamic columns */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[] | (() => ColumnDef<T, any>[])

  // ── Filtering ──
  /** Global search configuration */
  search?: SearchOptions<T>
  /** Per-column filter definitions */
  filters?: Record<string, FilterDef>

  // ── Pagination ──
  pagination?: PaginationOptions

  // ── Selection ──
  selection?: SelectionOptions

  // ── Column Visibility ──
  /** Show column visibility dropdown (default: false) */
  columnToggle?: boolean

  // ── Row Events ──
  onRowClick?: (row: T) => void
  onRowDoubleClick?: (row: T) => void
  /** Dynamic row CSS class */
  rowClass?: (row: T) => string

  // ── Styling ──
  /** No CSS injected at all (default: false) */
  unstyled?: boolean
  /** Per-instance CSS variable overrides — Layer 2 */
  styles?: TableStyles
  /** Override CSS classes per element — Layer 3 */
  classes?: Partial<TableClasses>
}

// ─── Table Result (Return Type) ────────────────────────────

export interface TableResult<T> {
  /** The rendered table component to mount in JSX */
  Root: () => Node

  // ── Sorting ──
  /** Current sorting state signal */
  sorting: () => SortState | null
  /** Sort by column key */
  sort: (key: string, direction?: SortDirection) => void
  /** Clear all sorting */
  clearSort: () => void

  // ── Search ──
  /** Current search query signal */
  search: () => string
  /** Set search query */
  setSearch: (query: string) => void

  // ── Filters ──
  /** Current filter state signal */
  filters: () => Record<string, unknown>
  /** Set a column filter value */
  setFilter: (key: string, value: unknown) => void
  /** Clear a single column filter */
  clearFilter: (key: string) => void
  /** Clear all column filters */
  clearAllFilters: () => void

  // ── Pagination ──
  /** Current page number (1-indexed) */
  page: () => number
  /** Current page size */
  pageSize: () => number
  /** Total number of pages */
  pageCount: () => number
  /** Total number of rows (unfiltered) */
  totalRows: () => number
  /** Number of rows after filtering */
  filteredRows: () => number
  /** Navigate to a specific page */
  setPage: (page: number) => void
  /** Go to next page */
  nextPage: () => void
  /** Go to previous page */
  prevPage: () => void
  /** Change page size */
  setPageSize: (size: number) => void

  // ── Selection ──
  /** Currently selected rows signal */
  selected: () => T[]
  /** Number of selected rows */
  selectedCount: () => number
  /** Check if a specific row is selected */
  isSelected: (row: T) => boolean
  /** Toggle row selection */
  toggleRow: (row: T) => void
  /** Select all visible rows */
  selectAll: () => void
  /** Deselect all rows */
  deselectAll: () => void

  // ── Column Visibility ──
  /** List of visible column keys */
  visibleColumns: () => string[]
  /** Show a hidden column */
  showColumn: (key: string) => void
  /** Hide a column */
  hideColumn: (key: string) => void
  /** Toggle column visibility */
  toggleColumn: (key: string) => void

  // ── Data Access ──
  /** Current visible rows (filtered, sorted, paginated) */
  rows: () => T[]
}

// ─── columnHelper ──────────────────────────────────────────

/**
 * Type-safe column builder. Binds `T` and `K` in a single call so
 * `getValue()` inside `cell` is narrowed to `T[K]` instead of the
 * union of all field types.
 *
 * ```ts
 * const h = columnHelper<Customer>()
 *
 * createTable<Customer>({
 *   columns: [
 *     h.field('email',    { cell: ({ getValue }) => <span>{getValue()}</span> }),
 *     //                                                    ^ string | null  ✓
 *     h.field('total',    { cell: ({ getValue }) => <span>{getValue().toFixed(2)}</span> }),
 *     //                                                    ^ number  ✓
 *     h.virtual('_actions', { cell: ({ row }) => <button>{row.id}</button> }),
 *     //  getValue() is () => never — virtual columns carry no field value
 *   ],
 * })
 * ```
 */
export function columnHelper<T>(): {
  /**
   * Define a column bound to a real field of T.
   * `getValue()` in the cell renderer is typed to `T[K]`.
   */
  field<K extends keyof T>(key: K, def: Omit<ColumnDef<T, T[K]>, 'key'>): ColumnDef<T, T[K]>
  /**
   * Define a virtual column (no data binding).
   * `getValue()` is typed as `() => never` inside the cell renderer — calling it is a
   * compile-time error. The return type is widened to `ColumnDef<T, any>` so it is
   * assignable to `ColumnDef<T, any>[]` with `exactOptionalPropertyTypes: true`.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  virtual(key: string & {}, def: Omit<ColumnDef<T, never>, 'key'>): ColumnDef<T, any>
} {
  return {
    field<K extends keyof T>(key: K, def: Omit<ColumnDef<T, T[K]>, 'key'>): ColumnDef<T, T[K]> {
      return { ...def, key } as ColumnDef<T, T[K]>
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    virtual(key: string & {}, def: Omit<ColumnDef<T, never>, 'key'>): ColumnDef<T, any> {
      return { ...def, key } as ColumnDef<T, any>
    },
  }
}

// ─── Column Helper (deprecated) ────────────────────────────

/**
 * @deprecated Use `columnHelper<T>()` instead.
 * Will be removed in the next major version.
 */
export function col<T>() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (def: ColumnDef<T, any>): ColumnDef<T> => def
}

// ─── Utility Types ─────────────────────────────────────────

/** Extract nested property value using dot notation */
export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? K | `${K}.${NestedKeyOf<T[K]>}`
        : K
    }[keyof T & string]
  : never
