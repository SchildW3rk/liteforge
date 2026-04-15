---
title: "Tooltip"
category: "tooltip"
tags: ["tooltip", "tooltip directive", "Tooltip component", "position", "delay", "showWhen"]
related: ["createModal", "Toast"]
---

# Tooltip

> Attach tooltips to DOM elements via directive or component wrapper.

## Installation

```bash
npm install @liteforge/tooltip
```

## Quick Start

```tsx
import { tooltip, Tooltip } from '@liteforge/tooltip'

// Directive style (imperative)
const btn = <button>Hover me</button>
tooltip(btn, 'This is a tooltip')

// Component wrapper style (JSX)
<Tooltip content="This is a tooltip" position="top">
  <button>Hover me</button>
</Tooltip>
```

## API Reference

### `tooltip(el, input)` → `void`

Attach a tooltip to a DOM element.

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `el` | `Element` | Target element |
| `input` | `string \| TooltipOptions` | Tooltip content or options object |

**`TooltipOptions`:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `content` | `string \| Node` | required | Tooltip text or DOM node |
| `position` | `TooltipPosition` | `'top'` | `'top' \| 'right' \| 'bottom' \| 'left' \| 'auto'` |
| `delay` | `number` | `0` | Show delay in ms |
| `offset` | `number` | `8` | Distance from element in px |
| `disabled` | `boolean` | `false` | Disable the tooltip |
| `showWhen` | `() => boolean` | — | Guard function evaluated on every pointerenter |
| `triggerOnFocus` | `boolean` | `true` | Also trigger on keyboard focus/blur |
| `class` | `string` | — | Extra CSS class(es) added to the tooltip element |
| `styles` | `TooltipStyles` | — | Inline style overrides for the tooltip (and arrow) |
| `borderRadius` | `string` | — | Shorthand to set `border-radius` inline (overrides CSS variable) |
| `dismissOn` | `'auto' \| 'click' \| 'manual'` | `'auto'` | How the tooltip is dismissed (see below) |

**`dismissOn` values:**

| Value | Behavior |
|-------|----------|
| `'auto'` | Hides on `pointerleave` + `blur` + click (default) |
| `'click'` | Hides on click only — stays visible on `pointerleave` |
| `'manual'` | Only the returned cleanup function hides the tooltip |

**`TooltipStyles`:**

| Field | Description |
|-------|-------------|
| `tooltip` | Inline style string applied to the tooltip element via `cssText +=` |
| `arrow` | Stored as `data-arrow-style` attribute — cannot be applied directly since the arrow is a `::before` pseudo-element |

### `Tooltip(props)` → `Node`

JSX component wrapper. All `TooltipOptions` fields are accepted as props including the new `class`, `styles`, `borderRadius`, and `dismissOn`.

**Props (`TooltipProps`):**

| Prop | Type | Description |
|------|------|-------------|
| `content` | `string \| Node` | Tooltip content |
| `position` | `TooltipPosition` | Tooltip position |
| `delay` | `number` | Show delay in ms |
| `offset` | `number` | Distance from element |
| `disabled` | `boolean` | Disable tooltip |
| `showWhen` | `() => boolean` | Guard function |
| `triggerOnFocus` | `boolean` | Focus/blur trigger |
| `class` | `string` | Extra CSS class(es) |
| `styles` | `TooltipStyles` | Inline style overrides |
| `borderRadius` | `string` | `border-radius` override |
| `dismissOn` | `'auto' \| 'click' \| 'manual'` | Dismiss behavior |

Children are wrapped in a `display:contents` span.

### `positionTooltip(el, target, position)` → `void`

Manually reposition a tooltip element relative to a target.

### `hideAllTooltips()` → `void`

Imperatively hide all visible tooltips.

## Examples

### In JSX with ref

```tsx
setup() {
  let btnEl: Element
  return { btnEl }
},
component({ setup }) {
  return (
    <button ref={(el) => {
      tooltip(el, {
        content: 'Delete this item',
        position: 'bottom',
        delay: 300,
      })
    }}>
      Delete
    </button>
  )
}
```

### Conditional tooltip (e.g. collapsed sidebar)

```ts
tooltip(navItem, {
  content: 'Dashboard',
  position: 'right',
  showWhen: () => !sidebarOpen(),
})
```

### Custom styling

```tsx
// Via directive
tooltip(el, {
  content: 'Custom styled',
  borderRadius: '0px',
  styles: { tooltip: 'background: var(--lf-color-surface); border: 1px solid var(--lf-color-border); color: var(--lf-color-text);' },
  class: 'my-tooltip',
})

// Via component
<Tooltip
  content="Custom styled"
  borderRadius="0px"
  styles={{ tooltip: 'background: var(--lf-color-surface);' }}
  class="my-tooltip"
>
  <span>Hover me</span>
</Tooltip>
```

### Click-to-dismiss (no auto-hide on mouse-out)

```ts
tooltip(el, {
  content: 'Click me to dismiss',
  dismissOn: 'click',
})
```

### Rich content tooltip

```ts
const tooltipNode = document.createElement('div')
tooltipNode.innerHTML = '<strong>Name:</strong> Alice<br><em>Role: Admin</em>'

tooltip(avatarEl, { content: tooltipNode, position: 'right' })
```

## Notes

- `tooltip()` is called on first invocation (lazily) — `injectDefaultStyles()` runs automatically.
- `showWhen` is a guard function evaluated on every `pointerenter` — not cached. Perfect for dynamic conditions.
- The `Tooltip` component wraps children in a `display:contents` span to avoid layout impact.
- Tooltips are positioned using the `positionTooltip()` function which reads viewport bounds.
