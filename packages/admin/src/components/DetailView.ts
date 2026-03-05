import { effect } from '@liteforge/core';
import { h, use } from '@liteforge/runtime';
import type { Router } from '@liteforge/router';
import type { Client } from '@liteforge/client';
import type { ResourceDefinition, ColumnConfig } from '../types.js';
import { useRecord } from '../hooks/useRecord.js';

export interface DetailViewProps {
  resource: ResourceDefinition;
  client: Client;
  basePath: string;
}

function formatValue(value: unknown, col?: ColumnConfig): Node {
  if (value === null || value === undefined) {
    return h('span', { style: 'opacity:0.4' }, '—');
  }

  if (col?.renderCell) return col.renderCell(value, {});

  const type = col?.type ?? 'text';

  switch (type) {
    case 'boolean':
      return h('span', null, value ? '✅' : '❌');

    case 'date': {
      let text = String(value);
      try {
        text = new Intl.DateTimeFormat(undefined, {
          dateStyle: 'long',
          timeStyle: 'short',
        }).format(new Date(value as string | number));
      } catch { /* keep raw */ }
      return h('span', null, text);
    }

    case 'image':
      return h('img', {
        src: String(value),
        alt: '',
        style: 'max-width:200px;max-height:200px;border-radius:4px;',
      });

    case 'badge':
      return h('span', { class: 'lf-admin-badge' }, String(value));

    case 'json': {
      let text = String(value);
      try { text = JSON.stringify(value, null, 2); } catch { /* keep */ }
      return h('pre', { style: 'font-size:12px;overflow:auto;max-height:200px;' }, text);
    }

    default:
      if (col?.badge) return h('span', { class: 'lf-admin-badge' }, String(value));
      return h('span', null, String(value));
  }
}

export function DetailView(props: DetailViewProps): Node {
  const { resource, client, basePath } = props;

  let router: Router | undefined;
  try {
    router = use<Router>('router');
  } catch { /* no-op */ }

  const getId = (): string => router?.params()['id'] ?? '';

  const { record, loading, error } = useRecord<Record<string, unknown>>(() =>
    client.resource<Record<string, unknown>>(resource.endpoint).getOne(getId()),
  );

  // ── Header ───────────────────────────────────────────────────────────────────

  const headerChildren: Node[] = [
    h('button', {
      class: 'lf-admin-btn lf-admin-btn--ghost',
      onclick: () => router?.back(),
    }, '← Back'),
    h('h2', { class: 'lf-admin-detail__title' }, resource.label),
  ];

  if (resource.actions.includes('edit') && router) {
    headerChildren.push(
      h('button', {
        class: 'lf-admin-btn lf-admin-btn--primary',
        onclick: () => void router!.navigate(`${basePath}/${resource.name}/${getId()}/edit`),
      }, 'Edit'),
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────────

  const errorEl = h('div', { class: 'lf-admin-error', style: 'display:none' });
  effect(() => {
    const err = error();
    (errorEl as HTMLElement).style.display = err ? 'block' : 'none';
    if (err) errorEl.textContent = err.message;
  });

  // ── Loading / detail card ─────────────────────────────────────────────────────

  const loadingEl = h('div', { class: 'lf-admin-loading' }, 'Loading...');
  const dl = h('dl', { class: 'lf-admin-detail__dl' }) as HTMLElement;
  const card = h('div', { class: 'lf-admin-detail__card', style: 'display:none' }, dl);

  const columns = resource.list.columns;
  const showFields = resource.show?.fields;

  effect(() => {
    const isLoading = loading();
    const rec = record();

    (loadingEl as HTMLElement).style.display = isLoading ? 'block' : 'none';
    (card as HTMLElement).style.display = !isLoading && rec ? 'block' : 'none';

    if (!rec) return;

    dl.innerHTML = '';

    let fieldsToRender: Array<{ field: string; label: string; col?: ColumnConfig }>;

    if (showFields) {
      fieldsToRender = showFields.map(f => {
        const col = columns.find(c => c.field === f);
        const entry: { field: string; label: string; col?: ColumnConfig } = {
          field: f,
          label: col?.label ?? f,
        };
        if (col) entry.col = col;
        return entry;
      });
    } else {
      fieldsToRender = [];
      if ('id' in rec) fieldsToRender.push({ field: 'id', label: 'ID' });
      for (const col of columns) {
        if (col.field !== 'id') fieldsToRender.push({ field: col.field, label: col.label, col });
      }
    }

    for (const { field, label, col } of fieldsToRender) {
      dl.appendChild(h('dt', { class: 'lf-admin-detail__dt' }, label));
      dl.appendChild(h('dd', { class: 'lf-admin-detail__dd' }, formatValue(rec[field], col)));
    }
  });

  return h('div', { class: 'lf-admin-detail' },
    h('div', { class: 'lf-admin-detail__header' }, ...headerChildren),
    errorEl,
    loadingEl,
    card,
  );
}
