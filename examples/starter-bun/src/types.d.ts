/**
 * Project-wide type augmentations for LiteForge.
 *
 * Written once per project. After this file is part of the TS program,
 * `use('server')` returns the typed RPC proxy in every component, and
 * server-fn handlers see the resolved ctx without explicit annotation.
 */

import type { app } from './app.js'
import type { ServerOf, BaseCtx } from '@liteforge/server'

declare module '@liteforge/runtime' {
  interface PluginRegistry {
    server: ServerOf<typeof app>
  }
}

// Components import `use` via the `liteforge` umbrella, not directly from
// `@liteforge/runtime`. TypeScript's module augmentation matches by string,
// so we mirror the augmentation on the umbrella path too.
declare module 'liteforge' {
  interface PluginRegistry {
    server: ServerOf<typeof app>
  }
}

// Explicit ctx shape — avoids self-reference circularity.
// Keep in sync with the `context` option in defineApp(...) if it's ever added.
declare module '@liteforge/server' {
  interface ServerCtxRegistry {
    ctx: BaseCtx
  }
}
