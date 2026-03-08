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
- **Object-style APIs** — All `create*` functions take an options object, no positional args

**Tech Stack:** TypeScript, Vite, JSX, pnpm monorepo.

---

## Architecture Rules — NEVER break these

1. Use ONLY `signal()`, `effect()`, `computed()` from `@liteforge/core` for reactivity
2. No classes in public APIs — use factory functions (`createX` pattern)
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

vite-plugin (standalone, no liteforge deps)
devtools (depends on core + store)
```

Build order follows this graph. `pnpm -r build` handles it automatically.

---

## Package Status

| Package | Version | Size (gzip) | Tests | Description |
|---------|---------|-------------|-------|-------------|
| `@liteforge/core` | 0.1.0 | ~6kb | ~120 | signal, computed, effect, batch, onCleanup |
| `@liteforge/runtime` | 0.1.0 | ~12kb | ~200 | createComponent, createApp, use(), Show, For, Switch |
| `@liteforge/store` | 0.1.0 | ~5kb | ~150 | defineStore, storeRegistry, plugins, time-travel |
| `@liteforge/router` | 0.1.0 | ~20kb | ~250 | Router, guards, middleware, nested routes, lazy loading |
| `@liteforge/query` | 0.1.0 | ~5kb | 67 | createQuery, createMutation, queryCache |
| `@liteforge/form` | 0.1.0 | ~4kb | 48 | createForm with Zod, nested fields, array fields |
| `@liteforge/table` | 0.1.0 | ~8kb | 61 | createTable with sort, filter, pagination, selection |
| `@liteforge/calendar` | 0.1.0 | ~22kb | 184 | createCalendar with 4 views, drag & drop, resources |
| `@liteforge/vite-plugin` | 0.1.0 | ~15kb | 275 | JSX transform, template extraction, signal-safe getters |
| `@liteforge/devtools` | 0.1.0 | ~16kb | ~100 | 5-tab debug panel with time-travel |

**Total: 1474+ tests across all packages**

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
const router = createRouter({
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

## Vite Plugin — Important Behavior

The `@liteforge/vite-plugin` transforms JSX to direct DOM operations with signal-safe getter wrapping.

**Event handler detection:** The `isEventHandler()` function in `packages/vite-plugin/src/utils.ts` recognizes:
- PascalCase: `onClick`, `onPointerDown`, etc. (any `on` + uppercase)
- Lowercase: `onclick`, `onpointerdown`, etc. (checked against `KNOWN_EVENTS` set)

Props like `online` or `once` are NOT treated as events.

If a new DOM event isn't recognized as an event handler and gets wrapped in a getter function, add it to the `KNOWN_EVENTS` set in `utils.ts`.

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
6. **`Show` vs. `display:none`** — Use `<Show>` when content is expensive and shouldn't be in the DOM. Use `style={() => open() ? '' : 'display:none'}` when content has reactive nodes that must stay alive while hidden (e.g. a panel with live-updating signals). Removing a node from the DOM disposes its effects — re-inserting the same node does NOT re-attach them.

---

## When Making Changes

1. Always run `pnpm test` after changes
2. Always run `pnpm build:packages` to verify builds
3. Test UI changes in the browser: `pnpm --filter starter dev`
4. **For interaction features (drag, resize, click handlers): TEST IN THE BROWSER, not just in vitest**
5. Create a changeset for any user-facing change: `pnpm changeset`
6. When fixing a bug or learning a new gotcha — ADD IT to this file under Known Issues

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