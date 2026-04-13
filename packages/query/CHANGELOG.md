# @liteforge/query

## 3.2.1

### Patch Changes

- fix/feat: multi-issue fixes and DX improvements

  **@liteforge/router**

  - fix(#20): lazy child routes with `:param/segment` pattern now correctly matched on initial navigation — replaced literal `startsWith` prefix check with param-aware regex
  - feat(#17): added `useParams<T>()`, `usePath()`, `useQuery<T>()`, `useRouter()` composables
  - docs(#19): added nested children route examples with absolute vs relative paths explanation

  **@liteforge/query**

  - fix(#15): `QueryKey` now accepts `(string | number | boolean | null | undefined)[]` — plain mutable arrays work without `as any`

  **@liteforge/devtools**

  - fix(#16): `PanelPosition` now includes `'bottom-right'`
  - fix(#16): `stores` option added to `DevToolsConfig` for passing additional stores explicitly
  - refactor: `DevToolsStore` and `DevToolsStoreMap` moved to `types.ts`

  **@liteforge/runtime**

  - fix(#14): `For` children callback `index` parameter JSDoc clarified — it is a plain `number`, not a signal; do not call `index()`
  - feat(#12): `PluginRegistry` JSDoc extended with Declaration Merging example for typed `use()` calls

  **@liteforge/admin**

  - feat(#18): `buildAdminRoutes` accepts `prefix` (custom URL prefix) and `layout` (custom layout component) options

- Updated dependencies
  - @liteforge/runtime@0.6.9

## 3.2.0

### Minor Changes

- queryPlugin now supports global defaults for all CreateQueryOptions

  Eliminates the need for per-project `createQuery` wrappers just to set sensible global values. All `CreateQueryOptions` keys with defaults are now overridable globally via `QueryPluginOptions`. Per-query options always win.

  New options: `defaultRefetchOnFocus`, `defaultRefetchInterval`, `defaultRetry`, `defaultRetryDelay` (in addition to the existing `defaultStaleTime` and `defaultCacheTime`).

  ```ts
  queryPlugin({
    defaultRefetchOnFocus: false,
    defaultStaleTime: 30_000,
    defaultRetry: 1,
  });
  ```

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.6.8

## 3.1.0

### Minor Changes

- Add global error handler for queries and mutations

  Pass `onError` to `queryPlugin()` to receive every query and mutation error in one place — no need to add `onError` to each individual `createQuery` / `createMutation` call.

  ```ts
  createApp({ root: App, target: "#app" })
    .use(
      queryPlugin({
        onError: (error, ctx) => {
          toast.error(`[${ctx.type}] ${error.message}`);
        },
      })
    )
    .mount();
  ```

  - `QueryErrorContext.type` is `'query'` or `'mutation'`
  - `QueryErrorContext.key` contains the serialized cache key for query errors
  - Handler is automatically cleared on plugin cleanup
  - `GlobalQueryErrorHandler` and `QueryErrorContext` types are exported from the package

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.6.7

## 3.0.0

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.6.0

## 2.0.0

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.5.0

## 1.0.0

### Minor Changes

- ## Formal Plugin System

  LiteForge now has a first-class plugin system. All packages ship a `*Plugin()` factory that integrates cleanly into the app bootstrap chain.

  ### `@liteforge/runtime` — AppBuilder + PluginContext

  `createApp()` now returns an `AppBuilder` with `.use(plugin).mount()`:

  ```ts
  const app = await createApp({ root: App, target: "#app" })
    .use(routerPlugin(createAppRouter()))
    .use(queryPlugin())
    .use(clientPlugin({ baseUrl: "/api", query: queryIntegration() }))
    .use(modalPlugin())
    .use(devtoolsPlugin())
    .mount();
  ```

  `await createApp(...)` (without `.mount()`) still works via the Thenable pattern — fully backward compatible.

  **New APIs:**

  - `LiteForgePlugin` — `{ name: string, install(ctx: PluginContext): void | (() => void) }`
  - `PluginContext` — `provide(key, value)` + `resolve(key)` for plugin-to-plugin communication
  - `PluginRegistry` — empty interface, extended via Declaration Merging per package
  - `onSetupCleanup(fn)` — register cleanup from within `setup()`, auto-runs on component destroy

  ### `@liteforge/router` — `routerPlugin` + `useParam()`

  ```ts
  import { routerPlugin, useParam } from "@liteforge/router";

  // In setup():
  const postId = useParam("id"); // → () => string | undefined
  ```

  - `routerPlugin(options)` — manages router lifecycle as a plugin
  - `useParam(name)` — reactive getter for route params, no manual `use('router')` needed
  - `use('router')` now returns `Router` without a cast (Declaration Merging in `index.ts`)
  - `useTitle()` fixes: proper cleanup via `onSetupCleanup` + `afterEach`, no more global title leak; restores route `meta.title` on cleanup
  - `hasTitleOverride()` — exported helper for middleware/store coordination

  ### `@liteforge/query` — `queryPlugin` + auto-dispose

  ```ts
  import { queryPlugin } from "@liteforge/query";

  // In setup():
  const { createQuery, createMutation } = use("query");
  ```

  - `queryPlugin()` — registers `QueryApi` under `'query'` key
  - `QueryApi` now includes `createQuery` and `createMutation` — no direct package import needed in components
  - `createQuery()` auto-disposes via `onSetupCleanup` — no more manual `destroyed()` boilerplate
  - `use('query')` typed as `QueryApi` (Declaration Merging)

  ### `@liteforge/client` — `clientPlugin` + `queryIntegration()` + `useQueryClient()`

  ```ts
  import {
    clientPlugin,
    queryIntegration,
    useQueryClient,
  } from "@liteforge/client";

  // Setup:
  app.use(clientPlugin({ baseUrl: "/api", query: queryIntegration() }));

  // In components:
  const client = use("client"); // → Client
  const client = useQueryClient(); // → QueryClient (explicit opt-in)
  ```

  - `clientPlugin(options)` — one plugin, one `'client'` registry key
  - `queryIntegration()` — explicit factory to wire `@liteforge/query`, no hidden `resolve()` magic
  - `useQueryClient()` — typed helper; the cast lives once in the package, not scattered in user code
  - `PluginRegistry.client: Client` — never lies; `useQueryClient()` for `QueryClient` access

  ### `@liteforge/modal` — `modalPlugin`

  ```ts
  import { modalPlugin } from "@liteforge/modal";

  app.use(modalPlugin());
  // use('modal') → { open, confirm, alert, prompt }
  ```

  - Modal container inserted `insertBefore` the `#app` sibling — not appended to `body`
  - Container removed on `destroy()`

  ### `@liteforge/devtools` — `devtoolsPlugin`

  ```ts
  import { devtoolsPlugin } from "@liteforge/devtools";

  app.use(devtoolsPlugin({ shortcut: "ctrl+shift+d", position: "right" }));
  ```

  ### `@liteforge/vite-plugin` — compile-time `For`/`Show` transform

  The Vite plugin now transforms `For` and `Show` calls at compile time:

  ```tsx
  // You write:
  For({ each: items, children: (item) => <li>{item.name}</li> });
  Show({ when: isVisible, children: () => <div /> });

  // Compiler produces (getter-based runtime calls):
  For({
    each: () => items(),
    children: (item) => <li>{() => item().name}</li>,
  });
  Show({ when: () => isVisible(), children: () => <div /> });
  ```

  Developers write clean, plain code. The runtime stays getter-based for fine-grained in-place DOM updates.

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.4.0

## 0.1.1

### Patch Changes

- fix: eliminate loading flash — stale-while-revalidate + HMR cache persistence

  **@liteforge/query:**

  - Query cache now persists on `window` and survives Vite HMR module re-evaluation (previously every HMR cycle reset the cache, forcing fresh fetches)
  - Signals initialize directly from cache at `createQuery()` time — no more flash of `data=undefined` before cache is read
  - Background revalidation: when stale data exists (on focus, HMR rerender, polling), `isLoading` stays `false` and fresh data replaces stale data silently — classic stale-while-revalidate behavior

  **@liteforge/runtime:**

  - HMR debounce timer moved to `window.__LITEFORGE_HMR_TIMER__` so it survives module re-evaluation
  - `fullRerender()` sets a cooldown flag to suppress the second Vite HMR wave triggered during remount
