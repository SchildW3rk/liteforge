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
  /** Start the production server. Pass a number for the port only, or an options object for full control. */
  listen(port: number): Promise<AppInstance<TContext, TModules>>
  listen(options: ListenOptions): Promise<AppInstance<TContext, TModules>>
  build(options: BuildOptions): Promise<BuildResult>
  dev(options: DevOptions): Promise<AppInstance<TContext, TModules>>

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
    async listen(portOrOptions: number | ListenOptions) {
      const opts: ListenOptions =
        typeof portOrOptions === 'number' ? { port: portOrOptions } : portOrOptions
      return startServer(state, {
        port: opts.port,
        ...(opts.hostname !== undefined ? { hostname: opts.hostname } : {}),
        ...(opts.clientEntry !== undefined ? { clientEntry: opts.clientEntry } : {}),
      })
    },
    async build(options: BuildOptions) {
      return runBuild(state, options)
    },
    async dev(options: DevOptions) {
      return startServer(state, {
        port: options.port,
        devMode: true,
        ...(options.hostname !== undefined ? { hostname: options.hostname } : {}),
        ...(options.watchDir !== undefined ? { watchDir: options.watchDir } : {}),
        ...(options.clientEntry !== undefined ? { clientEntry: options.clientEntry } : {}),
      })
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

// ─── Terminal method option types ────────────────────────────────────────────

/**
 * Options for `.listen()`. When `clientEntry` is provided, the facade bundles
 * the client on server start and serves it at `/client.js`. The HTML shell
 * then automatically includes `<script type="module" src="/client.js">`.
 */
export interface ListenOptions {
  port: number
  hostname?: string
  /** Path to the browser entry file (e.g. `./src/client.ts`). */
  clientEntry?: string
}

/**
 * Options for `.dev()`. Same as `.listen()` plus HMR controls.
 * `clientEntry` triggers a rebuild on file change, after which the HMR
 * WebSocket broadcasts a reload to connected browsers.
 */
export interface DevOptions {
  port: number
  hostname?: string
  clientEntry?: string
  /** Directory watched for HMR triggers. Defaults to `'src'`. */
  watchDir?: string
}

// ─── .build() types ───────────────────────────────────────────────────────────

export interface BuildOptions {
  /**
   * Client entry file path (e.g. `./src/main.tsx`). Compiled with
   * `@liteforge/bun-plugin` for JSX transform and emitted under
   * `<outDir>/client/`.
   */
  clientEntry: string
  /**
   * Output directory. Client bundle lands in `<outDir>/client/`, static HTML
   * shell (from `defineDocument`) in `<outDir>/client/index.html`.
   * Defaults to `./dist`.
   */
  outDir?: string
  /** Minify the client bundle. Defaults to true. */
  minify?: boolean
  /** Bundle target. Defaults to 'browser'. */
  target?: 'browser' | 'bun' | 'node'
}

export interface BuildResult {
  /** Resolved absolute path of the output directory. */
  outDir: string
  /** Relative paths of the emitted files (relative to `outDir`). */
  files: string[]
  /** `true` when `Bun.build()` reported success. */
  success: boolean
}

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

// ─── bundleClient — shared bundling helper ────────────────────────────────────
// Used by both runBuild() (writes to disk) and startServer() (keeps output
// in memory for /client.js serving). Throws on build failure with a message
// prefixed by the caller's label.

interface BundleClientOptions {
  clientEntry: string
  target: 'browser' | 'bun' | 'node'
  minify: boolean
  /** If set, write outputs to disk at this path. Otherwise in-memory only. */
  outDir?: string
  /** Error-message prefix — e.g. `.build()` or `.dev()` to hint the caller. */
  contextLabel: string
}

interface BundledClient {
  /** Main JS output as text (for in-memory serving). */
  mainJs: string
  /** All outputs with their basenames, for additional asset serving. */
  assets: Map<string, string>
  /** Absolute output paths when written to disk, empty when in-memory only. */
  outputPaths: string[]
}

async function bundleClient(options: BundleClientOptions): Promise<BundledClient> {
  const { liteforgeBunPlugin } = await import('@liteforge/bun-plugin')

  const bunGlobal = (globalThis as unknown as {
    Bun?: {
      build: (opts: unknown) => Promise<{
        success: boolean
        outputs: Array<{ path: string; text(): Promise<string> }>
        logs: Array<{ level: string; message: string }>
      }>
    }
  }).Bun
  if (!bunGlobal) {
    throw new Error(`[@liteforge/server] ${options.contextLabel} requires Bun runtime`)
  }

  let buildResult
  try {
    const buildOpts: Record<string, unknown> = {
      entrypoints: [options.clientEntry],
      target: options.target,
      minify: options.minify,
      plugins: [liteforgeBunPlugin()],
      external: options.target === 'browser' ? ['oakbun'] : [],
    }
    if (options.outDir !== undefined) buildOpts['outdir'] = options.outDir
    buildResult = await bunGlobal.build(buildOpts)
  } catch (err) {
    const cause = err instanceof Error ? err.message : String(err)
    throw new Error(`[@liteforge/server] ${options.contextLabel} failed: ${cause}`)
  }

  if (!buildResult.success) {
    const messages = buildResult.logs
      .filter((l) => l.level === 'error')
      .map((l) => l.message)
      .join('\n  ')
    throw new Error(
      `[@liteforge/server] ${options.contextLabel} failed:\n  ${messages || '(no error logs)'}`,
    )
  }

  // Pick up every emitted asset by basename. The "main" JS is the one that
  // corresponds to the clientEntry (ends with .js and isn't a chunk).
  const assets = new Map<string, string>()
  const outputPaths: string[] = []
  let mainJs = ''

  for (const output of buildResult.outputs) {
    const path = await import('node:path')
    const basename = path.basename(output.path)
    if (options.outDir !== undefined) {
      // On-disk mode: Bun.build already wrote the file; skip reading body.
      outputPaths.push(output.path)
    } else {
      // In-memory mode: read the generated text.
      const text = await output.text()
      assets.set(basename, text)
      if (basename.endsWith('.js') && !mainJs) mainJs = text
    }
  }

  return { mainJs, assets, outputPaths }
}

// ─── runBuild — internal implementation for .build() ──────────────────────────

async function runBuild(state: BuilderState, options: BuildOptions): Promise<BuildResult> {
  const outDir = options.outDir ?? './dist'
  const clientOutDir = `${outDir}/client`
  const target = options.target ?? 'browser'
  const minify = options.minify ?? true

  const path = await import('node:path')
  const fs = await import('node:fs/promises')

  const bundled = await bundleClient({
    clientEntry: options.clientEntry,
    target,
    minify,
    outDir: clientOutDir,
    contextLabel: '.build()',
  })

  // HTML shell — `.build()` always auto-references `/client.js` (relative to outDir).
  const documentDescriptor = state.options.document as DocumentDescriptor | undefined
  const mountId = resolveMountId(state.options.target)
  const html = documentDescriptor
    ? renderDocument(withClientScript(documentDescriptor), { mountId })
    : renderDocument(defaultDocumentWithClientScript(), { mountId })

  await fs.mkdir(clientOutDir, { recursive: true })
  const htmlPath = path.join(clientOutDir, 'index.html')
  await fs.writeFile(htmlPath, html, 'utf-8')

  const absOutDir = path.resolve(outDir)
  const files: string[] = []
  for (const p of bundled.outputPaths) {
    files.push(path.relative(absOutDir, p))
  }
  files.push(path.relative(absOutDir, htmlPath))

  return {
    outDir: absOutDir,
    files,
    success: true,
  }
}

// ─── Document client-script injection ─────────────────────────────────────────
// Ensures the HTML shell references `/client.js` when the facade controls the
// client bundle. Idempotent — if the user's document already lists a script
// with `src === '/client.js'`, we don't add a duplicate.

function withClientScript(doc: DocumentDescriptor): DocumentDescriptor {
  const existing = doc.config.head?.scripts ?? []
  const alreadyHasClientScript = existing.some(
    (s) => s.src === '/client.js' && s.type === 'module',
  )
  if (alreadyHasClientScript) return doc

  return {
    _tag: 'LiteForgeDocument',
    config: {
      ...doc.config,
      head: {
        ...doc.config.head,
        scripts: [...existing, { src: '/client.js', type: 'module' }],
      },
    },
  }
}

function defaultDocumentWithClientScript(): DocumentDescriptor {
  return {
    _tag: 'LiteForgeDocument',
    config: {
      head: {
        scripts: [{ src: '/client.js', type: 'module' }],
      },
    },
  }
}

// ─── startServer — internal implementation for .listen() ──────────────────────

interface StartServerOptions {
  port: number
  hostname?: string
  /** When true, inject HMR client snippet and start file watcher + WS channel. */
  devMode?: boolean
  /** Dev-mode only: glob for file watcher (default: 'src'). */
  watchDir?: string
  /**
   * Path to a browser entry file. When set, the server bundles it on start
   * (and on every file change in dev mode) and serves the output at
   * `/client.js`. The HTML shell automatically references `/client.js`.
   */
  clientEntry?: string
}

const HMR_WS_PATH = '/__liteforge_hmr__'

async function startServer<
  TContext extends ContextMap,
  TModules extends ModulesMap,
>(
  state: BuilderState,
  options: StartServerOptions,
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

  // 4. Client bundle — bundled once at start, rebuilt on file change in dev mode.
  //    Kept in a mutable reference so the rebuilder (below) can swap the bundle
  //    atomically without restarting the server.
  const clientBundle: { current: BundledClient | null } = { current: null }
  if (options.clientEntry) {
    clientBundle.current = await bundleClient({
      clientEntry: options.clientEntry,
      target: 'browser',
      minify: !options.devMode,
      contextLabel: options.devMode ? '.dev()' : '.listen()',
    })
  }

  // 5. Dev mode: start the parallel WebSocket+watcher server FIRST, so its
  //    port is known before we render the HTML shell (we bake the WS URL
  //    into the injected client snippet).
  let devControl: { stop: () => Promise<void>; port: number } | null = null
  if (options.devMode) {
    devControl = await startDevHmr({
      watchDir: options.watchDir ?? 'src',
      ...(options.clientEntry !== undefined
        ? {
            onChange: async () => {
              try {
                clientBundle.current = await bundleClient({
                  clientEntry: options.clientEntry!,
                  target: 'browser',
                  minify: false,
                  contextLabel: '.dev() rebuild',
                })
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err)
                console.error(`[@liteforge/server] rebuild failed:\n  ${msg}`)
              }
            },
          }
        : {}),
    })
  }

  // 6. Register the HTML shell at GET / — served with the rendered document.
  //    In dev mode, inject HMR client snippet at the end of <body>.
  //    When clientEntry is set, the document is auto-augmented to include
  //    `<script type="module" src="/client.js">`.
  const documentDescriptor = state.options.document as DocumentDescriptor | undefined
  const mountId = resolveMountId(state.options.target)
  const capturedDevControl = devControl
  const effectiveDocument: DocumentDescriptor | undefined = options.clientEntry
    ? documentDescriptor
      ? withClientScript(documentDescriptor)
      : defaultDocumentWithClientScript()
    : documentDescriptor

  ;(oakbun as unknown as {
    get: (path: string, handler: (ctx: { req: Request }) => Response | Promise<Response>) => void
  }).get('/', (ctx: { req: Request }) => {
    let html = effectiveDocument
      ? renderDocument(effectiveDocument, { mountId })
      : renderDocument(
          { _tag: 'LiteForgeDocument', config: {} },
          { mountId },
        )

    if (options.devMode && capturedDevControl) {
      const host = new URL(ctx.req.url).hostname
      const hmrWsUrl = `ws://${host}:${capturedDevControl.port}${HMR_WS_PATH}`
      html = injectHmrSnippet(html, hmrWsUrl)
    }

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  })

  // 7. Register the client bundle route (only if clientEntry was provided).
  //    /client.js serves the main JS. Other assets (e.g. code-split chunks)
  //    are served from their basename under the same root.
  if (options.clientEntry) {
    const bundleRouter = oakbun as unknown as {
      get: (path: string, handler: (ctx: { req: Request }) => Response) => void
    }
    bundleRouter.get('/client.js', () => {
      const bundle = clientBundle.current
      if (!bundle) return new Response('Client bundle not ready', { status: 503 })
      return new Response(bundle.mainJs, {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          // No caching in dev — always fresh after rebuild. .listen() users
          // get a rebuilt bundle per server restart, so no-cache is also
          // defensible here.
          'Cache-Control': 'no-cache',
        },
      })
    })
  }

  // 8. Start Bun.serve via OakBun's .listen(). OakBun returns the Bun server.
  //    Port 0 tells Bun to pick a free port — read back via server.port.
  const bunServer = (oakbun as unknown as {
    listen: (port: number) => { port: number; stop: () => Promise<void> | void }
  }).listen(options.port)

  // 9. Return an AppInstance shaped for the server context.
  return {
    unmount: () => { /* no-op — server-only mode */ },
    use: <T>(_key: string) => undefined as unknown as T,
    stop: async () => {
      await bunServer.stop()
      if (devControl) await devControl.stop()
    },
    port: bunServer.port,
    $server: undefined as unknown as InferServerApi<LiteForgeServerPlugin<TModules>>,
    $ctx: undefined as unknown as BaseCtx & ResolveContext<TContext>,
  }
}

// ─── HMR client snippet (injected into <body> in dev mode) ────────────────────

function injectHmrSnippet(html: string, wsUrl: string): string {
  const snippet = `<script type="module">
(() => {
  const url = ${JSON.stringify(wsUrl)};
  let retry = 0;
  function connect() {
    const ws = new WebSocket(url);
    ws.addEventListener('message', (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'reload') window.location.reload();
      } catch {}
    });
    ws.addEventListener('close', () => {
      retry = Math.min(retry + 1, 5);
      setTimeout(connect, 200 * retry);
    });
  }
  connect();
})();
</script>`
  return html.replace('</body>', `${snippet}\n  </body>`)
}

// ─── Dev HMR: WebSocket broadcast + file watcher ──────────────────────────────

interface DevHmrOptions {
  watchDir: string
  /** Optional hook invoked before the reload broadcast — used to rebuild the client bundle. */
  onChange?: () => Promise<void> | void
}

async function startDevHmr(
  options: DevHmrOptions,
): Promise<{ stop: () => Promise<void>; port: number }> {
  const { watch } = await import('node:fs')
  const path = await import('node:path')

  // Use a Set of active WebSocket clients — broadcast on file change.
  // `Bun.ServerWebSocket` is untyped here to avoid a hard `bun` type import
  // in node test environments.
  const clients = new Set<unknown>()

  // Start a dedicated Bun.serve on an OS-picked port for the HMR WS channel.
  // We bind on the same process but a separate listener to keep OakBun's
  // listen path free of @oakbun/ws adapter dependencies.
  // Node-incompatible call — only reached at runtime under Bun.
  const bunGlobal = (globalThis as unknown as {
    Bun?: {
      serve: (opts: unknown) => { port: number; stop: () => Promise<void> | void }
    }
  }).Bun
  if (!bunGlobal) {
    throw new Error('[@liteforge/server] .dev() requires Bun runtime')
  }

  // Debounced broadcast: multiple file changes within 100ms coalesce into one
  // reload. If `onChange` is provided, it runs BEFORE the broadcast — the
  // rebuilt bundle is served when browsers reload.
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const broadcastReload = () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      if (options.onChange) {
        try {
          await options.onChange()
        } catch {
          // bundleClient already logs; skip broadcast if rebuild failed
          return
        }
      }
      const msg = JSON.stringify({ type: 'reload' })
      for (const ws of clients) {
        try {
          ;(ws as { send: (data: string) => void }).send(msg)
        } catch { /* ignore broken clients */ }
      }
    }, 100)
  }

  // HMR WS server — dedicated port, inherit auto-allocation
  // The snippet reconnects automatically via `setTimeout(connect, retry*200)`
  // so the WS port drift (on restart) is transparent to the user.
  const wsServer = bunGlobal.serve({
    port: 0,
    fetch(req: Request, server: { upgrade: (r: Request) => boolean }) {
      const url = new URL(req.url)
      if (url.pathname === HMR_WS_PATH && server.upgrade(req)) {
        return
      }
      return new Response('HMR channel', { status: 404 })
    },
    websocket: {
      open(ws: unknown) { clients.add(ws) },
      close(ws: unknown) { clients.delete(ws) },
      message() { /* client → server not used */ },
    },
  })

  // File watcher — recursive, src/** by default
  const resolvedWatchDir = path.resolve(options.watchDir)
  const watcher = watch(
    resolvedWatchDir,
    { recursive: true },
    (event, filename) => {
      if (!filename) return
      if (event === 'change' || event === 'rename') broadcastReload()
    },
  )

  return {
    port: wsServer.port,
    stop: async () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      watcher.close()
      // Force-close: pass `true` to abort in-flight WebSocket clients.
      // Without this, .stop() hangs while clients stay connected.
      await (wsServer as unknown as { stop: (closeActive?: boolean) => Promise<void> | void })
        .stop(true)
    },
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
