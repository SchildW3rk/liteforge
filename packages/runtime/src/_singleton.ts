/**
 * Internal utility: globalThis-backed singleton state.
 *
 * Motivation — Bundle duplication in monorepos:
 *   Bundlers (Bun in particular) can emit `@liteforge/runtime` twice in the
 *   same client bundle when the package is reachable via multiple import
 *   paths (direct `@liteforge/runtime` and via the `liteforge` umbrella).
 *   Each module instance gets its own module-scoped state — e.g. two
 *   `contextStack` arrays — which means plugins installed into one instance
 *   are invisible to lookups through the other. `RouterOutlet` fails with
 *   "router not in context" even though `routerPlugin` installed it.
 *
 * Precedent:
 *   `@liteforge/modal` already uses `globalThis.__lfModalRegistry__` for the
 *   exact same reason (Vite split-chunk duplication). This helper generalises
 *   that pattern so future mutable module-state can opt in with one line.
 *
 * Contract:
 *   - Key is namespaced via `Symbol.for('@liteforge/runtime.<key>')` so two
 *     frameworks using the same bare key don't collide.
 *   - `init()` runs at most once per process. Subsequent calls return the
 *     existing singleton regardless of how many times the module was loaded.
 *   - Intentionally not exported from the package — internal use only.
 */

export function createGlobalSingleton<T>(key: string, init: () => T): T {
  const symbolKey = Symbol.for(`@liteforge/runtime.${key}`)
  const g = globalThis as unknown as Record<symbol, unknown>
  if (!(symbolKey in g)) {
    g[symbolKey] = init()
  }
  return g[symbolKey] as T
}
