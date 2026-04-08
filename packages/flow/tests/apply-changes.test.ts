import { describe, it, expect } from 'vitest'
import { applyNodeChanges, applyEdgeChanges } from '../src/helpers/apply-changes.js'
import type { FlowNode, FlowEdge } from '../src/types.js'

// ---- helpers ----

function makeNode(id: string, x = 0, y = 0, selected = false): FlowNode {
  return { id, type: 'default', position: { x, y }, data: null, selected }
}

function makeEdge(id: string, selected = false): FlowEdge {
  return {
    id,
    source: 'a',
    sourceHandle: 'out',
    target: 'b',
    targetHandle: 'in',
    selected,
  }
}

// ---- applyNodeChanges ----

describe('applyNodeChanges', () => {
  it('returns the same array reference when no changes', () => {
    const nodes = [makeNode('1')]
    const result = applyNodeChanges([], nodes)
    expect(result).toBe(nodes)
  })

  it('returns an empty array from an empty nodes list', () => {
    const result = applyNodeChanges([{ type: 'remove', id: 'x' }], [])
    expect(result).toEqual([])
  })

  it('updates position of a matching node', () => {
    const nodes = [makeNode('1', 10, 20), makeNode('2', 30, 40)]
    const result = applyNodeChanges(
      [{ type: 'position', id: '1', position: { x: 100, y: 200 } }],
      nodes,
    )
    expect(result[0]!.position).toEqual({ x: 100, y: 200 })
    expect(result[1]!.position).toEqual({ x: 30, y: 40 })
  })

  it('does not mutate the original node when updating position', () => {
    const node = makeNode('1', 10, 20)
    const nodes = [node]
    applyNodeChanges([{ type: 'position', id: '1', position: { x: 99, y: 99 } }], nodes)
    expect(node.position).toEqual({ x: 10, y: 20 })
  })

  it('updates selected flag on a matching node', () => {
    const nodes = [makeNode('1', 0, 0, false)]
    const result = applyNodeChanges([{ type: 'select', id: '1', selected: true }], nodes)
    expect(result[0]!.selected).toBe(true)
  })

  it('removes a node matching a remove change', () => {
    const nodes = [makeNode('1'), makeNode('2'), makeNode('3')]
    const result = applyNodeChanges([{ type: 'remove', id: '2' }], nodes)
    expect(result).toHaveLength(2)
    expect(result.map(n => n.id)).toEqual(['1', '3'])
  })

  it('passes through nodes not referenced by any change', () => {
    const n1 = makeNode('1', 5, 5)
    const n2 = makeNode('2', 10, 10)
    const result = applyNodeChanges([{ type: 'remove', id: '99' }], [n1, n2])
    expect(result).toEqual([n1, n2])
  })

  it('applies multiple changes in one call', () => {
    const nodes = [makeNode('a', 0, 0), makeNode('b', 0, 0), makeNode('c', 0, 0)]
    const result = applyNodeChanges(
      [
        { type: 'position', id: 'a', position: { x: 1, y: 2 } },
        { type: 'select', id: 'b', selected: true },
        { type: 'remove', id: 'c' },
      ],
      nodes,
    )
    expect(result).toHaveLength(2)
    expect(result[0]!.position).toEqual({ x: 1, y: 2 })
    expect(result[1]!.selected).toBe(true)
  })

  it('preserves node data and type on position change', () => {
    const nodes = [{ id: '1', type: 'custom', position: { x: 0, y: 0 }, data: { foo: 42 } }]
    const result = applyNodeChanges(
      [{ type: 'position', id: '1', position: { x: 7, y: 8 } }],
      nodes,
    )
    expect(result[0]!.data).toEqual({ foo: 42 })
    expect(result[0]!.type).toBe('custom')
  })

  it('handles change referencing a non-existent id gracefully', () => {
    const nodes = [makeNode('1')]
    const result = applyNodeChanges([{ type: 'remove', id: 'missing' }], nodes)
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('1')
  })
})

// ---- applyEdgeChanges ----

describe('applyEdgeChanges', () => {
  it('returns the same array reference when no changes', () => {
    const edges = [makeEdge('e1')]
    const result = applyEdgeChanges([], edges)
    expect(result).toBe(edges)
  })

  it('updates selected flag on a matching edge', () => {
    const edges = [makeEdge('e1', false)]
    const result = applyEdgeChanges([{ type: 'select', id: 'e1', selected: true }], edges)
    expect(result[0]!.selected).toBe(true)
  })

  it('does not mutate the original edge when updating selected', () => {
    const edge = makeEdge('e1', false)
    applyEdgeChanges([{ type: 'select', id: 'e1', selected: true }], [edge])
    expect(edge.selected).toBe(false)
  })

  it('removes an edge matching a remove change', () => {
    const edges = [makeEdge('e1'), makeEdge('e2'), makeEdge('e3')]
    const result = applyEdgeChanges([{ type: 'remove', id: 'e2' }], edges)
    expect(result).toHaveLength(2)
    expect(result.map(e => e.id)).toEqual(['e1', 'e3'])
  })

  it('passes through edges not referenced by any change', () => {
    const e1 = makeEdge('e1')
    const e2 = makeEdge('e2')
    const result = applyEdgeChanges([{ type: 'remove', id: 'missing' }], [e1, e2])
    expect(result).toEqual([e1, e2])
  })

  it('applies multiple changes in one call', () => {
    const edges = [makeEdge('e1'), makeEdge('e2'), makeEdge('e3')]
    const result = applyEdgeChanges(
      [
        { type: 'select', id: 'e1', selected: true },
        { type: 'remove', id: 'e3' },
      ],
      edges,
    )
    expect(result).toHaveLength(2)
    expect(result[0]!.selected).toBe(true)
    expect(result[1]!.id).toBe('e2')
  })

  it('returns an empty array from an empty edges list', () => {
    const result = applyEdgeChanges([{ type: 'remove', id: 'x' }], [])
    expect(result).toEqual([])
  })
})

  it('type:data updates node data field', () => {
    const nodes = [makeNode('1')]
    const result = applyNodeChanges([{ type: 'data', id: '1', data: { label: 'Updated' } }], nodes)
    expect((result[0]!.data as { label: string }).label).toBe('Updated')
  })

  it('type:data preserves other node fields', () => {
    const nodes = [makeNode('1', 50, 80)]
    const result = applyNodeChanges([{ type: 'data', id: '1', data: { x: 99 } }], nodes)
    expect(result[0]!.position).toEqual({ x: 50, y: 80 })
    expect(result[0]!.id).toBe('1')
  })
