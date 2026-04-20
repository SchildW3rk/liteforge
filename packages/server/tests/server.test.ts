import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { defineServerFn, defineServerModule, liteforgeServer } from '../src/index.js'
import type { InferServerApi } from '../src/index.js'

// ─── defineServerFn ───────────────────────────────────────────────────────────

describe('defineServerFn', () => {
  it('returns a ServerFn with _tag and _def', () => {
    const fn = defineServerFn({
      input: z.object({ name: z.string() }),
      handler: async (input) => ({ greeting: `Hello, ${input.name}` }),
    })
    expect(fn._tag).toBe('ServerFn')
    expect(fn._def.input).toBeDefined()
    expect(typeof fn._def.handler).toBe('function')
  })

  it('handler receives correctly typed input at runtime', async () => {
    const fn = defineServerFn({
      input: z.object({ x: z.number() }),
      handler: async (input) => input.x * 2,
    })
    const result = await fn._def.handler({ x: 5 }, {} as any)
    expect(result).toBe(10)
  })
})

// ─── defineServerModule ───────────────────────────────────────────────────────

describe('defineServerModule', () => {
  it('builds a module with correct name and fns', () => {
    const mod = defineServerModule('greetings')
      .serverFn('hello', {
        input: z.object({ name: z.string() }),
        handler: async (input) => ({ greeting: `Hello, ${input.name}` }),
      })
      .build()

    expect(mod._tag).toBe('ServerModule')
    expect(mod.name).toBe('greetings')
    expect(mod.fns['hello']).toBeDefined()
    expect(mod.fns['hello']!._tag).toBe('ServerFn')
  })

  it('supports multiple fns on one module', () => {
    const mod = defineServerModule('users')
      .serverFn('list', { input: z.object({}), handler: async () => [] })
      .serverFn('create', { input: z.object({ name: z.string() }), handler: async (i) => ({ id: '1', ...i }) })
      .build()

    expect(Object.keys(mod.fns)).toHaveLength(2)
  })
})

// ─── liteforgeServer ──────────────────────────────────────────────────────────

describe('liteforgeServer', () => {
  it('creates a plugin with correct name and _tag', () => {
    const mod = defineServerModule('greetings')
      .serverFn('hello', { input: z.object({ name: z.string() }), handler: async (i) => i.name })
      .build()

    const plugin = liteforgeServer({ modules: { greetings: mod } })
    expect(plugin._tag).toBe('LiteForgeServerPlugin')
    expect(plugin.name).toBe('liteforge-server')
  })

  it('preserves modulesMap with correct keys', () => {
    const greetings = defineServerModule('greetings')
      .serverFn('hello', { input: z.object({ name: z.string() }), handler: async (i) => i })
      .build()
    const invoices = defineServerModule('invoices')
      .serverFn('list', { input: z.object({}), handler: async () => [] })
      .build()

    const plugin = liteforgeServer({ modules: { greetings, invoices } })
    expect(plugin._modulesMap['greetings']).toBe(greetings)
    expect(plugin._modulesMap['invoices']).toBe(invoices)
  })

  it('uses default rpcPrefix when not specified', () => {
    const mod = defineServerModule('x').serverFn('y', { input: z.object({}), handler: async () => ({}) }).build()
    const plugin = liteforgeServer({ modules: { x: mod } })
    expect(plugin.options.rpcPrefix).toBeUndefined()
  })
})

// ─── RPC request handling ─────────────────────────────────────────────────────

describe('RPC route handler', () => {
  function makePlugin() {
    const mod = defineServerModule('greetings')
      .serverFn('hello', {
        input: z.object({ name: z.string() }),
        handler: async (input) => ({ greeting: `Hello, ${input.name}!` }),
      })
      .build()
    return liteforgeServer({ modules: { greetings: mod } })
  }

  function collectRoutes(plugin: ReturnType<typeof liteforgeServer>) {
    const routes: { method: string; path: string; handler: (ctx: any) => Promise<Response> }[] = []
    const oakbunPlugin = plugin as any
    oakbunPlugin.install({
      route: (method: string, path: string, handler: (ctx: any) => Promise<Response>) => {
        routes.push({ method, path, handler })
      },
    })
    return routes
  }

  it('registers POST and OPTIONS routes for each fn', () => {
    const plugin = makePlugin()
    const routes = collectRoutes(plugin)
    const paths = routes.map(r => `${r.method} ${r.path}`)
    expect(paths).toContain('POST /api/_rpc/greetings/hello')
    expect(paths).toContain('OPTIONS /api/_rpc/greetings/hello')
  })

  it('returns 403 when X-Liteforge-RPC header is missing', async () => {
    const plugin = makePlugin()
    const routes = collectRoutes(plugin)
    const postRoute = routes.find(r => r.method === 'POST')!

    const req = new Request('http://localhost/api/_rpc/greetings/hello', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { name: 'René' } }),
    })
    const res = await postRoute.handler({ req })
    expect(res.status).toBe(403)
    const body = await res.json() as { error: string }
    expect(body.error).toContain('X-Liteforge-RPC')
  })

  it('returns 400 for invalid Zod input', async () => {
    const plugin = makePlugin()
    const routes = collectRoutes(plugin)
    const postRoute = routes.find(r => r.method === 'POST')!

    const req = new Request('http://localhost/api/_rpc/greetings/hello', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Liteforge-RPC': '1' },
      body: JSON.stringify({ input: { name: 42 } }), // wrong type
    })
    const res = await postRoute.handler({ req })
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Validation failed')
  })

  it('returns 200 with data for valid input', async () => {
    const plugin = makePlugin()
    const routes = collectRoutes(plugin)
    const postRoute = routes.find(r => r.method === 'POST')!

    const req = new Request('http://localhost/api/_rpc/greetings/hello', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Liteforge-RPC': '1' },
      body: JSON.stringify({ input: { name: 'René' } }),
    })
    const res = await postRoute.handler({ req })
    expect(res.status).toBe(200)
    const body = await res.json() as { data: { greeting: string } }
    expect(body.data.greeting).toBe('Hello, René!')
  })

  it('returns 400 for malformed JSON body', async () => {
    const plugin = makePlugin()
    const routes = collectRoutes(plugin)
    const postRoute = routes.find(r => r.method === 'POST')!

    const req = new Request('http://localhost/api/_rpc/greetings/hello', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Liteforge-RPC': '1' },
      body: 'not-json',
    })
    const res = await postRoute.handler({ req })
    expect(res.status).toBe(400)
  })

  it('returns 500 when handler throws', async () => {
    const mod = defineServerModule('broken')
      .serverFn('fail', {
        input: z.object({}),
        handler: async () => { throw new Error('something went wrong') },
      })
      .build()
    const plugin = liteforgeServer({ modules: { broken: mod } })
    const routes = collectRoutes(plugin)
    const postRoute = routes.find(r => r.method === 'POST')!

    const req = new Request('http://localhost/api/_rpc/broken/fail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Liteforge-RPC': '1' },
      body: JSON.stringify({ input: {} }),
    })
    const res = await postRoute.handler({ req })
    expect(res.status).toBe(500)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('something went wrong')
  })
})

// ─── Type inference (compile-time verification via type assertions) ────────────

describe('InferServerApi type inference', () => {
  it('module keys and fn types are inferred correctly at compile time', () => {
    const mod = defineServerModule('greetings')
      .serverFn('hello', {
        input: z.object({ name: z.string() }),
        handler: async (input) => ({ greeting: `Hi ${input.name}`, ts: Date.now() }),
      })
      .build()

    const plugin = liteforgeServer({ modules: { greetings: mod } })
    type Api = InferServerApi<typeof plugin>

    // TypeScript compile-time assertions:
    type HelloFn = Api['greetings']['hello']
    type _input = Parameters<HelloFn>[0]
    type _output = Awaited<ReturnType<HelloFn>>
    const _inputCheck: _input = { name: 'test' }       // must compile
    const _outputCheck: _output = { greeting: '', ts: 0 } // must compile
    expect(_inputCheck.name).toBe('test')
    expect(_outputCheck.greeting).toBe('')
  })
})

// ─── Dev-mode key mismatch warning ────────────────────────────────────────────

describe('dev-mode warning', () => {
  it('warns when module name does not match record key', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mod = defineServerModule('hello') // name 'hello'
    const built = mod.serverFn('fn', { input: z.object({}), handler: async () => ({}) }).build()

    liteforgeServer({ modules: { greetings: built } }) // key 'greetings' ≠ name 'hello'

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"hello" does not match key "greetings"')
    )
    consoleSpy.mockRestore()
  })

  it('does not warn when module name matches record key', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mod = defineServerModule('greetings')
      .serverFn('fn', { input: z.object({}), handler: async () => ({}) })
      .build()

    liteforgeServer({ modules: { greetings: mod } })
    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
