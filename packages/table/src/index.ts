/**
 * @liteforge/table
 *
 * Signals-based data table with sorting, filtering, pagination, and selection.
 */

export { createTable } from './table.js'

export type {
  // Main types
  TableOptions,
  TableResult,
  ColumnDef,
  TableClasses,
  TableStyles,

  // Filter types
  FilterDef,
  TextFilterDef,
  SelectFilterDef,
  BooleanFilterDef,
  NumberRangeFilterDef,

  // State types
  SortState,
  SortDirection,
  SearchOptions,
  PaginationOptions,
  SelectionOptions,
} from './types.js'

export { injectDefaultStyles, resetStylesInjection } from './styles.js'
