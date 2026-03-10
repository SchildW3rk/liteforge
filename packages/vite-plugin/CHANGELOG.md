# @liteforge/vite-plugin

## 0.4.4

### Patch Changes

- fix: rewrite param refs in For() event handlers

## 0.4.3

### Patch Changes

- Add Vite 7 to peer dependency range (`^5.0.0 || ^6.0.0 || ^7.0.0`)

## 0.4.2

### Patch Changes

- Fix Show() unmount race and template path-resolver traversal

  - `runtime`: `Show()` now uses `marker.isConnected` instead of `marker.parentNode`
    so the deferred `requestAnimationFrame` is a no-op when the router unmounts
    the outlet before the frame fires — eliminates stale-content flashes on fast
    route transitions
  - `vite-plugin`: introduce `toDomChildren()` in path-resolver to correctly handle
    mixed static/dynamic child sequences; fixes off-by-one `nextSibling` traversal
    that caused null-ref crashes in template-extracted components with adjacent
    text nodes and reactive expressions

## 0.4.0

### Minor Changes

- c2a37b5: feat(vite-plugin): template extraction always-on + for-transform single-pass optimization

  - **Breaking default change**: `templateExtraction` now defaults to `true` (was `'auto'`).
    Dev and prod now use the same code path — no more "works in prod but not dev" surprises.
    Set `templateExtraction: false` only when debugging JSX transform issues.

  - **For-transform rewrite**: Single-pass walker with identity-short-circuits.
    `rewriteParamRefs` returns the original node unchanged when no param reference is found,
    eliminating a separate pre-scan pass per JSX attribute. Idempotent: `item()` calls are
    left as-is so the rewrite is safe to call on already-transformed code.

  - **Template visitor**: Enter-phase confirmed correct with clarifying comments explaining
    why `analyzeElement` must run before child JSX nodes are replaced.

  - **Regression tests**: Added Group I — nested JSX in expression children (e.g. `.map()` callbacks).

## 0.3.0

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

## 0.2.3

### Patch Changes

- feat(runtime): For component now passes getter functions to children

  `For`'s `children` callback now receives `(item: () => T, index: () => number)` instead of plain values. This enables signal-backed in-place updates when items reorder — DOM nodes are moved, not destroyed/recreated. Reactive bindings like `{() => item().name}` update automatically without re-running the render function.

  **Migration:** wrap item and index reads in the children callback:

  ```tsx
  // before
  For({ children: (user, i) => <li>{user.name}</li> });

  // after
  For({ children: (user, i) => <li>{() => user().name}</li> });
  ```

  Also fixes `vite-plugin`: `ref` prop is no longer wrapped in a getter function.

## 0.2.2

### Patch Changes

- Fix getter-wrapping incorrectly applied to MemberExpression component calls in JSX children.

  Calls like `table.Root()` or `calendar.Toolbar()` previously got wrapped in a reactive getter `() => table.Root()` because `processChildExpression` only checked `Identifier`-callees with uppercase names. The fix extends the check to `MemberExpression`-callees whose property starts with an uppercase letter — matching the same convention used for components.

## 0.2.1

### Patch Changes

- fix: relax generic constraints and fix JSX component prop passing

  **@liteforge/runtime**

  - `createComponent<TProps>()` now accepts any interface as props type — no longer requires an index signature (`Record<string, unknown>`). Typed props with optional properties work correctly under `exactOptionalPropertyTypes: true`.
  - Added `ComponentFactoryInternal` export for internal lifecycle access (used by `h()`, `app.ts`, `control-flow.ts`)
  - `ComponentFactory` call signature returns `Node` (= `JSX.Element`) for proper JSX tag usage

  **@liteforge/vite-plugin**

  - JSX props on PascalCase (component) tags are no longer wrapped in getter functions. Only HTML element props get getter-wrapped for signal reactivity. This fixes runtime errors like `props.rows.map is not a function` when passing arrays or objects as component props.

  **@liteforge/router**

  - `RouteComponent` and `LazyComponent` type constraints relaxed to `object` (consistent with runtime change)

  **@liteforge/table**

  - `cell` and `headerCell` column definition return type widened to `Node | Element`

## 0.2.0

### Minor Changes

- 20f3b24: Component-level HMR with state preservation

  - Components hot-replace without full page reload
  - `setup()` signals preserve their values (form inputs, toggles, counters)
  - Global stores preserve state (singleton registry pattern)
  - Router keeps current route
  - Scroll position maintained
  - DevTools stays open

  Implementation:

  - Vite plugin injects `__hmrId` into `createComponent()` calls
  - Runtime tracks mounted instances and re-renders with new component function
  - `setup()` result (signals) passed to new render, preserving reactivity

### Patch Changes

- b41d056: feat(hmr): component registry architecture for reliable hot module replacement

  Replaces the signal-driven HMR approach with a simpler component registry:

  - Every `createComponent()` call registers its definition in a `componentRegistry` Map
  - On Vite HMR, the module is re-evaluated → registry updated with latest code
  - `fullRerender()` tears down and remounts the app; all factories read the latest
    definition at call-time, including `setup()`, `component()`, `mounted()` etc.
  - Stores and router survive every re-render as module-level singletons
  - Layout edits now update instantly without a page reload
  - `setup()`-defined values (table columns, signals) update correctly after HMR
  - Removed ~370 lines of complexity: instance tracking, outlet transplanting,
    layout detection, `HotComponentState`, `createHotComponent`, `clearHotComponents`
  - `fullRerender()` is debounced 50 ms and preserves scroll position

  **Breaking (internal):** `HMRHandler` no longer has a `components` field.
  The `HMRInstance` type alias has been removed. The `HMRHandler.handleUpdate`
  method was renamed from `.update()` in the vite-plugin generated code.

## 0.1.1

### Patch Changes

- 754b399: Add HMR (Hot Module Replacement) support

  Browser now auto-reloads when saving `.tsx`/`.jsx` files during development. This is Level 1 HMR - it triggers a page reload to pick up changes immediately, eliminating the need for manual browser refresh.

  **vite-plugin changes:**

  - HMR boundary code now includes a callback that notifies the global `__LITEFORGE_HMR__` handler
  - Module ID is passed to identify which module was updated
  - Source maps use empty mappings to preserve Vite's module graph

  **runtime changes:**

  - New `hmr.ts` module with `HMRHandler` interface and global registry
  - `initHMR()` initializes the HMR handler on `window.__LITEFORGE_HMR__`
  - `createApp()` integrates with HMR for potential full-app re-render

  Future work (Level 2 HMR): Component-level updates that preserve signal state.
