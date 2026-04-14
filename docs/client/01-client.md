---
title: "Client"
category: "client"
tags: ["client", "createClient", "clientPlugin", "resource", "fetch", "interceptors", "middleware", "ApiError", "queryIntegration"]
related: ["createQuery", "Context", "Installation"]
---

# Client

> TypeScript-first HTTP client with resource-based CRUD, interceptors, middleware, and optional `@liteforge/query` integration.

## Installation

```bash
npm install @liteforge/client

# With query integration:
npm install @liteforge/client @liteforge/query
```

---

## Setup via plugin

The recommended approach — registers the client as an app plugin, available via `use('client')` in every component:

```ts
import { createApp } from 'liteforge'
import { clientPlugin, queryIntegration } from '@liteforge/client'

createApp({ root: App, target: '#app' })
  .use(clientPlugin({
    baseUrl: 'https://api.example.com',
    headers: { 'X-App-Version': '1.0.0' },
    timeout: 15_000,
    retry: 1,
    query: queryIntegration(),  // enables reactive use*() methods
  }))
  .mount()
```

In components, access the client via `use('client')` or `useQueryClient()`:

```ts
import { use } from 'liteforge'
import { useQueryClient } from '@liteforge/client'

setup() {
  const client = use('client')          // → Client (for imperative calls)
  const client = useQueryClient()       // → QueryClient (for reactive use*() methods)
}
```

---

## createClient

Use `createClient` directly when the plugin system isn't needed:

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

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | required | Base URL prepended to all paths |
| `headers` | `Record<string, string>` | `{}` | Default headers for every request |
| `timeout` | `number` | `30000` | Request timeout in ms |
| `retry` | `number` | `0` | Retry attempts on network/5xx errors |
| `retryDelay` | `number` | `300` | Base delay in ms between retries |
| `interceptors` | `InterceptorHandlers[]` | `[]` | Initial interceptors |
| `middleware` | `Middleware[]` | `[]` | Initial middleware |
| `query` | `QueryIntegration` | — | Enables reactive `use*()` methods on resources |

---

## HTTP methods

```ts
const user    = await api.get<User>('/users/42')
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
// api.resource<T, TCreate?, TUpdate?>('name', options?)
const users = api.resource<User, NewUser, UpdateUser>('users')

// GET /users
const list = await users.getList()
const page = await users.getList({ page: 2, pageSize: 20, sort: 'name', order: 'asc' })

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

// POST /users/42/activate  (custom action on record)
await users.action('activate', undefined, 42)

// POST /users/bulk-delete  (action on collection)
await users.action('bulk-delete', { ids: [1, 2, 3] })
```

### Resource options

```ts
// Custom URL path
const posts = api.resource<Post>('posts', { path: '/v2/articles' })

// Per-resource headers
const adminUsers = api.resource<User>('users', {
  headers: { 'X-Admin-Token': adminToken() }
})
```

---

## Reactive resources

When the client is configured with `query: queryIntegration()`, `resource()` returns a `QueryResource` with reactive signal-based methods:

```ts
setup() {
  const client = useQueryClient()
  const users = client.resource<User, NewUser>('users')

  const list = users.useList({ page: 1, pageSize: 20 })   // → QueryResult
  const one  = users.useOne(42)                            // → QueryResult
  const create = users.useCreate()                         // → MutationResult
  const update = users.useUpdate()
  const remove = users.useDelete()

  return { list, create }
}
```

```tsx
component({ setup }) {
  const { list, create } = setup
  return (
    <div>
      <Show when={() => list.isLoading()}><p>Loading…</p></Show>
      <For each={() => list.data()?.data ?? []}>
        {(user) => <div>{user.name}</div>}
      </For>
      <button onclick={() => create.mutate({ name: 'New', email: 'new@example.com' })}>
        Add
      </button>
    </div>
  )
}
```

| Method | Returns | Description |
|--------|---------|-------------|
| `useList(params?)` | `QueryResult<ListResponse<T>>` | Reactive paginated list |
| `useOne(id)` | `QueryResult<T>` | Reactive single record |
| `useCreate()` | `MutationResult<T, TCreate>` | Create mutation |
| `useUpdate()` | `MutationResult<T, { id, data }>` | Update mutation |
| `useDelete()` | `MutationResult<void, id>` | Delete mutation |

---

## Interceptors

Interceptors transform requests and responses globally. Request interceptors run FIFO; response interceptors run LIFO (Axios-style):

```ts
const remove = api.addInterceptor({
  onRequest(config) {
    return {
      ...config,
      headers: { ...config.headers, Authorization: `Bearer ${getToken()}` }
    }
  },

  onResponse(ctx) {
    return ctx
  },

  onResponseError(error) {
    if (error.status === 401) redirectToLogin()
    throw error
  }
})

remove()  // remove the interceptor
```

---

## Middleware

Middleware wraps the entire fetch pipeline and can short-circuit or augment requests. Runs in insertion order:

```ts
const removeLogger = api.use(async (config, next) => {
  const start = Date.now()
  const ctx = await next(config)
  console.log(`${config.method} ${config.url} — ${Date.now() - start}ms`)
  return ctx
})

removeLogger()  // remove middleware
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

## Types

```ts
import type {
  Client,
  QueryClient,
  ClientConfig,
  CreateClientOptions,
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
  QueryIntegration,
} from '@liteforge/client'
```
