/**
 * Phase F.5 — Client-Bundle Pipeline integration tests.
 *
 * Covers .listen() and .dev() when `clientEntry` is provided:
 * - /client.js is served with the bundled entry
 * - HTML shell auto-references /client.js
 * - clientEntry NOT set → no /client.js endpoint, no auto-script
 * - Dev mode: file change → rebuild → reload broadcast
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
let projectDir: string | null = null

beforeEach(() => {
  handle = null
  projectDir = mkdtempSync(path.join(tmpdir(), 'lf-client-bundle-'))
  mkdirSync(path.join(projectDir, 'src'), { recursive: true })
  // Plain TS (no JSX, no liteforge imports) — keeps the bundle self-contained.
  writeFileSync(
    path.join(projectDir, 'src/client.ts'),
    `export const hello = 'client-bundle-v1'\nconsole.log(hello)\n`,
  )
})

afterEach(async () => {
  if (handle) {
    await handle.stop()
    handle = null
  }
  if (projectDir) {
    rmSync(projectDir, { recursive: true, force: true })
    projectDir = null
  }
})

describe('.listen({ clientEntry }) — client bundle serving', () => {
  it('serves the bundled client at /client.js', async () => {
    const app = await defineApp({ root: makeRoot(), target: '#app' })
      .listen({ port: 0, clientEntry: path.join(projectDir!, 'src/client.ts') })
    handle = app

    const res = await fetch(`http://localhost:${app.port}/client.js`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/javascript')

    const js = await res.text()
    expect(js).toContain('client-bundle-v1')
  })

  it('auto-injects <script src="/client.js"> into the HTML shell', async () => {
    const doc = defineDocument({ head: { title: 'With Client' } })
    const app = await defineApp({ root: makeRoot(), target: '#app', document: doc })
      .listen({ port: 0, clientEntry: path.join(projectDir!, 'src/client.ts') })
    handle = app

    const res = await fetch(`http://localhost:${app.port}/`)
    const html = await res.text()
    expect(html).toContain('<title>With Client</title>')
    expect(html).toContain('<script type="module" src="/client.js"></script>')
  })

  it('does NOT duplicate the client script if already in the user document', async () => {
    // User explicitly lists /client.js — facade must not add a second one.
    const doc = defineDocument({
      head: { scripts: [{ src: '/client.js', type: 'module' }] },
    })
    const app = await defineApp({ root: makeRoot(), target: '#app', document: doc })
      .listen({ port: 0, clientEntry: path.join(projectDir!, 'src/client.ts') })
    handle = app

    const res = await fetch(`http://localhost:${app.port}/`)
    const html = await res.text()
    const matches = html.match(/<script type="module" src="\/client\.js">/g)
    expect(matches).toHaveLength(1)
  })

  it('does NOT expose /client.js or inject the script when clientEntry is NOT set', async () => {
    const app = await defineApp({ root: makeRoot(), target: '#app' }).listen(0)
    handle = app

    const clientRes = await fetch(`http://localhost:${app.port}/client.js`)
    expect(clientRes.status).toBe(404)

    const htmlRes = await fetch(`http://localhost:${app.port}/`)
    const html = await htmlRes.text()
    expect(html).not.toContain('src="/client.js"')
  })
})

describe('.dev({ clientEntry }) — rebuild on file change', () => {
  it('rebuilds the bundle and reloads when the client source changes', async () => {
    const clientEntry = path.join(projectDir!, 'src/client.ts')
    const app = await defineApp({ root: makeRoot(), target: '#app' })
      .dev({
        port: 0,
        clientEntry,
        watchDir: path.join(projectDir!, 'src'),
      })
    handle = app

    // Initial bundle
    const initialRes = await fetch(`http://localhost:${app.port}/client.js`)
    const initialJs = await initialRes.text()
    expect(initialJs).toContain('client-bundle-v1')

    // Discover HMR WebSocket URL from the HTML shell
    const htmlRes = await fetch(`http://localhost:${app.port}/`)
    const html = await htmlRes.text()
    const match = html.match(/const url = "(ws:\/\/[^"]+__liteforge_hmr__)"/)
    expect(match).not.toBeNull()
    const hmrUrl = match![1]!

    // Connect WS client, wait for reload message after file change
    const reloadPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('No reload within 3s')), 3000)
      const ws = new WebSocket(hmrUrl)
      ws.onopen = () => {
        setTimeout(() => {
          writeFileSync(
            clientEntry,
            `export const hello = 'client-bundle-v2'\nconsole.log(hello)\n`,
          )
        }, 50)
      }
      ws.onmessage = () => {
        clearTimeout(timeout)
        ws.close()
        resolve()
      }
      ws.onerror = () => {
        clearTimeout(timeout)
        reject(new Error('WS error'))
      }
    })

    await reloadPromise

    // The rebuilt bundle now serves the new content
    const nextRes = await fetch(`http://localhost:${app.port}/client.js`)
    const nextJs = await nextRes.text()
    expect(nextJs).toContain('client-bundle-v2')
  })
})
