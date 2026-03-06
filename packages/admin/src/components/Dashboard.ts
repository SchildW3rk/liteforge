import { effect, signal } from '@liteforge/core';
import { h } from '@liteforge/runtime';
import type { Client } from '@liteforge/client';
import type { DashboardConfig, DashboardWidgetConfig } from '../types.js';

export interface DashboardProps {
  config: DashboardConfig;
  client: Client;
  basePath: string;
}

function renderWidget(widget: DashboardWidgetConfig, client: Client): Node {
  const loading = signal(false);
  const error = signal<string | null>(null);

  const card = h('div', { class: 'lf-admin-dashboard__widget' }) as HTMLElement;
  const labelEl = h('div', { class: 'lf-admin-dashboard__widget-label' }, widget.label);
  card.appendChild(labelEl);

  if (widget.type === 'custom') {
    if (widget.render) {
      card.appendChild(widget.render());
    }
    return card;
  }

  if (widget.type === 'count') {
    card.classList.add('lf-admin-dashboard__widget--count');
    const valueEl = h('div', { class: 'lf-admin-dashboard__widget-value' }, '—') as HTMLElement;
    const errorEl = h('div', { class: 'lf-admin-error', style: 'display:none;font-size:12px;margin-top:8px' }) as HTMLElement;

    effect(() => {
      const err = error();
      errorEl.style.display = err ? 'block' : 'none';
      if (err) errorEl.textContent = err;
    });

    effect(() => {
      if (loading()) valueEl.textContent = '…';
    });

    card.appendChild(valueEl);
    card.appendChild(errorEl);

    if (widget.resource) {
      loading.set(true);
      void client.resource(widget.resource.endpoint)
        .getList({ pageSize: 1 })
        .then((res) => {
          valueEl.textContent = String((res as { meta?: { total?: number } }).meta?.total ?? 0);
        })
        .catch((err: unknown) => {
          error.set(err instanceof Error ? err.message : 'Error');
        })
        .finally(() => { loading.set(false); });
    } else {
      valueEl.textContent = '—';
    }

    return card;
  }

  if (widget.type === 'list') {
    card.classList.add('lf-admin-dashboard__widget--list');
    const listEl = h('ul', null) as HTMLElement;
    const errorEl = h('div', { class: 'lf-admin-error', style: 'display:none;font-size:12px;margin-top:8px' }) as HTMLElement;

    effect(() => {
      const err = error();
      errorEl.style.display = err ? 'block' : 'none';
      if (err) errorEl.textContent = err;
    });

    const loadingEl = h('div', { style: 'opacity:0.5;font-size:13px;margin-top:8px' }, 'Loading…') as HTMLElement;
    card.appendChild(loadingEl);
    card.appendChild(listEl);
    card.appendChild(errorEl);

    if (widget.resource) {
      const limit = widget.limit ?? 5;
      const firstCol = widget.resource.list.columns[0];
      loading.set(true);
      loadingEl.style.display = 'block';

      void client.resource<Record<string, unknown>>(widget.resource.endpoint)
        .getList({ pageSize: limit })
        .then((res) => {
          loadingEl.style.display = 'none';
          listEl.innerHTML = '';
          for (const item of res.data) {
            const text = firstCol ? String(item[firstCol.field] ?? '') : String(item['id'] ?? '');
            listEl.appendChild(h('li', null, text));
          }
          if (res.data.length === 0) {
            listEl.appendChild(h('li', { style: 'opacity:0.5' }, 'No records'));
          }
        })
        .catch((err: unknown) => {
          loadingEl.style.display = 'none';
          error.set(err instanceof Error ? err.message : 'Error');
        })
        .finally(() => { loading.set(false); });
    }

    return card;
  }

  return card;
}

export function Dashboard(props: DashboardProps): Node {
  const { config, client } = props;

  const grid = h('div', { class: 'lf-admin-dashboard__grid' });

  for (const widget of config.widgets) {
    grid.appendChild(renderWidget(widget, client));
  }

  return h('div', null,
    h('h2', { style: 'font-size:20px;font-weight:600;margin:0 0 20px' }, 'Dashboard'),
    grid,
  );
}
