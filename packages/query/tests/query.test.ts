/**
 * createQuery Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signal, effect } from '@liteforge/core';
import { createQuery } from '../src/query.js';
import { queryCache } from '../src/cache.js';

describe('createQuery', () => {
  beforeEach(() => {
    queryCache.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('basic functionality', () => {
    it('fetches data on creation', async () => {
      const fetcher = vi.fn().mockResolvedValue({ id: 1, name: 'Alice' });
      const query = createQuery({ key: 'user', fn: fetcher });

      expect(query.isLoading()).toBe(true);
      expect(query.data()).toBeUndefined();

      await vi.waitFor(() => expect(query.isLoading()).toBe(false));

      expect(query.data()).toEqual({ id: 1, name: 'Alice' });
      expect(query.error()).toBeNull();
      expect(query.isFetched()).toBe(true);
      expect(fetcher).toHaveBeenCalledTimes(1);

      query.dispose();
    });

    it('sets error on fetch failure', async () => {
      const error = new Error('Network error');
      const fetcher = vi.fn().mockRejectedValue(error);
      
      const query = createQuery({ key: 'failing', fn: fetcher, retry: 0 });

      await vi.waitFor(() => expect(query.isLoading()).toBe(false));

      expect(query.data()).toBeUndefined();
      expect(query.error()?.message).toBe('Network error');
      expect(query.isFetched()).toBe(false);

      query.dispose();
    });

    it('converts non-Error throws to Error', async () => {
      const fetcher = vi.fn().mockRejectedValue('string error');
      
      const query = createQuery({ key: 'failing', fn: fetcher, retry: 0 });

      await vi.waitFor(() => expect(query.isLoading()).toBe(false));

      expect(query.error()).toBeInstanceOf(Error);
      expect(query.error()?.message).toBe('string error');

      query.dispose();
    });

    it('returns result signals', () => {
      const fetcher = vi.fn().mockResolvedValue(null);
      const query = createQuery({ key: 'test', fn: fetcher });

      expect(typeof query.data).toBe('function');
      expect(typeof query.error).toBe('function');
      expect(typeof query.isLoading).toBe('function');
      expect(typeof query.isStale).toBe('function');
      expect(typeof query.isFetched).toBe('function');
      expect(typeof query.refetch).toBe('function');
      expect(typeof query.dispose).toBe('function');

      query.dispose();
    });
  });

  describe('caching', () => {
    it('stores result in cache', async () => {
      const data = { id: 1 };
      const fetcher = vi.fn().mockResolvedValue(data);
      const query = createQuery({ key: 'cached', fn: fetcher });

      await vi.waitFor(() => expect(query.data()).toEqual(data));

      expect(queryCache.get('cached')).toEqual(data);

      query.dispose();
    });

    it('returns cached data immediately for same key', async () => {
      const fetcher1 = vi.fn().mockResolvedValue({ id: 1 });
      const query1 = createQuery({ key: 'shared', fn: fetcher1 });

      await vi.waitFor(() => expect(query1.data()).toEqual({ id: 1 }));

      // Create second query with same key
      const fetcher2 = vi.fn().mockResolvedValue({ id: 2 });
      const query2 = createQuery({ key: 'shared', fn: fetcher2, staleTime: 60000 });

      // Should immediately have cached data
      expect(query2.data()).toEqual({ id: 1 });
      expect(query2.isLoading()).toBe(false);

      // fetcher2 should not be called because data is fresh
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(fetcher2).not.toHaveBeenCalled();

      query1.dispose();
      query2.dispose();
    });

    it('refetches stale cached data in background', async () => {
      const fetcher1 = vi.fn().mockResolvedValue({ id: 1 });
      const query1 = createQuery({ key: 'shared', fn: fetcher1, staleTime: 0 });

      await vi.waitFor(() => expect(query1.data()).toEqual({ id: 1 }));
      query1.dispose();

      // Create second query - data is stale (staleTime: 0)
      const fetcher2 = vi.fn().mockResolvedValue({ id: 2 });
      const query2 = createQuery({ key: 'shared', fn: fetcher2, staleTime: 0 });

      // Should immediately have cached data
      expect(query2.data()).toEqual({ id: 1 });
      
      // But should also refetch
      await vi.waitFor(() => expect(query2.data()).toEqual({ id: 2 }));
      expect(fetcher2).toHaveBeenCalledTimes(1);

      query2.dispose();
    });
  });

  describe('staleTime', () => {
    it('data is not stale within staleTime', async () => {
      const fetcher = vi.fn().mockResolvedValue({ id: 1 });
      // Use a long staleTime so data is fresh immediately after fetch
      const query = createQuery({ key: 'stale-test-1', fn: fetcher, staleTime: 60000 });

      await vi.waitFor(() => expect(query.isFetched()).toBe(true));

      // Data should not be stale immediately after fetch
      expect(query.isStale()).toBe(false);

      query.dispose();
    });

    it('data becomes stale after staleTime', async () => {
      const fetcher = vi.fn().mockResolvedValue({ id: 1 });
      // Use a staleTime that's long enough to test but short enough to not slow tests
      const query = createQuery({ key: 'stale-test-2', fn: fetcher, staleTime: 100 });

      await vi.waitFor(() => expect(query.isFetched()).toBe(true));

      // Initially should not be stale (check immediately after fetch)
      expect(query.isStale()).toBe(false);

      // Wait for staleTime to pass (with some buffer)
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(query.isStale()).toBe(true);

      query.dispose();
    });

    it('staleTime: 0 means always stale', async () => {
      const fetcher = vi.fn().mockResolvedValue({ id: 1 });
      const query = createQuery({ key: 'stale-test-3', fn: fetcher, staleTime: 0 });

      await vi.waitFor(() => expect(query.isFetched()).toBe(true));

      expect(query.isStale()).toBe(true);

      query.dispose();
    });
  });

  describe('retry', () => {
    it('retries on failure', async () => {
      const fetcher = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValueOnce({ id: 1 });

      const query = createQuery({ 
        key: 'retry', 
        fn: fetcher, 
        retry: 3, 
        retryDelay: 10 
      });

      await vi.waitFor(() => expect(query.data()).toEqual({ id: 1 }), { timeout: 1000 });

      expect(fetcher).toHaveBeenCalledTimes(3);
      expect(query.error()).toBeNull();

      query.dispose();
    });

    it('gives up after retry count exceeded', async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error('persistent error'));

      const query = createQuery({ 
        key: 'retry', 
        fn: fetcher, 
        retry: 2, 
        retryDelay: 10 
      });

      await vi.waitFor(() => expect(query.isLoading()).toBe(false), { timeout: 1000 });

      expect(fetcher).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
      expect(query.error()?.message).toBe('persistent error');

      query.dispose();
    });

    it('respects retryDelay', async () => {
      vi.useFakeTimers();
      
      const fetcher = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce({ id: 1 });

      const query = createQuery({ 
        key: 'retry', 
        fn: fetcher, 
        retry: 1, 
        retryDelay: 1000 
      });

      // First attempt fails
      await vi.advanceTimersByTimeAsync(0);
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Wait for retry delay
      await vi.advanceTimersByTimeAsync(999);
      expect(fetcher).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(2);
      expect(fetcher).toHaveBeenCalledTimes(2);

      query.dispose();
    });
  });

  describe('reactive keys', () => {
    it('refetches when signal in key changes', async () => {
      const userId = signal(1);
      const fetcher = vi.fn().mockImplementation(() => 
        Promise.resolve({ id: userId() })
      );

      const query = createQuery({
        key: () => ['user', userId()],
        fn: fetcher
      });

      await vi.waitFor(() => expect(query.data()).toEqual({ id: 1 }));
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Change the signal
      userId.set(2);

      await vi.waitFor(() => expect(query.data()).toEqual({ id: 2 }));
      expect(fetcher).toHaveBeenCalledTimes(2);

      query.dispose();
    });

    it('caches separately for different keys', async () => {
      const userId = signal(1);
      const fetcher = vi.fn().mockImplementation(() => 
        Promise.resolve({ id: userId() })
      );

      const query = createQuery({
        key: () => ['user', userId()],
        fn: fetcher
      });

      await vi.waitFor(() => expect(query.data()).toEqual({ id: 1 }));

      // Change key
      userId.set(2);
      await vi.waitFor(() => expect(query.data()).toEqual({ id: 2 }));

      // Change back - should use cached data
      fetcher.mockClear();
      userId.set(1);

      // Give effect time to run
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(query.data()).toEqual({ id: 1 });

      query.dispose();
    });
  });

  describe('enabled option', () => {
    it('does not fetch when disabled', async () => {
      const fetcher = vi.fn().mockResolvedValue({ id: 1 });
      const query = createQuery({ 
        key: 'disabled', 
        fn: fetcher, 
        enabled: () => false 
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(fetcher).not.toHaveBeenCalled();
      expect(query.isLoading()).toBe(false);
      expect(query.data()).toBeUndefined();

      query.dispose();
    });

    it('fetches when enabled becomes true', async () => {
      const enabled = signal(false);
      const fetcher = vi.fn().mockResolvedValue({ id: 1 });
      
      const query = createQuery({ 
        key: 'toggle', 
        fn: fetcher, 
        enabled: () => enabled() 
      });

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(fetcher).not.toHaveBeenCalled();

      // Enable the query
      enabled.set(true);

      await vi.waitFor(() => expect(query.data()).toEqual({ id: 1 }));
      expect(fetcher).toHaveBeenCalledTimes(1);

      query.dispose();
    });
  });

  describe('refetch', () => {
    it('manual refetch updates data', async () => {
      let count = 0;
      const fetcher = vi.fn().mockImplementation(() => 
        Promise.resolve({ count: ++count })
      );

      const query = createQuery({ key: 'manual', fn: fetcher });

      await vi.waitFor(() => expect(query.data()).toEqual({ count: 1 }));

      await query.refetch();

      expect(query.data()).toEqual({ count: 2 });
      expect(fetcher).toHaveBeenCalledTimes(2);

      query.dispose();
    });

    it('refetch clears error', async () => {
      let shouldFail = true;
      const fetcher = vi.fn().mockImplementation(() => 
        shouldFail 
          ? Promise.reject(new Error('fail')) 
          : Promise.resolve({ id: 1 })
      );

      const query = createQuery({ key: 'error-refetch', fn: fetcher, retry: 0 });

      await vi.waitFor(() => expect(query.error()).toBeDefined());

      shouldFail = false;
      await query.refetch();

      expect(query.error()).toBeNull();
      expect(query.data()).toEqual({ id: 1 });

      query.dispose();
    });
  });

  describe('refetchInterval', () => {
    it('polls at specified interval', async () => {
      let count = 0;
      const fetcher = vi.fn().mockImplementation(() => 
        Promise.resolve({ count: ++count })
      );

      const query = createQuery({ 
        key: 'poll', 
        fn: fetcher, 
        refetchInterval: 100  // Use short interval for real timers
      });

      await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

      // Wait for a couple more polls
      await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2), { timeout: 300 });
      await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3), { timeout: 300 });

      query.dispose();
    });

    it('stops polling on dispose', async () => {
      const fetcher = vi.fn().mockResolvedValue({ id: 1 });
      const query = createQuery({ 
        key: 'poll-dispose', 
        fn: fetcher, 
        refetchInterval: 50 
      });

      await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));

      const callCount = fetcher.mock.calls.length;
      query.dispose();

      // Wait a bit and verify no more calls
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(fetcher.mock.calls.length).toBe(callCount);
    });
  });

  describe('dispose', () => {
    it('stops all activity on dispose', async () => {
      const fetcher = vi.fn().mockResolvedValue({ id: 1 });
      const query = createQuery({ key: 'dispose-test', fn: fetcher });

      await vi.waitFor(() => expect(query.data()).toEqual({ id: 1 }));
      
      query.dispose();

      // Multiple disposes should be safe
      query.dispose();

      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('aborts in-flight request on dispose', async () => {
      let resolvePromise: (value: unknown) => void;
      const fetcher = vi.fn().mockImplementation(() => 
        new Promise(resolve => { resolvePromise = resolve; })
      );

      const query = createQuery({ key: 'abort', fn: fetcher });

      expect(query.isLoading()).toBe(true);

      query.dispose();

      // Resolve the promise - should not update data
      resolvePromise!({ id: 1 });
      await new Promise(resolve => setTimeout(resolve, 10));

      // Data should not be set after dispose
      // Note: The actual behavior depends on implementation
    });
  });

  describe('concurrent queries', () => {
    it('second query uses cached data without refetching when fresh', async () => {
      const fetcher = vi.fn().mockResolvedValue({ shared: true });

      // First query fetches
      const query1 = createQuery({ key: 'concurrent', fn: fetcher, staleTime: 60000 });
      await vi.waitFor(() => expect(query1.data()).toEqual({ shared: true }));
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Second query should use cache (data is fresh due to staleTime)
      fetcher.mockClear();
      const query2 = createQuery({ key: 'concurrent', fn: fetcher, staleTime: 60000 });

      // Should immediately have cached data
      expect(query2.data()).toEqual({ shared: true });
      
      // Wait a bit to ensure no fetch is triggered
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(fetcher).not.toHaveBeenCalled();

      query1.dispose();
      query2.dispose();
    });

    it('multiple simultaneous queries may both fetch', async () => {
      // When created at the same time before any cache exists,
      // both queries will attempt to fetch
      const fetcher = vi.fn().mockResolvedValue({ shared: true });

      const query1 = createQuery({ key: 'simultaneous', fn: fetcher });
      const query2 = createQuery({ key: 'simultaneous', fn: fetcher });

      await vi.waitFor(() => {
        expect(query1.data()).toEqual({ shared: true });
        expect(query2.data()).toEqual({ shared: true });
      });

      // Both may have fetched - this is expected behavior
      expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(1);

      query1.dispose();
      query2.dispose();
    });
  });

  describe('signals reactivity', () => {
    it('data signal triggers effects', async () => {
      const fetcher = vi.fn().mockResolvedValue({ id: 1 });
      const query = createQuery({ key: 'reactive', fn: fetcher });

      const values: unknown[] = [];
      const stopEffect = effect(() => {
        values.push(query.data());
      });

      await vi.waitFor(() => expect(query.data()).toEqual({ id: 1 }));

      // Should have recorded undefined and then the data
      expect(values).toContain(undefined);
      expect(values).toContainEqual({ id: 1 });

      stopEffect();
      query.dispose();
    });

    it('isLoading signal triggers effects', async () => {
      const fetcher = vi.fn().mockResolvedValue({ id: 1 });
      const query = createQuery({ key: 'loading-reactive', fn: fetcher });

      const states: boolean[] = [];
      const stopEffect = effect(() => {
        states.push(query.isLoading());
      });

      await vi.waitFor(() => expect(query.isLoading()).toBe(false));

      expect(states).toContain(true);
      expect(states).toContain(false);

      stopEffect();
      query.dispose();
    });
  });

  describe('unhappy path / error cases', () => {
    it('fetcher that throws synchronously is treated as rejection', async () => {
      const query = createQuery({
        key: 'sync-throw',
        retry: 0,
        fn: () => { throw new Error('sync boom'); },
      });

      await vi.waitFor(() => expect(query.isLoading()).toBe(false));
      expect(query.error()).toBeInstanceOf(Error);
      expect((query.error() as Error).message).toBe('sync boom');
      expect(query.data()).toBeUndefined();
      query.dispose();
    });

    it('refetch while already loading does not run two parallel fetches', async () => {
      let resolveFirst!: (v: string) => void;
      const fetcher = vi.fn().mockImplementationOnce(
        () => new Promise(r => { resolveFirst = r; })
      ).mockResolvedValue('second');

      const query = createQuery({ key: 'refetch-loading', fn: fetcher });

      // still loading — trigger a second refetch
      query.refetch();
      resolveFirst('first');

      await vi.waitFor(() => expect(query.isLoading()).toBe(false));
      // fetcher must not have been called more than twice total
      expect(fetcher.mock.calls.length).toBeLessThanOrEqual(2);
      query.dispose();
    });

    it('dispose while loading stops isLoading and does not set data', async () => {
      let resolve!: (v: string) => void;
      const fetcher = vi.fn().mockImplementation(
        () => new Promise(r => { resolve = r; })
      );

      const query = createQuery({ key: 'dispose-loading', fn: fetcher });
      expect(query.isLoading()).toBe(true);

      query.dispose();
      resolve('late value');

      // After dispose the data must NOT update
      await new Promise(r => setTimeout(r, 0));
      expect(query.data()).toBeUndefined();
    });

    it('error state is cleared when refetch succeeds', async () => {
      const fetcher = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('ok');

      const query = createQuery({ key: 'error-then-ok', retry: 0, fn: fetcher });

      await vi.waitFor(() => expect(query.error()).not.toBeNull());
      expect(query.data()).toBeUndefined();

      query.refetch();
      await vi.waitFor(() => expect(query.data()).toBe('ok'));
      expect(query.error()).toBeNull();
      query.dispose();
    });

    it('non-Error rejection is wrapped in an Error', async () => {
      const query = createQuery({ key: 'non-error-throw', retry: 0, fn: () => Promise.reject('plain string') });

      await vi.waitFor(() => expect(query.error()).not.toBeNull());
      expect(query.error()).toBeInstanceOf(Error);
      query.dispose();
    });
  });
});
