# @liteforge/tooltip

## 0.3.0

### Minor Changes

- Add `triggerOnFocus` option and `hideAllTooltips()` utility

  - New `triggerOnFocus?: boolean` option (default: `true`) — set to `false` to prevent focus/blur events from showing the tooltip. Useful for elements that receive programmatic focus-return (e.g. after a modal closes).
  - New `hideAllTooltips()` export — imperatively removes all visible tooltip elements from the DOM.

## 0.2.1

### Patch Changes

- Tooltip now fades out gracefully on hide instead of being removed immediately.
  The element is nulled right away (preventing re-show during transition) and
  removed from the DOM after the 150ms CSS opacity transition completes.

## 0.2.0

### Minor Changes

- New package: `@liteforge/tooltip`

  Portal-based tooltip primitive that renders directly on `<body>` to avoid `overflow:hidden` / z-index clipping from parent containers.

  **API:**

  - `tooltip(el, input)` — imperative function, attaches to any `HTMLElement` via ref-callback, returns a cleanup function
  - `Tooltip(props)` — plain factory wrapper for JSX usage (`display:contents` span)
  - `showWhen: () => boolean` — conditional guard (e.g. only show when sidebar is collapsed)
  - `position: 'top' | 'right' | 'bottom' | 'left' | 'auto'` — auto flips to avoid viewport edges
  - `delay`, `offset`, `disabled` options
  - CSS variables for full theming, `::before` arrow via `[data-position]`
  - Zero runtime dependencies
