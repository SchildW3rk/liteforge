---
"@liteforge/tooltip": minor
---

feat(tooltip): add `styles`, `class`, `borderRadius`, and `dismissOn` props (#60)

- `styles.tooltip` — inline style string applied to the tooltip element
- `styles.arrow` — stored as `data-arrow-style` attribute (arrow uses `::before`, can't be styled directly)
- `class` — extra CSS class(es) added to the tooltip element
- `borderRadius` — shorthand for `border-radius` inline override (overrides the CSS variable)
- `dismissOn: 'auto' | 'click' | 'manual'` — controls how the tooltip is dismissed:
  - `'auto'` (default): hides on pointerleave + blur + click
  - `'click'`: hides on click only (not on pointerleave/blur — useful for persistent tooltips)
  - `'manual'`: only the returned cleanup function hides the tooltip
- Works with both `tooltip()` directive and `<Tooltip>` component
