import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFlow } from '../src/flow.js'
import type { FlowInternals, FlowNode, Rect, Transform } from '../src/types.js'

// ---- Helpers ----

function makeNode(id: string, x = 0, y = 0, w = 100, h = 50): FlowNode {
  return { id, type: 'default', position: { x, y }, data: {}, width: w, height: h }
}

function makeInternals(
  nodes: FlowNode[] = [],
  edges = [],
  transform: Transform = { x: 0, y: 0, scale: 1 },
  overrides: Partial<FlowInternals> = {},
): FlowInternals {
  let t = transform
  return {
    getTransform:  () => ({ ...t }),
    setTransform:  (newT) => { t = newT },
    getRootSize:   () => ({ width: 800, height: 600 }),
    getNodes:      () => nodes,
    getEdges:      () => edges,
    getNodeSize:   () => undefined,
    minZoom:       0.1,
    maxZoom:       4,
    ...overrides,
  }
}

// ---- getViewport ----

describe('getViewport', () => {
  it('returns { x:0, y:0, zoom:1 } before register', () => {
    const flow = createFlow({ nodeTypes: {} })
    expect(flow.getViewport()).toEqual({ x: 0, y: 0, zoom: 1 })
  })

  it('reflects current transform after register', () => {
    const flow = createFlow({ nodeTypes: {} })
    flow._register(makeInternals([], [], { x: 10, y: 20, scale: 1.5 }))
    expect(flow.getViewport()).toEqual({ x: 10, y: 20, zoom: 1.5 })
  })
})

// ---- zoomTo ----

describe('zoomTo', () => {
  it('sets scale immediately when no duration', () => {
    const flow = createFlow({ nodeTypes: {} })
    let t: Transform = { x: 0, y: 0, scale: 1 }
    flow._register(makeInternals([], [], t, {
      getTransform: () => ({ ...t }),
      setTransform: (newT) => { t = newT },
      getRootSize:  () => ({ width: 800, height: 600 }),
    }))
    flow.zoomTo(2)
    expect(t.scale).toBeCloseTo(2)
  })

  it('keeps viewport center fixed while zooming', () => {
    const flow = createFlow({ nodeTypes: {} })
    let t: Transform = { x: 0, y: 0, scale: 1 }
    flow._register(makeInternals([], [], t, {
      getTransform: () => ({ ...t }),
      setTransform: (newT) => { t = newT },
      getRootSize:  () => ({ width: 800, height: 600 }),
    }))
    flow.zoomTo(2)
    // Canvas point at center (400, 300) should remain at same canvas coords
    // Before: canvasX = (400 - 0) / 1 = 400
    // After:  canvasX = (400 - t.x) / 2  should ≈ 400
    expect((400 - t.x) / t.scale).toBeCloseTo(400, 1)
    expect((300 - t.y) / t.scale).toBeCloseTo(300, 1)
  })

  it('clamps to minZoom', () => {
    const flow = createFlow({ nodeTypes: {} })
    let t: Transform = { x: 0, y: 0, scale: 1 }
    flow._register(makeInternals([], [], t, {
      getTransform: () => ({ ...t }),
      setTransform: (newT) => { t = newT },
      getRootSize:  () => ({ width: 800, height: 600 }),
      minZoom: 0.1,
      maxZoom: 4,
    }))
    flow.zoomTo(0.001)
    expect(t.scale).toBeGreaterThanOrEqual(0.1)
  })

  it('clamps to maxZoom', () => {
    const flow = createFlow({ nodeTypes: {} })
    let t: Transform = { x: 0, y: 0, scale: 1 }
    flow._register(makeInternals([], [], t, {
      getTransform: () => ({ ...t }),
      setTransform: (newT) => { t = newT },
      getRootSize:  () => ({ width: 800, height: 600 }),
      minZoom: 0.1,
      maxZoom: 4,
    }))
    flow.zoomTo(999)
    expect(t.scale).toBeLessThanOrEqual(4)
  })

  it('does nothing before register', () => {
    const flow = createFlow({ nodeTypes: {} })
    expect(() => flow.zoomTo(2)).not.toThrow()
  })

  it('animates over duration using rAF', () => {
    const rafCallbacks: FrameRequestCallback[] = []
    const origRaf = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = (cb) => { rafCallbacks.push(cb); return 0 }

    const flow = createFlow({ nodeTypes: {} })
    let t: Transform = { x: 0, y: 0, scale: 1 }
    flow._register(makeInternals([], [], t, {
      getTransform: () => ({ ...t }),
      setTransform: (newT) => { t = newT },
      getRootSize:  () => ({ width: 800, height: 600 }),
    }))
    flow.zoomTo(2, { duration: 300 })

    // Before rAF fires, transform unchanged (apart from first frame)
    expect(rafCallbacks.length).toBe(1)

    // Simulate final frame at t=1 (past duration)
    rafCallbacks[0](performance.now() + 400)
    expect(t.scale).toBeCloseTo(2, 1)

    globalThis.requestAnimationFrame = origRaf
  })
})

// ---- zoomIn / zoomOut ----

describe('zoomIn / zoomOut', () => {
  it('zoomIn multiplies scale by 1.2', () => {
    const flow = createFlow({ nodeTypes: {} })
    let t: Transform = { x: 0, y: 0, scale: 1 }
    flow._register(makeInternals([], [], t, {
      getTransform: () => ({ ...t }),
      setTransform: (newT) => { t = newT },
      getRootSize:  () => ({ width: 800, height: 600 }),
    }))
    flow.zoomIn()
    expect(t.scale).toBeCloseTo(1.2, 5)
  })

  it('zoomOut divides scale by 1.2', () => {
    const flow = createFlow({ nodeTypes: {} })
    let t: Transform = { x: 0, y: 0, scale: 1 }
    flow._register(makeInternals([], [], t, {
      getTransform: () => ({ ...t }),
      setTransform: (newT) => { t = newT },
      getRootSize:  () => ({ width: 800, height: 600 }),
    }))
    flow.zoomOut()
    expect(t.scale).toBeCloseTo(1 / 1.2, 5)
  })

  it('zoomIn does nothing before register', () => {
    expect(() => createFlow({ nodeTypes: {} }).zoomIn()).not.toThrow()
  })

  it('zoomOut does nothing before register', () => {
    expect(() => createFlow({ nodeTypes: {} }).zoomOut()).not.toThrow()
  })
})

// ---- fitBounds ----

describe('fitBounds', () => {
  it('centers the given bounds in the viewport', () => {
    const flow = createFlow({ nodeTypes: {} })
    let t: Transform = { x: 0, y: 0, scale: 1 }
    flow._register(makeInternals([], [], t, {
      getTransform: () => ({ ...t }),
      setTransform: (newT) => { t = newT },
      getRootSize:  () => ({ width: 800, height: 600 }),
      minZoom: 0.1,
      maxZoom: 4,
    }))

    // Fit a 200×100 rect starting at (50, 50) with padding=0
    flow.fitBounds({ x: 50, y: 50, width: 200, height: 100 }, { padding: 0 })

    // Scale: min(800/200, 600/100) = min(4, 6) → clamped to maxZoom=4
    expect(t.scale).toBeCloseTo(4, 1)
    // Center of bounds = (50 + 100, 50 + 50) = (150, 100) in canvas space
    // Screen center = (400, 300) = 150 * scale + t.x → t.x = 400 - 150*4 = -200
    expect(t.x).toBeCloseTo(400 - 150 * t.scale, 0)
    expect(t.y).toBeCloseTo(300 - 100 * t.scale, 0)
  })

  it('respects padding option', () => {
    const flow = createFlow({ nodeTypes: {} })
    let t1: Transform = { x: 0, y: 0, scale: 1 }
    let t2: Transform = { x: 0, y: 0, scale: 1 }

    const makeI = (tRef: { val: Transform }): FlowInternals => ({
      getTransform: () => ({ ...tRef.val }),
      setTransform: (newT) => { tRef.val = newT },
      getRootSize:  () => ({ width: 800, height: 600 }),
      getNodes:     () => [],
      getEdges:     () => [],
      getNodeSize:  () => undefined,
      minZoom:      0.1,
      maxZoom:      4,
    })

    const flow1 = createFlow({ nodeTypes: {} })
    const flow2 = createFlow({ nodeTypes: {} })
    const ref1 = { val: t1 }
    const ref2 = { val: t2 }
    flow1._register(makeI(ref1))
    flow2._register(makeI(ref2))

    const bounds = { x: 0, y: 0, width: 400, height: 300 }
    flow1.fitBounds(bounds, { padding: 0 })
    flow2.fitBounds(bounds, { padding: 50 })

    // Larger padding → smaller scale
    expect(ref2.val.scale).toBeLessThan(ref1.val.scale)
  })

  it('does nothing before register', () => {
    expect(() =>
      createFlow({ nodeTypes: {} }).fitBounds({ x: 0, y: 0, width: 100, height: 100 })
    ).not.toThrow()
  })
})

// ---- getNode / getEdge ----

describe('getNode / getEdge', () => {
  it('getNode returns undefined before register', () => {
    expect(createFlow({ nodeTypes: {} }).getNode('n1')).toBeUndefined()
  })

  it('getNode returns node by id', () => {
    const flow = createFlow({ nodeTypes: {} })
    const n1   = makeNode('n1')
    flow._register(makeInternals([n1]))
    expect(flow.getNode('n1')).toBe(n1)
  })

  it('getNode returns undefined for unknown id', () => {
    const flow = createFlow({ nodeTypes: {} })
    flow._register(makeInternals([makeNode('n1')]))
    expect(flow.getNode('nope')).toBeUndefined()
  })

  it('getEdge returns undefined before register', () => {
    expect(createFlow({ nodeTypes: {} }).getEdge('e1')).toBeUndefined()
  })

  it('getEdge returns edge by id', () => {
    const flow = createFlow({ nodeTypes: {} })
    const e1 = { id: 'e1', source: 'a', sourceHandle: 'out', target: 'b', targetHandle: 'in' }
    flow._register(makeInternals([], [e1] as any))
    expect(flow.getEdge('e1')).toBe(e1)
  })
})

// ---- getIntersectingNodes ----

describe('getIntersectingNodes', () => {
  it('returns empty array before register', () => {
    const flow = createFlow({ nodeTypes: {} })
    expect(flow.getIntersectingNodes(makeNode('n1'))).toEqual([])
  })

  it('returns nodes overlapping the given node', () => {
    const flow = createFlow({ nodeTypes: {} })
    // n1: (0,0,100,50)  n2: (50,25,100,50) → overlap  n3: (200,200,100,50) → no overlap
    const n1 = makeNode('n1', 0,   0,   100, 50)
    const n2 = makeNode('n2', 50,  25,  100, 50)
    const n3 = makeNode('n3', 200, 200, 100, 50)
    flow._register(makeInternals([n1, n2, n3]))

    const result = flow.getIntersectingNodes(n1)
    expect(result.map(n => n.id)).toContain('n2')
    expect(result.map(n => n.id)).not.toContain('n3')
  })

  it('excludes the queried node itself', () => {
    const flow = createFlow({ nodeTypes: {} })
    const n1 = makeNode('n1', 0, 0, 100, 50)
    flow._register(makeInternals([n1]))
    expect(flow.getIntersectingNodes(n1).map(n => n.id)).not.toContain('n1')
  })

  it('returns empty when no overlaps', () => {
    const flow = createFlow({ nodeTypes: {} })
    const n1 = makeNode('n1', 0,   0,   50, 50)
    const n2 = makeNode('n2', 200, 200, 50, 50)
    flow._register(makeInternals([n1, n2]))
    expect(flow.getIntersectingNodes(n1)).toHaveLength(0)
  })

  it('touching edges count as intersecting', () => {
    const flow = createFlow({ nodeTypes: {} })
    // n1 right edge = 100, n2 left edge = 100 → touching
    const n1 = makeNode('n1', 0,   0, 100, 50)
    const n2 = makeNode('n2', 100, 0, 100, 50)
    flow._register(makeInternals([n1, n2]))
    expect(flow.getIntersectingNodes(n1).map(n => n.id)).toContain('n2')
  })
})

// ---- isNodeIntersecting ----

describe('isNodeIntersecting', () => {
  it('returns true when node overlaps area', () => {
    const flow = createFlow({ nodeTypes: {} })
    flow._register(makeInternals())
    const node: FlowNode = makeNode('n1', 10, 10, 80, 60)
    const area: Rect = { x: 0, y: 0, width: 50, height: 50 }
    expect(flow.isNodeIntersecting(node, area)).toBe(true)
  })

  it('returns false when node outside area', () => {
    const flow = createFlow({ nodeTypes: {} })
    flow._register(makeInternals())
    const node: FlowNode = makeNode('n1', 200, 200, 80, 60)
    const area: Rect = { x: 0, y: 0, width: 50, height: 50 }
    expect(flow.isNodeIntersecting(node, area)).toBe(false)
  })

  it('returns true when area fully contains node', () => {
    const flow = createFlow({ nodeTypes: {} })
    flow._register(makeInternals())
    const node: FlowNode = makeNode('n1', 10, 10, 20, 20)
    const area: Rect = { x: 0, y: 0, width: 100, height: 100 }
    expect(flow.isNodeIntersecting(node, area)).toBe(true)
  })

  it('returns true when node fully contains area', () => {
    const flow = createFlow({ nodeTypes: {} })
    flow._register(makeInternals())
    const node: FlowNode = makeNode('n1', 0, 0, 100, 100)
    const area: Rect = { x: 10, y: 10, width: 20, height: 20 }
    expect(flow.isNodeIntersecting(node, area)).toBe(true)
  })

  it('uses node.width/height when set', () => {
    const flow = createFlow({ nodeTypes: {} })
    flow._register(makeInternals())
    const node: FlowNode = { id: 'n1', type: 'default', position: { x: 0, y: 0 }, data: {}, width: 50, height: 50 }
    expect(flow.isNodeIntersecting(node, { x: 40, y: 40, width: 20, height: 20 })).toBe(true)
    expect(flow.isNodeIntersecting(node, { x: 60, y: 60, width: 20, height: 20 })).toBe(false)
  })

  it('falls back to getNodeSize from internals when width/height not on node', () => {
    const flow = createFlow({ nodeTypes: {} })
    flow._register(makeInternals([], [], { x: 0, y: 0, scale: 1 }, {
      getNodeSize: () => ({ width: 80, height: 60 }),
    }))
    // Node without explicit width/height → uses getNodeSize
    const node: FlowNode = { id: 'n1', type: 'default', position: { x: 0, y: 0 }, data: {} }
    expect(flow.isNodeIntersecting(node, { x: 70, y: 50, width: 20, height: 20 })).toBe(true)
    expect(flow.isNodeIntersecting(node, { x: 100, y: 70, width: 20, height: 20 })).toBe(false)
  })
})

// ---- _register ----

describe('_register', () => {
  it('wires up internals so methods work after registration', () => {
    const flow = createFlow({ nodeTypes: {} })
    expect(flow.getViewport()).toEqual({ x: 0, y: 0, zoom: 1 })

    flow._register(makeInternals([], [], { x: 5, y: 10, scale: 2 }))
    expect(flow.getViewport()).toEqual({ x: 5, y: 10, zoom: 2 })
  })

  it('can re-register (canvas remount scenario)', () => {
    const flow = createFlow({ nodeTypes: {} })
    flow._register(makeInternals([], [], { x: 1, y: 1, scale: 1 }))
    flow._register(makeInternals([], [], { x: 99, y: 88, scale: 3 }))
    expect(flow.getViewport().zoom).toBe(3)
  })
})
