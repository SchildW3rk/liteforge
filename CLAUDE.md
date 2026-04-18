# CLAUDE.md – LiteForge Framework

## Project Overview

**LiteForge** is a signals-based frontend framework built from scratch. Published on npm under `@liteforge/*`. Monorepo with 10 packages under `packages/`, demo app under `examples/starter/`.

**Repository:** https://github.com/SchildW3rk/liteforge
**npm:** https://www.npmjs.com/org/liteforge
**Author:** SchildW3rk (René), Salzburg, Austria
**License:** MIT

**Core Principles:**
- **No Virtual DOM** — Direct, fine-grained DOM manipulation via Signals/Effects
- **JSX Syntax** — Custom Vite plugin transforms JSX to direct DOM operations at build-time
- **Signals-based Reactivity** — Automatic dependency tracking, no manual subscriptions
- **Zero Dependencies** — Every package has zero external runtime deps (only peer deps on core)
- **TypeScript-first** — Full strict mode, no `any` in public APIs
- **Object-style APIs** — All public functions take an options object, no positional args
- **Naming convention — `define*` vs `create*`:**
  - `define*` = **Spec/Declaration** — describes something statically, no live side-effects at call time (e.g. `defineComponent`, `defineRouter`, `defineApp`, `defineStore`)
  - `create*` = **Live Instance** — allocates runtime state, signals, or DOM resources at call time (e.g. `createQuery`, `createForm`, `createTable`, `createCalendar`, `createFlow`, `createClient`, `createModal`, `createMutation`, `createResource`, `createErrorBoundary`, `createThemeStore`, `createDevTools`)
  - **Rule:** If the return value holds live signals or DOM state → `create*`. If it is a reusable blueprint passed to a runtime → `define*`.

**Tech Stack:** TypeScript, Vite, JSX, pnpm monorepo.

---

## Architecture Rules — NEVER break these

1. Use ONLY `signal()`, `effect()`, `computed()` from `@liteforge/core` for reactivity
2. No classes in public APIs — use factory functions (`defineX` or `createX`, see naming convention above)
3. No `any` types in public APIs — full TypeScript generics with strict mode
4. No external runtime dependencies — only `@liteforge/core` as peer dependency
5. All date operations use native `Date` + `Intl.DateTimeFormat` — NO date-fns/dayjs/moment
6. All DOM interaction uses native APIs — NO jQuery, NO external DOM libraries
7. Drag & drop uses native Pointer Events — NO external drag libraries
8. Every package exports through a clean `src/index.ts` barrel file
9. ALL demo components MUST use JSX syntax
10. Object-style API pattern everywhere (options object, not positional args)

---

## Package Dependency Graph

```
core (no deps)
├── store
├── router
├── runtime
├── query
├── form
├── table
└── calendar

transform (standalone, no liteforge deps — bundler-agnostic AST core)
└── vite-plugin (thin Vite adapter over @liteforge/transform)
    └── [future] bun-plugin (thin Bun adapter over @liteforge/transform)

devtools (depends on core + store)
```

Build order follows this graph. `pnpm -r build` handles it automatically.

---

## Package Status

| Package | Version | Size (gzip) | Tests | Description |
|---------|---------|-------------|-------|-------------|
| `@liteforge/core` | 0.1.0 | ~6kb | ~120 | signal, computed, effect, batch, onCleanup |
| `@liteforge/runtime` | 0.1.0 | ~12kb | ~200 | defineComponent, defineApp, use(), Show, For, Switch |
| `@liteforge/store` | 0.1.0 | ~5kb | ~150 | defineStore, storeRegistry, plugins, time-travel |
| `@liteforge/router` | 0.1.0 | ~20kb | ~250 | Router, guards, middleware, nested routes, lazy loading |
| `@liteforge/query` | 0.1.0 | ~5kb | 67 | createQuery, createMutation, queryCache |
| `@liteforge/form` | 0.1.0 | ~4kb | 48 | createForm with Zod, nested fields, array fields |
| `@liteforge/table` | 0.1.0 | ~8kb | 61 | createTable with sort, filter, pagination, selection |
| `@liteforge/calendar` | 0.1.0 | ~22kb | 184 | createCalendar with 4 views, drag & drop, resources |
| `@liteforge/transform` | 0.1.0 | ~2kb | 25 | Bundler-agnostic AST transform core (JSX→h(), For/Show, getter-wrap) |
| `@liteforge/vite-plugin` | 0.5.1 | ~2kb | 388 | Thin Vite adapter over @liteforge/transform + HMR |
| `@liteforge/devtools` | 0.1.0 | ~16kb | ~100 | 5-tab debug panel with time-travel |

**Total: 3507+ tests across all packages**

---

## Common Patterns

### Signals — the foundation of everything:
```ts
import { signal, computed, effect } from '@liteforge/core'

const count = signal(0)
const doubled = computed(() => count() * 2)

effect(() => {
  console.log(doubled()) // auto-tracks dependencies
})

count.set(5)           // direct set
count.update(n => n + 1) // functional update
```

### JSX Event Handlers — IMPORTANT:
LiteForge JSX supports both `onclick` (lowercase) and `onClick` (PascalCase).
The vite-plugin recognizes both as event handlers and does NOT wrap them in getter functions.

```tsx
// Reactive text — needs () => wrapper:
<span>{() => count()}</span>

// Event handler — NOT wrapped:
<button onclick={() => doSomething()}>Click</button>

// Static attribute:
<div class="my-class" />

// Dynamic attribute — needs () => wrapper:
<div class={() => isActive() ? 'active' : 'inactive'} />
```

### Store pattern:
```ts
const myStore = defineStore('storeName', {
  state: { value: null },
  getters: (state) => ({
    computed: () => state.value() !== null
  }),
  actions: (state) => ({
    setValue(v) { state.value.set(v) }
  })
})
```

### Factory function pattern (ALL packages follow this):
```ts
// CORRECT:
export function createThing<T>(options: ThingOptions<T>): ThingResult<T> { ... }

// WRONG — never use classes in public APIs:
export class Thing<T> { ... }
```

---

## Core Packages

### `@liteforge/core` — Reactivity

```ts
const count = signal(0)
count()                     // read → 0
count.set(5)                // write
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
export const MyComponent = defineComponent({
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
</Switch>
```

### `@liteforge/store` — State Management

```ts
const userStore = defineStore('users', {
  state: { currentUser: null, list: [], loading: false },
  getters: (state) => ({
    isLoggedIn: () => state.currentUser() !== null,
  }),
  actions: (state) => ({
    async fetchUsers() {
      state.loading.set(true)
      state.list.set(await fetch('/api/users').then(r => r.json()))
      state.loading.set(false)
    },
  }),
})
```

### `@liteforge/router` — Routing

```ts
const router = defineRouter({
  routes: [
    { path: '/', component: Home },
    { path: '/users/:id', component: UserDetail, guard: 'auth' },
    { path: '/admin', component: AdminLayout, guard: ['auth', 'role:admin'],
      children: [
        { path: '/', component: Dashboard },
      ],
    },
  ],
})
```

### `@liteforge/query` — Data Fetching

```ts
const users = createQuery({
  key: 'users',
  fn: () => fetch('/api/users').then(r => r.json()),
  staleTime: 5 * 60 * 1000,
})

users.data()        // Signal: User[]
users.isLoading()   // Signal: boolean
users.refetch()     // Manual refetch

const addUser = createMutation({
  fn: (data) => api.createUser(data),
  invalidate: ['users'],
})
```

### `@liteforge/form` — Form Management

```ts
const form = createForm({
  schema: z.object({
    name: z.string().min(2),
    email: z.string().email(),
  }),
  initial: { name: '', email: '' },
  onSubmit: async (values) => { ... },
  validateOn: 'blur',
  revalidateOn: 'change',
})

form.field('name').value()   // Signal
form.field('name').error()   // Signal
form.field('name').set('...')
form.submit()
```

### `@liteforge/table` — Data Tables

```ts
const table = createTable<User>({
  data: () => usersQuery.data() ?? [],
  columns: [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: '_actions', header: '',
      cell: (_, row) => <button onclick={() => edit(row)}>Edit</button> },
  ],
  pagination: { pageSize: 20 },
  selection: { enabled: true, mode: 'multi' },
})

<table.Root />
```

### `@liteforge/calendar` — Scheduling Calendar

```ts
const calendar = createCalendar({
  events: () => appointments(),
  view: 'week',
  resources: [
    { id: 'anna', name: 'Anna Müller', color: '#3b82f6' },
    { id: 'tom', name: 'Tom Weber', color: '#10b981' },
  ],
  editable: true,
  selectable: true,
  locale: 'de-AT',
  time: { dayStart: 8, dayEnd: 20, slotDuration: 30, weekStart: 1 },
  onEventDrop: (event, newStart, newEnd, resourceId) => { ... },
  onEventResize: (event, newEnd) => { ... },
  onSlotClick: (start, end, resourceId) => { ... },
})

<calendar.Toolbar />
<calendar.Root />

calendar.next()
calendar.prev()
calendar.setView('month')
calendar.toggleResource('anna')
```

**4 Views:** Day (with resource columns), Week, Month, Agenda
**Features:** Drag & drop, resize, recurring events, working hours, now indicator, all-day row, dark mode

---

## Styling Convention — 3 Layers

All UI packages (table, calendar) use this system:

1. **BEM classes** (always present): `.lf-cal-event`, `.lf-table-header`
2. **CSS Variables** for theming (light + dark mode)
3. **`classes` override** prop for Tailwind or custom classes
4. **`unstyled: true`** option to skip default CSS injection

Dark mode: CSS variables under `:root.dark`, `[data-theme="dark"]`, and `@media (prefers-color-scheme: dark)`.

---

## Transform Architecture

`@liteforge/vite-plugin` is a thin Vite adapter. All AST logic lives in `@liteforge/transform`.

```
@liteforge/transform          — bundler-agnostic core
  transformJsx(code, opts, isDev) → TransformResult
  ├── jsx-visitor.ts          — JSX → h() calls
  ├── for-transform.ts        — For/Show/Switch control flow rewrites
  ├── getter-wrap.ts          — signal-safe getter wrapping rules
  ├── template-visitor.ts     — production template extraction mode
  ├── template-extractor.ts   — static/dynamic element classification
  ├── template-compiler.ts    — hydration code generation
  └── path-resolver.ts        — DOM traversal path calculation

@liteforge/vite-plugin        — Vite adapter
  └── configResolved + transform hook + HMR injection
      delegates to transformJsx() from @liteforge/transform

[future] @liteforge/bun-plugin — Bun adapter
      delegates to transformJsx() from @liteforge/transform
```

**Event handler detection** lives in `packages/transform/src/utils.ts` → `isEventHandler()`:
- PascalCase: `onClick`, `onPointerDown`, etc. (any `on` + uppercase)
- Lowercase: `onclick`, `onpointerdown`, etc. (checked against `KNOWN_EVENTS` set)

Props like `online` or `once` are NOT treated as events.

If a new DOM event isn't recognized, add it to `KNOWN_EVENTS` in `packages/transform/src/utils.ts`.

**`autoWrapProps` option** — when `true` (default), `props.x` in JSX content position is wrapped in `() => props.x` via `isPropsAccess()` in `processChildExpression()`. Setting it to `false` skips that early-exit path, but `props.x` is still a `MemberExpression` and gets wrapped by `shouldWrapExpression()` anyway. The option only matters if you need to distinguish "wrapped because props" from "wrapped because dynamic".

---

## Testing

- **Framework:** Vitest with happy-dom environment
- **Test location:** `packages/*/tests/`
- **Run all:** `pnpm test`
- **Run single package:** `pnpm vitest run packages/core/tests`
- **Tests excluded from typecheck:** tsconfig in each package excludes `tests/` from `tsc --noEmit`
- **Happy-DOM known issue:** Script tag loading causes unhandled rejections — caught in `tests/setup.ts`, safe to ignore

## Build & Publish

- All packages build with Vite library mode (ESM + CJS + .d.ts)
- Build: `pnpm build:packages`
- Output per package: `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`
- Typecheck: `pnpm typecheck:all` (checks source only, not tests)
- Publish: `pnpm publish:dry` (verify), then `pnpm publish:all`
- Changesets: `pnpm changeset` → `pnpm changeset version` → `pnpm publish:all`

---

## Known Issues & Gotchas

1. **Form value binding** — Must use `value={() => field.value()}` not `value={field.value}`. Signal needs explicit getter wrapper in JSX attributes.
2. **Text spacing in JSX** — Adjacent text nodes and signals need explicit `{' '}` for spaces.
3. **Calendar drag & drop** uses event delegation on the grid container (not individual event elements) to survive reactive re-renders.
4. **Store signals** use `.set()` for updates, not direct assignment: `state.value.set(newVal)` not `state.value = newVal`.
5. **`Show` `when` prop — pass signals directly**: The vite-plugin compiles `when: mySignal` to `when: () => mySignal` (wraps the identifier). `Show`'s `getValue()` then returns the signal function object itself — always truthy, never changing. Fix applied in `control-flow.ts`: `getValue` double-resolves if the result is itself a function. This means both `when: mySignal` and `when: () => mySignal()` work correctly.
6. **`Show` vs. `keepAlive`** — Use `<Show>` when content should be unmounted and its effects disposed on hide. Use `<Show keepAlive>` when the child has live reactive effects (subscriptions, polling, WebSocket bindings) that must keep running while hidden — the node is toggled via `display:none` instead of removed. Note: `keepAlive` only works when the child root is an `HTMLElement` (not a text node or comment). The `fallback` prop is ignored in `keepAlive` mode.
7. **`load()` vs `createQuery()` in `setup()`** — `load()` runs on every mount with no cache (use for detail/edit views). `createQuery()` in `setup()` uses the staleTime cache (use for list views — prevents refetch on back-navigation). Never call `createTable()` after awaiting in `load()`; wire `data: () => setup.query.data() ?? []` so the table reacts reactively.
8. **`table.search()` (not `searchQuery()`)** — The signal accessor on `TableResult` is `.search()`. `setSearch()` is a silent no-op if `search: { enabled: true }` is not passed to `createTable()` — a console warning is emitted in that case.
9. **`useParam()` vs `useParams()` — reactive vs snapshot** — `useParam('id')` returns a reactive getter `() => string | undefined`. Passing it to `useOne()` / `createQuery()` in `setup()` creates an infinite refetch loop (the getter is tracked inside the query key function, which causes re-runs). Always use `useParams()` for one-time reads in `setup()` and `load()` — it wraps the read in `untrack()` and returns a plain snapshot object.
10. **`untrack()` for writes inside effects** — When an `effect` reads signal A and writes signal B, and signal B is also read somewhere that triggers A again, use `untrack(() => signalB.set(...))` to break the cycle. Common case: prefilling a form from a query result — `effect(() => { const d = query.data(); if (d) untrack(() => form.setValues(d)); })`.

---

## When Making Changes

1. Always run `pnpm test:run` after changes
2. Always run `pnpm build:packages` to verify builds
3. Test UI changes in the browser: `pnpm --filter starter dev`
4. **For interaction features (drag, resize, click handlers): TEST IN THE BROWSER, not just in vitest**
5. Create a changeset for any user-facing change: `pnpm changeset`
6. When fixing a bug or learning a new gotcha — ADD IT to this file under Known Issues

### Bug-Hunting Discipline

When a hypothesis is disproven, form the **next hypothesis from the new data** — not by guessing in a different direction. Each debug step must narrow the hypothesis space. Concrete steps:
1. State the hypothesis explicitly before running a diagnostic.
2. Run the smallest diagnostic that can falsify it (a `console.log`, a direct unit call, reading the original source).
3. If falsified: update the hypothesis using only the new evidence. Do not pivot to an unrelated theory.
4. If confirmed: fix, then verify the fix closes the exact failure path found.

### Refactoring Validation Rule

When a test is red in refactored code, check in this order:

1. **Test exists 1:1 in the original, was green there** → the refactoring broke the code. Fix the code, not the test.
2. **Test exists in the original with a different assertion** → align the assertion to the original. Do not invent a new one.
3. **Test is new** → determine the original code's behavior as source of truth first, then write the test to match it.

**Never rewrite a test to match the current output without first verifying what the original code produced.**

---

## Future Roadmap

- [ ] `@liteforge/query` — `createInfiniteQuery` for pagination/infinite scroll
- [x] `@liteforge/router` — Route-level DX refactor (lazy directly in route definitions)
- [ ] `@liteforge/table` — Virtual scrolling for large datasets
- [ ] `@liteforge/i18n` — Internationalization plugin
- [ ] `@liteforge/calendar` — Month view click-to-navigate, multi-day event spanning
- [ ] Docs site — Built with LiteForge itself
- [x] `create-liteforge` — CLI scaffolding tool
- [x] HMR — Component-level hot module replacement with state preservation