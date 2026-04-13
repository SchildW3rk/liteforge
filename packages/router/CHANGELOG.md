# @liteforge/router

## 0.12.0

### Minor Changes

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

## 0.11.0

### Minor Changes

- feat: `replace` flag in `NavigationTarget`, `createAuthGuard` `replace` option, and `router.getRedirectParam()` helper

  - `NavigationTarget` object form now accepts `replace?: boolean` — guard redirects can opt into `push` (new history entry) instead of the default `replace`
  - `createAuthGuard` gains a `replace` option (default `true`); set `replace: false` so the login page is pushed onto the history stack
  - `createAuthGuard` now passes the redirect path via `query.redirect` (decoded by the router) instead of manually encoding it into the URL string
  - `router.getRedirectParam()` reads, decodes, and validates the `?redirect=` query param; rejects absolute URLs and protocol-relative paths to prevent open redirect attacks

## 0.10.0

### Minor Changes

- Run guards on initial page load — closes #9

  The router now runs the full guard + middleware pipeline for the current URL before
  the app mounts. Previously guards only ran on `navigate()` calls, meaning authenticated
  routes rendered briefly (or fully) without an auth check on hard reload.

  - `initialNavigation: true` (default) — guards run on page load
  - `initialNavigation: false` — skip guards on first load (opt-out)
  - `router.isReady: Promise<boolean>` — resolves after the initial navigation completes
  - `routerPlugin` awaits `isReady` before `install()` returns, so `createApp().mount()` blocks until guards have run

  ```ts
  // No extra code needed — routerPlugin handles it:
  await createApp({ root: App, target: "#app" })
    .use(routerPlugin(router))
    .mount();
  ```

## 0.9.0

### Minor Changes

- Built-in guard factories now use options objects (breaking change)

  `createAuthGuard`, `createRoleGuard`, `createConfirmGuard`, and `createGuestGuard` now
  accept an options object instead of positional parameters — consistent with the
  LiteForge object-style API convention and fixing a silent auth bypass where passing
  an options object to the old positional signature made `isAuthenticated` always truthy.

  **Before:**

  ```ts
  createAuthGuard(() => !!user(), "/login");
  createRoleGuard((role) => hasRole(role), "/forbidden");
  ```

  **After:**

  ```ts
  createAuthGuard({ isAuthenticated: () => !!user(), loginPath: "/login" });
  createRoleGuard({
    hasRole: (role) => hasRole(role),
    unauthorizedPath: "/forbidden",
  });
  ```

  New option type exports: `CreateAuthGuardOptions`, `CreateRoleGuardOptions`,
  `CreateConfirmGuardOptions`, `CreateGuestGuardOptions`.

## 0.8.0

### Minor Changes

- **Typed Routes Phase 2 — `navigate(pattern, params)` overload**

  Navigate to parametric routes using the path pattern as key — TypeScript infers the required params object directly from the pattern. No `name` field, no codegen.

  ```ts
  const routes = [
    { path: "/users/:id", component: UserDetail },
    { path: "/posts/:year/:month", component: Archive },
    { path: "/home", component: Home },
  ] as const;

  const router = createRouter({ routes, history });

  // Phase 2 — pattern + typed params
  router.navigate("/users/:id", { id: "42" }); // ✓
  router.navigate("/posts/:year/:month", { year: "2024", month: "03" }); // ✓
  router.navigate("/users/:id", { ix: "42" }); // TS Error — wrong key
  router.navigate("/users/:id"); // TS Error — params required
  router.navigate("/home", { id: "42" }); // TS Error — no params on /home

  // Phase 1 still works
  router.navigate("/users/42"); // ✓ — filled path, no params arg
  ```

  Params are `encodeURIComponent`-encoded. The runtime dispatch uses `/:\w+/.test(path)` as the sole discriminator — the second argument is always treated as params when the path still contains an unfilled segment, eliminating any ambiguity with param names like `replace` or `state`.

  **Known limitation:** Optional params (`:page?`) are treated as required. Full optional param support is planned for Phase 3.

  New type export: `ExtractParamPaths<T>` — filters a routes array to only paths containing at least one `:param` segment.

## 0.7.0

### Minor Changes

- **Typed Routes (Phase 1) — path-safe `navigate()` via `createRouter<T>`**

  `createRouter` is now generic. With `as const` on your routes array, `navigate()` only accepts paths that match a known route — typos and wrong paths become TypeScript errors at compile time.

  ```ts
  const routes = [
    { path: "/", component: Home },
    { path: "/users/:id", component: UserDetail },
  ] as const;

  const router = createRouter({ routes, history });

  router.navigate("/users/42"); // ✓
  router.navigate("/usr/42"); // TS Error — no match
  router.navigate("/"); // ✓
  ```

  **Opt-in, fully non-breaking:** Without `as const`, TypeScript widens paths to `string` and `navigate()` accepts any string — identical to the previous behavior. No existing code needs changes.

  **Three new type utilities exported:**

  - `FillParams<P>` — replaces `:param` segments with `${string}`
  - `ExtractRoutePaths<T>` — extracts all path literals from a routes array (recursively includes children)
  - `TypedNavigationTarget<T>` — the composed type used in `navigate()` overloads

  **Phase 2 (coming):** Named route navigation with fully-typed params — `navigate('user-detail', { params: { id: '42' } })`.

## 0.6.0

### Minor Changes

- Implement `transitions` hooks and `useViewTransitions` in the router.

  `TransitionHooks` (`onBeforeLeave`, `onAfterLeave`, `onBeforeEnter`, `onAfterEnter`) are now fully wired — previously defined in types but never called. Pass them via `RouterOptions.transitions`.

  `useViewTransitions: true` wraps every DOM commit in `document.startViewTransition()` with graceful fallback for browsers that don't support the API yet.

  ```ts
  createRouter({
    routes,
    useViewTransitions: true,
    transitions: {
      onBeforeLeave: (el, ctx) =>
        el.animate([{ opacity: 1 }, { opacity: 0 }], 150).finished,
      onAfterEnter: (el, ctx) =>
        el.animate([{ opacity: 0 }, { opacity: 1 }], 150),
    },
  });
  ```

## 0.5.0

### Minor Changes

- `Link` now accepts `() => string` as `children` for reactive i18n labels.
  The anchor text updates automatically via `effect()` when the getter's
  dependencies change — no re-mount required.

## 0.4.2

### Patch Changes

- Fix RouterOutlet mounting async components into detached containers — components with `load()` now render into the real DOM instead of a temporary `div`, preventing invisible async output. Fix `<Show>` double-signal unwrap — when the vite-plugin passes a signal reference through a getter, the condition is now unwrapped twice if needed, so `<Show when={mySignal}>` works correctly without manual `() => mySignal()` wrapping.

## 0.4.1

### Patch Changes

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

## 0.4.0

### Minor Changes

- feat(router): add `lazyChildren` for code-split route subtrees

  `RouteDefinition` now accepts a `lazyChildren` property — a function that returns a `Promise<RouteDefinition[]>`. The children are loaded on the first navigation to any path under the route's prefix, resolved once, and cached.

  ```ts
  {
    path: '/admin',
    lazyChildren: () => import('./admin-routes.js').then(m => m.adminRoutes),
  }
  ```

  - `matchRoutes()` is now async to support lazy loading
  - New `matchRoutesSync()` export for sync contexts (router init, `resolve()`)
  - Router initialization and back/forward navigation use sync matching; async lazy-loading fires transparently on first child navigation

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

## 0.2.0

### Minor Changes

- Add `titleTemplate` and `useTitle()` for automatic `document.title` management.

  - `titleTemplate: (title: string | undefined) => string` in `RouterOptions` — sets `document.title` reactively on every navigation using `route.meta.title`
  - `useTitle(string | (() => string))` — per-page override with automatic cleanup on next route change
  - Priority cascade: `useTitle()` > `route.meta.title` > `titleTemplate` default

## 0.1.1

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
