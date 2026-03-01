/**
 * @liteforge/calendar - Default CSS Theme
 */

let stylesInjected = false

const DEFAULT_STYLES = `
/* ─── CSS Variables ─────────────────────────────────────── */

:root {
  --lf-cal-bg: #ffffff;
  --lf-cal-border: #e2e8f0;
  --lf-cal-border-radius: 8px;
  --lf-cal-slot-height: 40px;
  --lf-cal-header-bg: #f8fafc;
  --lf-cal-header-color: #374151;
  --lf-cal-header-font-weight: 600;
  --lf-cal-today-bg: #eff6ff;
  --lf-cal-weekend-bg: #fafafa;
  --lf-cal-now-color: #ef4444;
  --lf-cal-now-width: 2px;
  --lf-cal-event-radius: 4px;
  --lf-cal-event-font-size: 12px;
  --lf-cal-event-padding: 2px 6px;
  --lf-cal-event-default-bg: #3b82f6;
  --lf-cal-event-default-color: #ffffff;
  --lf-cal-blocked-bg: #f1f5f9;
  --lf-cal-blocked-pattern: repeating-linear-gradient(
    45deg, transparent, transparent 5px, rgba(0,0,0,0.03) 5px, rgba(0,0,0,0.03) 10px
  );
  --lf-cal-selection-bg: rgba(59, 130, 246, 0.15);
  --lf-cal-selection-border: #3b82f6;
  --lf-cal-drag-opacity: 0.7;
  --lf-cal-time-color: #94a3b8;
  --lf-cal-time-font-size: 11px;
  --lf-cal-time-width: 60px;
}

/* ─── Root Container ────────────────────────────────────── */

.lf-cal {
  background: var(--lf-cal-bg);
  border: 1px solid var(--lf-cal-border);
  border-radius: var(--lf-cal-border-radius);
  overflow: hidden;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 14px;
}

/* ─── Toolbar ───────────────────────────────────────────── */

.lf-cal-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--lf-cal-header-bg);
  border-bottom: 1px solid var(--lf-cal-border);
  gap: 16px;
}

.lf-cal-toolbar-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lf-cal-toolbar-nav button {
  padding: 6px 12px;
  border: 1px solid var(--lf-cal-border);
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.15s;
}

.lf-cal-toolbar-nav button:hover {
  background: var(--lf-cal-today-bg);
}

.lf-cal-toolbar-title {
  font-size: 16px;
  font-weight: var(--lf-cal-header-font-weight);
  color: var(--lf-cal-header-color);
  min-width: 200px;
  text-align: center;
}

.lf-cal-toolbar-views {
  display: flex;
  gap: 4px;
}

.lf-cal-toolbar-views button {
  padding: 6px 12px;
  border: 1px solid var(--lf-cal-border);
  background: white;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
}

.lf-cal-toolbar-views button:first-child {
  border-radius: 4px 0 0 4px;
}

.lf-cal-toolbar-views button:last-child {
  border-radius: 0 4px 4px 0;
}

.lf-cal-toolbar-views button:not(:first-child) {
  margin-left: -1px;
}

.lf-cal-toolbar-views button:hover {
  background: var(--lf-cal-today-bg);
}

.lf-cal-toolbar-views button.active {
  background: var(--lf-cal-event-default-bg);
  color: white;
  border-color: var(--lf-cal-event-default-bg);
}

/* ─── Header ────────────────────────────────────────────── */

.lf-cal-header {
  display: flex;
  border-bottom: 1px solid var(--lf-cal-border);
  background: var(--lf-cal-header-bg);
}

.lf-cal-header-time-spacer {
  width: var(--lf-cal-time-width);
  flex-shrink: 0;
  border-right: 1px solid var(--lf-cal-border);
}

.lf-cal-header-cell {
  flex: 1;
  padding: 8px 4px;
  text-align: center;
  font-size: 13px;
  font-weight: var(--lf-cal-header-font-weight);
  color: var(--lf-cal-header-color);
  border-right: 1px solid var(--lf-cal-border);
}

.lf-cal-header-cell:last-child {
  border-right: none;
}

.lf-cal-header-cell--today {
  background: var(--lf-cal-today-bg);
  color: var(--lf-cal-event-default-bg);
}

.lf-cal-header-cell--weekend {
  background: var(--lf-cal-weekend-bg);
}

.lf-cal-header-day-name {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  opacity: 0.7;
}

.lf-cal-header-day-number {
  font-size: 18px;
  font-weight: 600;
}

/* ─── All-Day Row ───────────────────────────────────────── */

.lf-cal-allday-row {
  display: flex;
  border-bottom: 1px solid var(--lf-cal-border);
  background: var(--lf-cal-header-bg);
  min-height: 28px;
}

.lf-cal-allday-label {
  width: var(--lf-cal-time-width);
  flex-shrink: 0;
  border-right: 1px solid var(--lf-cal-border);
  padding: 4px 8px;
  font-size: var(--lf-cal-time-font-size);
  color: var(--lf-cal-time-color);
  text-align: right;
}

.lf-cal-allday-cells {
  flex: 1;
  display: flex;
}

.lf-cal-allday-cell {
  flex: 1;
  padding: 2px;
  border-right: 1px solid var(--lf-cal-border);
  min-height: 24px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lf-cal-allday-cell:last-child {
  border-right: none;
}

/* ─── Body / Grid ───────────────────────────────────────── */

.lf-cal-body {
  display: flex;
  overflow-y: auto;
  max-height: 600px;
}

.lf-cal-time-column {
  width: var(--lf-cal-time-width);
  flex-shrink: 0;
  border-right: 1px solid var(--lf-cal-border);
}

.lf-cal-time-label {
  height: var(--lf-cal-slot-height);
  padding: 0 8px;
  font-size: var(--lf-cal-time-font-size);
  color: var(--lf-cal-time-color);
  text-align: right;
  line-height: 1;
  position: relative;
  top: -6px;
}

.lf-cal-grid {
  flex: 1;
  display: flex;
  position: relative;
}

.lf-cal-day-column {
  flex: 1;
  position: relative;
  border-right: 1px solid var(--lf-cal-border);
}

.lf-cal-day-column:last-child {
  border-right: none;
}

.lf-cal-day-column--today {
  background: var(--lf-cal-today-bg);
}

.lf-cal-day-column--weekend {
  background: var(--lf-cal-weekend-bg);
}

.lf-cal-resource-column {
  flex: 1;
  position: relative;
  border-right: 1px solid var(--lf-cal-border);
}

.lf-cal-resource-column:last-child {
  border-right: none;
}

/* ─── Time Slots ────────────────────────────────────────── */

.lf-cal-time-slot {
  height: var(--lf-cal-slot-height);
  border-bottom: 1px solid var(--lf-cal-border);
  box-sizing: border-box;
}

.lf-cal-time-slot:last-child {
  border-bottom: none;
}

.lf-cal-time-slot--blocked {
  background: var(--lf-cal-blocked-bg);
  background-image: var(--lf-cal-blocked-pattern);
}

.lf-cal-time-slot--selected {
  background: var(--lf-cal-selection-bg);
}

.lf-cal-time-slot--hour {
  border-bottom-color: #cbd5e1;
}

/* ─── Events ────────────────────────────────────────────── */

.lf-cal-event {
  position: absolute;
  left: 2px;
  right: 2px;
  padding: var(--lf-cal-event-padding);
  border-radius: var(--lf-cal-event-radius);
  font-size: var(--lf-cal-event-font-size);
  background: var(--lf-cal-event-default-bg);
  color: var(--lf-cal-event-default-color);
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.15s;
  z-index: 1;
  box-sizing: border-box;
  border-left: 3px solid rgba(0,0,0,0.2);
}

.lf-cal-event:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 50;
  min-width: 150px;
  max-width: 250px;
  width: max-content;
}

.lf-cal-event:hover .lf-cal-event-title {
  white-space: normal;
  word-break: break-word;
}

.lf-cal-event--dragging {
  opacity: var(--lf-cal-drag-opacity);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  z-index: 100;
  cursor: grabbing;
}

.lf-cal-event--ghost {
  pointer-events: none;
  z-index: 10000;
  border: 2px dashed rgba(255,255,255,0.5);
}

.lf-cal-event--resizing {
  z-index: 100;
}

.lf-cal-event[data-editable="true"] {
  cursor: grab;
}

.lf-cal-day-column--drop-target {
  background: var(--lf-cal-selection-bg);
}

.lf-cal-time-slot--drop-target {
  background: var(--lf-cal-selection-bg);
  border: 1px dashed var(--lf-cal-selection-border);
}

.lf-cal-event--selected {
  box-shadow: 0 0 0 2px var(--lf-cal-selection-border);
}

.lf-cal-event--allday {
  position: relative;
  left: auto;
  right: auto;
  top: auto;
  width: auto;
  height: auto;
  margin: 0;
  padding: 2px 6px;
  font-size: 11px;
  border-left: none;
  border-radius: 3px;
}

.lf-cal-event-title {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lf-cal-event-time {
  font-size: 10px;
  opacity: 0.8;
}

.lf-cal-event-resize-handle {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 8px;
  cursor: ns-resize;
}

/* ─── Now Indicator ─────────────────────────────────────── */

.lf-cal-now-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: var(--lf-cal-now-width, 2px);
  background: var(--lf-cal-now-color);
  z-index: 100;
  pointer-events: none;
  box-shadow: 0 0 3px var(--lf-cal-now-color);
}

.lf-cal-now-indicator::before {
  content: '';
  position: absolute;
  left: 0;
  top: -4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--lf-cal-now-color);
  transform: translateX(-4px);
}

.lf-cal-now-indicator--no-dot::before {
  display: none;
}

/* ─── Month View ────────────────────────────────────────── */

.lf-cal-month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.lf-cal-month-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: var(--lf-cal-header-bg);
  border-bottom: 1px solid var(--lf-cal-border);
}

.lf-cal-month-header-cell {
  padding: 8px;
  text-align: center;
  font-size: 12px;
  font-weight: var(--lf-cal-header-font-weight);
  color: var(--lf-cal-header-color);
  text-transform: uppercase;
}

.lf-cal-month-cell {
  min-height: 100px;
  padding: 4px;
  border-right: 1px solid var(--lf-cal-border);
  border-bottom: 1px solid var(--lf-cal-border);
  background: var(--lf-cal-bg);
}

.lf-cal-month-cell:nth-child(7n) {
  border-right: none;
}

.lf-cal-month-cell--today {
  background: var(--lf-cal-today-bg);
}

.lf-cal-month-cell--other-month {
  background: var(--lf-cal-weekend-bg);
  opacity: 0.6;
}

.lf-cal-month-cell--weekend {
  background: var(--lf-cal-weekend-bg);
}

.lf-cal-month-day-number {
  font-size: 14px;
  font-weight: 500;
  color: var(--lf-cal-header-color);
  margin-bottom: 4px;
}

.lf-cal-month-cell--today .lf-cal-month-day-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: var(--lf-cal-event-default-bg);
  color: white;
  border-radius: 50%;
}

.lf-cal-month-event {
  padding: 2px 4px;
  margin-bottom: 2px;
  font-size: 11px;
  border-radius: 2px;
  background: var(--lf-cal-event-default-bg);
  color: var(--lf-cal-event-default-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}

.lf-cal-month-event:hover {
  filter: brightness(0.9);
}

.lf-cal-month-more {
  font-size: 11px;
  color: var(--lf-cal-event-default-bg);
  cursor: pointer;
  padding: 2px 4px;
}

.lf-cal-month-more:hover {
  text-decoration: underline;
}

/* ─── Agenda View ───────────────────────────────────────── */

.lf-cal-agenda {
  padding: 0;
  overflow-y: auto;
  max-height: 600px;
}

.lf-cal-agenda-day {
  border-bottom: 1px solid var(--lf-cal-border);
}

.lf-cal-agenda-day:last-child {
  border-bottom: none;
}

.lf-cal-agenda-day-header {
  padding: 12px 16px;
  background: var(--lf-cal-header-bg);
  font-weight: var(--lf-cal-header-font-weight);
  color: var(--lf-cal-header-color);
  font-size: 13px;
  position: sticky;
  top: 0;
}

.lf-cal-agenda-day-header--today {
  background: var(--lf-cal-today-bg);
  color: var(--lf-cal-event-default-bg);
}

.lf-cal-agenda-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  gap: 16px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.lf-cal-agenda-item:hover {
  background: var(--lf-cal-today-bg);
}

.lf-cal-agenda-item-time {
  width: 100px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--lf-cal-time-color);
}

.lf-cal-agenda-item-indicator {
  width: 4px;
  height: 40px;
  border-radius: 2px;
  background: var(--lf-cal-event-default-bg);
  flex-shrink: 0;
}

.lf-cal-agenda-item-content {
  flex: 1;
}

.lf-cal-agenda-item-title {
  font-weight: 500;
  color: var(--lf-cal-header-color);
  margin-bottom: 2px;
}

.lf-cal-agenda-item-details {
  font-size: 13px;
  color: var(--lf-cal-time-color);
}

/* ─── Empty State ───────────────────────────────────────── */

.lf-cal-empty {
  padding: 40px;
  text-align: center;
  color: var(--lf-cal-time-color);
}

/* ─── Dark Mode ─────────────────────────────────────────── */

[data-theme="dark"] {
  --lf-cal-bg: #1e1e2e;
  --lf-cal-border: #313244;
  --lf-cal-header-bg: #181825;
  --lf-cal-header-color: #cdd6f4;
  --lf-cal-today-bg: rgba(137, 180, 250, 0.1);
  --lf-cal-weekend-bg: #181825;
  --lf-cal-blocked-bg: #11111b;
  --lf-cal-time-color: #6c7086;
}
`

export function injectCalendarStyles(): void {
  if (stylesInjected) return
  if (typeof document === 'undefined') return

  const style = document.createElement('style')
  style.id = 'lf-calendar-styles'
  style.textContent = DEFAULT_STYLES
  document.head.appendChild(style)

  stylesInjected = true
}

export function resetCalendarStylesInjection(): void {
  stylesInjected = false
  const existing = document.getElementById('lf-calendar-styles')
  if (existing) {
    existing.remove()
  }
}
