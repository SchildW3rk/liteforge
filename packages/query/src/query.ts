/**
 * @liteforge/query - createQuery
 * 
 * Reactive data fetching with caching, retries, and automatic refetching.
 */

import { signal, effect } from '@liteforge/core';
import { queryCache, serializeKey } from './cache.js';
import type {
  CreateQueryOptions,
  ResolvedQueryOptions,
  QueryResult,
} from './types.js';

// ============================================================================
// Default Options
// ============================================================================

const DEFAULT_OPTIONS: ResolvedQueryOptions = {
  staleTime: 0,
  cacheTime: 5 * 60 * 1000, // 5 minutes
  refetchOnFocus: true,
  refetchInterval: undefined,
  retry: 3,
  retryDelay: 1000,
  enabled: () => true,
};

// ============================================================================
// Focus Tracking
// ============================================================================

/** Set of callbacks to run on window focus */
const focusCallbacks = new Set<() => void>();
let focusListenerAttached = false;

function attachFocusListener(): void {
  if (focusListenerAttached || typeof window === 'undefined') return;
  
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      for (const callback of focusCallbacks) {
        callback();
      }
    }
  });
  
  window.addEventListener('focus', () => {
    for (const callback of focusCallbacks) {
      callback();
    }
  });
  
  focusListenerAttached = true;
}

// ============================================================================
// createQuery Implementation
// ============================================================================

/**
 * Create a reactive query with automatic caching and refetching.
 * 
 * @param options - Query options including key, fetcher, and configuration
 * @returns Query result with reactive signals
 * 
 * @example
 * ```ts
 * // Simple query
 * const users = createQuery({
 *   key: 'users',
 *   fn: () => fetch('/api/users').then(r => r.json())
 * });
 * 
 * // Reactive key based on signal
 * const userId = signal(1);
 * const user = createQuery({
 *   key: () => ['user', userId()],
 *   fn: () => fetch(`/api/users/${userId()}`).then(r => r.json()),
 *   staleTime: 5000
 * });
 * ```
 */
export function createQuery<T>(options: CreateQueryOptions<T>): QueryResult<T> {
  const { key, fn: fetcher } = options;

  // Resolve options with defaults
  const opts: ResolvedQueryOptions = {
    staleTime: options.staleTime ?? DEFAULT_OPTIONS.staleTime,
    cacheTime: options.cacheTime ?? DEFAULT_OPTIONS.cacheTime,
    refetchOnFocus: options.refetchOnFocus ?? DEFAULT_OPTIONS.refetchOnFocus,
    refetchInterval: options.refetchInterval ?? DEFAULT_OPTIONS.refetchInterval,
    retry: options.retry ?? DEFAULT_OPTIONS.retry,
    retryDelay: options.retryDelay ?? DEFAULT_OPTIONS.retryDelay,
    enabled: options.enabled ?? DEFAULT_OPTIONS.enabled,
  };

  // Internal state signals
  const dataSignal = signal<T | undefined>(undefined);
  const errorSignal = signal<Error | undefined>(undefined);
  const isLoadingSignal = signal(false);
  const isFetchedSignal = signal(false);
  const fetchedAtSignal = signal(0);

  // Track if query is disposed
  let isDisposed = false;
  let currentKey: string = '';
  let unregisterFromCache: (() => void) | undefined;
  let pollingInterval: ReturnType<typeof setInterval> | undefined;
  let abortController: AbortController | undefined;

  /**
   * Check if data is stale.
   * Note: This is a regular function, not a computed, because staleness
   * depends on the current time which changes without signal updates.
   */
  function isStale(): boolean {
    const fetchedAt = fetchedAtSignal();
    if (fetchedAt === 0) return true;
    if (opts.staleTime === 0) return true;
    return Date.now() - fetchedAt > opts.staleTime;
  }

  /**
   * Execute the fetch with retry logic.
   */
  async function executeFetch(serializedKey: string): Promise<void> {
    if (isDisposed) return;

    // Check if enabled
    if (!opts.enabled()) {
      return;
    }

    // Abort any in-flight request
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();

    isLoadingSignal.set(true);
    errorSignal.set(undefined);

    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= opts.retry; attempt++) {
      if (isDisposed || abortController.signal.aborted) {
        isLoadingSignal.set(false);
        return;
      }

      try {
        const result = await fetcher();
        
        // Check if key changed or query disposed during fetch
        if (isDisposed || serializeCurrentKey() !== serializedKey) {
          return;
        }

        // Success - update state
        dataSignal.set(result);
        errorSignal.set(undefined);
        isLoadingSignal.set(false);
        isFetchedSignal.set(true);
        fetchedAtSignal.set(Date.now());

        // Update cache
        queryCache.set(serializedKey, result);

        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        
        // Don't retry if disposed or aborted
        if (isDisposed || abortController.signal.aborted) {
          isLoadingSignal.set(false);
          return;
        }

        // Wait before retry (except on last attempt)
        if (attempt < opts.retry) {
          await sleep(opts.retryDelay);
        }
      }
    }

    // All retries failed
    if (!isDisposed && serializeCurrentKey() === serializedKey) {
      errorSignal.set(lastError);
      isLoadingSignal.set(false);
    }
  }

  /**
   * Serialize current key (handles reactive keys).
   */
  function serializeCurrentKey(): string {
    if (typeof key === 'function') {
      return serializeKey(key());
    }
    return key;
  }

  /**
   * Refetch manually.
   */
  async function refetch(): Promise<void> {
    const serializedKey = serializeCurrentKey();
    await executeFetch(serializedKey);
  }

  /**
   * Handle focus refetch.
   */
  function onFocus(): void {
    if (isDisposed || !opts.refetchOnFocus) return;
    
    // Only refetch if data is stale
    if (isStale()) {
      refetch().catch(() => {
        // Silently ignore focus refetch errors
      });
    }
  }

  /**
   * Initialize the query.
   */
  function initialize(serializedKey: string): void {
    currentKey = serializedKey;

    // Subscribe to cache
    queryCache.subscribe(serializedKey);

    // Register for invalidation callbacks
    unregisterFromCache = queryCache.registerQuery(serializedKey, refetch);

    // Check for cached data
    const cachedEntry = queryCache.getEntry<T>(serializedKey);
    if (cachedEntry && cachedEntry.data !== undefined) {
      dataSignal.set(cachedEntry.data);
      fetchedAtSignal.set(cachedEntry.fetchedAt);
      isFetchedSignal.set(true);

      // If not stale, don't fetch
      if (cachedEntry.fetchedAt > 0 && 
          opts.staleTime > 0 && 
          Date.now() - cachedEntry.fetchedAt <= opts.staleTime) {
        return;
      }
    }

    // Initial fetch (if enabled)
    if (opts.enabled()) {
      executeFetch(serializedKey).catch(() => {
        // Error already handled in executeFetch
      });
    }
  }

  /**
   * Cleanup current key subscription.
   */
  function cleanup(): void {
    if (currentKey) {
      queryCache.unsubscribe(currentKey, opts.cacheTime);
    }
    if (unregisterFromCache) {
      unregisterFromCache();
      unregisterFromCache = undefined;
    }
  }

  // Set up reactive key tracking using effect
  let stopKeyEffect: (() => void) | undefined;

  if (typeof key === 'function') {
    // Reactive key - use effect to track dependencies
    stopKeyEffect = effect(() => {
      const newKey = serializeKey(key());
      
      if (newKey !== currentKey) {
        // Cleanup old key
        cleanup();
        
        // Initialize with new key
        initialize(newKey);
      }
    });
  } else {
    // Static key - initialize immediately
    initialize(key);
  }

  // Set up enabled guard tracking
  let stopEnabledEffect: (() => void) | undefined;
  if (options.enabled) {
    let wasEnabled = opts.enabled();
    stopEnabledEffect = effect(() => {
      const isEnabled = opts.enabled();
      
      // Trigger fetch when transitioning from disabled to enabled
      if (isEnabled && !wasEnabled && currentKey) {
        executeFetch(currentKey).catch(() => {});
      }
      wasEnabled = isEnabled;
    });
  }

  // Set up focus listener
  if (opts.refetchOnFocus) {
    attachFocusListener();
    focusCallbacks.add(onFocus);
  }

  // Set up polling
  if (opts.refetchInterval !== undefined && opts.refetchInterval > 0) {
    pollingInterval = setInterval(() => {
      if (!isDisposed && opts.enabled()) {
        refetch().catch(() => {});
      }
    }, opts.refetchInterval);
  }

  /**
   * Dispose the query.
   */
  function dispose(): void {
    if (isDisposed) return;
    isDisposed = true;

    // Abort any in-flight request
    if (abortController) {
      abortController.abort();
    }

    // Stop effects
    if (stopKeyEffect) {
      stopKeyEffect();
    }
    if (stopEnabledEffect) {
      stopEnabledEffect();
    }

    // Remove focus callback
    focusCallbacks.delete(onFocus);

    // Clear polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = undefined;
    }

    // Cleanup cache subscription
    cleanup();
  }

  return {
    data: dataSignal,
    error: errorSignal,
    isLoading: isLoadingSignal,
    isStale,
    isFetched: isFetchedSignal,
    refetch,
    dispose,
  };
}

// ============================================================================
// Utilities
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
