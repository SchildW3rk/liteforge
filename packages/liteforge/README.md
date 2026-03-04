# liteforge

**Signals-based frontend framework — No Virtual DOM, JSX, zero dependencies.**

```bash
pnpm add liteforge
```

> Single meta-package that re-exports all `@liteforge/*` packages via sub-path exports.
> Use one import instead of managing 12 separate packages.

---

## Core Principles

- **No Virtual DOM** — Fine-grained DOM updates via Signals & Effects
- **JSX Syntax** — Vite plugin transforms JSX to direct DOM operations at build time
- **Signals-based Reactivity** — Automatic dependency tracking, no manual subscriptions
- **Zero Runtime Dependencies** — Every package is self-contained
- **TypeScript-first** — Full strict mode throughout

---

## Quick Start

```bash
pnpm add liteforge
pnpm add -D vite typescript
```

**`vite.config.ts`**
```ts
import { defineConfig } from 'vite';
import liteforge from 'liteforge/vite-plugin';

export default defineConfig({
  plugins: [liteforge()],
});
```

**`src/main.tsx`**
```tsx
import { createApp } from 'liteforge';
import { routerPlugin } from 'liteforge/router';
import App from './App.js';

await createApp({ root: App, target: '#app' })
  .use(routerPlugin({ routes }))
  .mount();
```

**`src/App.tsx`**
```tsx
import { createComponent, Show } from 'liteforge';
import { signal } from 'liteforge';

export const App = createComponent({
  component() {
    const count = signal(0);
    return (
      <div>
        <h1>{() => count()}</h1>
        <button onclick={() => count.update(n => n + 1)}>+1</button>
        <Show when={() => count() > 5}>
          <p>Over 5!</p>
        </Show>
      </div>
    );
  },
});
```

---

## Sub-path Imports

| Import | Contents |
|--------|----------|
| `liteforge` | `@liteforge/core` + `@liteforge/runtime` — signals, effects, components, JSX |
| `liteforge/router` | SPA router, guards, middleware, lazy routes, nested routes |
| `liteforge/store` | Global state management with time-travel |
| `liteforge/query` | Data fetching, caching, mutations |
| `liteforge/client` | HTTP client with interceptors, middleware, query integration |
| `liteforge/form` | Form management with Zod validation |
| `liteforge/table` | Data tables — sort, filter, pagination, selection |
| `liteforge/calendar` | Full scheduling calendar — 4 views, drag & drop, resources |
| `liteforge/modal` | Signal-based modal system with focus trap |
| `liteforge/devtools` | Debug panel — signal inspector, store explorer, time-travel |
| `liteforge/vite-plugin` | Vite plugin for JSX transform & HMR |

---

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| `@liteforge/core` | 0.1.0 | `signal`, `computed`, `effect`, `batch`, `onCleanup` |
| `@liteforge/runtime` | 0.4.1 | `createComponent`, `createApp`, `Show`, `For`, `Switch`, plugin system |
| `@liteforge/router` | 0.3.0 | Router with guards, middleware, nested routes, lazy loading |
| `@liteforge/store` | 0.1.0 | `defineStore`, store registry, plugins, time-travel |
| `@liteforge/query` | 0.1.0 | `createQuery`, `createMutation`, query cache |
| `@liteforge/client` | 0.1.0 | `createClient`, `createResource`, interceptors |
| `@liteforge/form` | 0.1.0 | `createForm` with Zod, nested & array fields |
| `@liteforge/table` | 0.1.0 | `createTable` with sort, filter, pagination, selection |
| `@liteforge/calendar` | 0.1.0 | `createCalendar` — Day/Week/Month/Agenda, drag & drop |
| `@liteforge/modal` | 0.1.0 | `createModal`, `confirm`, `alert`, `prompt` presets |
| `@liteforge/devtools` | 0.1.0 | 5-tab debug panel with signal & store inspection |
| `@liteforge/vite-plugin` | 0.1.0 | JSX transform, template extraction, HMR |

---

## Reactivity

```ts
import { signal, computed, effect, batch } from 'liteforge';

const count  = signal(0);
const double = computed(() => count() * 2);

effect(() => {
  console.log(double()); // auto-tracks dependencies
});

count.set(5);             // → logs 10
count.update(n => n + 1); // → logs 12

batch(() => {             // deferred notifications
  count.set(1);
});
```

## Components

```tsx
import { createComponent, Show, For } from 'liteforge';
import { signal } from 'liteforge';

export const UserList = createComponent({
  async load() {
    const users = await fetch('/api/users').then(r => r.json());
    return { users };
  },
  placeholder: () => <div class="skeleton" />,
  component({ data }) {
    return (
      <ul>
        <For each={() => data.users}>
          {user => <li>{user.name}</li>}
        </For>
      </ul>
    );
  },
});
```

## Router

```ts
import { createRouter, createBrowserHistory, defineGuard } from 'liteforge/router';

const auth = defineGuard(async ({ to }) => {
  if (!isLoggedIn()) return '/login';
});

const router = createRouter({
  history: createBrowserHistory(),
  routes: [
    { path: '/',       component: Home },
    { path: '/login',  component: Login },
    { path: '/dashboard', component: Dashboard, guard: auth,
      children: [
        { path: '/',      component: Overview },
        { path: '/users', component: Users },
      ],
    },
  ],
});
```

## Store

```ts
import { defineStore } from 'liteforge/store';

const userStore = defineStore('users', {
  state: { list: [], loading: false },
  getters: state => ({
    count: () => state.list().length,
  }),
  actions: state => ({
    async fetch() {
      state.loading.set(true);
      state.list.set(await api.getUsers());
      state.loading.set(false);
    },
  }),
});
```

## Query

```ts
import { createQuery, createMutation } from 'liteforge/query';

const users = createQuery({
  key: 'users',
  fn: () => fetch('/api/users').then(r => r.json()),
  staleTime: 5 * 60 * 1000,
});

users.data()       // Signal: User[] | undefined
users.isLoading()  // Signal: boolean

const addUser = createMutation({
  fn: data => api.createUser(data),
  invalidate: ['users'],
});
```

## Form

```ts
import { createForm } from 'liteforge/form';
import { z } from 'zod';

const form = createForm({
  schema: z.object({
    name:  z.string().min(2),
    email: z.string().email(),
  }),
  initial: { name: '', email: '' },
  onSubmit: async values => { await api.save(values); },
  validateOn: 'blur',
});

form.field('name').value()  // Signal<string>
form.field('name').error()  // Signal<string | undefined>
```

## Plugin System

```ts
import { createApp } from 'liteforge';
import { routerPlugin } from 'liteforge/router';
import { modalPlugin }  from 'liteforge/modal';
import { queryPlugin }  from 'liteforge/query';
import { devtoolsPlugin } from 'liteforge/devtools';

await createApp({ root: App, target: '#app' })
  .use(routerPlugin({ routes }))
  .use(modalPlugin())
  .use(queryPlugin())
  .use(devtoolsPlugin())
  .mount();
```

---

## JSX

LiteForge JSX compiles to direct DOM operations — no diffing, no virtual tree.

```tsx
// Reactive: wrap in () =>
<span>{() => count()}</span>

// Event handler: no wrapper needed
<button onclick={() => count.update(n => n + 1)}>Click</button>

// Dynamic attribute
<div class={() => isActive() ? 'active' : 'inactive'} />

// Static attribute
<div class="container" />
```

---

## Architecture

```
core  ──────────────────────────────────────────────────┐
  signal · computed · effect · batch · onCleanup        │
                                                        │
runtime ────────────────────────────────────────────────┤
  createApp · createComponent · Show · For · Switch     │
  Plugin System · HMR                                   │
                                                        ├── liteforge (this package)
store · router · query · client · form                  │
  table · calendar · modal · devtools ──────────────────┤
                                                        │
vite-plugin ────────────────────────────────────────────┘
  JSX transform · template extraction · HMR injection
```

---

## License

MIT © [SchildW3rk](https://github.com/SchildW3rk)
