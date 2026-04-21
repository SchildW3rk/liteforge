/**
 * Internal-only exports. Not re-exported from `index.ts`.
 *
 * Used by test files that need to inspect builder state without adding
 * `__getState` to the public `FullstackAppBuilder` surface.
 */

import type { LiteForgePlugin } from '@liteforge/runtime'
import type { ModulesMap } from './types.js'
import type { OakBunPluginLike } from './define-app.js'

/** Symbol-keyed accessor for builder internals. Test-only. */
export const BUILDER_STATE = Symbol.for('@liteforge/server.builder-state')

/**
 * A plugin passed to `.use()` can be either:
 * - an eager `LiteForgePlugin` object — installed everywhere
 * - a lazy factory `() => LiteForgePlugin` — only evaluated in `.mount()`
 *   (skipped on the server-side terminal methods `.listen()`, `.dev()`,
 *   `.build()` so browser-only setup code can't crash the server import)
 */
export type LiteForgePluginEntry = LiteForgePlugin | (() => LiteForgePlugin)

export interface BuilderState {
  options: {
    root: object | (() => Node)
    target: string | HTMLElement
    document?: unknown
    context?: Record<string, unknown>
  }
  oakbunPlugins: OakBunPluginLike[]
  liteforgePlugins: LiteForgePluginEntry[]
  modulesMap: ModulesMap | null
  serverModulesCalled: boolean
}
