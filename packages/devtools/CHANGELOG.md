# @liteforge/devtools

## 3.0.1

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
