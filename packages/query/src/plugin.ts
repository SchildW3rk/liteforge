/**
 * @liteforge/query — queryPlugin
 *
 * Registers the query cache under the 'query' key in the app context.
 * Demonstrates Plugin-to-Plugin resolve() — optionally reads 'toast' if registered.
 * Clears the cache on app destroy.
 */

import type { LiteForgePlugin, PluginContext } from '@liteforge/runtime';
import { queryCache } from './cache.js';
import { createQuery } from './query.js';
import { createMutation } from './mutation.js';
import { globalQueryDefaults, resetQueryDefaults } from './query.js';
import {
  setGlobalQueryErrorHandler,
  clearGlobalQueryErrorHandler,
} from './global-error-handler.js';
import type { QueryCacheInterface } from './types.js';
import type { GlobalQueryErrorHandler } from './global-error-handler.js';

export interface QueryApi {
  cache: QueryCacheInterface;
  createQuery: typeof createQuery;
  createMutation: typeof createMutation;
}

export interface QueryPluginOptions {
  /** Default stale time in ms for all queries. Per-query `staleTime` wins. @default 0 */
  defaultStaleTime?: number;
  /** Default cache time in ms for all queries. Per-query `cacheTime` wins. @default 300000 */
  defaultCacheTime?: number;
  /** Default refetch-on-focus behavior. Per-query `refetchOnFocus` wins. @default true */
  defaultRefetchOnFocus?: boolean;
  /** Default poll interval in ms. Per-query `refetchInterval` wins. @default undefined */
  defaultRefetchInterval?: number;
  /** Default retry count on failure. Per-query `retry` wins. @default 3 */
  defaultRetry?: number;
  /** Default delay between retries in ms. Per-query `retryDelay` wins. @default 1000 */
  defaultRetryDelay?: number;
  /** Global error handler called for every query and mutation error. */
  onError?: GlobalQueryErrorHandler;
}

export function queryPlugin(options: QueryPluginOptions = {}): LiteForgePlugin {
  return {
    name: 'query',
    install(context: PluginContext): () => void {
      // Optional toast integration — resolve() returns undefined if not registered
      const _toast = context.resolve<{ error: (msg: string) => void }>('toast');
      void _toast; // reserved for future global error handling

      // Apply global query defaults — only override when explicitly set
      if (options.defaultStaleTime !== undefined)
        globalQueryDefaults.staleTime = options.defaultStaleTime;
      if (options.defaultCacheTime !== undefined)
        globalQueryDefaults.cacheTime = options.defaultCacheTime;
      if (options.defaultRefetchOnFocus !== undefined)
        globalQueryDefaults.refetchOnFocus = options.defaultRefetchOnFocus;
      if (options.defaultRefetchInterval !== undefined)
        globalQueryDefaults.refetchInterval = options.defaultRefetchInterval;
      if (options.defaultRetry !== undefined)
        globalQueryDefaults.retry = options.defaultRetry;
      if (options.defaultRetryDelay !== undefined)
        globalQueryDefaults.retryDelay = options.defaultRetryDelay;

      if (options.onError) {
        setGlobalQueryErrorHandler(options.onError);
      }

      const api: QueryApi = { cache: queryCache, createQuery, createMutation };
      context.provide('query', api);

      return () => {
        resetQueryDefaults();
        clearGlobalQueryErrorHandler();
        queryCache.clear();
      };
    },
  };
}

// Declaration Merging — augments @liteforge/runtime's PluginRegistry so that
// use('query') returns QueryApi without a cast whenever @liteforge/query is imported.
declare module '@liteforge/runtime' {
  interface PluginRegistry {
    query: QueryApi;
  }
}
