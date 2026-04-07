import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { signal } from '@liteforge/core'
import type { Signal } from '@liteforge/core'
import type { FlowContextValue } from '../src/context.js'
import type {
  FlowEdge,
  FlowNode,
  Transform,
  NodeChange,
  EdgeChange,
  HandlePosition,
  Point,
} from '../src/types.js'
import { createInteractionState } from '../src/state.js'
import { createHandleRegistry } from '../src/registry/handle-registry.js'
import { createEdgeLayer } from '../src/components/EdgeLayer.js'

// ---- Mock context helpers ----

function makeEdgeSvg(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  document.body.appendChild(svg)
  return svg
}

function makeCtx(
  edgesSignal: Signal<FlowEdge[]>,
  overrides: Partial<FlowContextValue> = {},
): FlowContextValue {
  const stateMgr = createInteractionState()
  const handleRegistry = createHandleRegistry()
  const transform = signal<Transform>({ x: 0, y: 0, scale: 1 })

  const ctx: FlowContextValue = {
    nodes: () => [] as FlowNode[],
    edges: () => edgesSignal(),
    getNode: () => undefined,
    getEdge: (id) => edgesSignal().find(e => e.id === id),
    getNodes: () => [] as FlowNode[],
    getEdges: () => edgesSignal(),
    transform,
    interactionState: stateMgr.state,
    stateMgr,
    interactionStateManager: stateMgr,
    handleRegistry,
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    isValidConnection: undefined,
    nodeTypes: {},
    edgeTypes: undefined,
    connectionLineType: 'bezier',
    registerNodeSize: vi.fn(),
    getNodeSize: () => undefined,
    getRootRect: () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}) } as DOMRect),
    nodeSizeVersion: signal(0),
    ...overrides,
  }
  return ctx
}

/** Registers handles so getAbsolutePosition returns a fixed point */
function registerHandle(ctx: FlowContextValue, nodeId: string, handleId: string, pos: Point = { x: 100, y: 100 }): void {
  ctx.handleRegistry.register(nodeId, handleId, pos, 'source')
}

const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0))

// ---- Tests ----

describe('createEdgeLayer', () => {
  let svg: SVGSVGElement

  beforeEach(() => {
    svg = makeEdgeSvg()
  })

  afterEach(() => {
    svg.remove()
  })

  it('creates no paths when edges() is empty', async () => {
    const edges = signal<FlowEdge[]>([])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    expect(svg.querySelectorAll('path.lf-edge').length).toBe(0)
    dispose()
  })

  it('creates one path element when one edge exists', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2' },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    expect(svg.querySelectorAll('path.lf-edge').length).toBe(1)
    dispose()
  })

  it('sets data-edge-id attribute on the path', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2' },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    expect(path.dataset['edgeId']).toBe('e1')
    dispose()
  })

  it('path element has class lf-edge', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2' },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const path = svg.querySelector('path') as SVGPathElement
    expect(path.classList.contains('lf-edge')).toBe(true)
    dispose()
  })

  it('sets d attribute when both handles are registered', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2' },
    ])
    // Provide nodes so getAbsolutePosition can resolve node.position + offset
    const nodes: FlowNode[] = [
      { id: 'n1', type: 'default', position: { x: 0, y: 0 }, data: null },
      { id: 'n2', type: 'default', position: { x: 200, y: 0 }, data: null },
    ]
    const ctx = makeCtx(edges, { nodes: () => nodes })
    // offset = { x: 0, y: 0 } → absolute position = node.position + offset
    registerHandle(ctx, 'n1', 'h1', { x: 0, y: 0 })
    registerHandle(ctx, 'n2', 'h2', { x: 0, y: 0 })
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    expect(path.getAttribute('d')).not.toBeNull()
    expect(path.getAttribute('d')).not.toBe('')
    dispose()
  })

  it('d attribute is absent when handles are NOT registered', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2' },
    ])
    const ctx = makeCtx(edges)
    // Do NOT register handles — getAbsolutePosition returns undefined
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    expect(path.hasAttribute('d')).toBe(false)
    dispose()
  })

  it('adding an edge creates a new path element', async () => {
    const edges = signal<FlowEdge[]>([])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    expect(svg.querySelectorAll('path.lf-edge').length).toBe(0)

    edges.set([{ id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2' }])
    await tick()
    expect(svg.querySelectorAll('path.lf-edge').length).toBe(1)
    dispose()
  })

  it('removing an edge removes its path from the DOM', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2' },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    expect(svg.querySelectorAll('path.lf-edge').length).toBe(1)

    edges.set([])
    await tick()
    expect(svg.querySelectorAll('path.lf-edge').length).toBe(0)
    dispose()
  })

  it('lf-edge-selected class toggled by edge.selected property', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', selected: false },
    ])
    const ctx = makeCtx(edges)
    registerHandle(ctx, 'n1', 'h1')
    registerHandle(ctx, 'n2', 'h2')
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    expect(path.classList.contains('lf-edge-selected')).toBe(false)

    edges.set([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', selected: true },
    ])
    await tick()
    expect(path.classList.contains('lf-edge-selected')).toBe(true)
    dispose()
  })

  it('click on path calls onEdgesChange with select change', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', selected: false },
      { id: 'e2', source: 'n2', sourceHandle: 'h2', target: 'n3', targetHandle: 'h3', selected: false },
    ])
    const onEdgesChange = vi.fn()
    const ctx = makeCtx(edges, { onEdgesChange })
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()

    const paths = svg.querySelectorAll('path.lf-edge')
    const e1Path = Array.from(paths).find(p => (p as SVGPathElement).dataset['edgeId'] === 'e1') as SVGPathElement
    expect(e1Path).not.toBeUndefined()

    e1Path.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await tick()

    expect(onEdgesChange).toHaveBeenCalledTimes(1)
    const changes = onEdgesChange.mock.calls[0][0] as EdgeChange[]
    const e1Change = changes.find(c => c.type === 'select' && c.id === 'e1')
    expect(e1Change).toBeDefined()
    expect((e1Change as { type: 'select'; id: string; selected: boolean }).selected).toBe(true)
    dispose()
  })

  it('dispose() removes all edge paths from the DOM', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2' },
      { id: 'e2', source: 'n2', sourceHandle: 'h2', target: 'n3', targetHandle: 'h3' },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    expect(svg.querySelectorAll('path.lf-edge').length).toBe(2)

    dispose()
    await tick()
    expect(svg.querySelectorAll('path.lf-edge').length).toBe(0)
  })

  // ---- Drag-reactivity fix: edges must track live localOffset ----

  it('edge d attribute updates reactively during node drag (localOffset)', async () => {
    const nodes: FlowNode[] = [
      { id: 'n1', type: 'default', position: { x: 0,   y: 0 }, data: null },
      { id: 'n2', type: 'default', position: { x: 200, y: 0 }, data: null },
    ]
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' },
    ])
    const stateMgr = createInteractionState()
    const ctx = makeCtx(edges, {
      nodes: () => nodes,
      interactionState: stateMgr.state,
      stateMgr,
      interactionStateManager: stateMgr,
    })
    registerHandle(ctx, 'n1', 'out', { x: 10, y: 0 })
    registerHandle(ctx, 'n2', 'in',  { x: 0,  y: 0 })

    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()

    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    const dBefore = path.getAttribute('d')
    expect(dBefore).not.toBeNull()

    // Start dragging n1
    stateMgr.toDragging('n1', 1, { x: 0, y: 0 }, { x: 0, y: 0 })
    const state = stateMgr.state()
    if (state.type === 'dragging') {
      state.localOffset.set({ x: 50, y: 30 })
    }

    const dDuring = path.getAttribute('d')
    // Path must have changed — source endpoint moved with n1
    expect(dDuring).not.toBe(dBefore)
    // Source x: node.position.x(0) + offset.x(10) + drag.x(50) = 60
    expect(dDuring).toMatch(/^M 60 30/)

    dispose()
  })

  it('edge snaps back when drag ends (toIdle)', async () => {
    const nodes: FlowNode[] = [
      { id: 'n1', type: 'default', position: { x: 0,   y: 0 }, data: null },
      { id: 'n2', type: 'default', position: { x: 200, y: 0 }, data: null },
    ]
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' },
    ])
    const stateMgr = createInteractionState()
    const ctx = makeCtx(edges, {
      nodes: () => nodes,
      interactionState: stateMgr.state,
      stateMgr,
      interactionStateManager: stateMgr,
    })
    registerHandle(ctx, 'n1', 'out', { x: 0, y: 0 })
    registerHandle(ctx, 'n2', 'in',  { x: 0, y: 0 })

    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()

    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    const dBefore = path.getAttribute('d')

    stateMgr.toDragging('n1', 1, { x: 0, y: 0 }, { x: 0, y: 0 })
    const state = stateMgr.state()
    if (state.type === 'dragging') {
      state.localOffset.set({ x: 100, y: 0 })
    }
    expect(path.getAttribute('d')).not.toBe(dBefore)

    stateMgr.toIdle()
    expect(path.getAttribute('d')).toBe(dBefore)

    dispose()
  })

  it('edge between two group-dragged nodes: both endpoints move together', async () => {
    // n1 and n2 are both selected and dragged together
    const nodes: FlowNode[] = [
      { id: 'n1', type: 'default', position: { x: 0,   y: 0 }, data: null },
      { id: 'n2', type: 'default', position: { x: 200, y: 0 }, data: null },
    ]
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' },
    ])
    const stateMgr = createInteractionState()
    const ctx = makeCtx(edges, {
      nodes: () => nodes,
      interactionState: stateMgr.state,
      stateMgr,
      interactionStateManager: stateMgr,
    })
    registerHandle(ctx, 'n1', 'out', { x: 0, y: 0 })
    registerHandle(ctx, 'n2', 'in',  { x: 0, y: 0 })

    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()

    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    const dBefore = path.getAttribute('d')

    // Group drag both n1 + n2
    stateMgr.toDragging('n1', 1, { x: 0, y: 0 }, { x: 0, y: 0 }, new Set(['n1', 'n2']))
    const state = stateMgr.state()
    if (state.type === 'dragging') {
      state.localOffset.set({ x: 50, y: 30 })
    }

    const dDuring = path.getAttribute('d')
    // Path must change (both endpoints move)
    expect(dDuring).not.toBe(dBefore)
    // Source: n1(0,0) + offset(50,30) = (50,30) — path starts there
    expect(dDuring).toMatch(/^M 50 30/)
    // Target: n2(200,0) + offset(50,30) = (250,30) — path ends there
    expect(dDuring).toMatch(/250 30$/)

    dispose()
  })

  it('only the source endpoint moves when source node is dragged', async () => {
    const nodes: FlowNode[] = [
      { id: 'n1', type: 'default', position: { x: 0,   y: 0 }, data: null },
      { id: 'n2', type: 'default', position: { x: 200, y: 0 }, data: null },
    ]
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' },
    ])
    const stateMgr = createInteractionState()
    const ctx = makeCtx(edges, {
      nodes: () => nodes,
      interactionState: stateMgr.state,
      stateMgr,
      interactionStateManager: stateMgr,
    })
    registerHandle(ctx, 'n1', 'out', { x: 0, y: 0 })
    registerHandle(ctx, 'n2', 'in',  { x: 0, y: 0 })

    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()

    const path = svg.querySelector('path.lf-edge') as SVGPathElement

    // Drag n1 — source endpoint should move, target endpoint stays at n2 (200,0)
    stateMgr.toDragging('n1', 1, { x: 0, y: 0 }, { x: 0, y: 0 })
    const state = stateMgr.state()
    if (state.type === 'dragging') {
      state.localOffset.set({ x: 40, y: 0 })
    }

    // Path starts at source (n1+offset = 40,0), ends at target (200,0)
    const d = path.getAttribute('d')!
    expect(d).toMatch(/^M 40 0/)
    expect(d).toMatch(/200 0$/)

    dispose()
  })
})
