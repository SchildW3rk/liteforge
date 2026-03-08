import type { TooltipInput, TooltipOptions, TooltipPosition } from './types.js';
import { injectDefaultStyles } from './styles.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeOptions(input: TooltipInput): TooltipOptions {
  return typeof input === 'string' ? { content: input } : input;
}

function createTooltipElement(opts: TooltipOptions): HTMLElement {
  const el = document.createElement('div');
  el.className = 'lf-tooltip';
  el.setAttribute('role', 'tooltip');

  if (typeof opts.content === 'string') {
    el.textContent = opts.content;
  } else {
    el.appendChild(opts.content);
  }

  return el;
}

type CardinalPosition = Exclude<TooltipPosition, 'auto'>

function resolvePosition(
  tooltipEl: HTMLElement,
  targetRect: DOMRect,
  position: TooltipPosition,
  offset: number,
): CardinalPosition {
  if (position !== 'auto') return position;

  const MARGIN = 4;
  const tRect = tooltipEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Prefer top; fall back to bottom if no room above
  const fitsTop = targetRect.top - tRect.height - offset >= MARGIN;
  const fitsBottom = targetRect.bottom + tRect.height + offset <= vh - MARGIN;
  const fitsLeft = targetRect.left - tRect.width - offset >= MARGIN;
  const fitsRight = targetRect.right + tRect.width + offset <= vw - MARGIN;

  if (fitsTop) return 'top';
  if (fitsBottom) return 'bottom';
  if (fitsRight) return 'right';
  if (fitsLeft) return 'left';
  return 'top'; // fallback
}

export function positionTooltip(
  tooltipEl: HTMLElement,
  target: HTMLElement,
  position: TooltipPosition,
  offset: number,
): void {
  const MARGIN = 4;
  const targetRect = target.getBoundingClientRect();

  // Measure tooltip dimensions (invisible but in DOM)
  const tRect = tooltipEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const resolved = resolvePosition(tooltipEl, targetRect, position, offset);
  tooltipEl.dataset['position'] = resolved;

  let top = 0;
  let left = 0;

  switch (resolved) {
    case 'top':
      top = targetRect.top - tRect.height - offset;
      left = targetRect.left + targetRect.width / 2 - tRect.width / 2;
      break;
    case 'bottom':
      top = targetRect.bottom + offset;
      left = targetRect.left + targetRect.width / 2 - tRect.width / 2;
      break;
    case 'left':
      top = targetRect.top + targetRect.height / 2 - tRect.height / 2;
      left = targetRect.left - tRect.width - offset;
      break;
    case 'right':
      top = targetRect.top + targetRect.height / 2 - tRect.height / 2;
      left = targetRect.right + offset;
      break;
  }

  // Clamp to viewport
  left = Math.max(MARGIN, Math.min(left, vw - tRect.width - MARGIN));
  top  = Math.max(MARGIN, Math.min(top,  vh - tRect.height - MARGIN));

  tooltipEl.style.top  = `${top}px`;
  tooltipEl.style.left = `${left}px`;
}

// ─── Main API ─────────────────────────────────────────────────────────────────

export function tooltip(el: HTMLElement, input: TooltipInput): () => void {
  const opts = normalizeOptions(input);

  if (opts.disabled) return () => {};

  injectDefaultStyles();

  let tooltipEl: HTMLElement | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const doShow = () => {
    try {
      if (opts.showWhen && !opts.showWhen()) return;
    } catch {
      return; // showWhen threw — treat as false, never show
    }

    tooltipEl = createTooltipElement(opts);
    document.body.appendChild(tooltipEl);
    positionTooltip(tooltipEl, el, opts.position ?? 'top', opts.offset ?? 8);

    requestAnimationFrame(() => {
      tooltipEl?.classList.add('lf-tooltip--visible');
    });
  };

  const show = () => {
    if (opts.delay) {
      timer = setTimeout(doShow, opts.delay);
    } else {
      doShow();
    }
  };

  const hide = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    tooltipEl?.remove();
    tooltipEl = null;
  };

  el.addEventListener('pointerenter', show);
  el.addEventListener('pointerleave', hide);
  el.addEventListener('focus', show);
  el.addEventListener('blur', hide);
  el.addEventListener('click', hide);

  return () => {
    hide();
    el.removeEventListener('pointerenter', show);
    el.removeEventListener('pointerleave', hide);
    el.removeEventListener('focus', show);
    el.removeEventListener('blur', hide);
    el.removeEventListener('click', hide);
  };
}
