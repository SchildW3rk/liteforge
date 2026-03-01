# @liteforge/vite-plugin

## 0.2.0

### Minor Changes

- 20f3b24: Component-level HMR with state preservation

  - Components hot-replace without full page reload
  - `setup()` signals preserve their values (form inputs, toggles, counters)
  - Global stores preserve state (singleton registry pattern)
  - Router keeps current route
  - Scroll position maintained
  - DevTools stays open

  Implementation:

  - Vite plugin injects `__hmrId` into `createComponent()` calls
  - Runtime tracks mounted instances and re-renders with new component function
  - `setup()` result (signals) passed to new render, preserving reactivity

### Patch Changes

- b41d056: feat(hmr): component registry architecture for reliable hot module replacement

  Replaces the signal-driven HMR approach with a simpler component registry:

  - Every `createComponent()` call registers its definition in a `componentRegistry` Map
  - On Vite HMR, the module is re-evaluated → registry updated with latest code
  - `fullRerender()` tears down and remounts the app; all factories read the latest
    definition at call-time, including `setup()`, `component()`, `mounted()` etc.
  - Stores and router survive every re-render as module-level singletons
  - Layout edits now update instantly without a page reload
  - `setup()`-defined values (table columns, signals) update correctly after HMR
  - Removed ~370 lines of complexity: instance tracking, outlet transplanting,
    layout detection, `HotComponentState`, `createHotComponent`, `clearHotComponents`
  - `fullRerender()` is debounced 50 ms and preserves scroll position

  **Breaking (internal):** `HMRHandler` no longer has a `components` field.
  The `HMRInstance` type alias has been removed. The `HMRHandler.handleUpdate`
  method was renamed from `.update()` in the vite-plugin generated code.

## 0.1.1

### Patch Changes

- 754b399: Add HMR (Hot Module Replacement) support

  Browser now auto-reloads when saving `.tsx`/`.jsx` files during development. This is Level 1 HMR - it triggers a page reload to pick up changes immediately, eliminating the need for manual browser refresh.

  **vite-plugin changes:**

  - HMR boundary code now includes a callback that notifies the global `__LITEFORGE_HMR__` handler
  - Module ID is passed to identify which module was updated
  - Source maps use empty mappings to preserve Vite's module graph

  **runtime changes:**

  - New `hmr.ts` module with `HMRHandler` interface and global registry
  - `initHMR()` initializes the HMR handler on `window.__LITEFORGE_HMR__`
  - `createApp()` integrates with HMR for potential full-app re-render

  Future work (Level 2 HMR): Component-level updates that preserve signal state.
