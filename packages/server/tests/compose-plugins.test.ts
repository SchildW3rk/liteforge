import { describe, it, expect, vi } from 'vitest'
import {
  defineApp,
  composeLiteForgePlugins,
  composeLiteForgePluginsForServer,
  createServerClientLiteForgePlugin,
} from '../src/define-app.js'
import { BUILDER_STATE, type BuilderState } from '../src/_internal.js'
import type { LiteForgePlugin } from '@liteforge/runtime'

function getState(builder: unknown): BuilderState {
  return (builder as Record<symbol, BuilderState>)[BUILDER_STATE]!
}

describe('composeLiteForgePlugins — Phase D', () => {
  it('returns just user plugins if serverModules() was not called', () => {
    const router = { name: 'router', install() {} }
    const toast = { name: 'toast', install() {} }

    const b = defineApp({ root: {}, target: '#app' }).use(router).use(toast)
    const plugins = composeLiteForgePlugins(getState(b))

    expect(plugins).toHaveLength(2)
    expect(plugins[0]!.name).toBe('router')
    expect(plugins[1]!.name).toBe('toast')
  })

  it('appends serverClientPlugin LAST when serverModules() was called', () => {
    const router = { name: 'router', install() {} }
    const toast = { name: 'toast', install() {} }
    const mod = { _tag: 'ServerModule', name: 'greetings', fns: {} } as const

    const b = defineApp({ root: {}, target: '#app' })
      .use(router)
      .use(toast)
      .serverModules({ greetings: mod } as never)

    const plugins = composeLiteForgePlugins(getState(b))

    expect(plugins).toHaveLength(3)
    expect(plugins[0]!.name).toBe('router')
    expect(plugins[1]!.name).toBe('toast')
    expect(plugins[2]!.name).toBe('liteforge-server-client')
  })

  it('appends server plugin even when .use() comes AFTER .serverModules()', () => {
    // Chain order: serverModules -> use — server plugin still ends up LAST.
    const router = { name: 'router', install() {} }
    const mod = { _tag: 'ServerModule', name: 'greetings', fns: {} } as const

    const b = defineApp({ root: {}, target: '#app' })
      .serverModules({ greetings: mod } as never)
      .use(router)

    const plugins = composeLiteForgePlugins(getState(b))

    expect(plugins).toHaveLength(2)
    expect(plugins[0]!.name).toBe('router')
    expect(plugins[1]!.name).toBe('liteforge-server-client')
  })

  it('does not mutate builder state when composing', () => {
    const mod = { _tag: 'ServerModule', name: 'greetings', fns: {} } as const
    const b = defineApp({ root: {}, target: '#app' }).serverModules({ greetings: mod } as never)
    const state = getState(b)
    const userPluginsBefore = state.liteforgePlugins.length

    composeLiteForgePlugins(state)
    composeLiteForgePlugins(state)
    composeLiteForgePlugins(state)

    expect(state.liteforgePlugins).toHaveLength(userPluginsBefore)
  })
})

describe('createServerClientLiteForgePlugin — Phase D', () => {
  it('returns a LiteForgePlugin with name "liteforge-server-client"', () => {
    const mod = { _tag: 'ServerModule', name: 'greetings', fns: {} } as const
    const plugin = createServerClientLiteForgePlugin({ greetings: mod } as never)
    expect(plugin.name).toBe('liteforge-server-client')
    expect(typeof plugin.install).toBe('function')
  })

  it('install() calls provide("server", proxy)', () => {
    const mod = { _tag: 'ServerModule', name: 'greetings', fns: {} } as const
    const plugin = createServerClientLiteForgePlugin({ greetings: mod } as never)

    const provided: Record<string, unknown> = {}
    const fakeCtx = {
      target: globalThis.document?.createElement('div') ?? ({} as HTMLElement),
      provide(key: string, value: unknown) {
        provided[key] = value
      },
      resolve<T>(key: string): T | undefined {
        return provided[key] as T | undefined
      },
    }

    plugin.install(fakeCtx as Parameters<LiteForgePlugin['install']>[0])

    expect(provided['server']).toBeDefined()
    // The proxy auto-generates module.fn chains — calling any key returns a Proxy
    const server = provided['server'] as Record<string, Record<string, unknown>>
    expect(typeof server).toBe('object')
  })

  it('provided proxy is callable via greetings.hello(input)', () => {
    const mod = { _tag: 'ServerModule', name: 'greetings', fns: {} } as const
    const plugin = createServerClientLiteForgePlugin({ greetings: mod } as never)

    const provided: Record<string, unknown> = {}
    const fakeCtx = {
      target: {} as HTMLElement,
      provide(key: string, value: unknown) {
        provided[key] = value
      },
      resolve<T>(key: string): T | undefined {
        return provided[key] as T | undefined
      },
    }

    plugin.install(fakeCtx as Parameters<LiteForgePlugin['install']>[0])
    const server = provided['server'] as {
      greetings: { hello: (input: unknown) => Promise<unknown> }
    }

    // Access chain produces a function — the fetch would happen if called
    expect(typeof server.greetings.hello).toBe('function')
  })
})

describe('lazy plugin factories (Weg D)', () => {
  it('composeLiteForgePlugins evaluates factories (for .mount() path)', () => {
    const eager: LiteForgePlugin = { name: 'eager', install() {} }
    const lazy: LiteForgePlugin = { name: 'lazy', install() {} }
    const factory = vi.fn(() => lazy)

    const b = defineApp({ root: {}, target: '#app' })
      .use(eager)
      .use(factory)

    const plugins = composeLiteForgePlugins(getState(b))

    expect(factory).toHaveBeenCalledTimes(1)
    expect(plugins.map((p) => p.name)).toEqual(['eager', 'lazy'])
  })

  it('composeLiteForgePluginsForServer SKIPS factories (for .listen()/.dev() path)', () => {
    const eager: LiteForgePlugin = { name: 'eager', install() {} }
    const factory = vi.fn((): LiteForgePlugin => ({ name: 'would-crash-on-server', install() {} }))

    const b = defineApp({ root: {}, target: '#app' })
      .use(eager)
      .use(factory)

    const plugins = composeLiteForgePluginsForServer(getState(b))

    expect(factory).not.toHaveBeenCalled()
    expect(plugins.map((p) => p.name)).toEqual(['eager'])
  })

  it('factory is re-evaluated on every composeLiteForgePlugins call', () => {
    // Important for HMR-style re-mounts — a factory may produce a fresh
    // plugin instance per mount cycle.
    const factory = vi.fn((): LiteForgePlugin => ({ name: 'fresh', install() {} }))

    const b = defineApp({ root: {}, target: '#app' }).use(factory)

    composeLiteForgePlugins(getState(b))
    composeLiteForgePlugins(getState(b))
    composeLiteForgePlugins(getState(b))

    expect(factory).toHaveBeenCalledTimes(3)
  })
})
