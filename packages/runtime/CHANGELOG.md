# @liteforge/runtime

## 0.6.6

### Patch Changes

- fix: restore context snapshot in For() children callbacks so use('router') works inside For() rendered components

## 0.6.5

### Patch Changes

- fix: use setAttribute for all SVG element props — avoids silent failure on SVGAnimatedString properties like d, points, viewBox

## 0.6.4

### Patch Changes

- fix: use createElementNS for SVG tags in h() — enables JSX SVG elements to render correctly in the browser

## 0.6.3

### Patch Changes

- 627a0e8: `ComponentFactory` call signature now uses optional props (`props?: InputP`). Components without defined props can now be called as `MyComponent()` instead of requiring `MyComponent({})`.

## 0.6.2

### Patch Changes

- Fix `ref` prop not being called in the template-compiler path (`_setProp`). When the Vite plugin's template extractor compiled JSX with `ref={el => ...}`, the callback was never invoked — it fell through to `setAttribute('ref', ...)`. The fix mirrors the existing `h.ts` behaviour: call the callback immediately with the DOM element. Regression tests added.

## 0.6.1

### Patch Changes

- Fix RouterOutlet mounting async components into detached containers — components with `load()` now render into the real DOM instead of a temporary `div`, preventing invisible async output. Fix `<Show>` double-signal unwrap — when the vite-plugin passes a signal reference through a getter, the condition is now unwrapped twice if needed, so `<Show when={mySignal}>` works correctly without manual `() => mySignal()` wrapping.

## 0.6.0

### Minor Changes

- Add `jsx-runtime` for `jsxImportSource` support; remove HMR console logs

  **`@liteforge/runtime`**

  - Add `jsx-runtime` entry point — re-exports `h` as `jsx`/`jsxs`/`jsxDEV` and `Fragment` for the `react-jsx` transform target
  - Export `./jsx-runtime` and `./jsx-dev-runtime` in `package.json`
  - Remove all `[LiteForge HMR]` console.log statements from `hmr.ts` and `app.ts`

  **`liteforge`**

  - Add `liteforge/jsx-runtime` barrel that re-exports from `@liteforge/runtime/jsx-runtime`
  - Export `./jsx-runtime` and `./jsx-dev-runtime` in `package.json`

  Users can now configure `tsconfig.json` with:

  ```json
  { "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "liteforge" } }
  ```

  No manual `h`/`Fragment` imports needed, no TypeScript errors.

## 0.5.0

### Minor Changes

- feat(runtime): Global Error Boundary

  New `createErrorBoundary()` system for centralized error capture and display:

  - `AppConfig.errorComponent` — custom fallback UI for all unhandled errors
  - `AppConfig.onError` — observer hook (Sentry, logging) called before any UI
  - `RouteDefinition.errorComponent` — per-route fallback rendered inside the outlet
  - Built-in DEV error page: error type badge, message, stack trace with highlighted first non-internal frame, Retry (reload) + Go Home buttons
  - Built-in PROD error page: minimal "Something went wrong." — no stack, no internals
  - Stack trace parser: V8 + Firefox/Safari formats, strips Vite `?t=` HMR timestamps
  - Global listeners: `unhandledrejection` + `window.error` caught after mount

  router: per-route `errorComponent` wired into RouterOutlet for render and lazy-load errors.

## 0.4.3

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

## 0.4.2

### Patch Changes

- feat(@liteforge/i18n): new signals-based internationalization plugin

  - Lazy-loaded locale files via async `load()` function
  - Dot-notation keys (`t('nav.home')`)
  - `{param}` interpolation
  - Pipe-based pluralization: `singular | plural` (2-part) and `zero | one | many` (3-part)
  - Fallback locale — loaded in parallel at startup, transparently used for missing keys
  - localStorage persistence with configurable key
  - No re-render on locale switch — only text nodes that call `t()` update
  - Async plugin install (`i18nPlugin`) awaits initial locale before app mounts (prevents FOUC)
  - Full TypeScript strictness, zero external dependencies

  feat(liteforge): add `liteforge/i18n` sub-path export

  patch(@liteforge/runtime): support async plugin `install()` return value (`Promise<void | (() => void)>`)

## 0.4.1

### Patch Changes

- 657e7a7: fix(runtime): set sideEffects to true to prevent tree-shaking of createApp()

  `"sideEffects": false` caused bundlers (Rollup/Vite) to tree-shake the
  `createApp()` call when its return value was not used, resulting in a blank
  page at runtime. `createApp()` mounts the app into the DOM — it is inherently
  a side-effectful operation.

## 0.4.0

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

## 0.3.0

### Minor Changes

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

## 0.2.3

### Patch Changes

- Fix `[object Object]` when a `ComponentFactory` result is used as a JSX child node. `h()` now correctly mounts `ComponentInstance` objects when encountered as children.

## 0.2.2

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

## 0.2.1

### Patch Changes

- fix: eliminate loading flash — stale-while-revalidate + HMR cache persistence

  **@liteforge/query:**

  - Query cache now persists on `window` and survives Vite HMR module re-evaluation (previously every HMR cycle reset the cache, forcing fresh fetches)
  - Signals initialize directly from cache at `createQuery()` time — no more flash of `data=undefined` before cache is read
  - Background revalidation: when stale data exists (on focus, HMR rerender, polling), `isLoading` stays `false` and fresh data replaces stale data silently — classic stale-while-revalidate behavior

  **@liteforge/runtime:**

  - HMR debounce timer moved to `window.__LITEFORGE_HMR_TIMER__` so it survives module re-evaluation
  - `fullRerender()` sets a cooldown flag to suppress the second Vite HMR wave triggered during remount

## 0.2.0

### Minor Changes

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
