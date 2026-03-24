# liteforge

Signals-based frontend framework — No Virtual DOM, JSX, zero dependencies.

```bash
npm install liteforge @liteforge/vite-plugin
```

> `liteforge` re-exports `@liteforge/core` and `@liteforge/runtime`. Use it as the single entry point for signals, effects, and component primitives. All other features are available as separate `@liteforge/*` packages.

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
npm install liteforge @liteforge/vite-plugin
```

**`vite.config.ts`**
```ts
import { defineConfig } from 'vite'
import { liteforge } from '@liteforge/vite-plugin'

export default defineConfig({
  plugins: [liteforge()]
})
```

**`src/main.tsx`**
```tsx
import { createApp } from 'liteforge'
import { App } from './App'

createApp({ root: App, target: '#app' }).mount()
```

**`src/App.tsx`**
```tsx
import { createComponent, signal, Show } from 'liteforge'

export const App = createComponent({
  component() {
    const count = signal(0)
    return (
      <div>
        <h1>{() => count()}</h1>
        <button onclick={() => count.update(n => n + 1)}>+1</button>
        <Show when={() => count() > 5}>
          <p>Over 5!</p>
        </Show>
      </div>
    )
  }
})
```

---

## Reactivity

```ts
import { signal, computed, effect, batch, onCleanup } from 'liteforge'

const count  = signal(0)
const double = computed(() => count() * 2)

effect(() => {
  console.log(double()) // auto-tracks dependencies
})

count.set(5)              // → logs 10
count.update(n => n + 1)  // → logs 12

batch(() => {             // deferred notifications
  count.set(1)
})

onCleanup(() => {         // runs when the enclosing effect/component is destroyed
  console.log('cleaned up')
})
```

## Components

```tsx
import { createComponent, Show, For } from 'liteforge'

export const UserList = createComponent({
  async load() {
    const users = await fetch('/api/users').then(r => r.json())
    return { users }
  },
  placeholder: () => <div class="skeleton" />,
  error: ({ error, retry }) => <button onclick={retry}>Retry</button>,
  component({ data }) {
    return (
      <ul>
        <For each={() => data.users}>
          {user => <li>{user.name}</li>}
        </For>
      </ul>
    )
  }
})
```

**Component lifecycle:** `setup()` → `placeholder` → `load()` → `component()` → `mounted()` → `destroyed()`

## Control Flow

```tsx
import { Show, For, Switch, Match } from 'liteforge'

// Conditional rendering
<Show when={() => isLoggedIn()}>
  <Dashboard />
</Show>

// List rendering
<For each={() => items()}>
  {(item) => <li>{item.name}</li>}
</For>

// Switch / pattern matching
<Switch fallback={<NotFound />}>
  <Match when={() => route() === 'home'}><Home /></Match>
  <Match when={() => route() === 'about'}><About /></Match>
</Switch>
```

## Plugin System

Additional capabilities are added via plugins in `createApp`:

```ts
import { createApp } from 'liteforge'
import { routerPlugin } from '@liteforge/router'
import { modalPlugin } from '@liteforge/modal'
import { toastPlugin } from '@liteforge/toast'
import { clientPlugin, queryIntegration } from '@liteforge/client'
import { devtoolsPlugin } from '@liteforge/devtools'
import { App } from './App'

createApp({ root: App, target: '#app' })
  .use(routerPlugin({ routes: [...] }))
  .use(modalPlugin())
  .use(toastPlugin({ position: 'bottom-right' }))
  .use(clientPlugin({ baseUrl: '/api', query: queryIntegration() }))
  .use(devtoolsPlugin())
  .mount()
```

Plugins registered via `.use()` are installed in order before the app mounts. Each plugin can provide values into the app context via `context.provide()` and returns an optional cleanup function.

---

## JSX

LiteForge JSX compiles to direct DOM operations — no diffing, no virtual tree.

```tsx
// Reactive text — wrap in () =>
<span>{() => count()}</span>

// Event handler — no wrapper needed
<button onclick={() => count.update(n => n + 1)}>Click</button>

// Dynamic attribute
<div class={() => isActive() ? 'active' : 'inactive'} />

// Static attribute
<div class="container" />
```

---

## Install What You Need

All packages are zero-dependency and published independently:

| Package | Description |
|---------|-------------|
| `liteforge` | Umbrella: core + runtime |
| `@liteforge/core` | `signal`, `computed`, `effect`, `batch`, `onCleanup` |
| `@liteforge/runtime` | `createComponent`, `createApp`, `Show`, `For`, `Switch`, plugin system |
| `@liteforge/vite-plugin` | JSX transform, signal-safe getter wrapping, HMR |
| `@liteforge/router` | Client-side routing with guards, middleware, lazy loading |
| `@liteforge/store` | Signal-based state management with devtools integration |
| `@liteforge/query` | `createQuery`, `createMutation`, query cache |
| `@liteforge/form` | Type-safe forms with Zod validation |
| `@liteforge/table` | Data tables with sorting, filtering, pagination, selection |
| `@liteforge/calendar` | Full scheduling calendar — 4 views, drag & drop, resources |
| `@liteforge/modal` | Modal dialogs with `confirm`/`alert`/`prompt` presets |
| `@liteforge/toast` | Toast notifications |
| `@liteforge/tooltip` | Tooltip directive and component |
| `@liteforge/client` | HTTP client with resources, interceptors, query integration |
| `@liteforge/devtools` | 5-tab debug panel with time-travel |

---

## Types

```ts
import type {
  Signal,
  ReadonlySignal,
  Computed,
  ComponentFactory,
  ComponentDefinition,
  AppBuilder,
  LiteForgePlugin,
  PluginContext,
  PluginRegistry
} from 'liteforge'
```

---

## License

MIT
