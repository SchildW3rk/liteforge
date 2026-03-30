import { describe, it, expect } from 'vitest'
import { createHandleRegistry } from '../src/registry/handle-registry.js'
import type { FlowNode } from '../src/types.js'

function makeNode(id: string, x: number, y: number): FlowNode {
  return { id, type: 'default', position: { x, y }, data: null }
}

describe('createHandleRegistry', () => {
  it('version starts at 0', () => {
    const reg = createHandleRegistry()
    expect(reg.version()).toBe(0)
  })

  it('register increments version', () => {
    const reg = createHandleRegistry()
    reg.register('n1', 'h1', { x: 10, y: 20 }, 'source')
    expect(reg.version()).toBe(1)
  })

  it('unregister increments version', () => {
    const reg = createHandleRegistry()
    reg.register('n1', 'h1', { x: 10, y: 20 }, 'source')
    reg.unregister('n1', 'h1')
    expect(reg.version()).toBe(2)
  })

  it('unregister on unknown handle does NOT increment version', () => {
    const reg = createHandleRegistry()
    reg.unregister('n1', 'h_unknown')
    // No entry existed, so nothing changed — version stays at 0
    expect(reg.version()).toBe(0)
  })

  it('getEntry returns undefined for unknown handle', () => {
    const reg = createHandleRegistry()
    expect(reg.getEntry('n1', 'h1')).toBeUndefined()
  })

  it('getEntry returns the registered entry', () => {
    const reg = createHandleRegistry()
    reg.register('n1', 'h1', { x: 5, y: 15 }, 'target')
    const entry = reg.getEntry('n1', 'h1')
    expect(entry).toEqual({ offset: { x: 5, y: 15 }, type: 'target' })
  })

  it('unregister removes the entry (getEntry returns undefined after)', () => {
    const reg = createHandleRegistry()
    reg.register('n1', 'h1', { x: 5, y: 15 }, 'source')
    reg.unregister('n1', 'h1')
    expect(reg.getEntry('n1', 'h1')).toBeUndefined()
  })

  it('getAbsolutePosition returns undefined when node not found in nodes array', () => {
    const reg = createHandleRegistry()
    reg.register('n1', 'h1', { x: 10, y: 20 }, 'source')
    const nodes: FlowNode[] = []
    expect(reg.getAbsolutePosition('n1', 'h1', nodes)).toBeUndefined()
  })

  it('getAbsolutePosition returns undefined when handle not registered', () => {
    const reg = createHandleRegistry()
    const nodes = [makeNode('n1', 100, 200)]
    expect(reg.getAbsolutePosition('n1', 'h_missing', nodes)).toBeUndefined()
  })

  it('getAbsolutePosition = node.position + handle offset', () => {
    const reg = createHandleRegistry()
    reg.register('n1', 'h1', { x: 10, y: 20 }, 'source')
    const nodes = [makeNode('n1', 100, 200)]
    const pos = reg.getAbsolutePosition('n1', 'h1', nodes)
    expect(pos).toEqual({ x: 110, y: 220 })
  })

  it('supports multiple handles on the same node', () => {
    const reg = createHandleRegistry()
    reg.register('n1', 'h-source', { x: 10, y: 0  }, 'source')
    reg.register('n1', 'h-target', { x: 10, y: 50 }, 'target')

    const nodes = [makeNode('n1', 100, 200)]

    expect(reg.getAbsolutePosition('n1', 'h-source', nodes)).toEqual({ x: 110, y: 200 })
    expect(reg.getAbsolutePosition('n1', 'h-target', nodes)).toEqual({ x: 110, y: 250 })
  })

  it('re-registering the same handle updates the stored offset', () => {
    const reg = createHandleRegistry()
    reg.register('n1', 'h1', { x: 10, y: 20 }, 'source')
    reg.register('n1', 'h1', { x: 99, y: 88 }, 'source')

    const entry = reg.getEntry('n1', 'h1')
    expect(entry?.offset).toEqual({ x: 99, y: 88 })
  })

  it('each register call increments version (re-register counts too)', () => {
    const reg = createHandleRegistry()
    reg.register('n1', 'h1', { x: 10, y: 20 }, 'source')
    reg.register('n1', 'h1', { x: 99, y: 88 }, 'source')
    expect(reg.version()).toBe(2)
  })

  it('handles on different nodes are stored independently', () => {
    const reg = createHandleRegistry()
    reg.register('n1', 'h1', { x: 10, y: 20 }, 'source')
    reg.register('n2', 'h1', { x: 30, y: 40 }, 'target')

    const nodes = [makeNode('n1', 0, 0), makeNode('n2', 50, 50)]

    expect(reg.getAbsolutePosition('n1', 'h1', nodes)).toEqual({ x: 10, y: 20 })
    expect(reg.getAbsolutePosition('n2', 'h1', nodes)).toEqual({ x: 80, y: 90 })
  })
})
