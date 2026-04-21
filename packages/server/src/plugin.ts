import type {
  AnyServerFn,
  AnyServerModule,
  LiteForgeServerOptions,
  LiteForgeServerPlugin,
  ModulesMap,
  RpcErrorResponse,
  RpcSuccessResponse,
} from './types.js'

// ─── Internal helpers (exported for `.listen()` / `.dev()` reuse in Phase F) ──
// These are intentionally not part of the public API — they're re-exposed via
// define-app.ts for building the OakBun route handlers. The shape and names
// may change without a major version bump.

export const RPC_HEADER = 'X-Liteforge-RPC'
export const DEFAULT_RPC_PREFIX = '/api/_rpc'

function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true // non-browser requests (curl, server-to-server) pass through
  try {
    const requestUrl = new URL(req.url)
    const originUrl = new URL(origin)
    return requestUrl.origin === originUrl.origin
  } catch {
    return false
  }
}

export function corsHeaders(req: Request, allowedOrigins: string[]): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  const allowed = allowedOrigins.length === 0
    ? isSameOrigin(req) ? origin : ''
    : allowedOrigins.includes(origin) ? origin : ''

  if (!allowed) return {}
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': `Content-Type, ${RPC_HEADER}`,
    'Access-Control-Max-Age': '86400',
  }
}

function jsonResponse<T>(data: T, status: number, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  })
}

export async function handleRpcRequest(
  req: Request,
  fn: AnyServerFn,
  ctx: unknown,
  extraHeaders: Record<string, string>
): Promise<Response> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    const err: RpcErrorResponse = { error: 'Invalid JSON body' }
    return jsonResponse(err, 400, extraHeaders)
  }

  const parsed = fn._def.input.safeParse((body as { input?: unknown })?.input ?? body)
  if (!parsed.success) {
    const err: RpcErrorResponse = {
      error: 'Validation failed',
      details: parsed.error.flatten(),
    }
    return jsonResponse(err, 400, extraHeaders)
  }

  try {
    const result = await fn._def.handler(parsed.data, ctx)
    const ok: RpcSuccessResponse = { data: result }
    return jsonResponse(ok, 200, extraHeaders)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    const err: RpcErrorResponse = { error: message }
    return jsonResponse(err, 500, extraHeaders)
  }
}

export function liteforgeServer<TMap extends ModulesMap>(
  options: LiteForgeServerOptions<TMap>
): LiteForgeServerPlugin<TMap> {
  const rpcPrefix = options.rpcPrefix ?? DEFAULT_RPC_PREFIX
  const allowedOrigins = options.cors?.origins ?? []

  // Dev-mode warning: check for Record-key / module name mismatches
  if (typeof process !== 'undefined' && process.env['NODE_ENV'] !== 'production') {
    for (const [key, mod] of Object.entries(options.modules)) {
      if ((mod as AnyServerModule).name !== key) {
        console.warn(
          `[liteforge/server] Module debug name "${(mod as AnyServerModule).name}" does not match key "${key}". ` +
          `The record key "${key}" is used for routing. Consider aligning them.`
        )
      }
    }
  }

  // OakBun plugin interface — install registers all RPC routes
  const plugin: LiteForgeServerPlugin<TMap> = {
    _tag: 'LiteForgeServerPlugin',
    _modulesMap: options.modules,
    name: 'liteforge-server',
    options,
    // The actual OakBun plugin fields are attached below via Object.assign
    // so we don't need a hard import of oakbun here.
  } as LiteForgeServerPlugin<TMap>

  // Attach OakBun-compatible plugin fields directly.
  // OakBun plugins are plain objects with { name, request?, install?, modules? }.
  // We use `fetch`-based route handling via OakBun's low-level route registration.
  Object.assign(plugin, {
    request: (_ctx: { req: Request }) => ({}),
    install: (hooks: {
      route: (method: string, path: string, handler: (ctx: { req: Request; [k: string]: unknown }) => Promise<Response>) => void
    }) => {
      // Register one POST route per fn, plus OPTIONS for preflight
      for (const [moduleKey, mod] of Object.entries(options.modules)) {
        const module = mod as AnyServerModule
        for (const [fnName, fn] of Object.entries(module.fns)) {
          const routePath = `${rpcPrefix}/${moduleKey}/${fnName}`
          const serverFn = fn as AnyServerFn

          // OPTIONS — CORS preflight
          hooks.route('OPTIONS', routePath, async (ctx) => {
            const headers = corsHeaders(ctx.req, allowedOrigins)
            return new Response(null, { status: 204, headers })
          })

          // POST — RPC handler
          hooks.route('POST', routePath, async (ctx) => {
            const req = ctx.req
            const headers = corsHeaders(req, allowedOrigins)

            // Security: require custom RPC header (blocks naive CSRF)
            if (!req.headers.get(RPC_HEADER)) {
              const err: RpcErrorResponse = { error: `Missing ${RPC_HEADER} header` }
              return jsonResponse(err, 403, headers)
            }

            return handleRpcRequest(req, serverFn, ctx, headers)
          })
        }
      }
    },
  })

  return plugin
}
