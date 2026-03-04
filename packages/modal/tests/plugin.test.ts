import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { modalPlugin } from '../src/plugin.js';
import { createPluginContext } from '../../runtime/src/plugin-registry.js';

describe('modalPlugin', () => {
  let parent: HTMLElement;
  let appTarget: HTMLElement;
  let appContext: Record<string, unknown>;

  beforeEach(() => {
    parent = document.createElement('div');
    appTarget = document.createElement('div');
    appTarget.id = 'app';
    parent.appendChild(appTarget);
    document.body.appendChild(parent);
    appContext = {};
  });

  afterEach(() => {
    if (parent.parentNode) {
      document.body.removeChild(parent);
    }
    // Reset globalThis modal registry between tests
    const g = globalThis as Record<string, unknown>;
    delete g['__lfModalRegistry__'];
    delete g['__lfModalVersion__'];
    delete g['__lfModalEsc__'];
  });

  it('plugin name is "modal"', () => {
    const plugin = modalPlugin();
    expect(plugin.name).toBe('modal');
  });

  it('provides modal API under "modal" key', () => {
    const plugin = modalPlugin();
    const ctx = createPluginContext(appTarget, appContext);
    plugin.install(ctx);

    const api = appContext['modal'] as { open: unknown; confirm: unknown; alert: unknown; prompt: unknown };
    expect(typeof api.open).toBe('function');
    expect(typeof api.confirm).toBe('function');
    expect(typeof api.alert).toBe('function');
    expect(typeof api.prompt).toBe('function');
  });

  it('inserts modal root container next to #app (not on body)', () => {
    const plugin = modalPlugin();
    const ctx = createPluginContext(appTarget, appContext);
    plugin.install(ctx);

    const modalRoot = parent.querySelector('#liteforge-modal-root');
    expect(modalRoot).toBeTruthy();
    // Should be a sibling of appTarget, not a child
    expect(modalRoot?.parentElement).toBe(parent);
    expect(appTarget.querySelector('#liteforge-modal-root')).toBeNull();
  });

  it('modal root container is placed AFTER the app target', () => {
    const plugin = modalPlugin();
    const ctx = createPluginContext(appTarget, appContext);
    plugin.install(ctx);

    const children = Array.from(parent.children);
    const appIdx = children.indexOf(appTarget);
    const modalRoot = parent.querySelector('#liteforge-modal-root') as HTMLElement;
    const modalIdx = children.indexOf(modalRoot);
    expect(modalIdx).toBe(appIdx + 1);
  });

  it('cleanup removes modal root container from DOM', () => {
    const plugin = modalPlugin();
    const ctx = createPluginContext(appTarget, appContext);
    const cleanup = plugin.install(ctx);

    expect(parent.querySelector('#liteforge-modal-root')).toBeTruthy();

    if (typeof cleanup === 'function') {
      cleanup();
    }

    expect(parent.querySelector('#liteforge-modal-root')).toBeNull();
  });

  it('modal API is accessible via resolve() after install', () => {
    const plugin = modalPlugin();
    const ctx = createPluginContext(appTarget, appContext);
    plugin.install(ctx);

    // resolve() reads from same appContext
    const resolved = ctx.resolve<{ open: unknown }>('modal');
    expect(resolved).toBeDefined();
    expect(typeof resolved?.open).toBe('function');
  });
});
