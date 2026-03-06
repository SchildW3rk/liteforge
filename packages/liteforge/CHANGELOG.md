# liteforge

## 0.5.1

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @liteforge/admin@0.2.0
  - @liteforge/modal@1.1.0
  - @liteforge/table@0.2.0
  - @liteforge/calendar@0.2.0
  - @liteforge/runtime@0.4.3
  - @liteforge/vite-plugin@0.4.2
  - @liteforge/client@1.0.0
  - @liteforge/devtools@1.0.0
  - @liteforge/i18n@0.2.0
  - @liteforge/query@1.0.0
  - @liteforge/router@0.3.0

## 0.5.0

### Minor Changes

- feat(@liteforge/i18n): new signals-based internationalization plugin

  - Lazy-loaded locale files via async `load()` function
  - Dot-notation keys (`t('nav.home')`)
  - `{param}` interpolation
  - Pipe-based pluralization: `singular | plural` (2-part) and `zero | one | many` (3-part)
  - Fallback locale — loaded in parallel at startup, transparently used for missing keys
  - localStorage persistence with configurable key
  - No re-render on locale switch — only text nodes that call `t()` update
  - Async plugin install (`i18nPlugin`) awaits initial locale before app mounts (prevents FOUC)
  - Full TypeScript strictness, zero external dependencies

  feat(liteforge): add `liteforge/i18n` sub-path export

  patch(@liteforge/runtime): support async plugin `install()` return value (`Promise<void | (() => void)>`)

### Patch Changes

- Updated dependencies
  - @liteforge/i18n@0.2.0
  - @liteforge/runtime@0.4.2
  - @liteforge/client@1.0.0
  - @liteforge/devtools@1.0.0
  - @liteforge/modal@1.0.0
  - @liteforge/query@1.0.0
  - @liteforge/router@0.3.0
