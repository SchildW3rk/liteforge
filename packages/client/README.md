# @liteforge/client

TypeScript-first HTTP client for LiteForge with resource-based CRUD, interceptors, middleware, and optional `@liteforge/query` integration.

## Installation

```bash
npm install @liteforge/client
```

Optional query integration:

```bash
npm install @liteforge/client @liteforge/query
```

## Overview

`@liteforge/client` wraps `fetch` with a pipeline of interceptors, middleware, and automatic retry. Resources provide strongly-typed CRUD methods for REST endpoints. When `@liteforge/query` is wired in, resources gain reactive `useList`, `useOne`, `useCreate`, `useUpdate`, and `useDelete` methods backed by the query cache.

---

## Setup via plugin

The recommended approach registers the client as an app plugin, making it available via `use('client')` in every component:

```ts
import { createApp } from 'liteforge'
import { clientPlugin } from '@liteforge/client'
import { App } from './App'

createApp({ root: App, target: '#app' })
  .use(clientPlugin({
    baseUrl: 'https://api.example.com',
    headers: { 'X-App-Version': '1.0.0' },
    timeout: 15_000,
    retry: 1,
  }))
  .mount()
```

### With query integration

Pass `query: queryIntegration()` to unlock reactive `use*` methods on every resource:

```ts
import { clientPlugin, queryIntegration } from '@liteforge/client'

createApp({ root: App, target: '#app' })
  .use(clientPlugin({
    baseUrl: '/api',
    query: queryIntegration(),
  }))
  .mount()
```

---

## createClient

Use `createClient` directly when you don't need the plugin system:

```ts
import { createClient } from '@liteforge/client'

const api = createClient({
  baseUrl: 'https://api.example.com',
  headers: { Authorization: `Bearer ${getToken()}` },
  timeout: 30_000,
  retry: 2,
  retryDelay: 500,
})
```

---

## HTTP methods

```ts
const user   = await api.get<User>('/users/42')
const newUser = await api.post<User>('/users', { name: 'Jane', email: 'jane@example.com' })
const updated = await api.put<User>('/users/42', { name: 'Jane Doe' })
const patched = await api.patch<User>('/users/42', { name: 'Jane' })
await api.delete('/users/42')
```

All methods accept an optional third `config` argument for per-request overrides (`headers`, `timeout`, `retry`, `signal`).

---

## Resources

`resource()` returns a strongly-typed CRUD object scoped to a REST endpoint:

```ts
const users = api.resource<User, NewUser, UpdateUser>('users')

// GET /users
const list = await users.getList()
const list = await users.getList({ page: 2, pageSize: 20, sort: 'name', order: 'asc' })

// GET /users/42
const user = await users.getOne(42)

// POST /users
const created = await users.create({ name: 'Jane', email: 'jane@example.com' })

// PUT /users/42
const updated = await users.update(42, { name: 'Jane Doe', email: 'jane@example.com' })

// PATCH /users/42
const patched = await users.patch(42, { name: 'Jane' })

// DELETE /users/42
await users.delete(42)

// POST /users/42/activate  (custom action)
await users.action('activate', undefined, 42)

// POST /users/bulk-delete  (action on the collection)
await users.action('bulk-delete', { ids: [1, 2, 3] })
```

### Custom URL path

```ts
const posts = api.resource<Post>('posts', { path: '/v2/articles' })
```

### Per-resource headers

```ts
const adminUsers = api.resource<User>('users', {
  headers: { 'X-Admin-Token': adminToken() }
})
```

---

## Reactive resources (query integration)

When `clientPlugin` is configured with `query: queryIntegration()`, `resource()` returns a `QueryResource` with reactive signal-based methods:

```ts
import { createComponent, use } from 'liteforge'
import { useQueryClient } from '@liteforge/client'

export const UserList = createComponent({
  setup() {
    const client = useQueryClient()
    const users = client.resource<User, NewUser>('users')

    // Reactive query — returns signals
    const list = users.useList({ page: 1, pageSize: 20 })
    const createUser = users.useCreate()

    return { list, createUser }
  },
  component({ setup }) {
    const { list, createUser } = setup
    return (
      <div>
        <Show when={() => list.isLoading()}>
          <p>Loading…</p>
        </Show>
        <For each={() => list.data()?.data ?? []}>
          {(user) => <div>{user.name}</div>}
        </For>
        <button onclick={() => createUser.mutate({ name: 'New User', email: 'new@example.com' })}>
          Add user
        </button>
      </div>
    )
  }
})
```

| Method | Returns | Description |
|--------|---------|-------------|
| `useList(params?)` | `QueryResultShape<ListResponse<T>>` | Reactive paginated list |
| `useOne(id)` | `QueryResultShape<T>` | Reactive single record |
| `useCreate()` | `MutationResultShape<T, TCreate>` | Create mutation |
| `useUpdate()` | `MutationResultShape<T, { id, data }>` | Update mutation |
| `useDelete()` | `MutationResultShape<void, id>` | Delete mutation |

---

## Interceptors

Interceptors allow transforming requests and responses, and handling errors globally. Request interceptors run FIFO; response interceptors run LIFO (Axios-style).

```ts
const remove = api.addInterceptor({
  onRequest(config) {
    return {
      ...config,
      headers: {
        ...config.headers,
        Authorization: `Bearer ${getToken()}`,
      }
    }
  },

  onResponse(ctx) {
    console.log('Response:', ctx.status, ctx.config.url)
    return ctx
  },

  onResponseError(error) {
    if (error.status === 401) {
      redirectToLogin()
    }
    throw error
  }
})

// Remove the interceptor
remove()
```

---

## Middleware

Middleware wraps the entire fetch pipeline and can short-circuit or augment requests. Middleware runs in insertion order.

```ts
const removeLogger = api.use(async (config, next) => {
  const start = Date.now()
  const ctx = await next(config)
  console.log(`${config.method} ${config.url} — ${Date.now() - start}ms`)
  return ctx
})

// Remove middleware
removeLogger()
```

---

## Error handling

Failed responses throw `ApiError`, which extends `Error`:

```ts
import { ApiError } from '@liteforge/client'

try {
  const user = await api.get<User>('/users/999')
} catch (err) {
  if (err instanceof ApiError) {
    console.error(err.status, err.statusText, err.data)
  }
}
```

---

## Client options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | required | Base URL prepended to all paths |
| `headers` | `Record<string, string>` | `{}` | Default headers for every request |
| `timeout` | `number` | `30000` | Request timeout in ms |
| `retry` | `number` | `0` | Retry attempts on network/5xx errors |
| `retryDelay` | `number` | `300` | Base delay in ms for exponential backoff |
| `interceptors` | `InterceptorHandlers[]` | `[]` | Initial interceptors |
| `middleware` | `Middleware[]` | `[]` | Initial middleware |
| `query` | `QueryIntegration` | — | Enables reactive `use*` methods on resources |

---

## Types

```ts
import type {
  Client,
  QueryClient,
  ClientConfig,
  CreateClientOptions,
  CreateQueryClientOptions,
  Resource,
  QueryResource,
  ResourceOptions,
  RequestConfig,
  ResponseContext,
  InterceptorHandlers,
  Middleware,
  ListParams,
  ListResponse,
  ListMeta,
  HttpMethod,
  QueryIntegration
} from '@liteforge/client'
```

## License

MIT
