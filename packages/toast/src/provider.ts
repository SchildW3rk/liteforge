import { effect } from '@liteforge/core';
import { toasts, removeToast } from './store.js';
import { injectDefaultStyles } from './styles.js';
import type { ToastClasses, ToastEntry, ToastPosition, ToastStyles } from './types.js';

const ICON_SVG: Record<string, string> = {
  success: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  error:   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  warning: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info:    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
};

const CLOSE_SVG = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

function renderToast(
  entry: ToastEntry,
  container: HTMLElement,
  providerStyles?: ToastStyles,
  providerClasses?: ToastClasses,
): void {
  const el = document.createElement('div');

  // Build class list: base classes, provider-level toast/type classes, per-toast class
  const classes = [`lf-toast`, `lf-toast--${entry.type}`];
  if (providerClasses?.toast) classes.push(providerClasses.toast);
  const typeClass = providerClasses?.[entry.type as keyof ToastClasses];
  if (typeClass) classes.push(typeClass);
  if (entry.options.class) classes.push(entry.options.class);
  el.className = classes.join(' ');

  el.setAttribute('role', 'alert');
  el.setAttribute('aria-live', 'polite');
  el.dataset['id'] = entry.id;

  // Apply provider-level toast style, then per-toast style (override)
  if (providerStyles?.toast) el.style.cssText += providerStyles.toast;
  if (entry.options.styles?.toast) el.style.cssText += entry.options.styles.toast;

  const icon = document.createElement('span');
  icon.className = 'lf-toast__icon';
  if (providerClasses?.icon) icon.classList.add(providerClasses.icon);
  icon.innerHTML = ICON_SVG[entry.type] ?? '';
  if (providerStyles?.icon) icon.style.cssText += providerStyles.icon;
  if (entry.options.styles?.icon) icon.style.cssText += entry.options.styles.icon;
  el.appendChild(icon);

  const msg = document.createElement('span');
  msg.className = 'lf-toast__message';
  msg.textContent = entry.message;
  el.appendChild(msg);

  if (entry.options.closable) {
    const closeBtn = document.createElement('button');
    closeBtn.className = 'lf-toast__close';
    if (providerClasses?.close) closeBtn.classList.add(providerClasses.close);
    closeBtn.innerHTML = CLOSE_SVG;
    closeBtn.setAttribute('aria-label', 'Dismiss');
    if (providerStyles?.close) closeBtn.style.cssText += providerStyles.close;
    if (entry.options.styles?.close) closeBtn.style.cssText += entry.options.styles.close;
    closeBtn.addEventListener('click', () => dismissToast(entry.id, el, container));
    el.appendChild(closeBtn);
  }

  container.appendChild(el);

  // Animate in
  requestAnimationFrame(() => {
    el.classList.add('lf-toast--visible');
  });

  // Auto-dismiss
  if (entry.options.duration > 0) {
    let remaining = entry.options.duration;
    let startTime: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const start = () => {
      startTime = Date.now();
      timer = setTimeout(() => dismissToast(entry.id, el, container), remaining);
    };

    const pause = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
        if (startTime !== null) {
          remaining -= Date.now() - startTime;
        }
      }
    };

    if (entry.options.pauseOnHover) {
      el.addEventListener('mouseenter', pause);
      el.addEventListener('mouseleave', start);
    }

    start();
  }
}

function dismissToast(id: string, el: HTMLElement, container: HTMLElement): void {
  el.classList.remove('lf-toast--visible');
  el.classList.add('lf-toast--hiding');
  el.addEventListener('transitionend', () => {
    if (el.parentNode === container) container.removeChild(el);
    removeToast(id);
  }, { once: true });
}

export interface ToastProviderOptions {
  position?: ToastPosition;
  unstyled?: boolean;
  styles?: ToastStyles;
  classes?: ToastClasses;
}

export function ToastProvider(opts?: ToastProviderOptions): HTMLElement {
  if (!opts?.unstyled) {
    injectDefaultStyles();
  }

  const position = opts?.position ?? 'bottom-right';

  const container = document.createElement('div');
  const containerClasses = [`lf-toast-container`, `lf-toast-container--${position}`];
  if (opts?.classes?.container) containerClasses.push(opts.classes.container);
  container.className = containerClasses.join(' ');
  container.setAttribute('aria-live', 'assertive');
  container.setAttribute('aria-atomic', 'false');

  if (opts?.styles?.container) {
    container.style.cssText += opts.styles.container;
  }

  const rendered = new Set<string>();

  effect(() => {
    const current = toasts();
    const currentIds = new Set(current.map(t => t.id));

    // Remove DOM nodes for dismissed toasts (not yet cleaned via transitionend)
    for (const id of rendered) {
      if (!currentIds.has(id)) {
        rendered.delete(id);
        // DOM cleanup happens in dismissToast via transitionend
      }
    }

    // Render new toasts
    for (const entry of current) {
      if (!rendered.has(entry.id)) {
        rendered.add(entry.id);
        renderToast(entry, container, opts?.styles, opts?.classes);
      }
    }
  });

  return container;
}
