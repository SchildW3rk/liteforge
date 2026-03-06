# @liteforge/table

## 0.2.0

### Minor Changes

- Migrate CSS from injected TS strings to real CSS files

  Each UI package now ships a `css/styles.css` file importable directly:

  ```css
  @import "@liteforge/modal/styles";
  @import "@liteforge/table/styles";
  @import "@liteforge/calendar/styles";
  @import "@liteforge/admin/styles";
  ```

  The `injectDefaultStyles()` function now creates a `<link>` element
  using a `?url` import so bundlers copy and hash the asset correctly
  in production builds. The `unstyled: true` option continues to work.

## 0.1.1

### Patch Changes

- fix: relax generic constraints and fix JSX component prop passing

  **@liteforge/runtime**

  - `createComponent<TProps>()` now accepts any interface as props type — no longer requires an index signature (`Record<string, unknown>`). Typed props with optional properties work correctly under `exactOptionalPropertyTypes: true`.
  - Added `ComponentFactoryInternal` export for internal lifecycle access (used by `h()`, `app.ts`, `control-flow.ts`)
  - `ComponentFactory` call signature returns `Node` (= `JSX.Element`) for proper JSX tag usage

  **@liteforge/vite-plugin**

  - JSX props on PascalCase (component) tags are no longer wrapped in getter functions. Only HTML element props get getter-wrapped for signal reactivity. This fixes runtime errors like `props.rows.map is not a function` when passing arrays or objects as component props.

  **@liteforge/router**

  - `RouteComponent` and `LazyComponent` type constraints relaxed to `object` (consistent with runtime change)

  **@liteforge/table**

  - `cell` and `headerCell` column definition return type widened to `Node | Element`
