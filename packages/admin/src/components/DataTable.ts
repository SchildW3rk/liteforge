import { effect } from '@liteforge/core';
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

  if (resource.actions.includes('create')) {
    toolbarChildren.push(
      h('button', {
        class: 'lf-admin-btn lf-admin-btn--primary',
        onclick: () => { if (router) void router.navigate(`${basePath}/${resource.name}/new`); },
      }, `+ New ${resource.label}`),
    );
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

  const columns = resource.list.columns;
  const hasRowActions =
    resource.actions.includes('show') ||
    resource.actions.includes('edit') ||
    resource.actions.includes('destroy') ||
    (resource.rowActions && resource.rowActions.length > 0);

  const headerCells: Node[] = columns.map(col => {
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
  });

  if (hasRowActions) {
    headerCells.push(h('th', { style: 'text-align:right' }, 'Actions'));
  }

  const thead = h('thead', null, h('tr', null, ...headerCells));

  // ── Table body (reactive) ────────────────────────────────────────────────────

  const tbody = h('tbody', null) as HTMLElement;
  const tableEl = h('table', { class: 'lf-admin-table' }, thead, tbody) as HTMLElement;

  const loadingEl = h('div', { class: 'lf-admin-loading' }, 'Loading...') as HTMLElement;

  effect(() => {
    const loading = list.loading();
    const data = list.data();

    if (loadingEl.parentNode && !loading) loadingEl.remove();
    else if (!loadingEl.parentNode && loading && data.length === 0) {
      tableEl.before(loadingEl);
    }

    tbody.innerHTML = '';

    for (const record of data) {
      const cells: Node[] = columns.map(col =>
        h('td', null, formatCellValue(record[col.field], col)),
      );

      if (hasRowActions) {
        const id = record['id'] as string | number;
        const actionBtns: Node[] = [];

        if (resource.actions.includes('show') && router) {
          actionBtns.push(h('button', {
            class: 'lf-admin-btn lf-admin-btn--ghost lf-admin-btn--sm',
            onclick: () => void router!.navigate(`${basePath}/${resource.name}/${id}`),
          }, 'View'));
        }

        if (resource.actions.includes('edit') && router) {
          actionBtns.push(h('button', {
            class: 'lf-admin-btn lf-admin-btn--ghost lf-admin-btn--sm',
            onclick: () => void router!.navigate(`${basePath}/${resource.name}/${id}/edit`),
          }, 'Edit'));
        }

        if (resource.actions.includes('destroy')) {
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

  return h('div', { class: 'lf-admin-table-wrap' },
    toolbar,
    errorEl,
    tableEl,
    pagination,
  );
}
