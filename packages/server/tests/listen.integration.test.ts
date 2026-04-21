/**
 * Phase F.2 — defineApp.listen() integration tests.
 *
 * Runs under Bun (Bun.serve is Bun-specific). Invoke with:
 *   pnpm --filter @liteforge/server test:integration
 * or
 *   bun test packages/server/tests/listen.integration.test.ts
 *
 * Vitest excludes *.integration.test.ts (see vitest.config.ts).
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { z } from 'zod'
import { defineApp, defineDocument, defineServerModule } from '../src/index.js'

// Local helper: install the plugin a user would inject — but here we go
// through the `.listen()` path entirely, so no client side is needed.
function makeRoot(): () => Node {
  return () => ({} as Node) // never mounted server-side — .listen() renders HTML only
}

type AppHandle = { stop: () => Promise<void>; port: number | null }
let handle: AppHandle | null = null

beforeEach(() => {
  handle = null
})

afterEach(async () => {
  if (handle) {
    await handle.stop()
    handle = null
  }
})

describe('.listen() — basic shell', () => {
  it('serves a rendered HTML document at GET /', async () => {
    const doc = defineDocument({
      head: {
        title: 'Integration Test App',
        description: 'Phase F.2 smoke',
      },
    })

    const app = await defineApp({ root: makeRoot(), target: '#app', document: doc }).listen(0)
    handle = app
    expect(app.port).toBeGreaterThan(0)

    const res = await fetch(`http://localhost:${app.port}/`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')

    const html = await res.text()
    expect(html).toMatch(/^<!DOCTYPE html>/)
    expect(html).toContain('<title>Integration Test App</title>')
    expect(html).toContain('<meta name="description" content="Phase F.2 smoke">')
    expect(html).toContain('<div id="app"></div>')
  })

  it('serves a default HTML shell when no document is configured', async () => {
    const app = await defineApp({ root: makeRoot(), target: '#app' }).listen(0)
    handle = app

    const res = await fetch(`http://localhost:${app.port}/`)
    const html = await res.text()
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<div id="app"></div>')
  })
})

describe('.listen() — RPC routes', () => {
  it('serves a registered server module at POST /api/_rpc/{module}/{fn}', async () => {
    const mod = defineServerModule('greetings')
      .serverFn('hello', {
        input: z.object({ name: z.string() }),
        handler: async (input) => ({ greeting: `Hello, ${input.name}!` }),
      })
      .build()

    const app = await defineApp({ root: makeRoot(), target: '#app' })
      .serverModules({ greetings: mod })
      .listen(0)
    handle = app

    const res = await fetch(`http://localhost:${app.port}/api/_rpc/greetings/hello`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Liteforge-RPC': '1' },
      body: JSON.stringify({ input: { name: 'René' } }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { greeting: string } }
    expect(body.data.greeting).toBe('Hello, René!')
  })

  it('rejects RPC request missing the X-Liteforge-RPC header with 403', async () => {
    const mod = defineServerModule('greetings')
      .serverFn('hello', {
        input: z.object({ name: z.string() }),
        handler: async () => ({ ok: true }),
      })
      .build()

    const app = await defineApp({ root: makeRoot(), target: '#app' })
      .serverModules({ greetings: mod })
      .listen(0)
    handle = app

    const res = await fetch(`http://localhost:${app.port}/api/_rpc/greetings/hello`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { name: 'x' } }),
    })

    expect(res.status).toBe(403)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/X-Liteforge-RPC/)
  })

  it('returns 400 with field errors on Zod validation failure', async () => {
    const mod = defineServerModule('greetings')
      .serverFn('hello', {
        input: z.object({ name: z.string().min(1, 'Name required') }),
        handler: async () => ({ ok: true }),
      })
      .build()

    const app = await defineApp({ root: makeRoot(), target: '#app' })
      .serverModules({ greetings: mod })
      .listen(0)
    handle = app

    const res = await fetch(`http://localhost:${app.port}/api/_rpc/greetings/hello`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Liteforge-RPC': '1' },
      body: JSON.stringify({ input: { name: '' } }),
    })

    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string; details: unknown }
    expect(body.error).toBe('Validation failed')
    expect(body.details).toBeDefined()
  })
})

describe('.listen() — context resolvers', () => {
  it('passes resolved context fields to the handler ctx', async () => {
    const mod = defineServerModule('inspect')
      .serverFn('whoami', {
        input: z.object({}),
        handler: async (_input, ctx) => {
          const c = ctx as { req: Request; tenantId: string; version: string }
          return { tenantId: c.tenantId, version: c.version }
        },
      })
      .build()

    const app = await defineApp({
      root: makeRoot(),
      target: '#app',
      context: {
        version: '1.2.3',
        tenantId: (req: Request) => 'tenant-' + (req.headers.get('x-tenant') ?? 'none'),
      },
    })
      .serverModules({ inspect: mod })
      .listen(0)
    handle = app

    const res = await fetch(`http://localhost:${app.port}/api/_rpc/inspect/whoami`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Liteforge-RPC': '1',
        'x-tenant': 'acme',
      },
      body: JSON.stringify({ input: {} }),
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { data: { tenantId: string; version: string } }
    expect(body.data).toEqual({ tenantId: 'tenant-acme', version: '1.2.3' })
  })

  it('re-evaluates resolvers per request (different tenant per call)', async () => {
    const mod = defineServerModule('inspect')
      .serverFn('tenant', {
        input: z.object({}),
        handler: async (_input, ctx) => {
          const c = ctx as { tenantId: string }
          return { tenantId: c.tenantId }
        },
      })
      .build()

    const app = await defineApp({
      root: makeRoot(),
      target: '#app',
      context: {
        tenantId: (req: Request) => req.headers.get('x-tenant') ?? 'default',
      },
    })
      .serverModules({ inspect: mod })
      .listen(0)
    handle = app

    const r1 = await fetch(`http://localhost:${app.port}/api/_rpc/inspect/tenant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Liteforge-RPC': '1', 'x-tenant': 'a' },
      body: JSON.stringify({ input: {} }),
    })
    const r2 = await fetch(`http://localhost:${app.port}/api/_rpc/inspect/tenant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Liteforge-RPC': '1', 'x-tenant': 'b' },
      body: JSON.stringify({ input: {} }),
    })

    expect(((await r1.json()) as { data: { tenantId: string } }).data.tenantId).toBe('a')
    expect(((await r2.json()) as { data: { tenantId: string } }).data.tenantId).toBe('b')
  })
})

describe('.listen() — server lifecycle', () => {
  it('stop() frees the port', async () => {
    const app = await defineApp({ root: makeRoot(), target: '#app' }).listen(0)
    const port = app.port
    expect(port).toBeGreaterThan(0)

    await app.stop()
    handle = null // don't stop again in afterEach

    // Port is freed — a new server on the same port should succeed.
    const app2 = await defineApp({ root: makeRoot(), target: '#app' }).listen(port!)
    handle = app2
    expect(app2.port).toBe(port)
  })
})
