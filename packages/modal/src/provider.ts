import { effect } from '@liteforge/core';
import { modalRegistry, registryVersion } from './modal.js';
import { injectDefaultStyles, STYLE_TOKEN_MAP } from './styles.js';
import type { ModalEntry } from './modal.js';

// ─── Focus trap helpers ──────────────────────────────────────

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

function trapFocus(modalEl: HTMLElement): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusable = getFocusableElements(modalEl);
    if (focusable.length === 0) return;

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
}

// ─── Render a single modal overlay ──────────────────────────

function renderOverlay(entry: ModalEntry, onRemove: () => void): HTMLElement {
  const { size, styles, classes } = entry.options;
  const cls = classes;

  const overlay = document.createElement('div');
  overlay.className = `${cls.overlay ?? 'lf-modal-overlay'} lf-modal-overlay--${size}`;

  // Apply per-instance style token overrides (CSS vars inherit into children)
  for (const [key, cssVar] of STYLE_TOKEN_MAP) {
    const value = styles[key];
    if (value !== undefined) overlay.style.setProperty(cssVar, value);
  }

  const modalEl = document.createElement('div');
  modalEl.className = cls.modal ?? 'lf-modal';
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');

  // Header
  const header = document.createElement('div');
  header.className = cls.header ?? 'lf-modal-header';

  const titleEl = document.createElement('span');
  titleEl.className = cls.title ?? 'lf-modal-title';
  titleEl.textContent = entry.options.title;
  header.appendChild(titleEl);

  if (entry.options.closable) {
    const closeBtn = document.createElement('button');
    closeBtn.className = cls.close ?? 'lf-modal-close';
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', () => entry.close());
    header.appendChild(closeBtn);
  }

  modalEl.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = cls.body ?? 'lf-modal-body';
  body.appendChild(entry.contentFn());
  modalEl.appendChild(body);

  overlay.appendChild(modalEl);

  // Backdrop click to close
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && entry.options.closeOnBackdrop) {
      entry.close();
    }
  });

  // Focus trap
  const focusTrapHandler = trapFocus(modalEl);
  modalEl.addEventListener('keydown', focusTrapHandler);

  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.add('lf-modal-overlay--open');
    // Move focus into modal
    const focusable = getFocusableElements(modalEl);
    if (focusable.length > 0) {
      focusable[0]!.focus();
    } else {
      modalEl.focus();
    }
  });

  // Animate out on close
  const cleanup = effect(() => {
    if (!entry.isOpen()) {
      overlay.classList.remove('lf-modal-overlay--open');
      overlay.addEventListener(
        'transitionend',
        () => {
          cleanup();
          onRemove();
        },
        { once: true }
      );
    }
  });

  return overlay;
}

// ─── ModalProvider ───────────────────────────────────────────

export function ModalProvider(opts?: { unstyled?: boolean }): HTMLElement {
  if (!opts?.unstyled) {
    injectDefaultStyles();
  }

  const container = document.createElement('div');
  container.className = 'lf-modal-provider';

  // Track rendered overlays: entry id → overlay element
  const rendered = new Map<symbol, HTMLElement>();

  // Reactively sync open modals.
  // Reading registryVersion() ensures effect re-runs when entries are added/removed.
  effect(() => {
    registryVersion(); // subscribe to registry membership changes
    const openEntries = Array.from(modalRegistry).filter((e) => e.isOpen());

    // Add newly opened modals
    for (const entry of openEntries) {
      if (!rendered.has(entry.id)) {
        const overlay = renderOverlay(entry, () => {
          rendered.delete(entry.id);
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        });
        rendered.set(entry.id, overlay);
        container.appendChild(overlay);
      }
    }
  });

  return container;
}
