import { describe, it, expect } from 'vitest'
import { defineApp } from '../src/define-app.js'
import { BUILDER_STATE, type BuilderState } from '../src/_internal.js'

function getState(builder: unknown): BuilderState {
  return (builder as Record<symbol, BuilderState>)[BUILDER_STATE]!
}

describe('defineApp — builder chain (Phase B)', () => {
  it('returns a chainable builder', () => {
    const b = defineApp({ root: {}, target: '#app' })
    expect(typeof b.plugin).toBe('function')
    expect(typeof b.use).toBe('function')
    expect(typeof b.serverModules).toBe('function')
  })

  it('accumulates OakBun plugins via .plugin()', () => {
    const p1 = { name: 'db' } as unknown as Parameters<ReturnType<typeof defineApp>['plugin']>[0]
    const p2 = { name: 'jwt' } as unknown as typeof p1
    const b = defineApp({ root: {}, target: '#app' }).plugin(p1).plugin(p2)
    const state = getState(b)
    expect(state.oakbunPlugins).toHaveLength(2)
    expect(state.oakbunPlugins[0]!.name).toBe('db')
    expect(state.oakbunPlugins[1]!.name).toBe('jwt')
  })

  it('accumulates LiteForge plugins via .use()', () => {
    const rp = { name: 'router', install() {} }
    const tp = { name: 'toast', install() {} }
    const b = defineApp({ root: {}, target: '#app' }).use(rp).use(tp)
    const state = getState(b)
    expect(state.liteforgePlugins).toHaveLength(2)
    expect(state.liteforgePlugins[0]!.name).toBe('router')
    expect(state.liteforgePlugins[1]!.name).toBe('toast')
  })

  it('registers server modules via .serverModules()', () => {
    const mod = { _tag: 'ServerModule', name: 'greetings', fns: {} } as const
    const b = defineApp({ root: {}, target: '#app' })
      .serverModules({ greetings: mod } as never)
    const state = getState(b)
    expect(state.modulesMap).not.toBeNull()
    expect(state.modulesMap!['greetings']).toBe(mod)
    expect(state.serverModulesCalled).toBe(true)
  })

  it('supports mixed chain: plugin, use, serverModules in any order', () => {
    const oakbunP = { name: 'db' } as unknown as Parameters<ReturnType<typeof defineApp>['plugin']>[0]
    const liteP = { name: 'router', install() {} }
    const mod = { _tag: 'ServerModule', name: 'm', fns: {} } as const

    const b = defineApp({ root: {}, target: '#app' })
      .use(liteP)
      .plugin(oakbunP)
      .serverModules({ m: mod } as never)

    const state = getState(b)
    expect(state.oakbunPlugins).toHaveLength(1)
    expect(state.liteforgePlugins).toHaveLength(1)
    expect(state.modulesMap).toEqual({ m: mod })
    expect(state.serverModulesCalled).toBe(true)
  })

  it('preserves config options (root, target, context, document) in state', () => {
    const root = {}
    const ctx = { version: '1.0' as const }
    const doc = { _tag: 'LiteForgeDocument', config: { lang: 'en' } } as const
    const b = defineApp({ root, target: '#app', context: ctx, document: doc })
    const state = getState(b)
    expect(state.options.root).toBe(root)
    expect(state.options.target).toBe('#app')
    expect(state.options.context).toBe(ctx)
    expect(state.options.document).toBe(doc)
  })

  it('omits optional config fields from state when not provided', () => {
    const b = defineApp({ root: {}, target: '#app' })
    const state = getState(b)
    expect(state.options.context).toBeUndefined()
    expect(state.options.document).toBeUndefined()
  })

  it('serverModulesCalled flag defaults to false', () => {
    const b = defineApp({ root: {}, target: '#app' })
    const state = getState(b)
    expect(state.serverModulesCalled).toBe(false)
    expect(state.modulesMap).toBeNull()
  })

  it('build/dev terminal methods still throw until Phase F.3/F.4', () => {
    const b = defineApp({ root: {}, target: '#app' })
    expect(() => b.build({ outDir: './dist' })).toThrow(/not implemented yet/)
    expect(() => b.dev({ port: 3000 })).toThrow(/not implemented yet/)
  })
})
