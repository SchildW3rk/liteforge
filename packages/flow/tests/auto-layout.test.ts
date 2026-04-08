import { describe, it, expect } from 'vitest'
import { createAutoLayout } from '../src/helpers/auto-layout.js'
import type { FlowNode, FlowEdge, NodeChange } from '../src/types.js'

// ---- helpers ----

function node(id: string, x = 0, y = 0): FlowNode {
  return { id, type: 'default', position: { x, y }, data: null }
}

function edge(source: string, target: string): FlowEdge {
  return { id: `${source}-${target}`, source, sourceHandle: 'out', target, targetHandle: 'in' }
}

function posMap(changes: NodeChange[]): Map<string, { x: number; y: number }> {
  const m = new Map<string, { x: number; y: number }>()
  for (const c of changes) {
    if (c.type === 'position') m.set(c.id, c.position)
  }
  return m
}

// ---- Tests ----

describe('createAutoLayout', () => {
  it('returns empty changes for empty node array', () => {
    const al = createAutoLayout()
    expect(al.layout([], [])).toEqual([])
  })

  it('produces a position change for every node', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const al = createAutoLayout()
    const changes = al.layout(nodes, [])
    expect(changes).toHaveLength(3)
    expect(changes.every(c => c.type === 'position')).toBe(true)
  })

  it('all node IDs are represented in changes', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const al = createAutoLayout()
    const changes = al.layout(nodes, [])
    const ids = new Set(changes.map(c => c.id))
    expect(ids.has('a')).toBe(true)
    expect(ids.has('b')).toBe(true)
    expect(ids.has('c')).toBe(true)
  })

  it('LR direction: successor nodes have greater x than predecessors', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const edges = [edge('a', 'b'), edge('b', 'c')]
    const al = createAutoLayout({ direction: 'LR' })
    const pos = posMap(al.layout(nodes, edges))
    expect(pos.get('a')!.x).toBeLessThan(pos.get('b')!.x)
    expect(pos.get('b')!.x).toBeLessThan(pos.get('c')!.x)
  })

  it('TB direction: successor nodes have greater y than predecessors', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const edges = [edge('a', 'b'), edge('b', 'c')]
    const al = createAutoLayout({ direction: 'TB' })
    const pos = posMap(al.layout(nodes, edges))
    expect(pos.get('a')!.y).toBeLessThan(pos.get('b')!.y)
    expect(pos.get('b')!.y).toBeLessThan(pos.get('c')!.y)
  })

  it('nodes in the same rank are offset along the cross axis', () => {
    // a → c and b → c: both a and b are rank 0, c is rank 1
    const nodes = [node('a'), node('b'), node('c')]
    const edges = [edge('a', 'c'), edge('b', 'c')]
    const al = createAutoLayout({ direction: 'LR' })
    const pos = posMap(al.layout(nodes, edges))
    // a and b are same x (rank 0), but different y
    expect(pos.get('a')!.x).toBe(pos.get('b')!.x)
    expect(pos.get('a')!.y).not.toBe(pos.get('b')!.y)
  })

  it('rankSpacing controls distance between ranks', () => {
    const nodes = [node('a'), node('b')]
    const edges = [edge('a', 'b')]
    const al40 = createAutoLayout({ direction: 'LR', rankSpacing: 40 })
    const al200 = createAutoLayout({ direction: 'LR', rankSpacing: 200 })
    const pos40  = posMap(al40.layout(nodes, edges))
    const pos200 = posMap(al200.layout(nodes, edges))
    const gap40  = pos40.get('b')!.x  - pos40.get('a')!.x
    const gap200 = pos200.get('b')!.x - pos200.get('a')!.x
    expect(gap200).toBeGreaterThan(gap40)
  })

  it('nodeSpacing controls distance between nodes in same rank', () => {
    const nodes = [node('a'), node('b')]
    // No edges → both rank 0
    const al20  = createAutoLayout({ direction: 'LR', nodeSpacing: 20 })
    const al100 = createAutoLayout({ direction: 'LR', nodeSpacing: 100 })
    const pos20  = posMap(al20.layout(nodes, []))
    const pos100 = posMap(al100.layout(nodes, []))
    const gap20  = Math.abs(pos20.get('b')!.y  - pos20.get('a')!.y)
    const gap100 = Math.abs(pos100.get('b')!.y - pos100.get('a')!.y)
    expect(gap100).toBeGreaterThan(gap20)
  })

  it('handles graph with no edges — nodes placed in a single rank', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const al = createAutoLayout({ direction: 'LR' })
    const pos = posMap(al.layout(nodes, []))
    // All rank 0 → same x
    expect(pos.get('a')!.x).toBe(pos.get('b')!.x)
    expect(pos.get('b')!.x).toBe(pos.get('c')!.x)
  })

  it('handles cyclic graphs without crashing', () => {
    const nodes = [node('a'), node('b'), node('c')]
    const edges = [edge('a', 'b'), edge('b', 'c'), edge('c', 'a')]
    const al = createAutoLayout()
    expect(() => al.layout(nodes, edges)).not.toThrow()
    const changes = al.layout(nodes, edges)
    expect(changes).toHaveLength(3)
  })

  it('ignores edges to/from unknown node IDs', () => {
    const nodes = [node('a'), node('b')]
    const edges = [edge('a', 'b'), edge('a', 'z')]  // 'z' not in nodes
    const al = createAutoLayout()
    expect(() => al.layout(nodes, edges)).not.toThrow()
    const changes = al.layout(nodes, edges)
    expect(changes).toHaveLength(2)
  })

  it('ignores self-loop edges', () => {
    const nodes = [node('a')]
    const edges = [edge('a', 'a')]
    const al = createAutoLayout()
    expect(() => al.layout(nodes, edges)).not.toThrow()
  })

  it('computePositions returns a Map with entry per node', () => {
    const nodes = [node('a'), node('b')]
    const al = createAutoLayout()
    const map = al.computePositions(nodes, [edge('a', 'b')])
    expect(map.size).toBe(2)
    expect(map.has('a')).toBe(true)
    expect(map.has('b')).toBe(true)
  })

  it('computePositions returns empty Map for empty nodes', () => {
    const al = createAutoLayout()
    expect(al.computePositions([], []).size).toBe(0)
  })

  it('RL direction: successor nodes have smaller x', () => {
    const nodes = [node('a'), node('b')]
    const al = createAutoLayout({ direction: 'RL' })
    const pos = posMap(al.layout(nodes, [edge('a', 'b')]))
    expect(pos.get('b')!.x).toBeLessThan(pos.get('a')!.x)
  })

  it('BT direction: successor nodes have smaller y', () => {
    const nodes = [node('a'), node('b')]
    const al = createAutoLayout({ direction: 'BT' })
    const pos = posMap(al.layout(nodes, [edge('a', 'b')]))
    expect(pos.get('b')!.y).toBeLessThan(pos.get('a')!.y)
  })

  it('custom getNodeSize is used for spacing computation', () => {
    const nodes = [node('a'), node('b')]
    const alDefault = createAutoLayout({ direction: 'LR', nodeSpacing: 0 })
    const alCustom  = createAutoLayout({
      direction: 'LR',
      nodeSpacing: 0,
      getNodeSize: () => ({ width: 400, height: 200 }),
    })
    const posDefault = posMap(alDefault.layout(nodes, [edge('a', 'b')]))
    const posCustom  = posMap(alCustom.layout(nodes, [edge('a', 'b')]))
    // With larger node size the rank gap is bigger
    const gapDefault = posDefault.get('b')!.x - posDefault.get('a')!.x
    const gapCustom  = posCustom.get('b')!.x  - posCustom.get('a')!.x
    expect(gapCustom).toBeGreaterThan(gapDefault)
  })

  it('longer chain places nodes at monotonically increasing ranks', () => {
    const nodes = [node('a'), node('b'), node('c'), node('d'), node('e')]
    const edges = [edge('a', 'b'), edge('b', 'c'), edge('c', 'd'), edge('d', 'e')]
    const al = createAutoLayout({ direction: 'TB' })
    const pos = posMap(al.layout(nodes, edges))
    expect(pos.get('a')!.y).toBeLessThan(pos.get('b')!.y)
    expect(pos.get('b')!.y).toBeLessThan(pos.get('c')!.y)
    expect(pos.get('c')!.y).toBeLessThan(pos.get('d')!.y)
    expect(pos.get('d')!.y).toBeLessThan(pos.get('e')!.y)
  })

  it('diamond graph: merge node is in a later rank than both branches', () => {
    //   a → b
    //   a → c
    //   b → d
    //   c → d
    const nodes = [node('a'), node('b'), node('c'), node('d')]
    const edges = [edge('a', 'b'), edge('a', 'c'), edge('b', 'd'), edge('c', 'd')]
    const al = createAutoLayout({ direction: 'LR' })
    const pos = posMap(al.layout(nodes, edges))
    expect(pos.get('a')!.x).toBeLessThan(pos.get('b')!.x)
    expect(pos.get('a')!.x).toBeLessThan(pos.get('c')!.x)
    expect(pos.get('b')!.x).toBeLessThan(pos.get('d')!.x)
    expect(pos.get('c')!.x).toBeLessThan(pos.get('d')!.x)
  })
})
