/**
 * @liteforge/query - createMutation
 * 
 * Mutations with optimistic updates and automatic cache invalidation.
 */

import { signal } from '@liteforge/core';
import { queryCache } from './cache.js';
import type {
  CreateMutationOptions,
  MutationResult,
  CacheAccess,
} from './types.js';

// ============================================================================
// createMutation Implementation
// ============================================================================

/**
 * Create a mutation handler with cache invalidation support.
 * 
 * @param options - Mutation options including fn, invalidate, and callbacks
 * @returns Mutation result with reactive signals
 * 
 * @example
 * ```ts
 * const createPost = createMutation({
 *   fn: (data: { title: string; body: string }) => 
 *     fetch('/api/posts', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json()),
 *   invalidate: ['posts'],
 *   onSuccess: (data) => console.log('Created:', data),
 * });
 * 
 * // Execute mutation
 * await createPost.mutate({ title: 'Hello', body: 'World' });
 * ```
 */
export function createMutation<TData, TVariables = void>(
  options: CreateMutationOptions<TData, TVariables>
): MutationResult<TData, TVariables> {
  const { fn: mutationFn, invalidate, onMutate, onSuccess, onError } = options;

  // Internal state signals
  const dataSignal = signal<TData | undefined>(undefined);
  const errorSignal = signal<Error | null>(null);
  const isLoadingSignal = signal(false);

  /**
   * Create cache access object for optimistic updates.
   */
  function createCacheAccess(): CacheAccess {
    return {
      get<T>(key: string): T | undefined {
        return queryCache.get<T>(key);
      },
      set<T>(key: string, data: T): void {
        queryCache.set(key, data);
      },
    };
  }

  /**
   * Execute the mutation.
   */
  async function mutate(variables: TVariables): Promise<TData> {
    isLoadingSignal.set(true);
    errorSignal.set(null);

    // Run onMutate for optimistic updates
    let rollbackData: unknown;
    if (onMutate) {
      try {
        rollbackData = onMutate(variables, createCacheAccess());
      } catch (err) {
        // onMutate error shouldn't stop the mutation
        console.error('[Query] onMutate error:', err);
      }
    }

    try {
      // Execute the mutation
      const result = await mutationFn(variables);

      // Update state
      dataSignal.set(result);
      isLoadingSignal.set(false);

      // Call onSuccess
      if (onSuccess) {
        try {
          onSuccess(result, variables);
        } catch (err) {
          // onSuccess error shouldn't affect the result
          console.error('[Query] onSuccess error:', err);
        }
      }

      // Invalidate cache keys
      if (invalidate && invalidate.length > 0) {
        for (const key of invalidate) {
          queryCache.invalidate(key);
        }
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      // Update state
      errorSignal.set(error);
      isLoadingSignal.set(false);

      // Call onError with rollback data
      if (onError) {
        try {
          onError(error, variables, rollbackData);
        } catch (e) {
          // onError error shouldn't affect the result
          console.error('[Query] onError error:', e);
        }
      }

      throw error;
    }
  }

  /**
   * Reset all signals to initial state.
   */
  function reset(): void {
    dataSignal.set(undefined);
    errorSignal.set(null);
    isLoadingSignal.set(false);
  }

  return {
    mutate,
    isLoading: isLoadingSignal,
    error: errorSignal,
    data: dataSignal,
    reset,
  };
}
