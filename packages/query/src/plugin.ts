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
import type { QueryCacheInterface } from './types.js';

export interface QueryApi {
  cache: QueryCacheInterface;
  createQuery: typeof createQuery;
  createMutation: typeof createMutation;
}

export interface QueryPluginOptions {
  defaultStaleTime?: number;
  defaultCacheTime?: number;
}

export function queryPlugin(options: QueryPluginOptions = {}): LiteForgePlugin {
  return {
    name: 'query',
    install(context: PluginContext): () => void {
      // Optional toast integration — resolve() returns undefined if not registered
      const _toast = context.resolve<{ error: (msg: string) => void }>('toast');
      void _toast; // reserved for future global error handling

      // options stored for future per-instance configuration
      void options;

      const api: QueryApi = { cache: queryCache, createQuery, createMutation };
      context.provide('query', api);

      return () => {
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
