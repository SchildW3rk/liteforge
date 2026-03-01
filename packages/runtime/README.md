# @liteforge/runtime

DOM runtime for LiteForge: components, context, lifecycle, and control flow.

## Installation

```bash
npm install @liteforge/runtime @liteforge/core
```

Peer dependency: `@liteforge/core >= 0.1.0`

## Overview

`@liteforge/runtime` provides the component model, app creation, context system, and control flow primitives for LiteForge applications.

## API

### createApp

Creates and mounts a LiteForge application.

```tsx
import { createApp } from '@liteforge/runtime'
import { App } from './App'

const app = createApp({
  root: '#app',          // CSS selector or HTMLElement
  router: myRouter,      // Optional: router instance
  stores: [userStore],   // Optional: stores to register
  plugins: [devtools()], // Optional: plugins
})

app.mount(App)
```

### createComponent

Creates a component with lifecycle hooks and async data loading.

```tsx
import { createComponent } from '@liteforge/runtime'
import { signal } from '@liteforge/core'

const UserProfile = createComponent({
  // Define props with validation
  props: {
    userId: { type: String, required: true },
    showEmail: { type: Boolean, default: false }
  },

  // Synchronous setup (runs immediately)
  setup({ props, use }) {
    const isEditing = signal(false)
    return { isEditing }
  },

  // Async data loading (component waits for this)
  async load({ props, setup, use }) {
    const api = use('api')
    const user = await api.get(`/users/${props.userId}`)
    return { user }
  },

  // Shown while load() is pending
  placeholder: () => <div class="skeleton" />,

  // Shown if load() throws
  error: ({ error, retry }) => (
    <div>
      <p>Error: {error.message}</p>
      <button onclick={retry}>Retry</button>
    </div>
  ),

  // Main render function
  component: ({ props, data, setup }) => (
    <div>
      <h1>{data.user.name}</h1>
      {() => props.showEmail && <p>{data.user.email}</p>}
    </div>
  ),

  // After DOM insertion
  mounted({ el }) {
    el.classList.add('fade-in')
  },

  // Before removal
  destroyed() {
    console.log('Cleanup')
  }
})
```

**Lifecycle Order:** `setup()` → `placeholder` renders → `load()` → `component` renders → `mounted()` → `destroyed()`

### use

Access registered services, stores, and the router.

```tsx
import { use } from '@liteforge/runtime'

// Inside a component
const MyComponent = createComponent({
  component: () => {
    const router = use('router')
    const userStore = use('users')
    
    return <button onclick={() => router.navigate('/')}>Home</button>
  }
})
```

### Control Flow

#### Show

Conditionally renders content.

```tsx
import { Show } from '@liteforge/runtime'

<Show when={() => isLoggedIn()} fallback={<LoginPrompt />}>
  <Dashboard />
</Show>
```

#### For

Renders a list of items.

```tsx
import { For } from '@liteforge/runtime'

<For each={() => items()} fallback={<p>No items</p>}>
  {(item, index) => (
    <li>{index()}: {item.name}</li>
  )}
</For>
```

#### Switch / Match

Renders the first matching case.

```tsx
import { Switch, Match } from '@liteforge/runtime'

<Switch fallback={<NotFound />}>
  <Match when={() => status() === 'loading'}>
    <Spinner />
  </Match>
  <Match when={() => status() === 'error'}>
    <ErrorMessage />
  </Match>
  <Match when={() => status() === 'success'}>
    <Content />
  </Match>
</Switch>
```

#### Dynamic

Dynamically renders a component based on a signal.

```tsx
import { Dynamic } from '@liteforge/runtime'

const currentView = signal(HomeView)

<Dynamic component={() => currentView()} props={{ user }} />
```

### h and Fragment

The JSX factory functions (used by the Vite plugin).

```tsx
import { h, Fragment } from '@liteforge/runtime'

// Usually not called directly — JSX compiles to h() calls
const element = h('div', { class: 'container' }, 
  h('p', null, 'Hello')
)

// Fragment for multiple root elements
const items = (
  <>
    <li>One</li>
    <li>Two</li>
  </>
)
```

## Types

```ts
import type {
  ComponentDefinition,
  ComponentFactory,
  AppConfig,
  AppInstance,
  Plugin,
  ShowProps,
  ForProps,
  SwitchProps,
  MatchProps,
  DynamicProps
} from '@liteforge/runtime'
```

## License

MIT
