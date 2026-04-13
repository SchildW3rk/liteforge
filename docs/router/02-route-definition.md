---
title: "Route Definition"
category: "router"
tags: ["routes", "nested", "lazy", "guards", "redirect", "meta", "preload"]
related: ["createRouter", "Navigation", "Lazy Loading"]
---

# Route Definition

> Define routes, nested layouts, lazy-loaded components, guards, and preloaders.

## Installation

```bash
npm install @liteforge/router
```

## Quick Start

```ts
import { createRouter, lazy } from '@liteforge/router'
import { createAuthGuard } from '@liteforge/router'
import { Home, NotFound } from './pages'

const router = createRouter({
  routes: [
    { path: '/', component: Home },
    {
      path: '/admin',
      component: lazy(() => import('./layouts/AdminLayout')),
      guard: 'auth',
      children: [
        { path: '/', component: lazy(() => import('./pages/Dashboard')) },
        { path: '/users', component: lazy(() => import('./pages/Users')) },
      ],
    },
    { path: '/login', component: lazy(() => import('./pages/Login')) },
    { path: '/:path(.*)', component: NotFound },
  ],
  guards: [createAuthGuard({ isAuthenticated: () => !!currentUser(), loginPath: '/login' })],
})
```

## API Reference

### `RouteDefinition`

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string` | Path pattern. Supports `:param`, `*`, regex groups |
| `component` | `RouteComponent \| LazyComponent` | Component factory or lazy component |
| `children` | `RouteDefinition[]` | Nested routes |
| `name` | `string` | Named route |
| `guard` | `string \| string[]` | Guard name(s) to apply |
| `middleware` | `RouteMiddleware[]` | Route-level middleware |
| `redirect` | `NavigationTarget` | Redirect immediately to this target |
| `meta` | `RouteMeta` | Arbitrary metadata |
| `preload` | `PreloadFunction` | Async data preload before navigation |
| `title` | `string` | Page title (used with `titleTemplate`) |
| `lazy` | `RouteLazyConfig` | Per-route lazy options |

### `lazy(importFn, options?)` → `LazyComponent`

Wrap a dynamic import for use as a route component.

```ts
import { lazy } from '@liteforge/router'

const AdminPage = lazy(() => import('./pages/Admin'))

// With options:
const SlowPage = lazy(() => import('./pages/Slow'), {
  loading: () => <Spinner />,
  error: ({ retry }) => <button onclick={retry}>Retry</button>,
  delay: 200,
})
```

### Built-in guards

All guard factories use an options object.

| Guard | Factory | Description |
|-------|---------|-------------|
| Auth | `createAuthGuard({ isAuthenticated, loginPath? })` | Redirect to login if not authenticated |
| Role | `createRoleGuard({ hasRole, unauthorizedPath? })` | Require a specific role (`guard: 'role:admin'`) |
| Confirm | `createConfirmGuard({ shouldConfirm, message? })` | Confirm dialog before leaving |
| Guest | `createGuestGuard({ isAuthenticated, homePath? })` | Redirect already-authenticated users |

```ts
import {
  createAuthGuard,
  createRoleGuard,
  createGuestGuard,
  createConfirmGuard,
} from '@liteforge/router'

const router = createRouter({
  routes,
  guards: [
    createAuthGuard({
      isAuthenticated: () => !!authStore.user(),
      loginPath: '/login',           // default: '/login'
    }),
    createRoleGuard({
      hasRole: (role) => authStore.roles().includes(role),
      unauthorizedPath: '/forbidden', // default: '/unauthorized'
    }),
  ],
})

// Guest-only route (login page):
createGuestGuard({
  isAuthenticated: () => !!authStore.user(),
  homePath: '/dashboard',            // default: '/'
})

// Unsaved-changes guard:
createConfirmGuard({
  shouldConfirm: () => form.isDirty(),
  message: 'Discard unsaved changes?', // default: 'You have unsaved changes...'
})
```

### `defineGuard(name, fn)` → `RouteGuard`

Create a named guard that can be referenced by string in route definitions.

```ts
import { defineGuard } from '@liteforge/router'

const authGuard = defineGuard('auth', async ({ to, from, use }) => {
  const token = localStorage.getItem('token')
  if (!token) return { redirect: '/login' }
  return true
})
```

### Built-in middleware

| Factory | Description |
|---------|-------------|
| `createLoggerMiddleware()` | Logs navigations to console |
| `createScrollMiddleware()` | Scroll to top on navigation |
| `createTitleMiddleware(template)` | Update document title |
| `createAnalyticsMiddleware(fn)` | Call analytics on route change |
| `createLoadingMiddleware(signal)` | Toggle loading signal |

## Examples

### Nested routes with layout

Child paths are always **relative to the parent** — the leading `/` is stripped automatically before joining. Both `'/stats'` and `'stats'` produce the same URL when nested.

```ts
createRouter({
  routes: [
    {
      path: '/customers',        // layout route
      component: CustomersLayout,
      children: [
        { path: '/',             component: CustomerList   },  // → /customers
        { path: '/:id',          component: CustomerDetail },  // → /customers/:id
        { path: '/:id/edit',     component: CustomerForm   },  // → /customers/:id/edit
        { path: '/new',          component: CustomerForm   },  // → /customers/new
      ],
    },
  ],
})
```

**Root-level layout** — wrapping everything without a URL prefix:

```ts
{
  path: '/',
  component: AppLayout,   // rendered for all routes
  children: [
    { path: '/',                  component: Dashboard },
    { path: '/customers',         component: CustomerList },
    { path: '/customers/:id',     component: CustomerDetail },
    { path: '/customers/:id/edit', component: CustomerForm },
  ],
}
```

> **Note:** When `path: '/'` contains params (e.g. `/customers/:id`), child routes that add a sub-segment (like `/customers/:id/edit`) are correctly matched as children — the router uses a param-aware prefix regex, not a literal string comparison.

### Preload data before navigation

```ts
{
  path: '/users/:id',
  component: UserDetail,
  async preload({ to, params, use }) {
    const user = await fetch(`/api/users/${params.id}`).then(r => r.json())
    return user
  },
}
```

## Notes

- Paths are matched in order. Place more specific routes before catch-alls.
- `guard: 'auth'` references a guard registered via `defineGuard('auth', ...)` or `createAuthGuard`.
- `lazy()` components are code-split by Vite automatically.
- `preloadedData` is available on the router signal `router.preloadedData()` after navigation.
