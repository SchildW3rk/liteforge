---
"@liteforge/vite-plugin": patch
"@liteforge/runtime": patch
---

Add HMR (Hot Module Replacement) support

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
