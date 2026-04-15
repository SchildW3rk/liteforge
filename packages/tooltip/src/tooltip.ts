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

  if (opts.class) {
    el.classList.add(...opts.class.split(/\s+/).filter(Boolean));
  }

  if (opts.styles?.tooltip) {
    el.style.cssText += opts.styles.tooltip;
  }

  if (opts.borderRadius) {
    el.style.borderRadius = opts.borderRadius;
  }

  if (opts.styles?.arrow) {
    el.dataset['arrowStyle'] = opts.styles.arrow;
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
    if (!tooltipEl) return;
    const dying = tooltipEl;
    tooltipEl = null;
    dying.classList.remove('lf-tooltip--visible');
    setTimeout(() => dying.remove(), 160);
  };

  const focusEnabled = opts.triggerOnFocus !== false;
  const dismissOn = opts.dismissOn ?? 'auto';

  // 'auto'   → hide on pointerleave + blur + click
  // 'click'  → hide on click only (not pointerleave/blur)
  // 'manual' → no auto-hide events at all
  const autoHide = dismissOn === 'auto';
  const clickHide = dismissOn === 'auto' || dismissOn === 'click';

  el.addEventListener('pointerenter', show);
  if (autoHide) el.addEventListener('pointerleave', hide);
  if (focusEnabled) el.addEventListener('focus', show);
  if (focusEnabled && autoHide) el.addEventListener('blur', hide);
  if (clickHide) el.addEventListener('click', hide);

  return () => {
    hide();
    el.removeEventListener('pointerenter', show);
    if (autoHide) el.removeEventListener('pointerleave', hide);
    if (focusEnabled) el.removeEventListener('focus', show);
    if (focusEnabled && autoHide) el.removeEventListener('blur', hide);
    if (clickHide) el.removeEventListener('click', hide);
  };
}

/**
 * Immediately remove all visible tooltip elements from the DOM.
 * Useful when a modal or overlay opens and any lingering tooltip should disappear instantly.
 */
export function hideAllTooltips(): void {
  document.querySelectorAll('.lf-tooltip').forEach((el) => el.remove());
}
