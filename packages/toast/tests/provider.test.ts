import { describe, it, expect, beforeEach } from 'vitest';
import { ToastProvider } from '../src/provider.js';
import { toast } from '../src/toast.js';
import { clearToasts } from '../src/store.js';
import { resetStylesInjection } from '../src/styles.js';

beforeEach(() => {
  document.body.innerHTML = '';
  clearToasts();
  resetStylesInjection();
});

describe('ToastProvider', () => {
  it('returns an HTMLElement', () => {
    const el = ToastProvider();
    expect(el).toBeInstanceOf(HTMLElement);
  });

  it('has container class', () => {
    const el = ToastProvider();
    expect(el.classList.contains('lf-toast-container')).toBe(true);
  });

  it('applies position class', () => {
    const el = ToastProvider({ position: 'top-center' });
    expect(el.classList.contains('lf-toast-container--top-center')).toBe(true);
  });

  it('defaults to bottom-right position', () => {
    const el = ToastProvider();
    expect(el.classList.contains('lf-toast-container--bottom-right')).toBe(true);
  });

  it('renders a toast when added', () => {
    const el = ToastProvider() as HTMLElement;
    document.body.appendChild(el);

    toast.success('Hello world');

    const toastEl = el.querySelector('.lf-toast');
    expect(toastEl).not.toBeNull();
  });

  it('renders the correct type class', () => {
    const el = ToastProvider() as HTMLElement;
    document.body.appendChild(el);

    toast.error('Oops');

    expect(el.querySelector('.lf-toast--error')).not.toBeNull();
  });

  it('renders the message text', () => {
    const el = ToastProvider() as HTMLElement;
    document.body.appendChild(el);

    toast.info('Test message');

    const msg = el.querySelector('.lf-toast__message');
    expect(msg?.textContent).toBe('Test message');
  });

  it('renders icon', () => {
    const el = ToastProvider() as HTMLElement;
    document.body.appendChild(el);

    toast.success('ok');

    expect(el.querySelector('.lf-toast__icon')).not.toBeNull();
  });

  it('renders close button when closable is true', () => {
    const el = ToastProvider() as HTMLElement;
    document.body.appendChild(el);

    toast.success('close me', { closable: true });

    expect(el.querySelector('.lf-toast__close')).not.toBeNull();
  });

  it('does not render close button when closable is false', () => {
    const el = ToastProvider() as HTMLElement;
    document.body.appendChild(el);

    toast.success('no close', { closable: false });

    expect(el.querySelector('.lf-toast__close')).toBeNull();
  });

  it('renders multiple toasts', () => {
    const el = ToastProvider() as HTMLElement;
    document.body.appendChild(el);

    toast.success('one');
    toast.error('two');
    toast.warning('three');

    expect(el.querySelectorAll('.lf-toast').length).toBe(3);
  });
});

describe('ToastProvider icons (#61)', () => {
  it('uses built-in SVG icon by default', () => {
    const el = ToastProvider() as HTMLElement;
    document.body.appendChild(el);
    toast.success('Hi');
    const icon = el.querySelector('.lf-toast__icon');
    expect(icon?.innerHTML).toContain('<svg');
  });

  it('applies provider-level SVG string icon', () => {
    const customSvg = '<svg data-custom="1"></svg>';
    const el = ToastProvider({ icons: { success: customSvg } }) as HTMLElement;
    document.body.appendChild(el);
    toast.success('Hi');
    const icon = el.querySelector('.lf-toast__icon');
    expect(icon?.innerHTML).toContain('data-custom="1"');
  });

  it('applies provider-level Node icon', () => {
    const node = document.createElement('span');
    node.textContent = '★';
    const el = ToastProvider({ icons: { error: node } }) as HTMLElement;
    document.body.appendChild(el);
    toast.error('Oops');
    const icon = el.querySelector('.lf-toast__icon');
    expect(icon?.textContent).toBe('★');
  });

  it('applies provider-level factory function icon', () => {
    const factory = () => {
      const s = document.createElement('span');
      s.textContent = '✓';
      return s;
    };
    const el = ToastProvider({ icons: { success: factory } }) as HTMLElement;
    document.body.appendChild(el);
    toast.success('Done');
    const icon = el.querySelector('.lf-toast__icon');
    expect(icon?.textContent).toBe('✓');
  });

  it('per-toast icon overrides provider-level icon', () => {
    const providerSvg = '<svg data-provider="1"></svg>';
    const perToastSvg = '<svg data-pertosst="1"></svg>';
    const el = ToastProvider({ icons: { success: providerSvg } }) as HTMLElement;
    document.body.appendChild(el);
    toast.success('Hi', { icon: perToastSvg });
    const icon = el.querySelector('.lf-toast__icon');
    expect(icon?.innerHTML).toContain('data-pertosst="1"');
    expect(icon?.innerHTML).not.toContain('data-provider="1"');
  });

  it('per-toast Node icon works without provider icons', () => {
    const node = document.createElement('img');
    node.setAttribute('src', 'star.svg');
    const el = ToastProvider() as HTMLElement;
    document.body.appendChild(el);
    toast.info('FYI', { icon: node });
    const icon = el.querySelector('.lf-toast__icon');
    expect(icon?.querySelector('img')?.getAttribute('src')).toBe('star.svg');
  });

  it('provider icon for one type does not affect other types', () => {
    const custom = '<svg data-custom="1"></svg>';
    const el = ToastProvider({ icons: { success: custom } }) as HTMLElement;
    document.body.appendChild(el);
    toast.error('Oops');
    const icon = el.querySelector('.lf-toast__icon');
    // error should still use built-in SVG (no data-custom attr)
    expect(icon?.innerHTML).not.toContain('data-custom="1"');
    expect(icon?.innerHTML).toContain('<svg');
  });
});

describe('ToastProvider styles', () => {
  it('injects <style data-lf-toast> into document head', () => {
    ToastProvider();
    expect(document.querySelector('style[data-lf-toast]')).not.toBeNull();
  });

  it('injects styles only once on repeated calls', () => {
    ToastProvider();
    ToastProvider();
    expect(document.querySelectorAll('style[data-lf-toast]').length).toBe(1);
  });

  it('skips CSS injection when unstyled: true', () => {
    ToastProvider({ unstyled: true });
    expect(document.querySelector('style[data-lf-toast]')).toBeNull();
  });
});
