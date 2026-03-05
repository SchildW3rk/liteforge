const STYLES = `
:root {
  --lf-admin-sidebar-bg: #1e1e2e;
  --lf-admin-sidebar-color: #cdd6f4;
  --lf-admin-sidebar-active-bg: #313244;
  --lf-admin-sidebar-active-color: #89b4fa;
  --lf-admin-sidebar-hover-bg: #313244;
  --lf-admin-sidebar-width: 240px;
  --lf-admin-header-bg: #181825;
  --lf-admin-header-color: #cdd6f4;
  --lf-admin-header-height: 56px;
  --lf-admin-content-bg: #11111b;
  --lf-admin-content-color: #cdd6f4;
  --lf-admin-accent: #89b4fa;
  --lf-admin-border: #313244;
  --lf-admin-table-row-hover: #1e1e2e;
  --lf-admin-badge-bg: #313244;
  --lf-admin-badge-color: #cdd6f4;
  --lf-admin-input-bg: #181825;
  --lf-admin-input-border: #313244;
  --lf-admin-input-focus: #89b4fa;
  --lf-admin-button-primary-bg: #89b4fa;
  --lf-admin-button-primary-color: #1e1e2e;
  --lf-admin-button-danger-bg: #f38ba8;
  --lf-admin-button-danger-color: #1e1e2e;
  --lf-admin-overlay-bg: rgba(0,0,0,0.6);
  --lf-admin-card-bg: #1e1e2e;
  --lf-admin-radius: 6px;
  --lf-admin-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

@media (prefers-color-scheme: light) {
  :root {
    --lf-admin-sidebar-bg: #1e3a5f;
    --lf-admin-sidebar-color: #e8f4fd;
    --lf-admin-sidebar-active-bg: #2563eb;
    --lf-admin-sidebar-active-color: #ffffff;
    --lf-admin-sidebar-hover-bg: #1e4080;
    --lf-admin-header-bg: #1a3050;
    --lf-admin-header-color: #e8f4fd;
    --lf-admin-content-bg: #f8fafc;
    --lf-admin-content-color: #1e293b;
    --lf-admin-accent: #2563eb;
    --lf-admin-border: #e2e8f0;
    --lf-admin-table-row-hover: #f1f5f9;
    --lf-admin-badge-bg: #e2e8f0;
    --lf-admin-badge-color: #475569;
    --lf-admin-input-bg: #ffffff;
    --lf-admin-input-border: #e2e8f0;
    --lf-admin-button-primary-bg: #2563eb;
    --lf-admin-button-primary-color: #ffffff;
    --lf-admin-card-bg: #ffffff;
  }
}

[data-theme="light"] {
  --lf-admin-sidebar-bg: #1e3a5f;
  --lf-admin-sidebar-color: #e8f4fd;
  --lf-admin-sidebar-active-bg: #2563eb;
  --lf-admin-sidebar-active-color: #ffffff;
  --lf-admin-sidebar-hover-bg: #1e4080;
  --lf-admin-header-bg: #1a3050;
  --lf-admin-header-color: #e8f4fd;
  --lf-admin-content-bg: #f8fafc;
  --lf-admin-content-color: #1e293b;
  --lf-admin-accent: #2563eb;
  --lf-admin-border: #e2e8f0;
  --lf-admin-table-row-hover: #f1f5f9;
  --lf-admin-badge-bg: #e2e8f0;
  --lf-admin-badge-color: #475569;
  --lf-admin-input-bg: #ffffff;
  --lf-admin-input-border: #e2e8f0;
  --lf-admin-button-primary-bg: #2563eb;
  --lf-admin-button-primary-color: #ffffff;
  --lf-admin-card-bg: #ffffff;
}

/* Layout */
.lf-admin {
  display: flex;
  height: 100vh;
  overflow: hidden;
  font-family: var(--lf-admin-font);
  font-size: 14px;
  color: var(--lf-admin-content-color);
  background: var(--lf-admin-content-bg);
}

.lf-admin-sidebar {
  width: var(--lf-admin-sidebar-width);
  background: var(--lf-admin-sidebar-bg);
  color: var(--lf-admin-sidebar-color);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid var(--lf-admin-border);
}

.lf-admin-sidebar__logo {
  padding: 20px 16px;
  font-size: 18px;
  font-weight: 700;
  color: var(--lf-admin-sidebar-color);
  border-bottom: 1px solid var(--lf-admin-border);
  text-decoration: none;
  display: block;
}

.lf-admin-sidebar__nav {
  padding: 8px 0;
  flex: 1;
}

.lf-admin-sidebar__link {
  display: block;
  padding: 10px 16px;
  color: var(--lf-admin-sidebar-color);
  text-decoration: none;
  border-radius: 0;
  transition: background 0.15s;
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  font-size: 14px;
}

.lf-admin-sidebar__link:hover {
  background: var(--lf-admin-sidebar-hover-bg);
}

.lf-admin-sidebar__link--active {
  background: var(--lf-admin-sidebar-active-bg);
  color: var(--lf-admin-sidebar-active-color);
}

/* Header */
.lf-admin-header {
  height: var(--lf-admin-header-height);
  background: var(--lf-admin-header-bg);
  color: var(--lf-admin-header-color);
  display: flex;
  align-items: center;
  padding: 0 24px;
  border-bottom: 1px solid var(--lf-admin-border);
  flex-shrink: 0;
}

.lf-admin-header__breadcrumb {
  font-size: 14px;
  opacity: 0.8;
}

/* Content */
.lf-admin-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.lf-admin-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: var(--lf-admin-content-bg);
}

/* Table */
.lf-admin-table-wrap {
  background: var(--lf-admin-card-bg);
  border: 1px solid var(--lf-admin-border);
  border-radius: var(--lf-admin-radius);
  overflow: hidden;
}

.lf-admin-toolbar {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid var(--lf-admin-border);
  align-items: center;
  flex-wrap: wrap;
}

.lf-admin-toolbar__title {
  font-size: 18px;
  font-weight: 600;
  flex: 1;
}

.lf-admin-search {
  padding: 6px 12px;
  border: 1px solid var(--lf-admin-input-border);
  border-radius: var(--lf-admin-radius);
  background: var(--lf-admin-input-bg);
  color: var(--lf-admin-content-color);
  font-size: 14px;
  outline: none;
}

.lf-admin-search:focus {
  border-color: var(--lf-admin-input-focus);
}

.lf-admin-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.lf-admin-table th {
  text-align: left;
  padding: 12px 16px;
  background: var(--lf-admin-sidebar-bg);
  color: var(--lf-admin-sidebar-color);
  font-weight: 600;
  border-bottom: 1px solid var(--lf-admin-border);
  white-space: nowrap;
  user-select: none;
}

.lf-admin-table__th--sortable {
  cursor: pointer;
}

.lf-admin-table__th--sortable:hover {
  background: var(--lf-admin-sidebar-hover-bg);
}

.lf-admin-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--lf-admin-border);
  vertical-align: middle;
}

.lf-admin-table__row:hover td {
  background: var(--lf-admin-table-row-hover);
}

.lf-admin-table__row:last-child td {
  border-bottom: none;
}

.lf-admin-table__actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

/* Badge */
.lf-admin-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--lf-admin-badge-bg);
  color: var(--lf-admin-badge-color);
  font-size: 12px;
  font-weight: 500;
}

/* Pagination */
.lf-admin-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding: 12px 16px;
  border-top: 1px solid var(--lf-admin-border);
}

.lf-admin-pagination__info {
  margin-right: auto;
  font-size: 13px;
  opacity: 0.7;
}

/* Buttons */
.lf-admin-btn {
  padding: 6px 14px;
  border: none;
  border-radius: var(--lf-admin-radius);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: opacity 0.15s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.lf-admin-btn:hover {
  opacity: 0.85;
}

.lf-admin-btn--primary {
  background: var(--lf-admin-button-primary-bg);
  color: var(--lf-admin-button-primary-color);
}

.lf-admin-btn--danger {
  background: var(--lf-admin-button-danger-bg);
  color: var(--lf-admin-button-danger-color);
}

.lf-admin-btn--ghost {
  background: transparent;
  color: var(--lf-admin-content-color);
  border: 1px solid var(--lf-admin-border);
}

.lf-admin-btn--sm {
  padding: 4px 10px;
  font-size: 12px;
}

.lf-admin-btn--page {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  background: transparent;
  border: 1px solid var(--lf-admin-border);
  color: var(--lf-admin-content-color);
  border-radius: var(--lf-admin-radius);
  cursor: pointer;
  font-size: 13px;
}

.lf-admin-btn--page.active {
  background: var(--lf-admin-button-primary-bg);
  color: var(--lf-admin-button-primary-color);
  border-color: transparent;
}

/* Form */
.lf-admin-form {
  max-width: 800px;
}

.lf-admin-form__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.lf-admin-form__title {
  font-size: 20px;
  font-weight: 600;
}

.lf-admin-form__grid {
  display: grid;
  gap: 20px;
}

.lf-admin-form__grid--two-column {
  grid-template-columns: 1fr 1fr;
}

.lf-admin-form__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lf-admin-form__field--full {
  grid-column: span 2;
}

.lf-admin-form__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--lf-admin-content-color);
}

.lf-admin-form__label--required::after {
  content: ' *';
  color: var(--lf-admin-button-danger-bg);
}

.lf-admin-form__input,
.lf-admin-form__select,
.lf-admin-form__textarea {
  padding: 8px 12px;
  border: 1px solid var(--lf-admin-input-border);
  border-radius: var(--lf-admin-radius);
  background: var(--lf-admin-input-bg);
  color: var(--lf-admin-content-color);
  font-size: 14px;
  outline: none;
  width: 100%;
  box-sizing: border-box;
  font-family: var(--lf-admin-font);
}

.lf-admin-form__input:focus,
.lf-admin-form__select:focus,
.lf-admin-form__textarea:focus {
  border-color: var(--lf-admin-input-focus);
}

.lf-admin-form__textarea {
  resize: vertical;
  min-height: 100px;
}

.lf-admin-form__error {
  font-size: 12px;
  color: var(--lf-admin-button-danger-bg);
}

.lf-admin-form__actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

/* Detail view */
.lf-admin-detail {
  max-width: 800px;
}

.lf-admin-detail__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.lf-admin-detail__title {
  font-size: 20px;
  font-weight: 600;
  flex: 1;
}

.lf-admin-detail__card {
  background: var(--lf-admin-card-bg);
  border: 1px solid var(--lf-admin-border);
  border-radius: var(--lf-admin-radius);
  padding: 24px;
}

.lf-admin-detail__dl {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 16px 24px;
  margin: 0;
  padding: 0;
}

.lf-admin-detail__dt {
  font-weight: 600;
  color: var(--lf-admin-sidebar-color);
  font-size: 13px;
}

.lf-admin-detail__dd {
  margin: 0;
  word-break: break-word;
}

/* Confirm Dialog */
.lf-admin-overlay {
  position: fixed;
  inset: 0;
  background: var(--lf-admin-overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.lf-admin-dialog {
  background: var(--lf-admin-card-bg);
  border: 1px solid var(--lf-admin-border);
  border-radius: var(--lf-admin-radius);
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

.lf-admin-dialog__title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px;
}

.lf-admin-dialog__message {
  font-size: 14px;
  margin: 0 0 20px;
  opacity: 0.8;
}

.lf-admin-dialog__actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* Loading / Error states */
.lf-admin-loading {
  text-align: center;
  padding: 48px;
  opacity: 0.6;
}

.lf-admin-error {
  padding: 16px;
  background: rgba(243, 139, 168, 0.1);
  border: 1px solid var(--lf-admin-button-danger-bg);
  border-radius: var(--lf-admin-radius);
  color: var(--lf-admin-button-danger-bg);
  margin-bottom: 16px;
}

/* Filter select */
.lf-admin-filter {
  padding: 6px 12px;
  border: 1px solid var(--lf-admin-input-border);
  border-radius: var(--lf-admin-radius);
  background: var(--lf-admin-input-bg);
  color: var(--lf-admin-content-color);
  font-size: 13px;
  outline: none;
}
`;

let injected = false;

export function injectAdminStyles(): void {
  if (injected) return;
  injected = true;
  const style = document.createElement('style');
  style.setAttribute('data-lf-admin', '');
  style.textContent = STYLES;
  document.head.appendChild(style);
}

export function resetStylesInjection(): void {
  injected = false;
}
