---
"create-liteforge": patch
---

Remove unused `@liteforge/modal` from scaffold template

The modal plugin was registered but never used in the template. Removed from `main.tsx` and `package.json` to keep the scaffold lean.
