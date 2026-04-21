/**
 * Phase F.1 — defineApp.mount() client-side mount integration.
 *
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from 'vitest'
import { defineApp } from '../src/define-app.js'
import type { LiteForgePlugin } from '@liteforge/runtime'

// Minimal root "component" — a plain render function returning a DOM node.
// The runtime accepts either a ComponentFactory (with __liteforge_component)
// or a plain () => Node. The latter is simpler for tests.
function makeRoot(markerId: string): () => Node {
  return () => {
    const el = document.createElement('div')
    el.id = markerId
    el.textContent = 'app-root-content'
    return el
  }
}

describe('defineApp.mount() — Phase F.1', () => {
  it('mounts the root into the target element', async () => {
    const target = document.createElement('div')
    target.id = 'lf-mount-test-1'
    document.body.appendChild(target)

    const app = await defineApp({ root: makeRoot('root-1'), target }).mount()

    const root = target.querySelector('#root-1')
    expect(root).not.toBeNull()
    expect(root!.textContent).toBe('app-root-content')

    app.unmount()
    target.remove()
  })

  it('installs user-registered plugins in order', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)

    const installOrder: string[] = []

    const pA: LiteForgePlugin = {
      name: 'plugin-a',
      install(ctx) {
        installOrder.push('a')
        ctx.provide('a', 'value-a')
      },
    }
    const pB: LiteForgePlugin = {
      name: 'plugin-b',
      install(ctx) {
        installOrder.push('b')
        ctx.provide('b', 'value-b')
      },
    }

    const app = await defineApp({ root: makeRoot('root-2'), target })
      .use(pA)
      .use(pB)
      .mount()

    expect(installOrder).toEqual(['a', 'b'])
    expect(app.use('a')).toBe('value-a')
    expect(app.use('b')).toBe('value-b')

    app.unmount()
    target.remove()
  })

  it('auto-installs server-client plugin last when serverModules() was called', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)

    const installOrder: string[] = []
    const userPlugin: LiteForgePlugin = {
      name: 'user',
      install() {
        installOrder.push('user')
      },
    }

    const mod = { _tag: 'ServerModule', name: 'greetings', fns: {} } as const

    const app = await defineApp({ root: makeRoot('root-3'), target })
      .use(userPlugin)
      .serverModules({ greetings: mod } as never)
      .mount()

    // The server-client plugin's install runs after user plugins and provides
    // the RPC proxy under 'server'.
    expect(installOrder).toEqual(['user'])
    const server = app.use('server') as { greetings: { hello: (i: unknown) => Promise<unknown> } }
    expect(typeof server).toBe('object')
    expect(typeof server.greetings.hello).toBe('function')

    app.unmount()
    target.remove()
  })

  it('returns an AppInstance with unmount + use + phantom $server/$ctx fields', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)

    const app = await defineApp({ root: makeRoot('root-4'), target }).mount()

    expect(typeof app.unmount).toBe('function')
    expect(typeof app.use).toBe('function')
    // $server and $ctx are phantom carriers — undefined at runtime, typed only.
    expect(app.$server).toBeUndefined()
    expect(app.$ctx).toBeUndefined()

    app.unmount()
    target.remove()
  })

  it('unmount() tears down the root from the target', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)

    const app = await defineApp({ root: makeRoot('root-5'), target }).mount()
    expect(target.querySelector('#root-5')).not.toBeNull()

    app.unmount()
    expect(target.querySelector('#root-5')).toBeNull()

    target.remove()
  })
})
