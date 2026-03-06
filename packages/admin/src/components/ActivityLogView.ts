import { effect } from '@liteforge/core';
import { h } from '@liteforge/runtime';
import { activityLog, clearActivityLog } from '../core/activityLog.js';

const ICONS: Record<string, string> = { create: '✚', update: '✎', delete: '✕' };

export function ActivityLogView(): Node {
  const listEl = h('ul', { class: 'lf-admin-activity__list' }) as HTMLElement;

  effect(() => {
    const entries = activityLog();
    listEl.innerHTML = '';
    if (entries.length === 0) {
      listEl.appendChild(h('div', { class: 'lf-admin-activity__empty' }, 'No activity yet.'));
      return;
    }
    for (const entry of entries) {
      const timeStr = entry.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      const dateStr = entry.timestamp.toLocaleDateString(undefined, { dateStyle: 'medium' } as Intl.DateTimeFormatOptions);
      listEl.appendChild(h('li', { class: 'lf-admin-activity__item' },
        h('div', { class: `lf-admin-activity__icon lf-admin-activity__icon--${entry.action}` }, ICONS[entry.action] ?? '?'),
        h('div', { class: 'lf-admin-activity__body' },
          h('div', { class: 'lf-admin-activity__label' }, `${entry.resourceLabel} #${entry.recordId} ${entry.action}d`),
          h('div', { class: 'lf-admin-activity__meta' }, `${dateStr} ${timeStr}`),
        ),
      ));
    }
  });

  return h('div', { class: 'lf-admin-activity' },
    h('div', { style: 'display:flex;align-items:center;gap:12px;margin-bottom:20px' },
      h('h2', { class: 'lf-admin-activity__title', style: 'flex:1' }, 'Activity Log'),
      h('button', { class: 'lf-admin-btn lf-admin-btn--ghost lf-admin-btn--sm', onclick: () => clearActivityLog() }, 'Clear'),
    ),
    listEl,
  );
}
