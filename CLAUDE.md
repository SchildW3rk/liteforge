# CLAUDE.md – LiteForge Framework

## Project Overview

**LiteForge** is a modern frontend framework built from scratch with these core principles:

- **No Virtual DOM** – Direct, fine-grained DOM manipulation via Signals/Effects
- **JSX Syntax** – Custom Vite plugin transforms JSX to direct DOM operations at build-time
- **Signals-based Reactivity** – Automatic dependency tracking, no manual subscriptions
- **Zero-Flicker Architecture** – Components render ONLY when async data is fully loaded
- **Unified Context System** – No provider wrapping, no prop drilling, one `use()` function
- **Built-in Router** – With guards, middleware, lazy loading, and nested routes
- **Store System** – With global registry for full state inspection
- **Data Fetching** – Signals-based query/mutation system with caching
- **Form Management** – Zod-validated forms with reactive fields
- **Data Tables** – Full-featured reactive tables with sorting, filtering, pagination

**Tech Stack:** TypeScript, Vite, JSX, pnpm monorepo.  
**Target:** < 5kb gzipped core runtime. Zero external runtime dependencies in core packages.

---

## Architecture Overview

```
liteforge/
├── packages/
│   ├── core/                # Reactivity: signal(), computed(), effect(), batch()
│   ├── runtime/             # DOM Renderer, createComponent(), Lifecycle, use()
│   ├── store/               # defineStore(), storeRegistry, time-travel
│   ├── router/              # Router, Guards, Middleware, Link, lazy loading
│   ├── query/               # createQuery(), createMutation(), queryCache
│   ├── form/                # createForm() with Zod validation
│   ├── table/               # createTable() with sort, filter, pagination
│   ├── vite-plugin/         # JSX → DOM transform, template extraction
│   └── devtools/            # DevTools panel (Ctrl+Shift+D) with 5 tabs
├── examples/
│   └── starter/             # Demo app showcasing all features
├── tsconfig.json
├── package.json             # Monorepo root (pnpm workspaces)
└── vitest.config.ts
```

---

## Package Status

| Package | Status | Tests | Description |
|---------|--------|-------|-------------|
| `@liteforge/core` | ✅ Complete | ~120 | signal, computed, effect, batch, onCleanup |
| `@liteforge/runtime` | ✅ Complete | ~200 | createComponent, createApp, use(), Show, For, Switch, Dynamic |
| `@liteforge/store` | ✅ Complete | ~150 | defineStore, storeRegistry, plugins, time-travel |
| `@liteforge/router` | ✅ Complete | ~250 | Router, guards, middleware, nested routes, lazy loading |
| `@liteforge/query` | ✅ Complete | 67 | createQuery, createMutation, queryCache |
| `@liteforge/form` | ✅ Complete | 48 | createForm with Zod, nested fields, array fields |
| `@liteforge/table` | ✅ Complete | 61 | createTable with sort, filter, pagination, selection |
| `@liteforge/vite-plugin` | ✅ Complete | — | JSX transform, template extraction, signal-safe getters |
| `@liteforge/devtools` | ✅ Complete | ~100 | 5-tab panel: Signals, Stores, Router, Components, Performance |
| Demo App | ✅ Complete | — | Full app with all features at examples/starter |

**Total: ~1000+ tests across all packages**

---

## Core Packages (Phase 1)

### `@liteforge/core` — Reactivity

```ts
import { signal, computed, effect, batch, onCleanup } from '@liteforge/core'

const count = signal(0)
count()                     // read → 0
count.set(5)                // write → notifies subscribers
count.update(n => n + 1)    // functional update

const doubled = computed(() => count() * 2)  // lazy, cached

const dispose = effect(() => {
  console.log(count())      // auto-subscribes
})

batch(() => {               // deferred notifications
  count.set(1)
  name.set('Max')
})
```

### `@liteforge/runtime` — Components & DOM

```tsx
export const MyComponent = createComponent({
  setup({ props, use }) {
    const editMode = signal(false)
    return { editMode }
  },

  async load({ props, setup, use }) {
    const user = await api.get(`/users/${props.userId}`)
    return { user }
  },

  placeholder: () => <div class="skeleton" />,
  error: ({ error, retry }) => <button onclick={retry}>Retry</button>,

  component: ({ props, data, setup }) => (
    <div><h1>{data.user.name}</h1></div>
  ),

  mounted({ el }) { el.classList.add('fade-in') },
  destroyed() { console.log('cleaned up') },
})
```

**Lifecycle:** `setup()` → `placeholder` → `load()` → `component()` → `mounted()` → `destroyed()`

**Control Flow:**
```tsx
<Show when={condition}>Content</Show>
<For each={items}>{(item) => <li>{item.name}</li>}</For>
<Switch fallback={<Default />}>
  <Match when={a}>A</Match>
  <Match when={b}>B</Match>
</Switch>
```

### `@liteforge/store` — State Management

```ts
export const userStore = defineStore('users', {
  state: {
    currentUser: null as User | null,
    list: [] as User[],
    loading: false,
  },
  getters: (state) => ({
    isLoggedIn: () => state.currentUser() !== null,
    admins: () => state.list().filter(u => u.role === 'admin'),
  }),
  actions: (state, use) => ({
    async fetchUsers() {
      state.loading.set(true)
      state.list.set(await use('api').get('/users'))
      state.loading.set(false)
    },
  }),
})

// Registry
storeRegistry.list()        // → ['users', 'ui']
storeRegistry.snapshot()    // → full state as plain object
storeRegistry.reset('ui')   // → reset to initial
```

### `@liteforge/router` — Routing

```ts
const app = createApp({
  router: {
    routes: [
      { path: '/', component: Home },
      { path: '/users/:id', component: UserDetail, guard: 'auth' },
      {
        path: '/admin',
        component: AdminLayout,
        guard: ['auth', 'role:admin'],
        children: [
          { path: '/', component: Dashboard },
          { path: '/users', component: AdminUsers },
        ],
      },
    ],
  },
})

// In components:
const router = use('router')
router.navigate('/path')
router.params()    // Signal: { id: '42' }
router.query()     // Signal: { search: 'foo' }
```

**Features:** Guards, middleware, nested routes, lazy loading with `lazy()`, code splitting, route-based preloading.

---

## Data Packages (Phase 2)

### `@liteforge/query` — Data Fetching & Caching

**Object-style API.** Every return value is a Signal.

```ts
import { createQuery, createMutation, queryCache } from '@liteforge/query'

// Query — fetch data
const users = createQuery({
  key: 'users',
  fn: () => fetch('/api/users').then(r => r.json()),
  staleTime: 5 * 60 * 1000,   // 5 min fresh
  retry: 3,
})

users.data()        // Signal: User[] | undefined
users.error()       // Signal: Error | undefined
users.isLoading()   // Signal: boolean
users.refetch()     // Manual refetch

// Reactive key — refetches when signal changes
const userId = signal(1)
const user = createQuery({
  key: () => ['user', userId()],
  fn: () => fetch(`/api/users/${userId()}`).then(r => r.json()),
})

// Mutation
const addUser = createMutation({
  fn: (data: NewUser) => api.createUser(data),
  invalidate: ['users'],        // Refetch users on success
  onSuccess: (data) => { ... },
  onError: (err) => { ... },
})
addUser.mutate({ name: 'René' })

// Optimistic updates via onMutate + rollback
const addUserOptimistic = createMutation({
  fn: api.addUser,
  onMutate: (newUser, cache) => {
    const previous = cache.get('users')
    cache.set('users', [...(previous ?? []), { ...newUser, id: 'temp' }])
    return previous  // rollback value
  },
  onError: (err, vars, rollback) => queryCache.set('users', rollback),
  onSuccess: () => queryCache.invalidate('users'),
})

// Cache control
queryCache.invalidate('users')
queryCache.invalidate('user:*')   // Pattern matching
queryCache.set('users', data)
queryCache.clear()
```

**Options:**
- `staleTime` — ms until data is stale (default: 0)
- `cacheTime` — ms to keep unused cache (default: 5 min)
- `refetchOnFocus` — refetch on tab focus (default: true)
- `refetchInterval` — polling interval
- `retry` / `retryDelay` — retry on error
- `enabled` — reactive guard: `() => !!token()`

### `@liteforge/form` — Form Management

**Zod schema → reactive form. Object-style API.**

```ts
import { createForm } from '@liteforge/form'
import { z } from 'zod'

const form = createForm({
  schema: z.object({
    name: z.string().min(2, 'Min 2 Zeichen'),
    email: z.string().email('Ungültige E-Mail'),
    address: z.object({
      street: z.string().min(1),
      zip: z.string().regex(/^\d{4}$/, 'Ungültige PLZ'),
    }),
    items: z.array(z.object({
      description: z.string().min(1),
      quantity: z.number().min(1),
      price: z.number().min(0),
    })).min(1, 'Mindestens ein Posten'),
  }),
  initial: { name: '', email: '', address: { street: '', zip: '' }, items: [] },
  onSubmit: async (values) => { ... },  // Typed from schema
  validateOn: 'blur',          // 'change' | 'blur' | 'submit'
  revalidateOn: 'change',     // After first error: revalidate on change
})

// Field access — all Signals
form.field('name').value()     // current value
form.field('name').error()     // validation error
form.field('name').touched()   // has been blurred
form.field('name').dirty()     // value ≠ initial
form.field('name').set('...')
form.field('name').touch()     // trigger blur validation
form.field('name').reset()

// Nested fields — dot notation
form.field('address.street').value()
form.field('address.zip').error()

// Array fields
const items = form.array('items')
items.fields()                 // Signal: ArrayItemField[]
items.append({ description: '', quantity: 1, price: 0 })
items.remove(index)
items.move(from, to)
items.swap(a, b)

// Array item fields
items.fields()[0].field('description').value()

// Form-level state (all Signals)
form.values()        // full form values
form.errors()        // all errors
form.isValid()       // all fields valid?
form.isDirty()       // any field changed?
form.isSubmitting()  // submit in progress?
form.submitCount()   // number of submits

// Actions
form.submit()        // validate + call onSubmit
form.reset()         // reset to initial
form.setValues({})   // partial update
form.validate()      // manual validation
form.clearErrors()

// In JSX:
<input
  value={() => form.field('email').value()}
  oninput={(e) => form.field('email').set(e.target.value)}
  onblur={() => form.field('email').touch()}
/>
<Show when={() => form.field('email').error()}>
  <span class="error">{() => form.field('email').error()}</span>
</Show>
```

**Peer dependencies:** `zod`, `@liteforge/core`

### `@liteforge/table` — Data Tables

**Full-featured reactive table. Object-style API.**

```ts
import { createTable } from '@liteforge/table'

const table = createTable<User>({
  // Data source — Signal or getter
  data: () => usersQuery.data() ?? [],

  // Column definitions
  columns: [
    { key: 'id', header: 'ID', width: 60, sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'company.name', header: 'Company', sortable: true, filterable: true },
    {
      key: 'website',
      header: 'Website',
      cell: (value) => <a href={`https://${value}`} target="_blank">{value}</a>,
    },
    {
      key: '_actions',    // Virtual column (no data field)
      header: '',
      cell: (_, row) => (
        <div>
          <button onclick={() => editUser(row)}>Edit</button>
          <button onclick={() => deleteUser.mutate(row.id)}>Delete</button>
        </div>
      ),
    },
  ],

  // Features (all optional)
  search: { enabled: true, columns: ['name', 'email'], placeholder: 'Search...' },
  filters: { 'company.name': { type: 'select' } },
  pagination: { pageSize: 20, pageSizes: [10, 20, 50] },
  selection: { enabled: true, mode: 'multi' },
  columnToggle: true,
  onRowClick: (row) => navigate(`/users/${row.id}`),
  rowClass: (row) => row.active ? '' : 'row-inactive',

  // Styling
  unstyled: false,         // true = no CSS injected
  classes: { ... },        // Override CSS classes per element
})

// Mount in JSX
<table.Root />

// Programmatic control (all Signals)
table.sorting()            // { key, direction } | null
table.sort('name', 'asc')
table.searchQuery()        // current search text
table.setSearch('...')
table.filters()            // { 'company.name': 'Acme' }
table.setFilter(key, value)
table.page() / table.setPage(2) / table.nextPage()
table.pageSize() / table.setPageSize(50)
table.selected()           // Selected rows
table.selectedCount()
table.selectAll() / table.deselectAll() / table.toggleRow(row)
table.visibleColumns()     // Visible column keys
table.showColumn(key) / table.hideColumn(key) / table.toggleColumn(key)
table.rows()               // Current visible rows (filtered + sorted + paginated)
```

**Column Definition:**
```ts
interface ColumnDef<T> {
  key: string                    // Data field or '_prefix' for virtual
  header: string
  width?: number | string
  sortable?: boolean
  filterable?: boolean
  visible?: boolean              // Default visibility
  cell?: (value, row) => Node    // Custom cell renderer (JSX)
  headerCell?: () => Node        // Custom header renderer
}
```

**Filter Types:** `text` (with debounce), `select` (auto-generated options), `boolean`, `number-range`

**Dynamic Columns:** `columns` can be a Signal for server-driven tables.

**Styling — 3 Layers:**
1. BEM classes always present: `.lf-table`, `.lf-table-row`, `.lf-table-cell`, etc.
2. Default theme via CSS Variables (overridable)
3. `classes` override for Tailwind or full control
4. `unstyled: true` disables default CSS injection

**Data Pipeline (computed chain for performance):**
```
data() → filteredData (computed) → sortedData (computed) → paginatedData (computed) → DOM
```

---

## Tooling Packages

### `@liteforge/vite-plugin` — Build-time JSX Transform

Transforms JSX to direct DOM operations with signal-safe getter wrapping:
```tsx
// Input:
<h1>Count: {count()}</h1>

// Output:
const _h1 = document.createElement('h1')
_effect(() => { _h1.textContent = `Count: ${count()}` })
```

Features: Template extraction for static HTML, code splitting support, JSX → DOM compilation.

**Known Issue:** HMR (Hot Module Replacement) is not yet working. Manual browser refresh required after changes.

### `@liteforge/devtools` — Debug Panel

Toggle with `Ctrl+Shift+D`. Five tabs:
- **Signals** — Live values, update counts, dependency graphs
- **Stores** — State tree with time-travel debugging (restore any past state)
- **Router** — Navigation history, guard results, timing
- **Components** — Component tree with mount/unmount tracking
- **Performance** — Signal updates/sec, effect executions, component counts

---

## Demo App (`examples/starter`)

Located at `examples/starter/`. Demonstrates all packages working together:

- **Dashboard layout** with sidebar navigation
- **Home** — Component lifecycle demo (load/placeholder)
- **Users** — User list (basic)
- **Posts** — `@liteforge/query` with JSONPlaceholder API, createMutation
- **Post Detail** — Reactive query keys from route params, dependent queries (comments)
- **Forms** — Contact form (simple) + Invoice form (array fields, computed totals)
- **Tables** — Full-featured table with sorting, filtering, pagination, selection
- **Settings** — Theme toggle (light/dark)
- **Admin Panel** — Nested routes demo

---

## API Consistency

All data packages use **object-style API** for consistency:

```ts
// Query
createQuery({ key: '...', fn: () => ..., staleTime: 5000 })

// Mutation
createMutation({ fn: (data) => ..., invalidate: ['...'] })

// Form
createForm({ schema: z.object({...}), initial: {...}, onSubmit: async (v) => {...} })

// Table
createTable({ data: () => [...], columns: [...], pagination: { pageSize: 20 } })
```

No positional arguments. Every option is named and self-documenting.

---

## Coding Standards

- **Language:** TypeScript strict mode, no `any` unless absolutely necessary
- **Testing:** Vitest for all packages, 1000+ total tests across all packages
- **Naming:** Concise variable names in internals, descriptive names in public API
- **Exports:** Clean barrel exports via index.ts per package
- **Dependencies:** No external runtime deps in core/runtime/store/router/query/table. `zod` is peer dep of form only.
- **API Style:** Object-style options for all `create*` functions
- **JSX:** All demo components and user-facing code uses JSX (not document.createElement)
- **Comments:** Document WHY, not WHAT

---

## Known Issues & TODOs

- [ ] **HMR not working** — Vite plugin needs HMR boundary implementation for component-level hot reload
- [ ] **Form value binding** — `value={field.value}` doesn't work, must use `value={() => field.value()}` (signal needs explicit getter in JSX attributes)
- [ ] **Text spacing in JSX** — Adjacent text nodes and signals need explicit `{' '}` for spaces
- [ ] **DevTools keydown** — `e.key?.toLowerCase()` needs optional chaining (some events have undefined key)
- [ ] **create-liteforge CLI** — Scaffolding tool not yet built

---

## Future Roadmap

- [ ] `@liteforge/query` — `createInfiniteQuery` for pagination/infinite scroll
- [ ] `@liteforge/router` — Route-level DX refactor (lazy directly in route definitions)
- [ ] `@liteforge/table` — Virtual scrolling for large datasets
- [ ] `@liteforge/i18n` — Internationalization plugin
- [ ] Docs site — Built with LiteForge itself
- [ ] `create-liteforge` — CLI scaffolding tool (minimal + full templates)
- [ ] HMR fix — Component-level hot module replacement
- [ ] Published npm packages