# LiteForge

A modern frontend framework with fine-grained reactivity, no virtual DOM, and zero-flicker rendering.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Why LiteForge?

- **No Virtual DOM** — Direct, surgical DOM updates via Signals and Effects
- **Zero-Flicker Architecture** — Components render only when async data is fully loaded
- **Fine-Grained Reactivity** — Automatic dependency tracking, no manual subscriptions
- **JSX Syntax** — Familiar developer experience with build-time optimization
- **Unified Context System** — One `use()` function for stores, router, and services
- **Type-Safe by Default** — Full TypeScript support with strict typing

## Packages

| Package | Version | Size (gzip) | Description |
|---------|---------|-------------|-------------|
| [@liteforge/core](packages/core) | 0.1.0 | ~6kb | Reactive primitives: signal, computed, effect, batch |
| [@liteforge/runtime](packages/runtime) | 0.1.0 | ~12kb | Components, lifecycle, control flow (Show, For, Switch) |
| [@liteforge/store](packages/store) | 0.1.0 | ~5kb | State management with registry and time-travel |
| [@liteforge/router](packages/router) | 0.1.0 | ~20kb | Routing with guards, middleware, lazy loading |
| [@liteforge/query](packages/query) | 0.1.0 | ~5kb | Data fetching with caching and mutations |
| [@liteforge/form](packages/form) | 0.1.0 | ~4kb | Form management with Zod validation |
| [@liteforge/table](packages/table) | 0.1.0 | ~8kb | Data tables with sorting, filtering, pagination |
| [@liteforge/calendar](packages/calendar) | 0.1.0 | ~22kb | Scheduling calendar with multiple views |
| [@liteforge/vite-plugin](packages/vite-plugin) | 0.1.0 | ~15kb | JSX transform and build optimization |
| [@liteforge/devtools](packages/devtools) | 0.1.0 | ~16kb | Debug panel with 5 tabs |

## Quick Start

```bash
npm install @liteforge/core @liteforge/runtime @liteforge/vite-plugin
```

**vite.config.ts**

```ts
import { defineConfig } from 'vite'
import liteforge from '@liteforge/vite-plugin'

export default defineConfig({
  plugins: [liteforge()]
})
```

**main.tsx**

```tsx
import { signal } from '@liteforge/core'
import { createApp, createComponent } from '@liteforge/runtime'

const Counter = createComponent({
  setup() {
    const count = signal(0)
    return { count }
  },
  component: ({ setup }) => (
    <div>
      <p>Count: {() => setup.count()}</p>
      <button onclick={() => setup.count.update(n => n + 1)}>
        Increment
      </button>
    </div>
  )
})

createApp({ root: '#app' }).mount(Counter)
```

## Core Concepts

### Signals

Signals are reactive values that automatically track dependencies:

```ts
import { signal, computed, effect } from '@liteforge/core'

const count = signal(0)
const doubled = computed(() => count() * 2)

effect(() => {
  console.log(`Count is ${count()}, doubled is ${doubled()}`)
})

count.set(5)  // Logs: "Count is 5, doubled is 10"
```

### Components

Components have a clear lifecycle with async data loading:

```tsx
import { createComponent } from '@liteforge/runtime'

const UserProfile = createComponent({
  props: {
    userId: { type: String, required: true }
  },

  async load({ props }) {
    const user = await fetch(`/api/users/${props.userId}`).then(r => r.json())
    return { user }
  },

  placeholder: () => <div class="skeleton" />,

  component: ({ data }) => (
    <div>
      <h1>{data.user.name}</h1>
      <p>{data.user.email}</p>
    </div>
  )
})
```

### Store

Global state management with automatic reactivity:

```ts
import { defineStore } from '@liteforge/store'

const userStore = defineStore('users', {
  state: {
    currentUser: null,
    list: []
  },
  getters: (state) => ({
    isLoggedIn: () => state.currentUser() !== null
  }),
  actions: (state) => ({
    async fetchUsers() {
      state.list.set(await fetch('/api/users').then(r => r.json()))
    }
  })
})
```

### Router

Full-featured routing with guards and lazy loading:

```ts
import { createRouter, lazy } from '@liteforge/router'

const router = createRouter({
  routes: [
    { path: '/', component: Home },
    { path: '/users/:id', component: lazy(() => import('./UserDetail')) },
    { 
      path: '/admin', 
      component: AdminLayout,
      guard: 'auth',
      children: [
        { path: '/', component: Dashboard }
      ]
    }
  ]
})
```

### Control Flow

Reactive control flow primitives:

```tsx
import { Show, For, Switch, Match } from '@liteforge/runtime'

<Show when={() => user()}>
  <UserCard user={user} />
</Show>

<For each={() => items()}>
  {(item) => <li>{item.name}</li>}
</For>

<Switch fallback={<NotFound />}>
  <Match when={() => status() === 'loading'}>Loading...</Match>
  <Match when={() => status() === 'error'}>Error!</Match>
</Switch>
```

## Philosophy

LiteForge is built on these principles:

1. **Simplicity over abstraction** — Clear, predictable behavior without magic
2. **Performance by default** — Fine-grained updates without diffing overhead
3. **Developer experience** — Familiar JSX syntax with excellent TypeScript support
4. **Zero runtime cost for static content** — Build-time optimization extracts static HTML

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build:packages

# Run tests
pnpm test

# Type check
pnpm typecheck

# Run demo app
pnpm --filter starter dev
```

## Bundle Sizes

LiteForge is designed to be lightweight. Core + Runtime together are under 20kb gzipped, providing a complete reactive UI framework.

| Setup | Size (gzip) |
|-------|-------------|
| Minimal (core only) | ~6kb |
| Core + Runtime | ~18kb |
| Full stack (core + runtime + store + router) | ~43kb |

## License

MIT License - see [LICENSE](LICENSE) for details.

## Author

SchildW3rk <contact@schildw3rk.dev>
