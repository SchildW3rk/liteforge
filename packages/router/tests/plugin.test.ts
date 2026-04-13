import { describe, it, expect, vi, beforeEach } from 'vitest';
import { routerPlugin } from '../src/plugin.js';
import { createPluginContext } from '../../runtime/src/plugin-registry.js';

describe('routerPlugin', () => {
  let container: HTMLElement;
  let appContext: Record<string, unknown>;

  beforeEach(() => {
    container = document.createElement('div');
    appContext = {};
  });

  it('plugin name is "router"', () => {
    const plugin = routerPlugin({ routes: [] });
    expect(plugin.name).toBe('router');
  });

  it('provides router under "router" key', async () => {
    const plugin = routerPlugin({
      routes: [{ path: '/', component: () => document.createElement('div') }],
    });
    const ctx = createPluginContext(container, appContext);

    await plugin.install(ctx);

    expect(appContext['router']).toBeDefined();
  });

  it('provided router has navigate and destroy methods', async () => {
    const plugin = routerPlugin({
      routes: [{ path: '/', component: () => document.createElement('div') }],
    });
    const ctx = createPluginContext(container, appContext);
    await plugin.install(ctx);

    const router = appContext['router'] as { navigate: unknown; destroy: unknown };
    expect(typeof router.navigate).toBe('function');
    expect(typeof router.destroy).toBe('function');
  });

  it('cleanup calls router.destroy()', async () => {
    const plugin = routerPlugin({
      routes: [{ path: '/', component: () => document.createElement('div') }],
    });
    const ctx = createPluginContext(container, appContext);
    const cleanup = await plugin.install(ctx);

    const router = appContext['router'] as { destroy: () => void };
    const destroySpy = vi.spyOn(router, 'destroy');

    if (typeof cleanup === 'function') {
      cleanup();
    }

    expect(destroySpy).toHaveBeenCalledTimes(1);
  });

  it('router is accessible via resolve()', async () => {
    const plugin = routerPlugin({
      routes: [{ path: '/', component: () => document.createElement('div') }],
    });
    const ctx = createPluginContext(container, appContext);
    await plugin.install(ctx);

    const resolved = ctx.resolve<{ navigate: unknown }>('router');
    expect(typeof resolved?.navigate).toBe('function');
  });
});
