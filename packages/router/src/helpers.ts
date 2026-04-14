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
/**
 * Returns the parsed numeric ID from a route parameter for edit/create forms.
 * Returns `null` when the param is absent, empty, non-numeric, `NaN`, or `≤ 0`.
 *
 * @param param - Route param name (default: `'id'`)
 *
 * @example
 * ```ts
 * setup() {
 *   const { editId, isEdit } = useEditParam()
 *   // editId: number | null
 *   // isEdit: boolean
 * }
 *
 * // Custom param name:
 * const { editId, isEdit } = useEditParam('invoiceId')
 * ```
 */
export function useEditParam(param = 'id'): { editId: number | null; isEdit: boolean } {
  const raw = useParam(param);
  const raw$ = raw();
  const parsed = raw$ ? Number(raw$) : NaN;
  const editId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  return { editId, isEdit: editId !== null };
}

export function useRouter(): Router {
  return use<Router>('router');
}
