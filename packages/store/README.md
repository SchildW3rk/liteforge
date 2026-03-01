# @liteforge/store

State management built on signals for LiteForge.

## Installation

```bash
npm install @liteforge/store @liteforge/core
```

Peer dependency: `@liteforge/core >= 0.1.0`

## Overview

`@liteforge/store` provides a simple, type-safe state management solution built on LiteForge signals. Stores are automatically registered and can be accessed via `use()` in components.

## API

### defineStore

Creates a store with state, getters, and actions.

```ts
import { defineStore } from '@liteforge/store'

export const userStore = defineStore('users', {
  // Initial state — each property becomes a signal
  state: {
    currentUser: null as User | null,
    list: [] as User[],
    loading: false
  },

  // Derived values (like computed)
  getters: (state) => ({
    isLoggedIn: () => state.currentUser() !== null,
    admins: () => state.list().filter(u => u.role === 'admin'),
    count: () => state.list().length
  }),

  // Actions can be sync or async
  actions: (state, use) => ({
    async fetchUsers() {
      state.loading.set(true)
      try {
        const api = use('api')
        const users = await api.get('/users')
        state.list.set(users)
      } finally {
        state.loading.set(false)
      }
    },

    setCurrentUser(user: User | null) {
      state.currentUser.set(user)
    },

    logout() {
      state.currentUser.set(null)
    }
  })
})
```

**Using the store:**

```tsx
import { use } from '@liteforge/runtime'
import { userStore } from './stores/user'

// In components
const users = use('users')  // or use(userStore)

// Read state (signals)
users.state.currentUser()
users.state.list()

// Use getters
users.isLoggedIn()
users.admins()

// Call actions
users.fetchUsers()
users.logout()
```

### storeRegistry

Global registry for all stores. Useful for devtools and debugging.

```ts
import { storeRegistry } from '@liteforge/store'

// List all registered store names
storeRegistry.list()  // ['users', 'ui', 'cart']

// Get a store by name
const users = storeRegistry.get('users')

// Get a snapshot of all state
storeRegistry.snapshot()
// { users: { currentUser: null, list: [...] }, ui: { ... } }

// Reset a store to initial state
storeRegistry.reset('users')

// Reset all stores
storeRegistry.resetAll()

// Watch for changes across all stores
storeRegistry.onChange((storeName, key, value) => {
  console.log(`${storeName}.${key} changed to`, value)
})
```

### defineStorePlugin

Create plugins that hook into store lifecycle.

```ts
import { defineStorePlugin } from '@liteforge/store'

const loggerPlugin = defineStorePlugin({
  name: 'logger',
  
  onStateChange(storeName, key, value, oldValue) {
    console.log(`[${storeName}] ${key}: ${oldValue} → ${value}`)
  },
  
  onAction(storeName, actionName, args) {
    console.log(`[${storeName}] ${actionName}(`, args, ')')
  }
})

// Register when creating app
createApp({
  plugins: [loggerPlugin]
})
```

## Store Methods

Each store instance has these built-in methods:

| Method | Description |
|--------|-------------|
| `$reset()` | Reset to initial state |
| `$patch(partial)` | Update multiple state properties |
| `$subscribe(cb)` | Watch for state changes |
| `$inspect()` | Get store metadata and history |

```ts
const users = use('users')

// Reset store
users.$reset()

// Patch multiple values
users.$patch({
  loading: false,
  list: newUsers
})

// Subscribe to changes
const unsubscribe = users.$subscribe((key, value, oldValue) => {
  console.log(`${key} changed`)
})
```

## Types

```ts
import type {
  Store,
  StoreDefinition,
  StorePlugin,
  StoreRegistry,
  StateDefinition,
  GettersFactory,
  ActionsFactory
} from '@liteforge/store'
```

## License

MIT
