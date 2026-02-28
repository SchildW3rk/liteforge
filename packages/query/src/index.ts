/**
 * @liteforge/query
 * 
 * Signals-based data fetching and caching for LiteForge.
 */

// Core functions
export { createQuery } from './query.js';
export { createMutation } from './mutation.js';
export { queryCache, serializeKey } from './cache.js';

// Types
export type {
  // Query types
  QueryKey,
  QueryFetcher,
  CreateQueryOptions,
  QueryResult,
  
  // Mutation types
  MutationFn,
  CreateMutationOptions,
  MutationResult,
  CacheAccess,
  
  // Cache types
  CacheEntry,
  QueryCacheInterface,
} from './types.js';
