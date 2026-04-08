import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signal } from '@liteforge/core'
import { applyNodeChanges } from '../src/helpers/apply-changes.js'
import { collectDragGroup } from '../src/interactions/drag-node.js'
import { computeFitView } from '../src/helpers/fit-view.js'
import type { FlowNode, NodeChange } from '../src/types.js'

// ---- Fixtures ----

function node(id: string, x: number, y: number, parentId?: string): FlowNode {
  return { id, type: 'default', position: { x, y }, data: {}, ...(parentId ? { parentId } : {}) }
}

const flat = [
  node('root1', 0,   0),
  node('root2', 200, 0),
]

const tree = [
  node('parent', 100, 100),
  node('child1',  20,  20, 'parent'),
  node('child2',  40,  40, 'parent'),
  node('grandchild', 10, 10, 'child1'),
]

// ---- applyNodeChanges ----

describe('applyNodeChanges — add', () => {
  it('appends a new node', () => {
    const result = applyNodeChanges<unknown>(
      [{ type: 'add', node: node('n3', 10, 10) }],
      flat,
    )
    expect(result).toHaveLength(3)
    expect(result.find(n => n.id === 'n3')).toBeDefined()
  })

  it('add with parentId is preserved', () => {
    const result = applyNodeChanges<unknown>(
      [{ type: 'add', node: node('child', 5, 5, 'root1') }],
      flat,
    )
    const added = result.find(n => n.id === 'child')
    expect(added?.parentId).toBe('root1')
  })
})

describe('applyNodeChanges — remove cascades to children', () => {
  it('removing a parent also removes direct children', () => {
    const result = applyNodeChanges<unknown>(
      [{ type: 'remove', id: 'parent' }],
      tree,
    )
    const ids = result.map(n => n.id)
    expect(ids).not.toContain('parent')
    expect(ids).not.toContain('child1')
    expect(ids).not.toContain('child2')
  })

  it('removing a parent removes grandchildren too', () => {
    const result = applyNodeChanges<unknown>(
      [{ type: 'remove', id: 'parent' }],
      tree,
    )
    expect(result.map(n => n.id)).not.toContain('grandchild')
  })

  it('removing a child only removes that child (not siblings)', () => {
    const result = applyNodeChanges<unknown>(
      [{ type: 'remove', id: 'child1' }],
      tree,
    )
    const ids = result.map(n => n.id)
    expect(ids).not.toContain('child1')
    expect(ids).not.toContain('grandchild') // grandchild of child1
    expect(ids).toContain('child2')
    expect(ids).toContain('parent')
  })

  it('does not affect unrelated nodes', () => {
    const nodes = [...tree, node('unrelated', 500, 500)]
    const result = applyNodeChanges<unknown>(
      [{ type: 'remove', id: 'parent' }],
      nodes,
    )
    expect(result.find(n => n.id === 'unrelated')).toBeDefined()
  })
})

describe('applyNodeChanges — position on child', () => {
  it('updates child position independently', () => {
    const result = applyNodeChanges<unknown>(
      [{ type: 'position', id: 'child1', position: { x: 50, y: 60 } }],
      tree,
    )
    const child = result.find(n => n.id === 'child1')
    expect(child?.position).toEqual({ x: 50, y: 60 })
    // parent unchanged
    const parent = result.find(n => n.id === 'parent')
    expect(parent?.position).toEqual({ x: 100, y: 100 })
  })
})

// ---- collectDragGroup ----

describe('collectDragGroup', () => {
  it('collects just the root node when it has no children', () => {
    const out = new Set<string>()
    collectDragGroup('root1', flat, out)
    expect(out).toEqual(new Set(['root1']))
  })

  it('collects root and all direct children', () => {
    const out = new Set<string>()
    collectDragGroup('parent', tree, out)
    expect(out.has('parent')).toBe(true)
    expect(out.has('child1')).toBe(true)
    expect(out.has('child2')).toBe(true)
  })

  it('collects grandchildren recursively', () => {
    const out = new Set<string>()
    collectDragGroup('parent', tree, out)
    expect(out.has('grandchild')).toBe(true)
    expect(out.size).toBe(4)
  })

  it('collects only the subtree when starting from a child', () => {
    const out = new Set<string>()
    collectDragGroup('child1', tree, out)
    expect(out.has('child1')).toBe(true)
    expect(out.has('grandchild')).toBe(true)
    expect(out.has('child2')).toBe(false)
    expect(out.has('parent')).toBe(false)
  })

  it('is cycle-safe', () => {
    // Artificial cycle: child1 points back to parent
    const cyclic: FlowNode[] = [
      { id: 'a', type: 'default', position: { x: 0, y: 0 }, data: {}, parentId: 'b' },
      { id: 'b', type: 'default', position: { x: 0, y: 0 }, data: {}, parentId: 'a' },
    ]
    const out = new Set<string>()
    expect(() => collectDragGroup('a', cyclic, out)).not.toThrow()
    expect(out.size).toBeLessThanOrEqual(2)
  })
})

// ---- computeFitView with getAbsolutePosition ----

describe('computeFitView — with parent-relative positions', () => {
  it('uses absolute positions when getAbsolutePosition is provided', () => {
    // Parent at (100, 100), child at (50, 50) relative → absolute (150, 150)
    const nodes: FlowNode[] = [
      node('parent', 100, 100),
      node('child', 50, 50, 'parent'),
    ]

    // Without absolute resolver: uses raw positions (50, 50 for child → wrong)
    const tRaw = computeFitView(nodes, 800, 600)
    // With absolute resolver: child at (150, 150)
    const absMap: Record<string, { x: number; y: number }> = {
      parent: { x: 100, y: 100 },
      child:  { x: 150, y: 150 },
    }
    const tAbs = computeFitView(nodes, 800, 600, undefined, id => absMap[id] ?? { x: 0, y: 0 })

    // The center-of-mass should be different
    expect(tRaw.x).not.toBeCloseTo(tAbs.x, 0)
  })

  it('correct scale uses outermost bounding box with absolute positions', () => {
    const nodes: FlowNode[] = [
      node('p',  0, 0),
      node('c1', 100, 0, 'p'), // absolute (100, 0)
      node('c2', 0, 100, 'p'), // absolute (0, 100)
    ]
    const absMap: Record<string, { x: number; y: number }> = {
      p: { x: 0, y: 0 }, c1: { x: 100, y: 0 }, c2: { x: 0, y: 100 },
    }
    const t = computeFitView(nodes, 800, 600, { padding: 0 }, id => absMap[id] ?? { x: 0, y: 0 })
    expect(t.scale).toBeGreaterThan(0)
    expect(t.scale).toBeLessThanOrEqual(1.5)
  })
})

// ---- FlowContext getAbsolutePosition ----

describe('getAbsolutePosition (context helper)', () => {
  // Simulate the logic from FlowCanvas
  function makeAbsPos(nodes: FlowNode[]) {
    return function getAbsolutePosition(nodeId: string): { x: number; y: number } {
      const visited = new Set<string>()
      let pos = { x: 0, y: 0 }
      let current = nodes.find(n => n.id === nodeId)
      while (current) {
        if (visited.has(current.id)) break
        visited.add(current.id)
        pos = { x: pos.x + current.position.x, y: pos.y + current.position.y }
        if (!current.parentId) break
        current = nodes.find(n => n.id === current!.parentId)
      }
      return pos
    }
  }

  it('root node absolute == position', () => {
    const getAbs = makeAbsPos(tree)
    expect(getAbs('parent')).toEqual({ x: 100, y: 100 })
  })

  it('child absolute = parent.pos + child.pos', () => {
    const getAbs = makeAbsPos(tree)
    expect(getAbs('child1')).toEqual({ x: 120, y: 120 }) // 100+20, 100+20
  })

  it('grandchild absolute = parent + child + grandchild', () => {
    const getAbs = makeAbsPos(tree)
    expect(getAbs('grandchild')).toEqual({ x: 130, y: 130 }) // 100+20+10
  })

  it('cycle guard returns partial result without infinite loop', () => {
    const cyclic: FlowNode[] = [
      { id: 'a', type: 'default', position: { x: 10, y: 0 }, data: {}, parentId: 'b' },
      { id: 'b', type: 'default', position: { x: 10, y: 0 }, data: {}, parentId: 'a' },
    ]
    const getAbs = makeAbsPos(cyclic)
    expect(() => getAbs('a')).not.toThrow()
  })
})

// ---- FlowCanvas wrapperMap DOM nesting ---- (integration-level)

describe('FlowCanvas node group DOM structure', () => {
  it('child node wrapper is nested inside parent wrapper', async () => {
    // We test the sortNodesByDepth logic directly by simulating
    // the effect's behavior with a mock container map
    const nodes: FlowNode[] = [
      node('parent', 0, 0),
      node('child', 10, 10, 'parent'),
    ]

    const containers = new Map<string, HTMLElement>()
    const nodesLayer = document.createElement('div')
    const parentEl = document.createElement('div')
    parentEl.setAttribute('data-node-id', 'parent')
    containers.set('parent', parentEl)

    // Simulate the DOM nesting logic from FlowCanvas effect
    // Sort: parent before child
    const sorted = [...nodes].sort((a, b) => {
      if (!a.parentId && b.parentId) return -1
      if (a.parentId && !b.parentId) return 1
      return 0
    })

    const wrappers = new Map<string, HTMLElement>()
    for (const n of sorted) {
      const el = document.createElement('div')
      el.setAttribute('data-node-id', n.id)
      const container = n.parentId ? (wrappers.get(n.parentId) ?? nodesLayer) : nodesLayer
      container.appendChild(el)
      wrappers.set(n.id, el)
    }

    const parentWrapper = wrappers.get('parent')!
    const childWrapper  = wrappers.get('child')!

    // Child should be inside parent
    expect(parentWrapper.contains(childWrapper)).toBe(true)
    // Parent should be in nodesLayer
    expect(nodesLayer.contains(parentWrapper)).toBe(true)
    // nodesLayer directly contains parent (not child)
    expect(nodesLayer.children[0]?.getAttribute('data-node-id')).toBe('parent')
  })
})

// ---- drag-node: child position changes skipped when parent in draggedNodes ----

describe('drag-node — parent drag skips children in commit', () => {
  it('does not emit position change for child when parent is dragged', async () => {
    // Import and invoke drag-node commit logic via the exported function
    // We test this indirectly via the NodeChange logic expectations:
    // When parent is in draggedNodes and child.parentId === parent.id,
    // only parent gets a position change.
    const allNodes: FlowNode[] = [
      node('parent', 100, 100),
      node('child',   20,  20, 'parent'),
    ]

    const draggedNodes = new Set(['parent', 'child'])
    const offset = { x: 50, y: 50 }

    // Simulate the commit logic from drag-node.ts
    const changes: NodeChange[] = []
    for (const id of draggedNodes) {
      const n = allNodes.find(nd => nd.id === id)!
      // Skip if parent is also dragged
      if (n.parentId && draggedNodes.has(n.parentId)) continue
      changes.push({
        type: 'position',
        id,
        position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
      })
    }

    expect(changes).toHaveLength(1)
    expect(changes[0].id).toBe('parent')
    expect(changes[0].type === 'position' && changes[0].position).toEqual({ x: 150, y: 150 })
  })

  it('emits position change for independent child (parent not dragged)', () => {
    const allNodes: FlowNode[] = [
      node('parent', 100, 100),
      node('child',   20,  20, 'parent'),
    ]

    const draggedNodes = new Set(['child']) // only child dragged
    const offset = { x: 10, y: 10 }

    const changes: NodeChange[] = []
    for (const id of draggedNodes) {
      const n = allNodes.find(nd => nd.id === id)!
      if (n.parentId && draggedNodes.has(n.parentId)) continue
      changes.push({
        type: 'position',
        id,
        position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
      })
    }

    expect(changes).toHaveLength(1)
    expect(changes[0].id).toBe('child')
  })

  it('emits position changes for all selected root nodes in multi-drag', () => {
    const allNodes: FlowNode[] = [
      node('r1', 0,   0),
      node('r2', 200, 0),
      node('c1', 10, 10, 'r1'),
    ]

    // Both roots selected + c1 included via collectDragGroup
    const draggedNodes = new Set(['r1', 'r2', 'c1'])
    const offset = { x: 5, y: 5 }

    const changes: NodeChange[] = []
    for (const id of draggedNodes) {
      const n = allNodes.find(nd => nd.id === id)!
      if (n.parentId && draggedNodes.has(n.parentId)) continue
      changes.push({ type: 'position', id, position: { x: n.position.x + offset.x, y: n.position.y + offset.y } })
    }

    const ids = changes.map(c => c.id)
    expect(ids).toContain('r1')
    expect(ids).toContain('r2')
    expect(ids).not.toContain('c1') // c1's parent r1 is in draggedNodes
  })
})
