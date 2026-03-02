/**
 * @liteforge/table - Default CSS Theme
 *
 * Minimal, clean default styles using CSS variables.
 * Injected once when the first table renders (unless unstyled: true).
 */

let stylesInjected = false

const DEFAULT_STYLES = `
/* ─── CSS Variables (Customizable) ─────────────────────────── */

:root {
  --lf-table-bg: #ffffff;
  --lf-table-border: #e2e8f0;
  --lf-table-border-radius: 8px;
  --lf-table-header-bg: #f8fafc;
  --lf-table-header-color: #374151;
  --lf-table-header-font-weight: 600;
  --lf-table-row-bg: #ffffff;
  --lf-table-row-bg-hover: #f1f5f9;
  --lf-table-row-bg-selected: #eff6ff;
  --lf-table-row-bg-striped: #f8fafc;
  --lf-table-cell-padding: 12px 16px;
  --lf-table-cell-color: #1e293b;
  --lf-table-cell-font-size: 14px;
  --lf-table-sort-icon-color: #94a3b8;
  --lf-table-sort-icon-active: #3b82f6;
  --lf-table-pagination-bg: #f8fafc;
  --lf-table-pagination-btn: #3b82f6;
  --lf-table-search-border: #d1d5db;
  --lf-table-search-focus: #3b82f6;
}

/* ─── Root Container ───────────────────────────────────────── */

.lf-table {
  background: var(--lf-table-bg);
  border: 1px solid var(--lf-table-border);
  border-radius: var(--lf-table-border-radius);
  overflow: hidden;
  font-family: system-ui, -apple-system, sans-serif;
}

/* ─── Search ───────────────────────────────────────────────── */

.lf-table-search {
  padding: 12px 16px;
  border-bottom: 1px solid var(--lf-table-border);
}

.lf-table-search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--lf-table-search-border);
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.lf-table-search-input:focus {
  border-color: var(--lf-table-search-focus);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* ─── Column Toggle ────────────────────────────────────────── */

.lf-table-column-toggle {
  position: relative;
  padding: 8px 16px;
  border-bottom: 1px solid var(--lf-table-border);
}

.lf-table-column-toggle-btn {
  padding: 6px 12px;
  border: 1px solid var(--lf-table-border);
  border-radius: 4px;
  background: var(--lf-table-row-bg);
  color: var(--lf-table-cell-color);
  cursor: pointer;
  font-size: 13px;
}

.lf-table-column-toggle-btn:hover {
  background: var(--lf-table-row-bg-hover);
}

.lf-table-column-toggle-dropdown {
  position: absolute;
  top: 100%;
  left: 16px;
  background: var(--lf-table-row-bg);
  border: 1px solid var(--lf-table-border);
  border-radius: 6px;
  padding: 8px 0;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  min-width: 150px;
}

.lf-table-column-toggle-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
}

.lf-table-column-toggle-item:hover {
  background: var(--lf-table-row-bg-hover);
}

/* ─── Filters ──────────────────────────────────────────────── */

.lf-table-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--lf-table-border);
  background: var(--lf-table-header-bg);
}

.lf-table-filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.lf-table-filter-item label {
  font-size: 11px;
  font-weight: 500;
  color: var(--lf-table-header-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.lf-table-filter-item input,
.lf-table-filter-item select {
  padding: 6px 10px;
  border: 1px solid var(--lf-table-search-border);
  border-radius: 4px;
  font-size: 13px;
  min-width: 120px;
}

/* ─── Table Container (Scroll) ─────────────────────────────── */

.lf-table-container {
  overflow-x: auto;
}

/* ─── Table Element ────────────────────────────────────────── */

.lf-table-element {
  width: 100%;
  border-collapse: collapse;
}

/* ─── Header ───────────────────────────────────────────────── */

.lf-table-header {
  background: var(--lf-table-header-bg);
}

.lf-table-header-row {
  border-bottom: 1px solid var(--lf-table-border);
}

.lf-table-header-cell {
  padding: var(--lf-table-cell-padding);
  text-align: left;
  font-size: var(--lf-table-cell-font-size);
  font-weight: var(--lf-table-header-font-weight);
  color: var(--lf-table-header-color);
  white-space: nowrap;
  user-select: none;
}

.lf-table-header-cell--sortable {
  cursor: pointer;
}

.lf-table-header-cell--sortable:hover {
  background: rgba(0,0,0,0.03);
}

.lf-table-header-cell--select {
  width: 40px;
  text-align: center;
}

.lf-table-sort-icon {
  color: var(--lf-table-sort-icon-color);
  margin-left: 4px;
  font-size: 12px;
}

.lf-table-header-cell--sorted-asc .lf-table-sort-icon,
.lf-table-header-cell--sorted-desc .lf-table-sort-icon {
  color: var(--lf-table-sort-icon-active);
}

/* ─── Body ─────────────────────────────────────────────────── */

.lf-table-body {
  background: var(--lf-table-row-bg);
}

.lf-table-row {
  border-bottom: 1px solid var(--lf-table-border);
  transition: background-color 0.15s;
}

.lf-table-row:last-child {
  border-bottom: none;
}

.lf-table-row:hover {
  background: var(--lf-table-row-bg-hover);
}

.lf-table-row--odd {
  background: var(--lf-table-row-bg-striped);
}

.lf-table-row--odd:hover {
  background: var(--lf-table-row-bg-hover);
}

.lf-table-row--selected {
  background: var(--lf-table-row-bg-selected) !important;
}

.lf-table-cell {
  padding: var(--lf-table-cell-padding);
  font-size: var(--lf-table-cell-font-size);
  color: var(--lf-table-cell-color);
}

.lf-table-cell--select {
  width: 40px;
  text-align: center;
}

/* ─── Empty State ──────────────────────────────────────────── */

.lf-table-empty {
  padding: 40px;
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
}

/* ─── Pagination ───────────────────────────────────────────── */

.lf-table-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  background: var(--lf-table-pagination-bg);
  border-top: 1px solid var(--lf-table-border);
  font-size: 13px;
}

.lf-table-pagination-info {
  color: #6b7280;
}

.lf-table-pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.lf-table-pagination-controls button {
  padding: 6px 12px;
  border: 1px solid var(--lf-table-border);
  border-radius: 4px;
  background: var(--lf-table-row-bg);
  color: var(--lf-table-cell-color);
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.15s;
}

.lf-table-pagination-controls button:hover:not(:disabled) {
  background: var(--lf-table-row-bg-hover);
}

.lf-table-pagination-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lf-table-pagination-sizes {
  padding: 6px 10px;
  border: 1px solid var(--lf-table-border);
  border-radius: 4px;
  font-size: 13px;
  background: var(--lf-table-row-bg);
  color: var(--lf-table-cell-color);
}

/* ─── Dark Mode Support ────────────────────────────────────── */

.dark {
  --lf-table-bg: #1e1e2e;
  --lf-table-border: #313244;
  --lf-table-header-bg: #181825;
  --lf-table-header-color: #cdd6f4;
  --lf-table-row-bg: #1e1e2e;
  --lf-table-row-bg-hover: #313244;
  --lf-table-row-bg-selected: #45475a;
  --lf-table-row-bg-striped: #181825;
  --lf-table-cell-color: #cdd6f4;
  --lf-table-pagination-bg: #181825;
  --lf-table-search-border: #45475a;
}

[data-theme="dark"] {
  --lf-table-bg: #1e1e2e;
  --lf-table-border: #313244;
  --lf-table-header-bg: #181825;
  --lf-table-header-color: #cdd6f4;
  --lf-table-row-bg: #1e1e2e;
  --lf-table-row-bg-hover: #313244;
  --lf-table-row-bg-selected: #45475a;
  --lf-table-row-bg-striped: #181825;
  --lf-table-cell-color: #cdd6f4;
  --lf-table-pagination-bg: #181825;
  --lf-table-search-border: #45475a;
}

@media (prefers-color-scheme: dark) {
  :root {
  --lf-table-bg: #1e1e2e;
  --lf-table-border: #313244;
  --lf-table-header-bg: #181825;
  --lf-table-header-color: #cdd6f4;
  --lf-table-row-bg: #1e1e2e;
  --lf-table-row-bg-hover: #313244;
  --lf-table-row-bg-selected: #45475a;
  --lf-table-row-bg-striped: #181825;
  --lf-table-cell-color: #cdd6f4;
  --lf-table-pagination-bg: #181825;
  --lf-table-search-border: #45475a;
  }
}
`

/**
 * Inject default styles into the document head.
 * Called automatically when the first table is created (unless unstyled: true).
 */
export function injectDefaultStyles(): void {
  if (stylesInjected) return
  if (typeof document === 'undefined') return // SSR safety

  const style = document.createElement('style')
  style.id = 'lf-table-styles'
  style.textContent = DEFAULT_STYLES
  document.head.appendChild(style)

  stylesInjected = true
}

/**
 * Reset styles injection flag (for testing)
 */
export function resetStylesInjection(): void {
  stylesInjected = false
  const existing = document.getElementById('lf-table-styles')
  if (existing) {
    existing.remove()
  }
}
