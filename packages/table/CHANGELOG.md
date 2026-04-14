# @liteforge/table

## 2.2.0

### Minor Changes

- feat(@liteforge/form): Input and Textarea field-bound components (#39)

  Add `Input` and `Textarea` factory functions that accept a `field` prop (`FieldResult<string>`) and automatically wire up `value ← field.value()`, `oninput → field.set()`, `onblur → field.touch()`, and reactive `aria-invalid`. Both components forward all standard HTML attributes.

  feat(@liteforge/router): useEditParam helper (#40)

  Add `useEditParam(param?)` composable that returns `{ editId: number | null, isEdit: boolean }`. Guards against absent, empty, non-numeric, NaN, zero, and negative param values. Default param name is `'id'`.

  feat(@liteforge/table): CellContext + columnHelper (#36)

  Migrate `cell` renderer from `(value, row)` positional args to a single `CellContext<T, TValue>` object with `getValue`, `renderValue`, `row`, `column`, `rowIndex`, `isSelected`. Add `columnHelper<T>()` for per-column type inference. Column container type is now `ColumnDef<T, any>[]` for `exactOptionalPropertyTypes` compat.

## 2.1.2

### Patch Changes

- Fix `h.virtual()` not assignable to `ColumnDef<T, any>[]` with `exactOptionalPropertyTypes: true`.

  `ColumnDef<T, never>` was not assignable to `ColumnDef<T, any>[]` because `exactOptionalPropertyTypes` breaks covariance on the optional `cell` property — `CellContext<T, never>` is not compatible with `CellContext<T, any>` as a parameter type.

  `h.virtual()` now returns `ColumnDef<T, any>` instead of `ColumnDef<T, never>`. The `never` type for `getValue()` is preserved inside the `cell` callback (inferred from the `Omit<ColumnDef<T, never>, 'key'>` parameter), so `getValue()` is still a compile-time error inside virtual cell renderers.

## 2.1.1

### Patch Changes

- Fix `ColumnDef<T, K>` not assignable to `columns` array with `exactOptionalPropertyTypes: true`.

  `TableOptions.columns` is now typed as `ColumnDef<T, any>[]` instead of `ColumnDef<T>[]`. With `exactOptionalPropertyTypes`, a narrower `ColumnDef<T, string>` was not assignable to `ColumnDef<T, string | number | ...>` because the optional `cell` property's `CellContext<T, string>` parameter type was incompatible with `CellContext<T, string | number | ...>`.

  The `any` is intentional — the array is a heterogeneous container for differently-typed columns. Type safety lives in `columnHelper<T>().field()` and `.virtual()`, not in the array element type.

## 2.1.0

### Minor Changes

- Add `columnHelper<T>()` — type-safe column builder with narrowed `getValue()`.

  The root problem: when column definitions are placed in a `ColumnDef<T>[]` array, TypeScript cannot infer a literal type for `key`, so `getValue()` returns `T[keyof T]` — the union of all field types. `columnHelper` solves this by binding `K` and `TValue` in a single typed call _before_ the array is created.

  ```ts
  const h = columnHelper<Customer>();

  createTable<Customer>({
    columns: [
      h.field("email", { cell: ({ getValue }) => <span>{getValue()}</span> }),
      //                                                   ^ string | null  ✓
      h.field("total", {
        cell: ({ getValue }) => <span>{getValue().toFixed(2)}</span>,
      }),
      //                                                   ^ number  ✓
      h.virtual("_actions", { cell: ({ row }) => <button>{row.id}</button> }),
      //  getValue() is typed as () => never — calling it is a compile-time error ✓
    ],
  });
  ```

  - `h.field(key, def)` — binds a real field key `K extends keyof T`; `getValue()` returns `T[K]`
  - `h.virtual(key, def)` — for virtual (`_`-prefix) columns; `getValue()` is `() => never`
  - Both return `ColumnDef<T>` and are directly assignable to `ColumnDef<T>[]`
  - No breaking changes — plain object syntax without `columnHelper` continues to work

## 2.0.0

### Major Changes

- **Breaking:** `cell(value, row)` → `cell(info: CellContext<T, TValue>)`

  Every `cell` renderer now receives a single `CellContext` object instead of positional parameters. This solves the `TValue` inference problem fundamentally — no tuple-inference tricks, no currying, no `col<T>()` helper needed.

  ```ts
  // Before:
  { key: 'email', cell: (v, row) => <span>{v as string}</span> }

  // After — fully typed, no cast:
  { key: 'email', cell: ({ getValue, row }) => <span>{getValue()}</span> }
  //                                                   ^ string | null ✓
  ```

  **`CellContext<T, TValue>` properties:**

  - `getValue()` — cell value typed to `T[key]`; `undefined` for virtual (`_`-prefix) columns
  - `renderValue()` — null-safe `getValue`, returns `null` instead of `undefined`
  - `row` — full row object of type `T`
  - `column` — `{ key, header, width }`
  - `rowIndex` — 0-based index in the current paginated view
  - `isSelected` — whether this row is currently selected

  `createTable` is no longer curried — `createTable<T>({...})` works directly again.

  `col<T>()` is deprecated and will be removed in the next major version.

  **Migration:** Replace every `cell: (v, row) =>` with `cell: ({ getValue, row }) =>` and replace `v` with `getValue()`.

## 1.0.0

### Major Changes

- **Breaking:** `createTable<T>(options)` → `createTable<T>()(options)` — curried API for correct per-column type inference.

  The single-call form `createTable<T, C>(options)` required TypeScript to infer `T` and `C` simultaneously. Because `C`'s constraint (`ColTuple<T, C>`) depends on `T`, this created an inference cycle that caused TypeScript to lose `T` entirely — `row.id` stopped resolving, `cell(v)` became `any`.

  The curried form fixes `T` in the first call so `C` can be resolved per-element in the second call without any cycle:

  ```ts
  // Before (broken with complex column types):
  createTable<Customer>({ columns: [...] })

  // After:
  createTable<Customer>()({ columns: [...] })
  ```

  `col<T>()` remains available for pre-assigned column arrays that TypeScript has already widened.

## 0.5.2

### Patch Changes

- Fix `cell(v)` type inference via self-referential `ColTuple<T, C>` constraint.

  The previous `[...C]` spread approach did not work inside nested object properties — TypeScript only triggers tuple inference when the spread is on a top-level parameter type, not on a property within an options object.

  The correct mechanism is a self-referential constraint:

  ```ts
  type ColTuple<T, A extends readonly unknown[]> = {
    [I in keyof A]: A[I] extends ColumnDef<T, infer K> ? ColumnDef<T, K> : never
  }

  function createTable<
    T,
    C extends readonly ColumnDef<T, keyof T | (string & {})>[] & ColTuple<T, C>,
  >(options: { columns: C | (() => C), ... }): TableResult<T>
  ```

  Because `C extends ColTuple<T, C>` is self-referential, TypeScript is forced to resolve each element's `K` individually to satisfy the constraint, rather than widening the whole array. `expectTypeOf` tests confirm `v` is exactly `T[K]` per column — not a union.

## 0.5.1

### Patch Changes

- Fix per-element `cell(v)` type inference via `[...C]` tuple spread.

  The previous `C extends ReadonlyArray<ColumnDef<T, ...>>` constraint didn't actually produce per-element inference — TypeScript still inferred `C` as a single array type, leaving `v` as `any`. The `[...C]` spread on the `columns` parameter type forces TypeScript into tuple inference mode, where each element's `K` is resolved independently.

  Plain inline arrays now produce precisely typed `cell` callbacks with no helpers or casts:

  ```ts
  createTable<User>({
    columns: [
      { key: "email", cell: (v) => <span>{v}</span> }, // v: string  ✓
      { key: "id", cell: (v) => <span>{v}</span> }, // v: number  ✓
    ],
  });
  ```

  Note: tuple inference only applies to inline array literals. A pre-assigned `const cols = [...]` variable is already widened by TypeScript — use `col<T>()` in that case.

## 0.5.0

### Minor Changes

- `createTable` now infers `cell(v)` type per column element without any helper.

  Plain inline object arrays just work — no `col()` wrapper, no casts:

  ```ts
  createTable<Customer>({
    columns: [
      { key: "email", cell: (v) => <span>{v ?? "—"}</span> },
      //                     ^ v: string | null  ✓
      { key: "age", cell: (v) => <span>{v.toFixed(0)}</span> },
      //                     ^ v: number  ✓
    ],
  });
  ```

  `createTable` is now generic over the column array `C` so TypeScript infers each element's `K` individually instead of widening to `keyof T | string` across the whole array. The `col<T>()` helper remains available for backwards compatibility but is no longer needed.

## 0.4.1

### Patch Changes

- Fix `col<T>()` incompatibility with `exactOptionalPropertyTypes: true` (TS2375).

  The helper now returns `ColumnDef<T>` (via `unknown` cast) instead of the narrower `ColumnDef<T, K>`, making it directly assignable to `columns: ColumnDef<T>[]` regardless of `exactOptionalPropertyTypes`. The `K` parameter is still inferred during authoring so `cell(v)` remains precisely typed.

## 0.4.0

### Minor Changes

- Add `col<T>()` column definition helper for per-column type inference.

  Without the helper, `columns: ColumnDef<T>[]` erases the `K` type parameter, causing `cell(v)` to receive a union of all `T` field types instead of the specific `T[K]`. The `col<T>()` helper preserves `K` without any breaking changes — existing column definitions continue to work as-is.

  ```ts
  const c = col<Customer>();
  createTable<Customer>({
    columns: [
      c({ key: "email", cell: (v) => <span>{v ?? "—"}</span> }),
      //                              ^ v: string | null  ✓
    ],
  });
  ```

## 0.3.1

### Patch Changes

- Fix pagination select width and add scoped CSS design tokens.

  - `width: auto` + `min-width: fit-content` on `.lf-table-pagination-sizes` prevents host CSS resets from stretching the select to full width (#30)
  - Added scoped design tokens on `.lf-table-container` for per-instance theming without BEM overrides: `--lf-table-font-size`, `--lf-table-border-color`, `--lf-table-header-bg`, `--lf-table-header-color`, `--lf-table-cell-padding`, `--lf-table-row-hover-bg`, `--lf-table-row-selected-bg`, `--lf-table-empty-color`, `--lf-table-pagination-gap`, `--lf-table-pagination-size-width` (#31)

## 0.3.0

### Minor Changes

- Batch #21-#28: query callbacks, form useField, Show no-arg children, typed ColumnDef, client refactor

  - **@liteforge/query** (#21): `onSuccess`/`onError` callbacks on `CreateQueryOptions`; (#22) `defaultEnabled` on `QueryPluginOptions`; fix `QueryKey` array serialization
  - **@liteforge/form** (#24): `form.field()` two overloads (typed path vs string), `useField()` composable exported
  - **@liteforge/runtime** (#26): `Show` `children` now accepts `() => Node` (no-arg) in addition to `(value) => Node`
  - **@liteforge/table** (#27): `ColumnDef<T, K>` generic over key type — `cell` value parameter is typed `T[K]` for real fields, `undefined` for virtual columns (`_prefix`)
  - **@liteforge/store** (#25): Declaration Merging JSDoc for typed `use('store:*')` pattern
  - **@liteforge/devtools**: `PanelPosition` gains `'bottom-right'`; `DevToolsStore`/`DevToolsStoreMap` types moved to `types.ts` and properly exported; `stores` config option on `DevToolsConfig`
  - **@liteforge/admin**: `buildAdminRoutes` gains `prefix` and `layout` options

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
