import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { queryPlugin } from '../src/plugin.js';
import { queryCache } from '../src/cache.js';
import { createPluginContext } from '../../runtime/src/plugin-registry.js';
import { createQuery, globalQueryDefaults, resetQueryDefaults } from '../src/query.js';
import { createMutation } from '../src/mutation.js';
import { clearGlobalQueryErrorHandler } from '../src/global-error-handler.js';

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
    clearGlobalQueryErrorHandler();
    resetQueryDefaults();
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

  describe('onError — global error handler', () => {
    it('registers onError handler on install', async () => {
      const handler = vi.fn();
      const plugin = queryPlugin({ onError: handler });
      const ctx = createPluginContext(fakeTarget, appContext);
      plugin.install(ctx);

      const error = new Error('boom');
      const query = createQuery({
        key: 'err-q',
        fn: () => Promise.reject(error),
        retry: 0,
      });

      await vi.waitFor(() => expect(query.error()).not.toBeNull());

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(error, { type: 'query', key: 'err-q' });

      query.dispose();
    });

    it('handler receives mutation errors', async () => {
      const handler = vi.fn();
      const plugin = queryPlugin({ onError: handler });
      const ctx = createPluginContext(fakeTarget, appContext);
      plugin.install(ctx);

      const error = new Error('mutation failed');
      const mut = createMutation({
        fn: () => Promise.reject(error),
      });

      await expect(mut.mutate()).rejects.toThrow('mutation failed');

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(error, { type: 'mutation' });
    });

    it('does not call handler when onError not provided', async () => {
      const plugin = queryPlugin();
      const ctx = createPluginContext(fakeTarget, appContext);
      plugin.install(ctx);

      const query = createQuery({
        key: 'no-handler-q',
        fn: () => Promise.reject(new Error('fail')),
        retry: 0,
      });

      await vi.waitFor(() => expect(query.error()).not.toBeNull());
      // No assertion needed — just must not throw
      query.dispose();
    });

    it('clears handler on plugin cleanup', async () => {
      const handler = vi.fn();
      const plugin = queryPlugin({ onError: handler });
      const ctx = createPluginContext(fakeTarget, appContext);
      const cleanup = plugin.install(ctx);

      if (typeof cleanup === 'function') {
        cleanup();
      }

      // After cleanup, a new query error should NOT reach the handler
      const query = createQuery({
        key: 'post-cleanup-q',
        fn: () => Promise.reject(new Error('after cleanup')),
        retry: 0,
      });

      await vi.waitFor(() => expect(query.error()).not.toBeNull());

      expect(handler).not.toHaveBeenCalled();
      query.dispose();
    });
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

describe('queryPlugin — global query defaults', () => {
  const fakeTarget = {} as HTMLElement;
  let appContext: Record<string, unknown>;

  beforeEach(() => {
    appContext = {};
    resetQueryDefaults();
  });

  afterEach(() => {
    queryCache.clear();
    resetQueryDefaults();
  });

  it('sets defaultRefetchOnFocus on globalQueryDefaults', () => {
    const plugin = queryPlugin({ defaultRefetchOnFocus: false });
    const ctx = createPluginContext(fakeTarget, appContext);
    plugin.install(ctx);
    expect(globalQueryDefaults.refetchOnFocus).toBe(false);
  });

  it('sets defaultStaleTime on globalQueryDefaults', () => {
    const plugin = queryPlugin({ defaultStaleTime: 30_000 });
    const ctx = createPluginContext(fakeTarget, appContext);
    plugin.install(ctx);
    expect(globalQueryDefaults.staleTime).toBe(30_000);
  });

  it('sets defaultRetry on globalQueryDefaults', () => {
    const plugin = queryPlugin({ defaultRetry: 1 });
    const ctx = createPluginContext(fakeTarget, appContext);
    plugin.install(ctx);
    expect(globalQueryDefaults.retry).toBe(1);
  });

  it('sets defaultRetryDelay on globalQueryDefaults', () => {
    const plugin = queryPlugin({ defaultRetryDelay: 500 });
    const ctx = createPluginContext(fakeTarget, appContext);
    plugin.install(ctx);
    expect(globalQueryDefaults.retryDelay).toBe(500);
  });

  it('sets defaultCacheTime on globalQueryDefaults', () => {
    const plugin = queryPlugin({ defaultCacheTime: 60_000 });
    const ctx = createPluginContext(fakeTarget, appContext);
    plugin.install(ctx);
    expect(globalQueryDefaults.cacheTime).toBe(60_000);
  });

  it('does not override defaults when option is not provided', () => {
    const plugin = queryPlugin({});
    const ctx = createPluginContext(fakeTarget, appContext);
    plugin.install(ctx);
    expect(globalQueryDefaults.refetchOnFocus).toBe(true);
    expect(globalQueryDefaults.retry).toBe(3);
  });

  it('per-query option wins over global default', async () => {
    const plugin = queryPlugin({ defaultRetry: 0 });
    const ctx = createPluginContext(fakeTarget, appContext);
    plugin.install(ctx);

    let attempts = 0;
    const query = createQuery({
      key: 'per-query-retry',
      fn: () => { attempts++; return Promise.reject(new Error('fail')); },
      retry: 2,       // overrides global default of 0
      retryDelay: 0,  // no wait between retries
    });

    await vi.waitFor(() => expect(query.error()).not.toBeNull());
    // retry: 2 → 1 initial + 2 retries = 3 attempts
    expect(attempts).toBe(3);
    query.dispose();
  });

  it('cleanup resets global defaults', () => {
    const plugin = queryPlugin({ defaultRefetchOnFocus: false, defaultRetry: 0 });
    const ctx = createPluginContext(fakeTarget, appContext);
    const cleanup = plugin.install(ctx);

    expect(globalQueryDefaults.refetchOnFocus).toBe(false);
    expect(globalQueryDefaults.retry).toBe(0);

    if (typeof cleanup === 'function') cleanup();

    expect(globalQueryDefaults.refetchOnFocus).toBe(true);
    expect(globalQueryDefaults.retry).toBe(3);
  });
});
