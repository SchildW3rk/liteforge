/**
 * @liteforge/query Types
 * 
 * Type definitions for the query and caching system.
 */

// ============================================================================
// Query Types
// ============================================================================

/**
 * Query key - can be a string or a reactive function returning an array.
 */
export type QueryKeyPrimitive = string | number | boolean | null | undefined;
export type QueryKey =
  | string
  | QueryKeyPrimitive[]
  | ReadonlyArray<QueryKeyPrimitive>
  | (() => QueryKeyPrimitive[] | ReadonlyArray<QueryKeyPrimitive>);

/**
 * Fetcher function type.
 */
export type QueryFetcher<T> = () => Promise<T>;

/**
 * Options for createQuery (object-style API).
 */
export interface CreateQueryOptions<T> {
  /** Query key (string or reactive function) */
  key: QueryKey;
  /** Async function to fetch data */
  fn: QueryFetcher<T>;
  /** Time in ms until data is considered stale (default: 0) */
  staleTime?: number;
  /** Time in ms to keep unused cache entries (default: 5 minutes) */
  cacheTime?: number;
  /** Refetch when window regains focus (default: true) */
  refetchOnFocus?: boolean;
  /** Polling interval in ms (default: disabled) */
  refetchInterval?: number;
  /** Number of retry attempts on error (default: 3) */
  retry?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
  /** Reactive guard - query only runs when truthy */
  enabled?: () => boolean;
}

/**
 * Resolved query options with all defaults applied.
 */
export interface ResolvedQueryOptions {
  staleTime: number;
  cacheTime: number;
  refetchOnFocus: boolean;
  refetchInterval: number | undefined;
  retry: number;
  retryDelay: number;
  enabled: () => boolean;
}

/**
 * Query result with reactive signals.
 */
export interface QueryResult<T> {
  /** Current data (undefined while loading or on error) */
  data: () => T | undefined;
  /** Current error (null if no error) */
  error: () => Error | null;
  /** Whether the query is currently fetching */
  isLoading: () => boolean;
  /** Whether the cached data is stale */
  isStale: () => boolean;
  /** Whether the query has successfully fetched at least once */
  isFetched: () => boolean;
  /** Manually trigger a refetch */
  refetch: () => Promise<void>;
  /** Clean up the query (mark as inactive) */
  dispose: () => void;
}

// ============================================================================
// Mutation Types
// ============================================================================

/**
 * Mutation function type.
 */
export type MutationFn<TData, TVariables> = (variables: TVariables) => Promise<TData>;

/**
 * Cache access for optimistic updates.
 */
export interface CacheAccess {
  /** Get cached data for a key */
  get: <T>(key: string) => T | undefined;
  /** Set cached data for a key */
  set: <T>(key: string, data: T) => void;
}

/**
 * Options for createMutation (object-style API).
 */
export interface CreateMutationOptions<TData, TVariables> {
  /** Async function to execute the mutation */
  fn: MutationFn<TData, TVariables>;
  /** Query keys to invalidate on success */
  invalidate?: ReadonlyArray<string>;
  /** Called before the mutation - can return rollback data */
  onMutate?: (variables: TVariables, cache: CacheAccess) => unknown;
  /** Called on successful mutation */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Called on mutation error - receives rollback data from onMutate */
  onError?: (error: Error, variables: TVariables, rollback: unknown) => void;
}

/**
 * Mutation result with reactive signals.
 */
export interface MutationResult<TData, TVariables> {
  /** Execute the mutation */
  mutate: (variables: TVariables) => Promise<TData>;
  /** Whether the mutation is currently running */
  isLoading: () => boolean;
  /** Current error (null if no error) */
  error: () => Error | null;
  /** Data from the last successful mutation */
  data: () => TData | undefined;
  /** Reset all signals to initial state */
  reset: () => void;
}

// ============================================================================
// Cache Types
// ============================================================================

/**
 * Internal cache entry structure.
 */
export interface CacheEntry<T = unknown> {
  /** Cached data */
  data: T;
  /** Timestamp when data was fetched */
  fetchedAt: number;
  /** Number of active subscribers */
  subscribers: number;
  /** Timeout ID for garbage collection */
  gcTimeout: ReturnType<typeof setTimeout> | undefined;
}

/**
 * Query cache interface.
 */
export interface QueryCacheInterface {
  /** Get cached data for a key */
  get: <T>(key: string) => T | undefined;
  /** Set cached data for a key */
  set: <T>(key: string, data: T) => void;
  /** Invalidate a key or pattern (e.g., 'user:*') */
  invalidate: (keyOrPattern: string) => void;
  /** Clear all cache entries */
  clear: () => void;
  /** Get all cache entries (for devtools) */
  getAll: () => Map<string, CacheEntry>;
  /** Get entry metadata (for internal use) */
  getEntry: <T>(key: string) => CacheEntry<T> | undefined;
  /** Update entry metadata (for internal use) */
  updateEntry: <T>(key: string, updater: (entry: CacheEntry<T>) => CacheEntry<T>) => void;
  /** Subscribe to a cache entry (increment subscriber count) */
  subscribe: (key: string) => void;
  /** Unsubscribe from a cache entry (decrement subscriber count) */
  unsubscribe: (key: string, cacheTime: number) => void;
  /** Register a query for invalidation callbacks */
  registerQuery: (key: string, refetch: () => Promise<void>) => () => void;
}

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Query state (internal).
 */
export interface QueryState<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetched: boolean;
  fetchedAt: number;
}
