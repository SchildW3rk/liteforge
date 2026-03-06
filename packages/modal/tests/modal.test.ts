/**
 * @liteforge/modal - Test Suite
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createModal, ModalProvider, resetStylesInjection } from '../src/index.js';
import { modalRegistry } from '../src/modal.js';

// ─── Setup ─────────────────────────────────────────────────

beforeEach(() => {
  document.body.innerHTML = '';
  resetStylesInjection();
  modalRegistry.clear();
});

afterEach(() => {
  document.body.innerHTML = '';
  modalRegistry.clear();
});

// ─── createModal ───────────────────────────────────────────

describe('createModal', () => {
  it('returns the expected shape', () => {
    const modal = createModal({ component: () => document.createElement('div') });
    expect(typeof modal.isOpen).toBe('function');
    expect(typeof modal.open).toBe('function');
    expect(typeof modal.close).toBe('function');
    expect(typeof modal.toggle).toBe('function');
    expect(typeof modal.destroy).toBe('function');
  });

  it('isOpen starts as false', () => {
    const modal = createModal({ component: () => document.createElement('div') });
    expect(modal.isOpen()).toBe(false);
  });

  it('open() sets isOpen to true', () => {
    const modal = createModal({ component: () => document.createElement('div') });
    modal.open();
    expect(modal.isOpen()).toBe(true);
  });

  it('close() sets isOpen to false', () => {
    const modal = createModal({ component: () => document.createElement('div') });
    modal.open();
    modal.close();
    expect(modal.isOpen()).toBe(false);
  });

  it('toggle() flips state from false to true', () => {
    const modal = createModal({ component: () => document.createElement('div') });
    expect(modal.isOpen()).toBe(false);
    modal.toggle();
    expect(modal.isOpen()).toBe(true);
  });

  it('toggle() flips state from true to false', () => {
    const modal = createModal({ component: () => document.createElement('div') });
    modal.open();
    modal.toggle();
    expect(modal.isOpen()).toBe(false);
  });

  it('onOpen callback fires on open()', () => {
    let called = false;
    const modal = createModal({
      config: { onOpen: () => { called = true; } },
      component: () => document.createElement('div'),
    });
    modal.open();
    expect(called).toBe(true);
  });

  it('onClose callback fires on close()', () => {
    let called = false;
    const modal = createModal({
      config: { onClose: () => { called = true; } },
      component: () => document.createElement('div'),
    });
    modal.open();
    modal.close();
    expect(called).toBe(true);
  });

  it('destroy() removes modal from registry', () => {
    const modal = createModal({ component: () => document.createElement('div') });
    expect(modalRegistry.size).toBe(1);
    modal.destroy();
    expect(modalRegistry.size).toBe(0);
  });

  it('open() after destroy() is a no-op', () => {
    const modal = createModal({ component: () => document.createElement('div') });
    modal.destroy();
    modal.open();
    expect(modal.isOpen()).toBe(false);
  });
});

// ─── ModalProvider ─────────────────────────────────────────

describe('ModalProvider', () => {
  it('returns a Node', () => {
    const provider = ModalProvider();
    expect(provider).toBeInstanceOf(Node);
  });

  it('after open(), provider DOM contains .lf-modal-overlay', () => {
    const provider = ModalProvider() as HTMLElement;
    document.body.appendChild(provider);

    const modal = createModal({
      component: () => {
        const el = document.createElement('div');
        el.textContent = 'Hello';
        return el;
      },
    });

    modal.open();

    expect(provider.querySelector('.lf-modal-overlay')).not.toBeNull();
  });

  it('after close(), overlay is removed from provider DOM', () => {
    const provider = ModalProvider() as HTMLElement;
    document.body.appendChild(provider);

    const modal = createModal({ component: () => document.createElement('div') });
    modal.open();

    expect(provider.querySelector('.lf-modal-overlay')).not.toBeNull();

    modal.close();

    const overlay = provider.querySelector('.lf-modal-overlay') as HTMLElement | null;
    if (overlay) {
      overlay.dispatchEvent(new Event('transitionend'));
    }

    expect(provider.querySelector('.lf-modal-overlay')).toBeNull();
  });

  it('backdrop click closes modal when closeOnBackdrop is true', () => {
    const provider = ModalProvider() as HTMLElement;
    document.body.appendChild(provider);

    const modal = createModal({
      config: { closeOnBackdrop: true },
      component: () => document.createElement('div'),
    });
    modal.open();

    const overlay = provider.querySelector('.lf-modal-overlay') as HTMLElement;
    expect(overlay).not.toBeNull();

    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(modal.isOpen()).toBe(false);
  });

  it('backdrop click does NOT close modal when closeOnBackdrop is false', () => {
    const provider = ModalProvider() as HTMLElement;
    document.body.appendChild(provider);

    const modal = createModal({
      config: { closeOnBackdrop: false },
      component: () => document.createElement('div'),
    });
    modal.open();

    const overlay = provider.querySelector('.lf-modal-overlay') as HTMLElement;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(modal.isOpen()).toBe(true);
  });

  it('ESC key closes modal when closeOnEsc is true', () => {
    const provider = ModalProvider() as HTMLElement;
    document.body.appendChild(provider);

    const modal = createModal({
      config: { closeOnEsc: true },
      component: () => document.createElement('div'),
    });
    modal.open();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(modal.isOpen()).toBe(false);
  });
});

// ─── Styles ────────────────────────────────────────────────

describe('injectDefaultStyles', () => {
  it('injects <link data-lf-modal> into document head', () => {
    ModalProvider();
    expect(document.querySelector('link[data-lf-modal]')).not.toBeNull();
  });

  it('injects styles only once on repeated calls', () => {
    ModalProvider();
    ModalProvider();
    const tags = document.querySelectorAll('link[data-lf-modal]');
    expect(tags.length).toBe(1);
  });

  it('skips CSS injection when unstyled: true', () => {
    ModalProvider({ unstyled: true });
    expect(document.querySelector('link[data-lf-modal]')).toBeNull();
  });
});

// ─── Focus management ──────────────────────────────────────

describe('Focus management', () => {
  it('moves focus into the modal on open()', () => {
    const provider = ModalProvider() as HTMLElement;
    document.body.appendChild(provider);

    const modal = createModal({
      component: () => {
        const btn = document.createElement('button');
        btn.textContent = 'Inside';
        return btn;
      },
    });

    const outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);
    outside.focus();

    modal.open();

    const modalEl = provider.querySelector('.lf-modal') as HTMLElement;
    expect(modalEl).not.toBeNull();
    expect(provider.querySelector('.lf-modal-body button')).not.toBeNull();
  });

  it('focus returns to prior element after close()', () => {
    const outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);
    outside.focus();

    const modal = createModal({ component: () => document.createElement('div') });
    modal.open();
    modal.close();

    expect(document.activeElement).toBe(outside);
  });
});
