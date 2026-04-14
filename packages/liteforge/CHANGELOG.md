# liteforge

## 0.7.12

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.7.1

## 0.7.11

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.7.0

## 0.7.10

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.6.9

## 0.7.9

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.6.8

## 0.7.8

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.6.7

## 0.7.7

### Patch Changes

- Rewrite README to correctly describe umbrella package scope.

  - Clarify that `liteforge` re-exports only `@liteforge/core` + `@liteforge/runtime`
  - Remove incorrect sub-path export documentation (`liteforge/router` etc. do not exist)
  - Add "Install what you need" table listing all `@liteforge/*` packages
  - Update Quick Start and Plugin System examples to use correct `@liteforge/*` imports

## 0.7.6

### Patch Changes

- fix: bump @liteforge/runtime dependency to 0.6.6

## 0.7.5

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.6.6

## 0.7.4

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.6.5

## 0.7.3

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.6.4

## 0.7.1

### Patch Changes

- Updated dependencies [627a0e8]
  - @liteforge/runtime@0.6.3

## 0.7.0

### Minor Changes

- Dissolve umbrella meta-package. `liteforge` now re-exports only `@liteforge/core` and `@liteforge/runtime` — the two foundational primitives needed in every app.

  All other packages (`@liteforge/router`, `@liteforge/store`, `@liteforge/query`, `@liteforge/form`, `@liteforge/table`, `@liteforge/modal`, `@liteforge/toast`, `@liteforge/tooltip`, `@liteforge/calendar`, `@liteforge/i18n`, `@liteforge/client`, `@liteforge/admin`) are standalone and should be imported directly:

  ```ts
  // Before (still works via vite aliases):
  import { createRouter } from "liteforge/router";

  // Preferred going forward:
  import { createRouter } from "@liteforge/router";
  ```

  The `liteforge/jsx-runtime` entry point is retained for the Vite JSX transform.

## 0.6.8

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.6.2
  - @liteforge/admin@3.0.0
  - @liteforge/client@3.0.0
  - @liteforge/devtools@3.0.0
  - @liteforge/i18n@2.0.0
  - @liteforge/modal@3.1.0
  - @liteforge/query@3.0.0
  - @liteforge/router@0.4.2
  - @liteforge/toast@2.0.0

## 0.6.7

### Patch Changes

- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @liteforge/calendar@0.3.0
  - @liteforge/modal@3.1.0
  - @liteforge/router@0.4.2
  - @liteforge/runtime@0.6.1
  - @liteforge/admin@3.0.0
  - @liteforge/client@3.0.0
  - @liteforge/devtools@3.0.0
  - @liteforge/i18n@2.0.0
  - @liteforge/query@3.0.0
  - @liteforge/toast@2.0.0

## 0.6.5

### Patch Changes

- Add Vite 7 to peer dependency range (`^5.0.0 || ^6.0.0 || ^7.0.0`)
- Updated dependencies
  - @liteforge/vite-plugin@0.4.3

## 0.6.4

### Patch Changes

- Add `jsx-runtime` for `jsxImportSource` support; remove HMR console logs

  **`@liteforge/runtime`**

  - Add `jsx-runtime` entry point — re-exports `h` as `jsx`/`jsxs`/`jsxDEV` and `Fragment` for the `react-jsx` transform target
  - Export `./jsx-runtime` and `./jsx-dev-runtime` in `package.json`
  - Remove all `[LiteForge HMR]` console.log statements from `hmr.ts` and `app.ts`

  **`liteforge`**

  - Add `liteforge/jsx-runtime` barrel that re-exports from `@liteforge/runtime/jsx-runtime`
  - Export `./jsx-runtime` and `./jsx-dev-runtime` in `package.json`

  Users can now configure `tsconfig.json` with:

  ```json
  { "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "liteforge" } }
  ```

  No manual `h`/`Fragment` imports needed, no TypeScript errors.

- Updated dependencies
  - @liteforge/runtime@0.6.0
  - @liteforge/admin@3.0.0
  - @liteforge/client@3.0.0
  - @liteforge/devtools@3.0.0
  - @liteforge/i18n@2.0.0
  - @liteforge/modal@3.0.0
  - @liteforge/query@3.0.0
  - @liteforge/router@0.4.1
  - @liteforge/toast@2.0.0

## 0.6.3

### Patch Changes

- feat(runtime): Global Error Boundary

  New `createErrorBoundary()` system for centralized error capture and display:

  - `AppConfig.errorComponent` — custom fallback UI for all unhandled errors
  - `AppConfig.onError` — observer hook (Sentry, logging) called before any UI
  - `RouteDefinition.errorComponent` — per-route fallback rendered inside the outlet
  - Built-in DEV error page: error type badge, message, stack trace with highlighted first non-internal frame, Retry (reload) + Go Home buttons
  - Built-in PROD error page: minimal "Something went wrong." — no stack, no internals
  - Stack trace parser: V8 + Firefox/Safari formats, strips Vite `?t=` HMR timestamps
  - Global listeners: `unhandledrejection` + `window.error` caught after mount

  router: per-route `errorComponent` wired into RouterOutlet for render and lazy-load errors.

- Updated dependencies
  - @liteforge/runtime@0.5.0
  - @liteforge/router@0.4.1
  - @liteforge/admin@2.0.0
  - @liteforge/client@2.0.0
  - @liteforge/devtools@2.0.0
  - @liteforge/i18n@1.0.0
  - @liteforge/modal@2.0.0
  - @liteforge/query@2.0.0
  - @liteforge/toast@1.0.0

## 0.6.2

### Patch Changes

- Updated dependencies
  - @liteforge/router@0.4.0
  - @liteforge/admin@1.0.0

## 0.6.1

### Patch Changes

- Fix PluginRegistry augmentations not flowing through liteforge/\* subpath imports. Each barrel file (liteforge/toast, liteforge/router, etc.) now correctly activates the use() return type when imported.

## 0.6.0

### Minor Changes

- feat(toast): add @liteforge/toast — signals-based toast notification package

  Imperative API (`toast.success/error/warning/info/promise/dismiss/dismissAll`),
  signal store, `ToastProvider` DOM component with 6 positions, pause-on-hover,
  auto-dismiss, CSS-first with `?url` import pattern, `toastPlugin()` with
  `PluginRegistry` declaration merging. Available as `liteforge/toast`.

  Also fixes `ResourceDefinition<any>` in `@liteforge/admin` to correctly handle
  callback contravariance when passing typed resources to `buildAdminRoutes`.

### Patch Changes

- Updated dependencies
  - @liteforge/toast@0.2.0
  - @liteforge/admin@0.2.1

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
