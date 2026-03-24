# @liteforge/tooltip

Lightweight tooltip directive and component for LiteForge.

## Installation

```bash
npm install @liteforge/tooltip @liteforge/core
```

Peer dependency: `@liteforge/core >= 0.1.0`

## Overview

`@liteforge/tooltip` provides two APIs:

- **`tooltip(el, input)`** — imperative directive, attach to any `HTMLElement`
- **`Tooltip(props)`** — JSX component wrapper, wraps a child element without affecting layout

Tooltips are rendered into `document.body`, positioned automatically, and removed on hide. Default styles are injected once on first use and can be disabled via `unstyled` mode.

---

## tooltip() directive

Call `tooltip(el, options)` with an `HTMLElement` and a string or options object. It returns a cleanup function that removes all event listeners.

```ts
import { tooltip } from '@liteforge/tooltip'
import { onCleanup } from '@liteforge/core'

// Inside createComponent setup or mounted():
const el = document.querySelector('#my-button') as HTMLElement
const cleanup = tooltip(el, 'Click to save your changes')
onCleanup(cleanup)
```

### String shorthand

```ts
tooltip(el, 'Simple tooltip text')
```

### Options object

```ts
tooltip(el, {
  content: 'Tooltip text',      // required — string or Node
  position: 'top',              // 'top' | 'right' | 'bottom' | 'left' | 'auto'
  delay: 300,                   // ms before tooltip appears
  offset: 8,                    // px gap between tooltip and target
  disabled: false,              // disable tooltip entirely
  triggerOnFocus: true,         // also show on focus/blur (default: true)
  showWhen: () => !menuOpen(),  // guard — tooltip only shows when this returns true
})
```

### In JSX via ref

```tsx
import { createComponent, onCleanup } from 'liteforge'
import { tooltip } from '@liteforge/tooltip'

export const SaveButton = createComponent({
  component() {
    return (
      <button
        ref={(el) => {
          const cleanup = tooltip(el, { content: 'Save your work', position: 'bottom' })
          onCleanup(cleanup)
        }}
      >
        Save
      </button>
    )
  }
})
```

---

## Tooltip component

`Tooltip` is a plain factory function that wraps a child in a `display: contents` span so layout is unaffected. Accepts all `TooltipOptions` as props plus a `children` node.

```tsx
import { Tooltip } from '@liteforge/tooltip'

const el = Tooltip({
  content: 'Open settings',
  position: 'right',
  children: settingsButton
})
```

In JSX:

```tsx
import { Tooltip } from '@liteforge/tooltip'

<Tooltip content="Open settings" position="right">
  <button>
    <SettingsIcon />
  </button>
</Tooltip>
```

---

## Positions

| Value | Description |
|-------|-------------|
| `'top'` | Above the target, horizontally centered |
| `'bottom'` | Below the target, horizontally centered |
| `'left'` | Left of the target, vertically centered |
| `'right'` | Right of the target, vertically centered |
| `'auto'` | Automatically picks the best position (prefers top) |

With `position: 'auto'`, the tooltip measures available viewport space and falls back through `top → bottom → right → left`. The resolved position is set as a `data-position` attribute for CSS arrow targeting.

---

## showWhen pattern

`showWhen` is a guard function evaluated on every `pointerenter`. Use it to suppress tooltips conditionally — for example, when a sidebar is expanded and items already have visible labels:

```tsx
import { createComponent } from 'liteforge'
import { tooltip } from '@liteforge/tooltip'

export const Nav = createComponent({
  setup({ use }) {
    const ui = use('ui')
    return { ui }
  },
  component({ setup }) {
    const { ui } = setup
    return (
      <nav>
        <button
          ref={(el) => {
            tooltip(el, {
              content: 'Dashboard',
              position: 'right',
              showWhen: () => !ui.sidebarOpen(),
            })
          }}
        >
          <DashboardIcon />
        </button>
      </nav>
    )
  }
})
```

---

## hideAllTooltips

Immediately removes all visible tooltip elements from the DOM. Useful when a modal or overlay opens and any lingering tooltip should disappear:

```ts
import { hideAllTooltips } from '@liteforge/tooltip'

modal.open()
hideAllTooltips()
```

---

## Styling

Default styles are injected automatically on first `tooltip()` call. To opt out and provide your own CSS:

```ts
import { tooltip } from '@liteforge/tooltip'

tooltip(el, { content: 'Hello', disabled: false })  // styles already injected

// Or manually:
import { injectDefaultStyles } from '@liteforge/tooltip'
injectDefaultStyles()
```

### CSS custom properties

```css
:root {
  --lf-tooltip-bg: rgba(30, 30, 46, 0.97);
  --lf-tooltip-color: #cdd6f4;
  --lf-tooltip-border-radius: 6px;
  --lf-tooltip-font-size: 13px;
  --lf-tooltip-padding: 5px 10px;
  --lf-tooltip-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  --lf-tooltip-max-width: 260px;
  --lf-tooltip-z-index: 9999;
  --lf-tooltip-arrow-size: 5px;
}
```

BEM classes: `.lf-tooltip`, `.lf-tooltip--visible`, `[data-position="top|bottom|left|right"]`

---

## API

### tooltip(el, input)

```ts
tooltip(el: HTMLElement, input: string | TooltipOptions): () => void
```

Attaches tooltip behavior to `el`. Returns a cleanup function that removes all event listeners and hides the tooltip.

### Tooltip(props)

```ts
Tooltip(props: TooltipOptions & { children: Node }): Node
```

Wraps `children` in a `display: contents` span and attaches tooltip behavior to the first `HTMLElement` child.

### positionTooltip(tooltipEl, target, position, offset)

```ts
positionTooltip(
  tooltipEl: HTMLElement,
  target: HTMLElement,
  position: TooltipPosition,
  offset: number
): void
```

Low-level positioning function. Measures the target and tooltip, resolves `'auto'` positions, clamps to the viewport, and sets `top`/`left` style properties.

### hideAllTooltips()

```ts
hideAllTooltips(): void
```

Immediately removes all `.lf-tooltip` elements from the DOM.

### TooltipOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `content` | `string \| Node` | required | Tooltip content |
| `position` | `TooltipPosition` | `'top'` | Preferred position |
| `delay` | `number` | `0` | Show delay in ms |
| `offset` | `number` | `8` | Gap between tooltip and target in px |
| `disabled` | `boolean` | `false` | Disable the tooltip |
| `showWhen` | `() => boolean` | — | Guard evaluated on each pointerenter |
| `triggerOnFocus` | `boolean` | `true` | Also show on focus/blur events |

---

## Types

```ts
import type {
  TooltipPosition,
  TooltipOptions,
  TooltipInput,
  TooltipProps
} from '@liteforge/tooltip'
```

## License

MIT
