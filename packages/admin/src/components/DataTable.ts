import { effect, signal, onCleanup } from '@liteforge/core';
import { h, use } from '@liteforge/runtime';
import type { Router } from '@liteforge/router';
import type { Client } from '@liteforge/client';
import type { ResourceDefinition, ColumnConfig } from '../types.js';
import { useList } from '../hooks/useList.js';
import { useResource } from '../hooks/useResource.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import type { UseListOptions } from '../hooks/useList.js';

export interface DataTableProps {
  resource: ResourceDefinition;
  client: Client;
  basePath: string;
}

function evalPerm<T>(
  perm: boolean | ((record: T) => boolean) | undefined,
  record: T,
): boolean {
  if (perm === undefined) return true;
  if (typeof perm === 'boolean') return perm;
  return perm(record);
}

function triggerDownload(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatCellValue(value: unknown, col: ColumnConfig): Node {
  if (col.renderCell) {
    return col.renderCell(value, {});
  }

  if (value === null || value === undefined) {
    return h('span', { style: 'opacity:0.4' }, '—');
  }

  const type = col.type ?? 'text';

  switch (type) {
    case 'boolean':
      return h('span', null, value ? '✅' : '❌');

    case 'date': {
      let text = String(value);
      try {
        text = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
          new Date(value as string | number),
        );
      } catch { /* keep raw string */ }
      return h('span', null, text);
    }

    case 'badge':
      return h('span', { class: 'lf-admin-badge' }, String(value));

    case 'image': {
      const img = h('img', { src: String(value), alt: '', style: 'width:40px;height:40px;object-fit:cover;border-radius:4px;' });
      return img;
    }

    default:
      if (col.badge) return h('span', { class: 'lf-admin-badge' }, String(value));
      return h('span', null, String(value));
  }
}

export function DataTable(props: DataTableProps): Node {
  const { resource, client, basePath } = props;

  let router: Router | undefined;
  try {
    router = use<Router>('router');
  } catch { /* no-op */ }

  const res = useResource({ resource, client });
  const columns = resource.list.columns;

  // ── Export helpers ────────────────────────────────────────────────────────────

  function exportCurrentPage(format: 'csv' | 'json', data: Record<string, unknown>[]): void {
    if (format === 'json') {
      triggerDownload(JSON.stringify(data, null, 2), `${resource.name}.json`, 'application/json');
    } else {
      const header = columns.map(c => JSON.stringify(c.label)).join(',');
      const rows = data.map(row =>
        columns.map(c => {
          const v = row[c.field];
          return v == null ? '' : JSON.stringify(String(v));
        }).join(','),
      );
      triggerDownload([header, ...rows].join('\n'), `${resource.name}.csv`, 'text/csv');
    }
  }

  // ── Bulk selection state ──────────────────────────────────────────────────────

  const selectedIds = signal<(string | number)[]>([]);
  const hasBulkFeature =
    resource.actions.includes('destroy') ||
    (resource.bulkActions !== undefined && resource.bulkActions.length > 0);

  const listOptions: UseListOptions<Record<string, unknown>> = {
    fetchFn: (params) => client.resource<Record<string, unknown>>(resource.endpoint).getList(params),
    pageSize: resource.list.pageSize ?? 20,
  };
  if (resource.list.defaultSort) listOptions.defaultSort = resource.list.defaultSort;
  if (resource.list.searchable) listOptions.searchable = resource.list.searchable;

  const list = useList<Record<string, unknown>>(listOptions);
  const pageSize = resource.list.pageSize ?? 20;

  // ── Toolbar ──────────────────────────────────────────────────────────────────

  const titleEl = h('span', { class: 'lf-admin-toolbar__title' }, resource.label);

  const toolbarChildren: Node[] = [titleEl];

  if (resource.list.searchable && resource.list.searchable.length > 0) {
    const searchInput = h('input', {
      type: 'search',
      placeholder: 'Search...',
      class: 'lf-admin-search',
    }) as HTMLInputElement;
    let searchTimer: ReturnType<typeof setTimeout> | null = null;
    searchInput.addEventListener('input', () => {
      if (searchTimer) clearTimeout(searchTimer);
      searchTimer = setTimeout(() => list.setSearch(searchInput.value), 300);
    });
    toolbarChildren.push(searchInput);
  }

  for (const filter of resource.list.filters ?? []) {
    const sel = h('select', { class: 'lf-admin-filter' },
      h('option', { value: '' }, filter.label),
      ...filter.options.map(opt => h('option', { value: opt.value }, opt.label)),
    ) as HTMLSelectElement;
    sel.addEventListener('change', () => list.setFilter(filter.field, sel.value));
    toolbarChildren.push(sel);
  }

  const canCreate = evalPerm(resource.permissions?.canCreate as boolean | (() => boolean) | undefined, {} as Record<string, unknown>);
  if (resource.actions.includes('create') && canCreate) {
    toolbarChildren.push(
      h('button', {
        class: 'lf-admin-btn lf-admin-btn--primary',
        onclick: () => { if (router) void router.navigate(`${basePath}/${resource.name}/new`); },
      }, `+ New ${resource.label}`),
    );
  }

  // Export dropdown
  if (columns.length > 0) {
    const exportOpen = signal(false);

    const exportDropdown = h('div', { class: 'lf-admin-export-dropdown', style: 'display:none' },
      h('button', { onclick: () => { exportCurrentPage('csv', list.data()); exportOpen.set(false); } }, 'Export CSV'),
      h('button', { onclick: () => { exportCurrentPage('json', list.data()); exportOpen.set(false); } }, 'Export JSON'),
    ) as HTMLElement;

    effect(() => {
      exportDropdown.style.display = exportOpen() ? 'block' : 'none';
    });

    const exportToggleBtn = h('button', {
      class: 'lf-admin-btn lf-admin-btn--ghost lf-admin-btn--sm',
      onclick: (e: Event) => { e.stopPropagation(); exportOpen.update(v => !v); },
    }, '↓ Export');

    const clickAway = (): void => exportOpen.set(false);
    document.addEventListener('click', clickAway);
    onCleanup(() => document.removeEventListener('click', clickAway));

    toolbarChildren.push(h('div', { class: 'lf-admin-export-menu' }, exportToggleBtn, exportDropdown));
  }

  const toolbar = h('div', { class: 'lf-admin-toolbar' }, ...toolbarChildren);

  // ── Error ────────────────────────────────────────────────────────────────────

  const errorEl = h('div', { class: 'lf-admin-error', style: 'display:none;margin:16px' });
  effect(() => {
    const err = list.error();
    (errorEl as HTMLElement).style.display = err ? 'block' : 'none';
    if (err) errorEl.textContent = err.message;
  });

  // ── Table header ─────────────────────────────────────────────────────────────

  const hasRowActions =
    resource.actions.includes('show') ||
    resource.actions.includes('edit') ||
    resource.actions.includes('destroy') ||
    (resource.rowActions && resource.rowActions.length > 0);

  const headerCells: Node[] = [];

  // Master checkbox
  if (hasBulkFeature) {
    const masterCb = h('input', { type: 'checkbox', style: 'cursor:pointer' }) as HTMLInputElement;
    effect(() => {
      const data = list.data();
      const selected = selectedIds();
      if (data.length === 0) {
        masterCb.indeterminate = false;
        masterCb.checked = false;
      } else if (selected.length === data.length) {
        masterCb.indeterminate = false;
        masterCb.checked = true;
      } else if (selected.length > 0) {
        masterCb.indeterminate = true;
        masterCb.checked = false;
      } else {
        masterCb.indeterminate = false;
        masterCb.checked = false;
      }
    });
    masterCb.addEventListener('change', () => {
      if (masterCb.checked) {
        selectedIds.set(list.data().map(r => r['id'] as string | number));
      } else {
        selectedIds.set([]);
      }
    });
    headerCells.push(h('th', { style: 'width:40px;text-align:center' }, masterCb));
  }

  headerCells.push(...columns.map(col => {
    if (!col.sortable) return h('th', null, col.label);

    const sortIcon = h('span', { style: 'margin-left:4px' }, ' ↕');
    effect(() => {
      const s = list.sort();
      sortIcon.textContent = s?.field === col.field
        ? (s.direction === 'asc' ? ' ▲' : ' ▼')
        : ' ↕';
    });

    const th = h('th', {
      class: 'lf-admin-table__th--sortable',
      onclick: () => list.setSort(col.field),
    }, col.label, sortIcon);
    return th;
  }));

  if (hasRowActions) {
    headerCells.push(h('th', { style: 'text-align:right' }, 'Actions'));
  }

  const thead = h('thead', null, h('tr', null, ...headerCells));

  // ── Table body (reactive) ────────────────────────────────────────────────────

  const tbody = h('tbody', null) as HTMLElement;
  const tableEl = h('table', { class: 'lf-admin-table' }, thead, tbody) as HTMLElement;

  const loadingEl = h('div', { class: 'lf-admin-loading' }, 'Loading...') as HTMLElement;

  // ── Bulk bar ─────────────────────────────────────────────────────────────────

  const bulkBar = hasBulkFeature ? (() => {
    const countEl = h('span', { class: 'lf-admin-bulk-bar__count' }, '0 selected') as HTMLElement;

    const actionBtns: Node[] = [];

    if (resource.actions.includes('destroy')) {
      const deleteBtn = h('button', {
        class: 'lf-admin-btn lf-admin-btn--danger lf-admin-btn--sm',
        onclick: () => {
          const ids = selectedIds();
          const dialog = ConfirmDialog({
            message: `Delete ${ids.length} selected item(s)? This cannot be undone.`,
            onConfirm: async () => {
              for (const id of ids) await res.destroy(id);
              selectedIds.set([]);
              list.refresh();
            },
            onCancel: () => {},
          });
          document.body.appendChild(dialog);
        },
      }, 'Delete selected');
      actionBtns.push(deleteBtn);
    }

    for (const bulkAction of resource.bulkActions ?? []) {
      const btn = h('button', {
        class: 'lf-admin-btn lf-admin-btn--ghost lf-admin-btn--sm',
        onclick: () => {
          const ids = selectedIds();
          void bulkAction.action(ids).then(() => {
            selectedIds.set([]);
            list.refresh();
          });
        },
      }, bulkAction.label);
      actionBtns.push(btn);
    }

    const clearBtn = h('button', {
      class: 'lf-admin-btn lf-admin-btn--ghost lf-admin-btn--sm',
      onclick: () => selectedIds.set([]),
    }, 'Clear');

    const bar = h('div', { class: 'lf-admin-bulk-bar', style: 'display:none' },
      countEl, ...actionBtns, clearBtn,
    ) as HTMLElement;

    effect(() => {
      const count = selectedIds().length;
      bar.style.display = count > 0 ? 'flex' : 'none';
      countEl.textContent = `${count} selected`;
    });

    return bar;
  })() : null;

  // Reset selection on page change
  if (hasBulkFeature) {
    effect(() => {
      list.page(); // track page signal
      selectedIds.set([]);
    });
  }

  effect(() => {
    const loading = list.loading();
    const data = list.data();

    if (loadingEl.parentNode && !loading) loadingEl.remove();
    else if (!loadingEl.parentNode && loading && data.length === 0) {
      tableEl.before(loadingEl);
    }

    tbody.innerHTML = '';

    for (const record of data) {
      const id = record['id'] as string | number;
      const cells: Node[] = [];

      // Row checkbox
      if (hasBulkFeature) {
        const rowCb = h('input', { type: 'checkbox', style: 'cursor:pointer' }) as HTMLInputElement;
        rowCb.checked = selectedIds().includes(id);
        rowCb.addEventListener('change', () => {
          if (rowCb.checked) {
            selectedIds.update(ids => [...ids, id]);
          } else {
            selectedIds.update(ids => ids.filter(x => x !== id));
          }
        });
        cells.push(h('td', { style: 'width:40px;text-align:center' }, rowCb));
      }

      cells.push(...columns.map(col =>
        h('td', null, formatCellValue(record[col.field], col)),
      ));

      if (hasRowActions) {
        const actionBtns: Node[] = [];

        if (resource.actions.includes('show') && router && evalPerm(resource.permissions?.canView, record)) {
          actionBtns.push(h('button', {
            class: 'lf-admin-btn lf-admin-btn--ghost lf-admin-btn--sm',
            onclick: () => void router!.navigate(`${basePath}/${resource.name}/${id}`),
          }, 'View'));
        }

        if (resource.actions.includes('edit') && router && evalPerm(resource.permissions?.canEdit, record)) {
          actionBtns.push(h('button', {
            class: 'lf-admin-btn lf-admin-btn--ghost lf-admin-btn--sm',
            onclick: () => void router!.navigate(`${basePath}/${resource.name}/${id}/edit`),
          }, 'Edit'));
        }

        if (resource.actions.includes('destroy') && evalPerm(resource.permissions?.canDestroy, record)) {
          actionBtns.push(h('button', {
            class: 'lf-admin-btn lf-admin-btn--danger lf-admin-btn--sm',
            onclick: () => {
              const dialog = ConfirmDialog({
                message: `Delete this ${resource.label}? This action cannot be undone.`,
                onConfirm: async () => { await res.destroy(id); list.refresh(); },
                onCancel: () => {},
              });
              document.body.appendChild(dialog);
            },
          }, 'Delete'));
        }

        for (const rowAction of resource.rowActions ?? []) {
          if (rowAction.show && !rowAction.show(record)) continue;
          actionBtns.push(h('button', {
            class: 'lf-admin-btn lf-admin-btn--ghost lf-admin-btn--sm',
            onclick: () => {
              const result = rowAction.action(record);
              if (result instanceof Promise) void result.then(() => list.refresh());
            },
          }, rowAction.label));
        }

        cells.push(h('td', null, h('div', { class: 'lf-admin-table__actions' }, ...actionBtns)));
      }

      tbody.appendChild(h('tr', { class: 'lf-admin-table__row' }, ...cells));
    }
  });

  // ── Pagination ───────────────────────────────────────────────────────────────

  const infoEl = h('span', { class: 'lf-admin-pagination__info' });

  const prevBtn = h('button', {
    class: 'lf-admin-btn--page',
    onclick: () => { const p = list.page(); if (p > 1) list.setPage(p - 1); },
  }, '←') as HTMLButtonElement;

  const nextBtn = h('button', {
    class: 'lf-admin-btn--page',
    onclick: () => {
      const p = list.page();
      if (p < Math.ceil(list.total() / pageSize)) list.setPage(p + 1);
    },
  }, '→') as HTMLButtonElement;

  const pageButtonsContainer = h('div', { style: 'display:flex;gap:4px' }) as HTMLElement;

  effect(() => {
    const total = list.total();
    const page = list.page();
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);

    infoEl.textContent = total > 0 ? `${start}–${end} of ${total}` : 'No results';
    (prevBtn as HTMLButtonElement).disabled = page <= 1;
    (nextBtn as HTMLButtonElement).disabled = page >= totalPages;

    pageButtonsContainer.innerHTML = '';
    const winStart = Math.max(1, Math.min(page - 2, totalPages - 4));
    const winEnd = Math.min(totalPages, winStart + 4);
    for (let p = winStart; p <= winEnd; p++) {
      const pageNum = p;
      pageButtonsContainer.appendChild(
        h('button', {
          class: 'lf-admin-btn--page' + (p === page ? ' active' : ''),
          onclick: () => list.setPage(pageNum),
        }, String(p)),
      );
    }
  });

  const pagination = h('div', { class: 'lf-admin-pagination' },
    infoEl,
    h('div', { style: 'display:flex;gap:4px' }, prevBtn, pageButtonsContainer, nextBtn),
  );

  const wrapChildren: Node[] = [toolbar];
  if (bulkBar) wrapChildren.push(bulkBar);
  wrapChildren.push(errorEl, tableEl, pagination);

  return h('div', { class: 'lf-admin-table-wrap' }, ...wrapChildren);
}
