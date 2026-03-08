/**
 * @liteforge/tooltip — Test Suite
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tooltip, Tooltip, resetStylesInjection } from '../src/index.js';

// ─── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  document.body.innerHTML = '';
  resetStylesInjection();
  vi.useFakeTimers();
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeTarget(): HTMLButtonElement {
  const btn = document.createElement('button');
  document.body.appendChild(btn);
  return btn;
}

function pointerEnter(el: HTMLElement) {
  el.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
}

function pointerLeave(el: HTMLElement) {
  el.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
}

function focus(el: HTMLElement) {
  el.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
}

function blur(el: HTMLElement) {
  el.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
}

// ─── tooltip() function ────────────────────────────────────────────────────

describe('tooltip()', () => {
  it('returns a cleanup function', () => {
    const target = makeTarget();
    const cleanup = tooltip(target, 'Hello');
    expect(typeof cleanup).toBe('function');
    cleanup();
  });

  it('appends tooltip element to body on pointerenter', () => {
    const target = makeTarget();
    tooltip(target, 'Hello');
    expect(document.querySelector('.lf-tooltip')).toBeNull();
    pointerEnter(target);
    expect(document.querySelector('.lf-tooltip')).not.toBeNull();
  });

  it('tooltip text content matches input string', () => {
    const target = makeTarget();
    tooltip(target, 'Save');
    pointerEnter(target);
    expect(document.querySelector('.lf-tooltip')?.textContent).toBe('Save');
  });

  it('accepts TooltipOptions object with content string', () => {
    const target = makeTarget();
    tooltip(target, { content: 'Settings', position: 'right' });
    pointerEnter(target);
    const el = document.querySelector('.lf-tooltip') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.textContent).toBe('Settings');
  });

  it('removes tooltip element on pointerleave', () => {
    const target = makeTarget();
    tooltip(target, 'Hello');
    pointerEnter(target);
    expect(document.querySelector('.lf-tooltip')).not.toBeNull();
    pointerLeave(target);
    expect(document.querySelector('.lf-tooltip')).toBeNull();
  });

  it('hides tooltip on click (navigation guard)', () => {
    const target = makeTarget();
    tooltip(target, 'Hello');
    pointerEnter(target);
    expect(document.querySelector('.lf-tooltip')).not.toBeNull();
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelector('.lf-tooltip')).toBeNull();
  });

  it('shows tooltip on focus', () => {
    const target = makeTarget();
    tooltip(target, 'Focus tooltip');
    focus(target);
    expect(document.querySelector('.lf-tooltip')).not.toBeNull();
  });

  it('hides tooltip on blur', () => {
    const target = makeTarget();
    tooltip(target, 'Focus tooltip');
    focus(target);
    blur(target);
    expect(document.querySelector('.lf-tooltip')).toBeNull();
  });

  it('disabled: true → no tooltip shown', () => {
    const target = makeTarget();
    tooltip(target, { content: 'Hidden', disabled: true });
    pointerEnter(target);
    expect(document.querySelector('.lf-tooltip')).toBeNull();
  });

  it('disabled: true → cleanup is a noop', () => {
    const target = makeTarget();
    const cleanup = tooltip(target, { content: 'Hidden', disabled: true });
    expect(() => cleanup()).not.toThrow();
  });

  it('delay: timer fires after delay ms', () => {
    const target = makeTarget();
    tooltip(target, { content: 'Delayed', delay: 300 });
    pointerEnter(target);
    expect(document.querySelector('.lf-tooltip')).toBeNull();
    vi.advanceTimersByTime(300);
    expect(document.querySelector('.lf-tooltip')).not.toBeNull();
  });

  it('delay: early pointerleave cancels timer', () => {
    const target = makeTarget();
    tooltip(target, { content: 'Delayed', delay: 300 });
    pointerEnter(target);
    vi.advanceTimersByTime(100);
    pointerLeave(target);
    vi.advanceTimersByTime(300);
    expect(document.querySelector('.lf-tooltip')).toBeNull();
  });

  it('content as Node is appended inside tooltip', () => {
    const target = makeTarget();
    const node = document.createElement('strong');
    node.textContent = 'Rich content';
    tooltip(target, { content: node });
    pointerEnter(target);
    const tooltipEl = document.querySelector('.lf-tooltip');
    expect(tooltipEl?.querySelector('strong')).not.toBeNull();
    expect(tooltipEl?.querySelector('strong')?.textContent).toBe('Rich content');
  });

  it('cleanup fn removes active tooltip from DOM', () => {
    const target = makeTarget();
    const cleanup = tooltip(target, 'Cleanup test');
    pointerEnter(target);
    expect(document.querySelector('.lf-tooltip')).not.toBeNull();
    cleanup();
    expect(document.querySelector('.lf-tooltip')).toBeNull();
  });

  it('cleanup fn prevents future tooltips from showing', () => {
    const target = makeTarget();
    const cleanup = tooltip(target, 'Gone');
    cleanup();
    pointerEnter(target);
    expect(document.querySelector('.lf-tooltip')).toBeNull();
  });

  it('showWhen: false → tooltip suppressed', () => {
    const target = makeTarget();
    tooltip(target, { content: 'Conditional', showWhen: () => false });
    pointerEnter(target);
    expect(document.querySelector('.lf-tooltip')).toBeNull();
  });

  it('showWhen: true → tooltip shown', () => {
    const target = makeTarget();
    tooltip(target, { content: 'Conditional', showWhen: () => true });
    pointerEnter(target);
    expect(document.querySelector('.lf-tooltip')).not.toBeNull();
  });

  it('tooltip has role="tooltip" for accessibility', () => {
    const target = makeTarget();
    tooltip(target, 'Accessible');
    pointerEnter(target);
    const el = document.querySelector('.lf-tooltip');
    expect(el?.getAttribute('role')).toBe('tooltip');
  });
});

// ─── Unhappy path / error cases ───────────────────────────────────────────

describe('tooltip() — unhappy path', () => {
  it('empty string content renders an empty tooltip (no throw)', () => {
    const target = makeTarget();
    expect(() => tooltip(target, '')).not.toThrow();
    pointerEnter(target);
    const el = document.querySelector('.lf-tooltip');
    expect(el).not.toBeNull();
    expect(el?.textContent).toBe('');
  });

  it('cleanup called twice is safe (idempotent)', () => {
    const target = makeTarget();
    const cleanup = tooltip(target, 'Hello');
    expect(() => {
      cleanup();
      cleanup(); // second call must not throw
    }).not.toThrow();
    pointerEnter(target);
    expect(document.querySelector('.lf-tooltip')).toBeNull(); // still suppressed
  });

  it('target removed from DOM while tooltip is visible — tooltip is removed without error', () => {
    const target = makeTarget();
    tooltip(target, 'Orphan test');
    pointerEnter(target);
    expect(document.querySelector('.lf-tooltip')).not.toBeNull();

    // Remove the target from DOM (simulates component unmount)
    target.remove();

    // Dispatching pointerleave on a detached element should not throw
    expect(() => pointerLeave(target)).not.toThrow();
    // Tooltip should no longer be in the document
    expect(document.querySelector('.lf-tooltip')).toBeNull();
  });

  it('multiple tooltip() calls on same element — last one wins, no listener leak', () => {
    const target = makeTarget();
    const cleanup1 = tooltip(target, 'First');
    const cleanup2 = tooltip(target, 'Second');

    pointerEnter(target);
    const tooltips = document.querySelectorAll('.lf-tooltip');
    // Both are registered — two tooltips visible. Cleanup both.
    cleanup1();
    cleanup2();
    pointerEnter(target);
    expect(document.querySelectorAll('.lf-tooltip').length).toBe(0);
  });

  it('rapid pointerenter/pointerleave with delay cancels the timer', () => {
    const target = makeTarget();
    tooltip(target, { content: 'Delayed', delay: 200 });

    pointerEnter(target);
    // Leave before delay fires
    pointerLeave(target);
    vi.advanceTimersByTime(300);

    // Timer was cancelled — no tooltip in DOM
    expect(document.querySelector('.lf-tooltip')).toBeNull();
  });

  it('showWhen that throws is treated as false (no tooltip shown)', () => {
    const target = makeTarget();
    tooltip(target, {
      content: 'Conditional',
      showWhen: () => { throw new Error('showWhen threw'); },
    });

    expect(() => pointerEnter(target)).not.toThrow();
    expect(document.querySelector('.lf-tooltip')).toBeNull();
  });
});

// ─── Tooltip() component factory ──────────────────────────────────────────

describe('Tooltip() factory', () => {
  it('returns a Node', () => {
    const child = document.createElement('button');
    const result = Tooltip({ content: 'Test', children: child });
    expect(result).toBeInstanceOf(Node);
  });

  it('wraps child in display:contents span', () => {
    const child = document.createElement('button');
    const wrapper = Tooltip({ content: 'Test', children: child }) as HTMLElement;
    expect(wrapper.tagName).toBe('SPAN');
    expect(wrapper.style.display).toBe('contents');
  });

  it('child element is first child of wrapper', () => {
    const child = document.createElement('button');
    const wrapper = Tooltip({ content: 'Tooltip', children: child });
    expect(wrapper.firstChild).toBe(child);
  });
});
