/**
 * defineApp — High-Level Fullstack Facade
 *
 * Superset over `defineApp` from `@liteforge/runtime`: adds `.plugin()` for OakBun
 * plugins, `.serverModules()` for RPC modules, and server-aware terminal methods
 * (`.listen()`, `.build()`, `.dev()`).
 *
 * Phase B: builder chain implemented. Terminal methods throw until Phase F.
 *
 * Layer boundary: this file may import from `@liteforge/runtime` and `oakbun`.
 * The low-level `plugin.ts` / `client.ts` remain dependency-free.
 */

import type { Plugin } from 'oakbun'
import type { AppInstance as RuntimeAppInstance, ComponentFactory, LiteForgePlugin } from '@liteforge/runtime'
import { defineApp as runtimeDefineApp } from '@liteforge/runtime'
import type { AnyServerFn, AnyServerModule, BaseCtx, InferServerApi, LiteForgeServerPlugin, ModulesMap } from './types.js'
import type { ContextMap, ResolveContext } from './context.js'
import { resolveRequestContext } from './context.js'
import { corsHeaders, DEFAULT_RPC_PREFIX, handleRpcRequest, RPC_HEADER } from './plugin.js'
import { renderDocument } from './define-document.js'
import type { DocumentDescriptor } from './define-document.js'
import { serverClientPlugin as createServerClient, type ServerClientOptions } from './client.js'
import { BUILDER_STATE, type BuilderState } from './_internal.js'

// ─── OakBun plugin shape ──────────────────────────────────────────────────────
// Public surface accepts any OakBun Plugin. Generic parameters are erased here
// because the concrete ctx extension of each plugin is opaque to the facade.
export type OakBunPluginLike = Plugin<any, object>

// ─── App config ───────────────────────────────────────────────────────────────

export interface AppConfig<TContext extends ContextMap = ContextMap> {
  /** Root component to render. */
  root: object | (() => Node)

  /** Mount target selector or element. */
  target: string | HTMLElement

  /** Optional static document shell (rendered by `.listen()`/`.build()`/`.dev()`). */
  document?: DocumentDescriptor

  /** Request-scoped context. Values may be static or `(req) => T` resolvers. */
  context?: TContext
}

// ─── Server context derivation ────────────────────────────────────────────────

export type AppServerCtx<TContext extends ContextMap> = BaseCtx & ResolveContext<TContext>

// ─── Required-context inference (Q1 resolution pattern) ──────────────────────

type RequiredCtxOfFn<F> = F extends { readonly _ctx: infer C } ? C : never

type RequiredCtxOfModule<M> = M extends { readonly fns: infer TFns }
  ? { [K in keyof TFns]: RequiredCtxOfFn<TFns[K]> }[keyof TFns]
  : never

type RequiredCtxOfMap<TMap> = {
  [K in keyof TMap]: RequiredCtxOfModule<TMap[K]>
}[keyof TMap]

export interface ServerModulesContextError<TRequired, TProvided> {
  readonly _error: 'App context does not provide all required fields'
  readonly _required: TRequired
  readonly _provided: TProvided
}

type ServerModulesGuard<TAppCtx, TMap extends ModulesMap> =
  TAppCtx extends RequiredCtxOfMap<TMap>
    ? TMap
    : ServerModulesContextError<RequiredCtxOfMap<TMap>, TAppCtx>

type ServerModulesInput<
  TAppCtx,
  TMap extends ModulesMap,
  TAlreadyCalled extends boolean,
> = TAlreadyCalled extends true ? never : ServerModulesGuard<TAppCtx, TMap>

// ─── AppInstance — carries $server and $ctx phantom-types ────────────────────

export interface AppInstance<
  TContext extends ContextMap = Record<never, never>,
  TModules extends ModulesMap = Record<never, never>,
> {
  /** Unmount the app and run plugin cleanups in reverse registration order. */
  unmount(): void

  /** Read a provided value from the app context (proxies to the runtime `use`). */
  use: RuntimeAppInstance['use']

  /**
   * Stop the server started by `.listen()` / `.dev()` and free the port.
   * No-op for `.mount()` (there's no server to stop).
   */
  stop(): Promise<void>

  /**
   * Port the server is listening on, or `null` for `.mount()` / `.build()`.
   * Useful in tests (e.g. when `.listen(0)` lets the OS pick a free port).
   */
  readonly port: number | null

  /**
   * Phantom-type carrier for `use('server')`. Undefined at runtime.
   *
   * Bind into `PluginRegistry` once per project:
   * ```ts
   * declare module '@liteforge/runtime' {
   *   interface PluginRegistry {
   *     server: ServerOf<typeof app>
   *   }
   * }
   * ```
   */
  readonly $server: InferServerApi<LiteForgeServerPlugin<TModules>>

  /**
   * Phantom-type carrier for the resolved request context. Undefined at runtime.
   *
   * Bind into `ServerCtxRegistry` once per project to make server handlers see
   * the resolved context without annotation or generic:
   * ```ts
   * declare module '@liteforge/server' {
   *   interface ServerCtxRegistry {
   *     ctx: CtxOf<typeof app>
   *   }
   * }
   * ```
   */
  readonly $ctx: BaseCtx & ResolveContext<TContext>
}

// ─── FullstackAppBuilder ─────────────────────────────────────────────────────

export interface FullstackAppBuilder<
  TContext extends ContextMap = ContextMap,
  TModules extends ModulesMap = Record<never, never>,
  TServerModulesCalled extends boolean = false,
> {
  plugin(plugin: OakBunPluginLike): FullstackAppBuilder<TContext, TModules, TServerModulesCalled>
  use(plugin: LiteForgePlugin): FullstackAppBuilder<TContext, TModules, TServerModulesCalled>
  serverModules<TMap extends ModulesMap>(
    modules: ServerModulesInput<AppServerCtx<TContext>, TMap, TServerModulesCalled>,
  ): FullstackAppBuilder<TContext, TMap, true>

  mount(): Promise<AppInstance<TContext, TModules>>
  listen(port: number): Promise<AppInstance<TContext, TModules>>
  build(options: { outDir: string }): Promise<void>
  dev(options: { port: number }): Promise<AppInstance<TContext, TModules>>

  /**
   * Phantom-type carrier for `use('server')`. Undefined at runtime.
   *
   * Exposed on the builder (not only on AppInstance) so that users can
   * augment `PluginRegistry` against `typeof app['$server']` when `app` is
   * the exported builder const in `src/app.ts`:
   *
   * ```ts
   * // src/app.ts
   * export const app = defineApp({...}).serverModules({...}).use(...)
   * if (import.meta.main) await app.dev({ port: 3000 })
   *
   * // src/types.d.ts
   * declare module '@liteforge/runtime' {
   *   interface PluginRegistry {
   *     server: typeof app['$server']   // ← builder, not instance
   *   }
   * }
   * ```
   */
  readonly $server: InferServerApi<LiteForgeServerPlugin<TModules>>

  /**
   * Phantom-type carrier for the resolved request context. Undefined at runtime.
   *
   * Same rationale as `$server` — exposed on the builder so `typeof app['$ctx']`
   * works regardless of whether the user captured the builder or the
   * mounted instance.
   */
  readonly $ctx: BaseCtx & ResolveContext<TContext>
}

// ─── defineApp ───────────────────────────────────────────────────────────────

export function defineApp<TContext extends ContextMap = Record<never, never>>(
  config: AppConfig<TContext>,
): FullstackAppBuilder<TContext> {
  const state: BuilderState = {
    options: {
      root: config.root,
      target: config.target,
      ...(config.document !== undefined ? { document: config.document } : {}),
      ...(config.context !== undefined ? { context: config.context as Record<string, unknown> } : {}),
    },
    oakbunPlugins: [],
    liteforgePlugins: [],
    modulesMap: null,
    serverModulesCalled: false,
  }

  const builder = {
    [BUILDER_STATE]: state,

    plugin(plugin: OakBunPluginLike) {
      state.oakbunPlugins.push(plugin)
      return builder
    },

    use(plugin: LiteForgePlugin) {
      state.liteforgePlugins.push(plugin)
      return builder
    },

    serverModules(modules: ModulesMap) {
      state.modulesMap = modules
      state.serverModulesCalled = true
      return builder
    },

    async mount() {
      // Phase F.1 — client-side mount only. No server, no Bun.serve.
      // Delegates to @liteforge/runtime's defineApp, which handles target
      // resolution, plugin.install() pass, root mount, and cleanup wiring.
      const runtimeBuilder = runtimeDefineApp({
        root: state.options.root as ComponentFactory<object> | (() => Node),
        target: state.options.target,
      })

      // Compose LiteForge plugins: user-registered first, server-client plugin last.
      const composedPlugins = composeLiteForgePlugins(state)
      for (const p of composedPlugins) {
        runtimeBuilder.use(p)
      }

      const runtimeInstance = await runtimeBuilder.mount()
      return wrapRuntimeInstance(runtimeInstance)
    },
    async listen(port: number) {
      return startServer(state, { port })
    },
    build(_options: { outDir: string }) {
      throw new Error('[@liteforge/server] .build() not implemented yet (Phase F)')
    },
    dev(_options: { port: number }) {
      throw new Error('[@liteforge/server] .dev() not implemented yet (Phase F)')
    },
  }

  return builder as unknown as FullstackAppBuilder<TContext>
}

// ─── Re-exports consumed via this module ─────────────────────────────────────
export type { AnyServerModule }

// ─── Typeof-Helpers: ServerOf / CtxOf ─────────────────────────────────────────
// Extract the $server / $ctx phantom types from an app reference. Works with
// both the builder (pre-mount) and the resolved AppInstance (post-mount),
// since both carry the same readonly phantom fields.
//
// Usage in `src/types.d.ts`:
//
//   import type { ServerOf, CtxOf } from '@liteforge/server'
//   import type { app } from './app.js'
//
//   declare module '@liteforge/runtime' {
//     interface PluginRegistry {
//       server: ServerOf<typeof app>
//     }
//   }
//   declare module '@liteforge/server' {
//     interface ServerCtxRegistry {
//       ctx: CtxOf<typeof app>
//     }
//   }
//
// Preferred over `typeof app['$server']` because it hides the `$` sigil and
// works uniformly whether `app` is the builder or the resolved instance.
export type ServerOf<T> = T extends { readonly $server: infer S } ? S : never
export type CtxOf<T> = T extends { readonly $ctx: infer C } ? C : never

// ─── Runtime-Instance wrapper ─────────────────────────────────────────────────
// Wraps the `@liteforge/runtime` AppInstance in the fullstack AppInstance shape.
// The `$server` and `$ctx` fields are pure phantom-type carriers — undefined at
// runtime — so we just cast through. The user reaches the proxy via `use('server')`.
function wrapRuntimeInstance<
  TContext extends ContextMap,
  TModules extends ModulesMap,
>(
  runtime: RuntimeAppInstance,
  serverControl?: { stop: () => Promise<void>; port: number },
): AppInstance<TContext, TModules> {
  return {
    unmount: runtime.unmount,
    use: runtime.use,
    stop: serverControl ? serverControl.stop : async () => { /* no server to stop */ },
    port: serverControl?.port ?? null,
    // Phantom carriers — runtime value is undefined; TS sees the precise type.
    $server: undefined as unknown as InferServerApi<LiteForgeServerPlugin<TModules>>,
    $ctx: undefined as unknown as BaseCtx & ResolveContext<TContext>,
  }
}

// ─── startServer — internal implementation for .listen() ──────────────────────

async function startServer<
  TContext extends ContextMap,
  TModules extends ModulesMap,
>(
  state: BuilderState,
  options: { port: number; hostname?: string },
): Promise<AppInstance<TContext, TModules>> {
  // 1. Build OakBun app, apply user-registered OakBun plugins.
  //    Dynamic import keeps OakBun out of the node-based test environments —
  //    server-side code paths still require Bun runtime, but importing the
  //    facade in vitest (node) does not trigger `bun:` module resolution.
  const { createApp: createOakBunApp } = await import('oakbun')
  const oakbun = createOakBunApp()
  for (const p of state.oakbunPlugins) {
    (oakbun as unknown as { plugin: (p: unknown) => void }).plugin(p)
  }

  // 2. Register context resolver as an OakBun plugin (if the app declared context)
  //    Fields resolved per request are merged into the OakBun ctx via .extend().
  if (state.options.context) {
    const contextDeclaration = state.options.context
    const extensionPlugin: Plugin<BaseCtx, Record<string, unknown>> = {
      name: 'liteforge-context',
      request: async (ctx) => {
        const resolved = await resolveRequestContext(contextDeclaration, ctx.req)
        return { ...ctx, ...resolved } as BaseCtx & Record<string, unknown>
      },
    }
    ;(oakbun as unknown as { plugin: (p: unknown) => void }).plugin(extensionPlugin)
  }

  // 3. Register RPC routes for every module.fn in state.modulesMap
  if (state.modulesMap) {
    registerRpcRoutes(oakbun, state.modulesMap)
  }

  // 4. Register the HTML shell at GET / — served with the rendered document
  const documentDescriptor = state.options.document as DocumentDescriptor | undefined
  const mountId = resolveMountId(state.options.target)
  ;(oakbun as unknown as {
    get: (path: string, handler: (ctx: { req: Request }) => Response | Promise<Response>) => void
  }).get('/', () => {
    const html = documentDescriptor
      ? renderDocument(documentDescriptor, { mountId })
      : renderDocument(
          { _tag: 'LiteForgeDocument', config: {} },
          { mountId },
        )
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  })

  // 5. Start Bun.serve via OakBun's .listen(). OakBun returns the Bun server.
  //    Port 0 tells Bun to pick a free port — read back via server.port.
  const bunServer = (oakbun as unknown as {
    listen: (port: number) => { port: number; stop: () => Promise<void> | void }
  }).listen(options.port)

  // 6. Return an AppInstance shaped for the server context.
  //    `unmount`/`use` are no-ops here — .mount() is the client-only path;
  //    .listen() users interact with the server via HTTP.
  return {
    unmount: () => { /* no-op — server-only mode */ },
    use: <T>(_key: string) => undefined as unknown as T,
    stop: async () => {
      await bunServer.stop()
    },
    port: bunServer.port,
    $server: undefined as unknown as InferServerApi<LiteForgeServerPlugin<TModules>>,
    $ctx: undefined as unknown as BaseCtx & ResolveContext<TContext>,
  }
}

function resolveMountId(target: string | HTMLElement): string {
  if (typeof target !== 'string') return 'app'
  return target.startsWith('#') ? target.slice(1) : target
}

function registerRpcRoutes(oakbun: unknown, modulesMap: ModulesMap): void {
  const register = oakbun as {
    post: (path: string, handler: (ctx: { req: Request; [k: string]: unknown }) => Promise<Response>) => void
    options: (path: string, handler: (ctx: { req: Request }) => Promise<Response>) => void
  }

  for (const [moduleKey, mod] of Object.entries(modulesMap)) {
    const module = mod as AnyServerModule
    for (const [fnName, fn] of Object.entries(module.fns)) {
      const routePath = `${DEFAULT_RPC_PREFIX}/${moduleKey}/${fnName}`
      const serverFn = fn as AnyServerFn

      // Preflight — no custom header check, no body
      register.options(routePath, async (ctx) => {
        const headers = corsHeaders(ctx.req, [])
        return new Response(null, { status: 204, headers })
      })

      // POST — RPC handler
      register.post(routePath, async (ctx) => {
        const req = ctx.req
        const headers = corsHeaders(req, [])
        if (!req.headers.get(RPC_HEADER)) {
          return new Response(JSON.stringify({ error: `Missing ${RPC_HEADER} header` }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', ...headers },
          })
        }
        return handleRpcRequest(req, serverFn, ctx, headers)
      })
    }
  }
}

// ─── Context-Plugin Fabrik (wired into OakBun in Phase F) ────────────────────
// Produces an OakBun-compatible plugin that, on every request, runs the
// context declaration against the request and merges resolved values into ctx.
// The returned plugin's `request` hook is what the OakBun `.extend()` pattern
// consumes at request time.
//
// Exported for Phase F's `.listen()` / `.dev()` wiring and for isolated testing.
export interface ContextPlugin {
  readonly name: 'liteforge-context'
  request: (ctx: { req: Request }) => Promise<Record<string, unknown>>
}

export function createContextPlugin<TContext extends ContextMap>(
  declaration: TContext,
): ContextPlugin {
  return {
    name: 'liteforge-context',
    async request(ctx) {
      return resolveRequestContext(declaration, ctx.req) as unknown as Record<string, unknown>
    },
  }
}

// ─── serverClientPlugin auto-install (Q3-B: deferred at terminal) ─────────────
// Wraps the Proxy-based client (`./client.ts`) as a LiteForgePlugin so it can
// be `.use()`-d on the runtime app-builder. The plugin registers the proxy
// under the `server` key in the app context — `use('server')` returns it.
//
// The returned plugin's `.install()` calls `provide('server', proxy)`, so
// `use('server')` in a component retrieves the typed proxy.

const SERVER_PLUGIN_NAME = 'liteforge-server-client'

export function createServerClientLiteForgePlugin<TMap extends ModulesMap>(
  _modulesMap: TMap,
  options?: ServerClientOptions,
): LiteForgePlugin {
  // TMap is phantom — the proxy is a Proxy, any module/fn access produces a
  // fetch. It's TypeScript that cares about the map at compile time via
  // the PluginRegistry augmentation the user writes.
  const client = createServerClient<InferServerApi<LiteForgeServerPlugin<TMap>>>(options ?? {})
  const proxy = client.useServer()

  return {
    name: SERVER_PLUGIN_NAME,
    install(ctx) {
      ctx.provide('server', proxy)
    },
  }
}

// ─── Plugin composition — user plugins first, server last ─────────────────────
// Given a builder state, returns the ordered LiteForgePlugin list that should
// be installed on the runtime builder at terminal time (Phase F consumes this).
//
// Contract (verified in define-app.test.ts):
//   1. All user `.use()`-registered plugins appear first, in registration order
//   2. If `.serverModules()` was called, the server client plugin is appended
//      last — so user plugins see an empty `server` context, and the server
//      client plugin is the final provider
//   3. If `.serverModules()` was NOT called, no server plugin is added
export function composeLiteForgePlugins(
  state: BuilderState,
  options?: ServerClientOptions,
): LiteForgePlugin[] {
  const plugins: LiteForgePlugin[] = [...state.liteforgePlugins]
  if (state.serverModulesCalled && state.modulesMap !== null) {
    plugins.push(createServerClientLiteForgePlugin(state.modulesMap, options))
  }
  return plugins
}
