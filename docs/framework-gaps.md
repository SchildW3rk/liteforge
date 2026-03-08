# Framework Gaps & Future Improvements

## `@liteforge/tooltip` — reactive `showWhen`

**Current behavior:** `showWhen` is evaluated on every `pointerenter`. If the condition becomes `false` while the tooltip is already visible (e.g. a signal changes), the tooltip stays until the next `pointerleave`.

**Workaround (Option A):** Use the cleanup/hide fn returned by `tooltip()` and call it reactively:
```ts
const hideTooltip = tooltip(btn, { content: '...', showWhen: () => !panelOpen() });
effect(() => { if (panelOpen()) hideTooltip(); });
```

**Proper fix (Option B):** When `showWhen` is provided and the tooltip is currently visible, poll or observe the condition and call `hide()` if it flips to `false`:
```ts
// After doShow(), add a watcher — but setInterval is not ideal:
const checkInterval = setInterval(() => {
  if (tooltipEl && opts.showWhen && !opts.showWhen()) hide();
}, 50);
// Clear in hide() and cleanup fn
```
A better approach would be an `effect()` inside `tooltip.ts` when `showWhen` is a signal-reading function — but that creates a dependency on `@liteforge/core` which tooltip currently avoids for zero-dep reasons.

---

## Theme Customizer — Code Theme (v2)

**Idea:** Add a "Code Theme" dropdown to the Theme Customizer panel, separate from the accent color. Preset themes for `--syntax-*` variables:

| Theme | keyword | string | fn | type | number |
|-------|---------|--------|----|------|--------|
| Default | `#a78bfa` | `#34d399` | `#7dd3fc` | `#fcd34d` | `#fbbf24` |
| Catppuccin | `#cba6f7` | `#a6e3a1` | `#89b4fa` | `#f9e2af` | `#fab387` |
| Nord | `#b48ead` | `#a3be8c` | `#88c0d0` | `#ebcb8b` | `#d08770` |
| One Dark | `#c678dd` | `#98c379` | `#61afef` | `#e5c07b` | `#d19a66` |
| GitHub Dark | `#ff7b72` | `#a5d6ff` | `#d2a8ff` | `#ffa657` | `#79c0ff` |

Implementation: add `tcCodeTheme = signal<string>('default')` + a second `effect()` that writes the `--syntax-*` vars. Persist to the same `TC_LS_KEY` object. UI: small `<select>` or pill buttons below the Border Radius row.
