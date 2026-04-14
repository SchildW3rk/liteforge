# @liteforge/theme

## 0.3.2

### Patch Changes

- feat(@liteforge/theme): add css/tailwind export for Tailwind v4 @theme registration (#53)

  Adds `@liteforge/theme/css/tailwind` — a CSS file that registers all `--lf-color-*`
  tokens in Tailwind v4's `@theme` block, enabling utility classes like `text-lf-accent`,
  `bg-lf-surface`, `border-lf-border` etc.

  ```css
  @import "@liteforge/theme/css/base";
  @import "@liteforge/theme/css/tailwind";
  ```

## 0.3.0

### Minor Changes

- 009ac82: feat(@liteforge/theme): colorScheme() signal for reactive dark/light mode toggle (#52)

  Export `colorScheme()` — a singleton `Signal<'light' | 'dark'>` that:

  - Initialises from `localStorage` → `prefers-color-scheme` → `'light'`
  - Applies `data-theme` to `<html>` synchronously on first call (no FOUC)
  - Persists every change to `localStorage` under `'lf-theme'`
  - Works alongside Tailwind v3 `dark:` variant (add a `.dark` class toggle via `effect()`)

  ```ts
  import { colorScheme } from "@liteforge/theme";

  const scheme = colorScheme();
  scheme(); // 'light' | 'dark'
  scheme.set("dark");
  scheme.update((s) => (s === "dark" ? "light" : "dark")); // toggle
  ```

## 0.2.0

### Minor Changes

- New package: `@liteforge/theme` — shared design-token CSS system

  Provides primitive and semantic CSS variables used by all LiteForge UI packages.

  ```css
  /* Import everything */
  @import "@liteforge/theme/css";

  /* Or selectively */
  @import "@liteforge/theme/css/base"; /* semantic tokens */
  @import "@liteforge/theme/css/dark"; /* dark mode overrides */
  @import "@liteforge/theme/css/reset"; /* optional CSS reset */
  ```

  Tokens cover: color palette (surface, accent, danger, warning, success),
  typography scale, spacing, border-radius, shadows, z-index, and transitions.
  Dark mode via `[data-theme="dark"]`, `.dark`, and `@media (prefers-color-scheme: dark)`.
