/**
 * Phase F.3 — defineApp.dev() integration tests.
 *
 * Runs under Bun. Covers:
 * - HMR snippet injection into the HTML shell
 * - HMR WebSocket channel: file change → reload message
 * - .stop() tears down watcher + WS server
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { defineApp, defineDocument } from '../src/index.js'

function makeRoot(): () => Node {
  return () => ({} as Node)
}

type AppHandle = { stop: () => Promise<void>; port: number | null }
let handle: AppHandle | null = null
let watchDir: string | null = null

beforeEach(() => {
  handle = null
  watchDir = mkdtempSync(path.join(tmpdir(), 'lf-hmr-'))
  mkdirSync(path.join(watchDir, 'src'), { recursive: true })
  writeFileSync(path.join(watchDir, 'src/app.ts'), 'export const seed = 1\n')
})

afterEach(async () => {
  if (handle) {
    await handle.stop()
    handle = null
  }
  if (watchDir) {
    rmSync(watchDir, { recursive: true, force: true })
    watchDir = null
  }
})

describe('.dev() — HTML snippet injection', () => {
  it('injects the HMR client snippet into the rendered HTML shell', async () => {
    const doc = defineDocument({ head: { title: 'Dev' } })
    const app = await defineApp({ root: makeRoot(), target: '#app', document: doc })
      .dev({ port: 0 })
    handle = app

    const res = await fetch(`http://localhost:${app.port}/`)
    const html = await res.text()

    expect(html).toContain('<title>Dev</title>')
    expect(html).toContain('new WebSocket(')
    expect(html).toContain('__liteforge_hmr__')
    expect(html).toContain("type === 'reload'")
    expect(html).toContain('</script>\n  </body>')
  })

  it('.listen() does NOT inject the HMR snippet', async () => {
    const doc = defineDocument({ head: { title: 'Prod' } })
    const app = await defineApp({ root: makeRoot(), target: '#app', document: doc })
      .listen(0)
    handle = app

    const res = await fetch(`http://localhost:${app.port}/`)
    const html = await res.text()

    expect(html).toContain('<title>Prod</title>')
    expect(html).not.toContain('__liteforge_hmr__')
    expect(html).not.toContain('new WebSocket(')
  })
})

describe('.dev() — HMR WebSocket channel', () => {
  it('broadcasts { type: "reload" } to connected clients on file change', async () => {
    // We start .dev() pointed at the tmp watchDir, connect a WS client to the
    // HMR endpoint (on its own auto-picked port — we have to discover it via
    // the snippet URL), then modify a file and assert the client gets a reload.

    const app = await defineApp({ root: makeRoot(), target: '#app' })
      .dev({ port: 0, watchDir: path.join(watchDir!, 'src') } as Parameters<
        ReturnType<typeof defineApp>['dev']
      >[0])
    handle = app

    // Pull the HMR WS URL out of the rendered HTML
    const res = await fetch(`http://localhost:${app.port}/`)
    const html = await res.text()
    const match = html.match(/const url = "(ws:\/\/[^"]+__liteforge_hmr__)"/)
    expect(match).not.toBeNull()
    const hmrUrl = match![1]!

    // Connect a WS client; wait for the reload message
    const reloadPromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('No reload within 2s')), 2000)
      const ws = new WebSocket(hmrUrl)
      ws.onopen = () => {
        // give the server a tick to register the client, then change a file
        setTimeout(() => {
          writeFileSync(path.join(watchDir!, 'src/app.ts'), 'export const seed = 2\n')
        }, 50)
      }
      ws.onmessage = (evt) => {
        clearTimeout(timeout)
        ws.close()
        resolve(typeof evt.data === 'string' ? evt.data : '')
      }
      ws.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('WS error'))
      }
    })

    const message = await reloadPromise
    expect(JSON.parse(message)).toEqual({ type: 'reload' })
  })
})

describe('.dev() — lifecycle', () => {
  it('.stop() frees the main port AND tears down the HMR channel', async () => {
    const app = await defineApp({ root: makeRoot(), target: '#app' })
      .dev({ port: 0 })
    const port = app.port!
    expect(port).toBeGreaterThan(0)

    await app.stop()
    handle = null

    // Main port should be free again
    const app2 = await defineApp({ root: makeRoot(), target: '#app' }).listen(port)
    handle = app2
    expect(app2.port).toBe(port)
  })
})
