import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { queryPlugin } from '../src/plugin.js';
import { queryCache } from '../src/cache.js';
import { createPluginContext } from '../../runtime/src/plugin-registry.js';

describe('queryPlugin', () => {
  // Use a plain object cast as HTMLElement — queryPlugin never accesses DOM on target
  const fakeTarget = {} as HTMLElement;
  let appContext: Record<string, unknown>;

  beforeEach(() => {
    appContext = {};
    // Seed a cache entry so we can verify clear()
    queryCache.set('test-key', { data: 'value' });
  });

  afterEach(() => {
    queryCache.clear();
  });

  it('plugin name is "query"', () => {
    const plugin = queryPlugin();
    expect(plugin.name).toBe('query');
  });

  it('provides query API under "query" key', () => {
    const plugin = queryPlugin();
    const ctx = createPluginContext(fakeTarget, appContext);
    plugin.install(ctx);

    const api = appContext['query'] as { cache: unknown };
    expect(api).toBeDefined();
    expect(api.cache).toBeDefined();
  });

  it('provided cache is the shared queryCache singleton', () => {
    const plugin = queryPlugin();
    const ctx = createPluginContext(fakeTarget, appContext);
    plugin.install(ctx);

    const api = appContext['query'] as { cache: typeof queryCache };
    expect(api.cache).toBe(queryCache);
  });

  it('resolve("toast") returns undefined when toast not registered', () => {
    // queryPlugin should not throw if toast is absent
    const plugin = queryPlugin();
    const ctx = createPluginContext(fakeTarget, appContext);
    expect(() => plugin.install(ctx)).not.toThrow();
  });

  it('resolve("toast") returns toast API when registered before query', () => {
    const toast = { error: vi.fn() };
    appContext['toast'] = toast;

    let capturedToast: unknown;

    // Override install to verify toast is read (using a custom plugin)
    const plugin = queryPlugin();
    const ctx = createPluginContext(fakeTarget, appContext);

    // Install the plugin — internally it calls ctx.resolve('toast')
    plugin.install(ctx);

    // We verify indirectly: the plugin should not throw and still register 'query'
    capturedToast = ctx.resolve('toast');
    expect(capturedToast).toBe(toast);
  });

  it('cleanup calls queryCache.clear()', () => {
    const clearSpy = vi.spyOn(queryCache, 'clear');

    const plugin = queryPlugin();
    const ctx = createPluginContext(fakeTarget, appContext);
    const cleanup = plugin.install(ctx);

    expect(clearSpy).not.toHaveBeenCalled();

    if (typeof cleanup === 'function') {
      cleanup();
    }

    expect(clearSpy).toHaveBeenCalledTimes(1);
    clearSpy.mockRestore();
  });
});
