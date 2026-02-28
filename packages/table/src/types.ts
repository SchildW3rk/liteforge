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

// ─── Column Definition ─────────────────────────────────────

export interface ColumnDef<T> {
  /** Field key in data OR '_prefix' for virtual columns */
  key: string
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
  /** Custom cell renderer — return JSX/DOM Node */
  cell?: (value: unknown, row: T) => Node
  /** Custom header renderer */
  headerCell?: () => Node
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

export interface PaginationOptions {
  pageSize: number
  pageSizes?: number[]
}

// ─── Selection Options ─────────────────────────────────────

export interface SelectionOptions {
  enabled: boolean
  mode: 'single' | 'multi'
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
  columns: ColumnDef<T>[] | (() => ColumnDef<T>[])

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
  /** Override CSS classes per element */
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
  searchQuery: () => string
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

// ─── Utility Types ─────────────────────────────────────────

/** Extract nested property value using dot notation */
export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? K | `${K}.${NestedKeyOf<T[K]>}`
        : K
    }[keyof T & string]
  : never
