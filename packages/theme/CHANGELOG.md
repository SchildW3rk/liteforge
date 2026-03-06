# @liteforge/theme

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
