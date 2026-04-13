/**
 * @liteforge/router — Component Helpers
 *
 * Convenience functions for accessing router state inside components.
 */

import { use } from '@liteforge/runtime';
import type { Signal } from '@liteforge/core';
import type { Router, RouteParams, QueryParams } from './types.js';

/**
 * Returns a reactive getter for a named route parameter.
 *
 * @example
 * ```ts
 * setup() {
 *   const postId = useParam('id');
 *   const query = createQuery({ key: () => ['post', postId()], fn: () => fetchPost(postId()) });
 *   return { query };
 * }
 * ```
 */
export function useParam(name: string): () => string | undefined {
  const router = use<Router>('router');
  return () => router.params()[name];
}

/**
 * Returns a typed snapshot of all current route params.
 * The returned object is re-read on every call — use inside reactive contexts
 * (effects, computed, JSX getters) to track param changes.
 *
 * @example
 * ```ts
 * setup() {
 *   const { id } = useParams<{ id: string }>();
 *   return { id };
 * }
 * ```
 */
export function useParams<T extends RouteParams = RouteParams>(): T {
  const router = use<Router>('router');
  return router.params() as T;
}

/**
 * Returns the current path Signal.
 *
 * @example
 * ```ts
 * setup() {
 *   const path = usePath();  // Signal<string>
 *   return { path };
 * }
 * ```
 */
export function usePath(): Signal<string> {
  const router = use<Router>('router');
  return router.path;
}

/**
 * Returns a typed snapshot of the current query string params.
 * The returned object is re-read on every call — use inside reactive contexts.
 *
 * @example
 * ```ts
 * setup() {
 *   const query = useQuery<{ tab?: string; page?: string }>();
 *   return { query };
 * }
 * ```
 */
export function useQuery<T extends QueryParams = QueryParams>(): T {
  const router = use<Router>('router');
  return router.query() as T;
}

/**
 * Returns the router instance from app context.
 * Prefer the specific composables (`useParam`, `useParams`, `usePath`, `useQuery`)
 * over this for better type safety.
 */
export function useRouter(): Router {
  return use<Router>('router');
}
