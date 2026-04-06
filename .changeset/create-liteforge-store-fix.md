---
"create-liteforge": patch
---

Fix scaffold template: add missing `@liteforge/store` dependency and wire `uiStore` in `App.tsx`

- `package.json`: add `@liteforge/store ^0.1.0` (was missing; `stores/ui.ts` imports `defineStore` from it)
- `App.tsx`: import `uiStore` and add a theme-toggle button that uses `effectiveTheme` getter and `setTheme` action, demonstrating the store pattern in the scaffold
- `styles.css`: add `.theme-toggle` button styles
