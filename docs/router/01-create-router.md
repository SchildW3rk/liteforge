---
title: "createRouter"
category: "router"
tags: ["router", "createRouter", "navigate", "history", "guards", "middleware"]
related: ["Route Definition", "Navigation", "Context"]
---

# createRouter

> Client-side router with signals, guards, middleware, nested routes, and lazy loading.

## Installation

```bash
npm install @liteforge/router
```

## Quick Start

```ts
import { createRouter, createBrowserHistory } from '@liteforge/router'
import { routerPlugin } from '@liteforge/router'
import { createApp } from '@liteforge/runtime'
import { Home, About, UserDetail } from './pages'

const router = createRouter({
  history: createBrowserHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
    { path: '/users/:id', component: UserDetail },
  ],
})

await createApp({ root: App, target: '#app' })
  .use(routerPlugin(router))
```

## API Reference

### `createRouter<T>(options)` → `Router<T>`

**Options (`RouterOptions`):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `routes` | `RouteDefinition[]` | required | Route definitions |
| `history` | `History` | `createMemoryHistory()` | History implementation |
| `guards` | `RouteGuard[]` | `[]` | Global guards |
| `middleware` | `RouteMiddleware[]` | `[]` | Global middleware |
| `lazyDefaults` | `LazyDefaults` | — | Default lazy options |
| `scrollBehavior` | `ScrollBehavior` | `'top'` | Scroll restoration |
| `titleTemplate` | `string` | — | `%s | My App` |
| `transitions` | `TransitionHooks` | — | Enter/leave hooks |
| `useViewTransitions` | `boolean` | `false` | Use browser View Transitions API |
| `onError` | `(err: Error) => void` | — | Navigation error handler |
| `initialNavigation` | `boolean` | `true` | Run guards on page load before mounting |

**Returns (`Router<T>`):**

| Property / Method | Type | Description |
|-------------------|------|-------------|
| `.path` | `Signal<string>` | Current path |
| `.params` | `Signal<RouteParams>` | Current route params |
| `.query` | `Signal<QueryParams>` | Current query string |
| `.hash` | `Signal<string>` | Current hash |
| `.matched` | `Signal<RouteMatch>` | All matched route segments |
| `.location` | `Signal<Location>` | Full location object |
| `.isNavigating` | `Signal<boolean>` | True during navigation |
| `.navigate(target, opts?)` | `Promise<boolean>` | Navigate to a path |
| `.navigate(pattern, params, opts?)` | `Promise<boolean>` | Navigate with param filling |
| `.replace(target, opts?)` | `Promise<boolean>` | Replace current history entry |
| `.back()` | `void` | History back |
| `.forward()` | `void` | History forward |
| `.go(delta)` | `void` | History jump |
| `.beforeEach(cb)` | `() => void` | Register navigation guard |
| `.afterEach(cb)` | `() => void` | Register post-navigation hook |
| `.registerGuard(guard)` | `void` | Register named guard |
| `.unregisterGuard(name)` | `void` | Remove named guard |
| `.getRoute(name)` | `CompiledRoute \| undefined` | Find route by name |
| `.resolve(target)` | `{ href, route, params }` | Resolve URL without navigating |
| `.destroy()` | `void` | Clean up the router |
| `.isReady` | `Promise<boolean>` | Resolves when initial navigation (including guards) completes |

## Examples

### Typed navigation with `as const`

```ts
const router = createRouter({
  routes: [
    { path: '/' },
    { path: '/users/:id' },
  ] as const,
})

router.navigate('/users/:id', { id: '42' })  // TypeScript-checked
router.navigate('/typo')  // TS error
```

### History types

```ts
import {
  createBrowserHistory,  // uses window.history (pushState) — use this for browser SPAs
  createHashHistory,     // uses hash: #/path — no server config needed
  createMemoryHistory,   // in-memory (SSR / tests) — this is the default
} from '@liteforge/router'
```

> **Browser SPAs must pass `history: createBrowserHistory()` explicitly.**
> The default is `createMemoryHistory`, which is intended for SSR and testing.
> Without an explicit history, the router ignores `window.location` entirely and always starts at `/` — direct URL access and page refresh will always land on the root route.

#### Vite dev server — `historyApiFallback`

When using `createBrowserHistory`, the dev server must serve `index.html` for all routes (not just `/`). Add this to `vite.config.ts`:

```ts
export default defineConfig({
  server: {
    historyApiFallback: true,
  },
})
```

Without this, navigating directly to `http://localhost:5173/users/42` returns a 404 from the dev server instead of loading the app.

### Navigation guards

```ts
router.beforeEach(async ({ to, from }) => {
  if (to.path.startsWith('/admin') && !isLoggedIn()) {
    return { redirect: '/login' }  // redirect
  }
  return true  // allow
})
```

## Initial Navigation & Guards on Page Load

By default (`initialNavigation: true`), the router runs the full guard + middleware pipeline for the **current URL** before the app mounts. This prevents authenticated routes from rendering without an auth check on hard reload.

When using `routerPlugin`, `createApp().mount()` awaits `isReady` internally — no extra code needed:

```ts
// Guards run before App renders — auth redirect happens before any component mounts
await createApp({ root: App, target: '#app' })
  .use(routerPlugin(router))
  .mount()
```

If a guard redirects on the initial load, the URL is replaced and the redirect target is rendered instead. `isReady` resolves to `true` in this case (a route was rendered). It only resolves to `false` when navigation was fully blocked with no redirect.

To skip guards on the initial load (rare — only for apps that handle auth differently):

```ts
createRouter({ routes, initialNavigation: false })
```

## Notes

- `navigate()` uses the sole discriminator `/:\w+/.test(path)` to detect param-filling mode. Never use a key named `replace` or `state` as a route param name.
- The router is attached to app context via `routerPlugin`. Access it with `use('router')` inside components (typed when `@liteforge/router` is imported).
- `useParam(key)` helper returns a `Signal<string>` for a specific route param.
