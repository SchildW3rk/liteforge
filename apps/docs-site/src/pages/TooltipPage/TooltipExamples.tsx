import { signal, effect } from 'liteforge';
import { tooltip } from '@liteforge/tooltip';


export function BasicTooltipExample(): Node {
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-wrap gap-3';

  const makeBtn = (label: string, pos: 'top' | 'right' | 'bottom' | 'left') => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'px-3 py-1.5 text-sm rounded bg-[var(--surface-overlay)] border border-[var(--line-default)] text-[var(--content-primary)] hover:bg-[var(--surface-raised)] transition-colors';
    tooltip(btn, { content: `position: "${pos}"`, position: pos });
    return btn;
  };

  wrap.appendChild(makeBtn('Tooltip top', 'top'));
  wrap.appendChild(makeBtn('Tooltip right', 'right'));
  wrap.appendChild(makeBtn('Tooltip bottom', 'bottom'));
  wrap.appendChild(makeBtn('Tooltip left', 'left'));
  return wrap;
}

export function DelayExample(): Node {
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-wrap gap-3';

  const makeBtn = (label: string, delay: number) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'px-3 py-1.5 text-sm rounded bg-[var(--surface-overlay)] border border-[var(--line-default)] text-[var(--content-primary)]';
    tooltip(btn, { content: `${delay}ms delay`, delay, position: 'top' });
    return btn;
  };

  wrap.appendChild(makeBtn('No delay', 0));
  wrap.appendChild(makeBtn('150ms delay', 150));
  wrap.appendChild(makeBtn('500ms delay', 500));
  return wrap;
}

export function ShowWhenExample(): Node {
  const collapsed = signal(true);

  const wrap = document.createElement('div');
  wrap.className = 'space-y-3';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:opacity-80 transition-opacity';
  effect(() => {
    toggleBtn.textContent = collapsed() ? 'Expand sidebar (tooltip hidden)' : 'Collapse sidebar (tooltip shown)';
  });
  toggleBtn.addEventListener('click', () => collapsed.update(v => !v));

  const iconBtn = document.createElement('button');
  iconBtn.className = 'w-10 h-10 rounded bg-[var(--surface-overlay)] border border-[var(--line-default)] text-lg flex items-center justify-center';
  iconBtn.textContent = '⚙️';
  tooltip(iconBtn, {
    content: 'Settings',
    position: 'right',
    delay: 150,
    showWhen: () => collapsed(),
  });

  const hint = document.createElement('p');
  hint.className = 'text-xs text-[var(--content-muted)]';
  effect(() => {
    hint.textContent = collapsed()
      ? 'Hover ⚙️ — tooltip visible (collapsed)'
      : 'Hover ⚙️ — tooltip suppressed (expanded)';
  });

  wrap.appendChild(toggleBtn);
  wrap.appendChild(iconBtn);
  wrap.appendChild(hint);
  return wrap;
}

export function CleanupExample(): Node {
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-col gap-3 items-start';

  const btn = document.createElement('button');
  btn.textContent = 'Hover me';
  btn.className = 'px-3 py-1.5 text-sm rounded bg-[var(--surface-overlay)] border border-[var(--line-default)] text-[var(--content-primary)]';

  let cleanup: (() => void) | null = null;
  const active = signal(true);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'px-3 py-1.5 text-sm rounded bg-red-600/80 text-white hover:opacity-80';
  effect(() => {
    removeBtn.textContent = active() ? 'Remove tooltip' : 'Tooltip removed ✓';
    removeBtn.disabled = !active();
  });
  removeBtn.addEventListener('click', () => {
    if (cleanup) { cleanup(); cleanup = null; active.set(false); }
  });

  wrap.appendChild(btn);
  wrap.appendChild(removeBtn);

  // Attach tooltip after btn is in the DOM tree
  cleanup = tooltip(btn, { content: 'I can be removed', position: 'top' });

  return wrap;
}

export function StylingExample(): Node {
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-wrap gap-3';

  const makeBtn = (label: string, opts: Parameters<typeof tooltip>[1]) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'px-3 py-1.5 text-sm rounded bg-[var(--surface-overlay)] border border-[var(--line-default)] text-[var(--content-primary)] hover:bg-[var(--surface-raised)] transition-colors';
    tooltip(btn, opts);
    return btn;
  };

  wrap.appendChild(makeBtn('Default', { content: 'Default tooltip', position: 'top' }));

  wrap.appendChild(makeBtn('borderRadius: 0', {
    content:      'Square corners',
    position:     'top',
    borderRadius: '0px',
  }));

  wrap.appendChild(makeBtn('Custom style', {
    content: 'Custom styled',
    position: 'top',
    styles: {
      tooltip: 'background: var(--lf-color-surface); border: 1px solid var(--lf-color-border); color: var(--lf-color-text); border-radius: 4px;',
    },
  }));

  wrap.appendChild(makeBtn('Extra class', {
    content: 'With extra class',
    position: 'top',
    class:   'lf-tooltip--accent',
    styles:  { tooltip: 'background: var(--lf-color-accent); color: #fff; border-radius: 6px;' },
  }));

  return wrap;
}

export function DismissExample(): Node {
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-wrap gap-3';

  const makeBtn = (label: string, opts: Parameters<typeof tooltip>[1]) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'px-3 py-1.5 text-sm rounded bg-[var(--surface-overlay)] border border-[var(--line-default)] text-[var(--content-primary)] hover:bg-[var(--surface-raised)] transition-colors';
    tooltip(btn, opts);
    return btn;
  };

  wrap.appendChild(makeBtn("dismissOn: 'auto' (default)", {
    content:   'Hides on mouse-out',
    position:  'top',
    dismissOn: 'auto',
  }));

  wrap.appendChild(makeBtn("dismissOn: 'click'", {
    content:   'Stays on mouse-out — click to hide',
    position:  'top',
    dismissOn: 'click',
  }));

  const manualBtn = document.createElement('button');
  manualBtn.textContent = "dismissOn: 'manual'";
  manualBtn.className = 'px-3 py-1.5 text-sm rounded bg-[var(--surface-overlay)] border border-[var(--line-default)] text-[var(--content-primary)] hover:bg-[var(--surface-raised)] transition-colors';
  const manualCleanup = tooltip(manualBtn, {
    content:   'Click "Hide" to dismiss',
    position:  'top',
    dismissOn: 'manual',
  });
  wrap.appendChild(manualBtn);

  const hideBtn = document.createElement('button');
  hideBtn.textContent = 'Hide manual tooltip';
  hideBtn.className = 'px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:opacity-80 transition-opacity';
  hideBtn.addEventListener('click', () => manualCleanup());
  wrap.appendChild(hideBtn);

  return wrap;
}
