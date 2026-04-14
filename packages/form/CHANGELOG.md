# @liteforge/form

## 0.3.0

### Minor Changes

- feat(@liteforge/form): Input and Textarea field-bound components (#39)

  Add `Input` and `Textarea` factory functions that accept a `field` prop (`FieldResult<string>`) and automatically wire up `value ← field.value()`, `oninput → field.set()`, `onblur → field.touch()`, and reactive `aria-invalid`. Both components forward all standard HTML attributes.

  feat(@liteforge/router): useEditParam helper (#40)

  Add `useEditParam(param?)` composable that returns `{ editId: number | null, isEdit: boolean }`. Guards against absent, empty, non-numeric, NaN, zero, and negative param values. Default param name is `'id'`.

  feat(@liteforge/table): CellContext + columnHelper (#36)

  Migrate `cell` renderer from `(value, row)` positional args to a single `CellContext<T, TValue>` object with `getValue`, `renderValue`, `row`, `column`, `rowIndex`, `isSelected`. Add `columnHelper<T>()` for per-column type inference. Column container type is now `ColumnDef<T, any>[]` for `exactOptionalPropertyTypes` compat.

## 0.2.0

### Minor Changes

- Batch #21-#28: query callbacks, form useField, Show no-arg children, typed ColumnDef, client refactor

  - **@liteforge/query** (#21): `onSuccess`/`onError` callbacks on `CreateQueryOptions`; (#22) `defaultEnabled` on `QueryPluginOptions`; fix `QueryKey` array serialization
  - **@liteforge/form** (#24): `form.field()` two overloads (typed path vs string), `useField()` composable exported
  - **@liteforge/runtime** (#26): `Show` `children` now accepts `() => Node` (no-arg) in addition to `(value) => Node`
  - **@liteforge/table** (#27): `ColumnDef<T, K>` generic over key type — `cell` value parameter is typed `T[K]` for real fields, `undefined` for virtual columns (`_prefix`)
  - **@liteforge/store** (#25): Declaration Merging JSDoc for typed `use('store:*')` pattern
  - **@liteforge/devtools**: `PanelPosition` gains `'bottom-right'`; `DevToolsStore`/`DevToolsStoreMap` types moved to `types.ts` and properly exported; `stores` config option on `DevToolsConfig`
  - **@liteforge/admin**: `buildAdminRoutes` gains `prefix` and `layout` options
