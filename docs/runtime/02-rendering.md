---
title: "Rendering"
category: "runtime"
tags: ["rendering", "dom", "template", "insert", "setProp", "h"]
related: ["JSX", "createComponent", "Context"]
---

# Rendering

> How LiteForge renders components to the DOM: direct DOM creation, signal-tracked updates, template optimizations.

## Installation

```bash
npm install @liteforge/runtime
```

## Quick Start

```tsx
// The JSX transform compiles this automatically:
const el = <div class="box">{() => count()}</div>

// Equivalent low-level calls (rarely written manually):
import { h } from '@liteforge/runtime'
const el = h('div', { class: 'box' }, () => count())
```

## API Reference

### `h(tag, props, ...children)` → `Node`

JSX factory. Creates DOM elements or instantiates component factories.

| Param | Type | Description |
|-------|------|-------------|
| `tag` | `string \| ComponentFactory` | HTML tag name or component factory |
| `props` | `object \| null` | Element attributes / component props |
| `...children` | `Child[]` | Text, nodes, signals (wrapped in `() =>`), or arrays |

### `Fragment` → `DocumentFragment`

Used for `<>...</>` JSX fragments.

### Template runtime (advanced / compiler output)

The vite-plugin may emit calls to these low-level APIs for static templates:

| Function | Description |
|----------|-------------|
| `_template(html)` | Clone a cached HTML template fragment |
| `_insert(parent, value, before?)` | Insert a reactive child at a position |
| `_setProp(el, name, value)` | Set a property or attribute reactively |
| `_addEventListener(el, event, handler)` | Attach a DOM event listener |

These are compiler output — you should not call them directly.

## Examples

### Manual DOM construction (without JSX)

```ts
import { h, Fragment } from '@liteforge/runtime'
import { signal } from '@liteforge/core'

const label = signal('Hello')

const node = h('div', { class: 'wrapper' },
  h('span', null, () => label()),
  h('button', { onclick: () => label.set('World') }, 'Click'),
)

document.body.appendChild(node)
```

### Children types

```tsx
// Strings are static text nodes
<p>Hello world</p>

// () => expressions are reactive
<p>{() => user()?.name ?? 'Guest'}</p>

// Arrays are flattened
<ul>{items().map(i => <li>{i}</li>)}</ul>

// Nodes are inserted as-is
<div>{document.createElement('canvas')}</div>
```

### Props in JSX content — `{props.x}` vs `{() => props.x}`

> **Always wrap `props.*` access in `() =>` when used as JSX content.** Bare `{props.x}` is evaluated once at render time and never updates.

```tsx
// ❌ Static — evaluated once, never re-renders when props.label changes
component({ props }) {
  return <button>{props.label}</button>
}

// ✅ Reactive — re-evaluates whenever props.label changes
component({ props }) {
  return <button>{() => props.label}</button>
}
```

**Why:** `props` is a Proxy — reading `props.label` only tracks the dependency if the read happens inside a reactive context (an effect or a `() =>` getter). Bare `{props.label}` is read once during the initial DOM construction call and never again.

This applies to any reactive value used as JSX text content or children:

```tsx
// ❌ All of these are static:
<span>{props.name}</span>
<span>{count()}</span>
<span>{store.count()}</span>

// ✅ All of these are reactive:
<span>{() => props.name}</span>
<span>{() => count()}</span>
<span>{() => store.count()}</span>
```

**Attributes are different** — `_setProp` handles getter functions automatically, so `class`, `disabled`, `style` etc. work with or without `() =>` as long as they contain a reactive read. For consistency, still prefer `() =>` for dynamic attributes too.

```tsx
// Both work for attributes — but () => is explicit and consistent:
<div class={isActive() ? 'active' : ''}  />   // re-evaluates (signal call in attribute)
<div class={() => isActive() ? 'active' : ''} />  // same, more explicit
```

## Control Flow

### `Show` — conditional rendering

```tsx
import { Show } from 'liteforge'

// Boolean condition — no-arg children
<Show when={() => isLoggedIn()}>
  {() => <Dashboard />}
</Show>

// Value-based condition — receive narrowed value
<Show when={() => currentUser()}>
  {(user) => <h1>Hello, {user.name}</h1>}
</Show>

// With fallback
<Show when={() => data()} fallback={() => <Spinner />}>
  {(items) => <List items={items} />}
</Show>
```

`children` accepts two forms:
- `(value: NonNullable<T>) => Node` — receives the truthy value, narrowed to non-nullable
- `() => Node` — no argument, for boolean conditions where the value is not needed

Both `when` and `fallback` must be functions.

### `For` — list rendering

```tsx
import { For } from 'liteforge'

<For each={() => items()} key={(item) => item.id}>
  {(item, index) => <li>{item.name}</li>}
</For>
```

### `Switch` / `Match`

```tsx
import { Switch, Match } from 'liteforge'

<Switch fallback={() => <NotFound />}>
  <Match when={() => status() === 'loading'}>{() => <Spinner />}</Match>
  <Match when={() => status() === 'error'}>{() => <Error />}</Match>
  <Match when={() => status() === 'ok'}>{() => <Content />}</Match>
</Switch>
```

## Notes

- The runtime uses direct DOM APIs — no virtual DOM diff.
- Signal-returning children (`() => ...`) are wrapped in effects; updating the signal updates the DOM node in place.
- The vite-plugin's template compiler generates `_template`/`_insert`/`_setProp` calls for static subtrees to avoid repeated `createElement` calls.
- `ref` props are supported: `ref={el => myRef = el}` calls the function with the element after insertion.
- Use `<Show>` when content should not be in the DOM at all when hidden. Use `style={() => show() ? '' : 'display:none'}` when the content has reactive effects that must stay alive while hidden.
