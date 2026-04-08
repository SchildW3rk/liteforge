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

  // ---- Edge Labels ----

  it('creates a label group element for each edge', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2' },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    expect(svg.querySelectorAll('g.lf-edge-label').length).toBe(1)
    dispose()
  })

  it('label group is hidden when edge has no label', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2' },
    ])
    const ctx = makeCtx(edges)
    registerHandle(ctx, 'n1', 'h1', { x: 0, y: 0 })
    registerHandle(ctx, 'n2', 'h2', { x: 0, y: 0 })
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const labelG = svg.querySelector('g.lf-edge-label') as SVGGElement
    expect(labelG.style.display).toBe('none')
    dispose()
  })

  it('label group is visible when edge has a label and handles are resolved', async () => {
    const nodes: FlowNode[] = [
      { id: 'n1', type: 'default', position: { x: 0,   y: 0 }, data: null },
      { id: 'n2', type: 'default', position: { x: 200, y: 0 }, data: null },
    ]
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', label: 'hello' },
    ])
    const ctx = makeCtx(edges, { nodes: () => nodes })
    registerHandle(ctx, 'n1', 'h1', { x: 0, y: 0 })
    registerHandle(ctx, 'n2', 'h2', { x: 0, y: 0 })
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const labelG = svg.querySelector('g.lf-edge-label') as SVGGElement
    expect(labelG.style.display).not.toBe('none')
    dispose()
  })

  it('label text content matches edge.label', async () => {
    const nodes: FlowNode[] = [
      { id: 'n1', type: 'default', position: { x: 0,   y: 0 }, data: null },
      { id: 'n2', type: 'default', position: { x: 200, y: 0 }, data: null },
    ]
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', label: 'my label' },
    ])
    const ctx = makeCtx(edges, { nodes: () => nodes })
    registerHandle(ctx, 'n1', 'h1', { x: 0, y: 0 })
    registerHandle(ctx, 'n2', 'h2', { x: 0, y: 0 })
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const textEl = svg.querySelector('text.lf-edge-label-text') as SVGTextElement
    expect(textEl.textContent).toBe('my label')
    dispose()
  })

  it('label text x/y attributes are set to midpoint coordinates', async () => {
    const nodes: FlowNode[] = [
      { id: 'n1', type: 'default', position: { x: 0,   y: 0 }, data: null },
      { id: 'n2', type: 'default', position: { x: 200, y: 0 }, data: null },
    ]
    // source at (0,0), target at (200,0) → bezier midpoint is at (100, 0)
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', label: 'x' },
    ])
    const ctx = makeCtx(edges, { nodes: () => nodes })
    registerHandle(ctx, 'n1', 'h1', { x: 0, y: 0 })
    registerHandle(ctx, 'n2', 'h2', { x: 0, y: 0 })
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const textEl = svg.querySelector('text.lf-edge-label-text') as SVGTextElement
    const mx = parseFloat(textEl.getAttribute('x')!)
    const my = parseFloat(textEl.getAttribute('y')!)
    // midpoint of bezier from (0,0) to (200,0): x should be ~100, y=0
    expect(mx).toBeCloseTo(100, 0)
    expect(my).toBeCloseTo(0, 0)
    dispose()
  })

  it('label background rect has class lf-edge-label-bg and positive dimensions', async () => {
    const nodes: FlowNode[] = [
      { id: 'n1', type: 'default', position: { x: 0,   y: 0 }, data: null },
      { id: 'n2', type: 'default', position: { x: 200, y: 0 }, data: null },
    ]
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', label: 'abc' },
    ])
    const ctx = makeCtx(edges, { nodes: () => nodes })
    registerHandle(ctx, 'n1', 'h1', { x: 0, y: 0 })
    registerHandle(ctx, 'n2', 'h2', { x: 0, y: 0 })
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const rectEl = svg.querySelector('rect.lf-edge-label-bg') as SVGRectElement
    expect(rectEl).not.toBeNull()
    expect(parseFloat(rectEl.getAttribute('width')!)).toBeGreaterThan(0)
    expect(parseFloat(rectEl.getAttribute('height')!)).toBeGreaterThan(0)
    dispose()
  })

  it('updating edge.label reactively updates the text content', async () => {
    const nodes: FlowNode[] = [
      { id: 'n1', type: 'default', position: { x: 0,   y: 0 }, data: null },
      { id: 'n2', type: 'default', position: { x: 200, y: 0 }, data: null },
    ]
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', label: 'first' },
    ])
    const ctx = makeCtx(edges, { nodes: () => nodes })
    registerHandle(ctx, 'n1', 'h1', { x: 0, y: 0 })
    registerHandle(ctx, 'n2', 'h2', { x: 0, y: 0 })
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const textEl = svg.querySelector('text.lf-edge-label-text') as SVGTextElement
    expect(textEl.textContent).toBe('first')

    edges.set([{ id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', label: 'second' }])
    await tick()
    expect(textEl.textContent).toBe('second')
    dispose()
  })

  it('label group is removed from DOM when edge is removed', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', label: 'bye' },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    expect(svg.querySelectorAll('g.lf-edge-label').length).toBe(1)

    edges.set([])
    await tick()
    expect(svg.querySelectorAll('g.lf-edge-label').length).toBe(0)
    dispose()
  })

  it('label position updates during node drag (label follows node)', async () => {
    const nodes: FlowNode[] = [
      { id: 'n1', type: 'default', position: { x: 0,   y: 0 }, data: null },
      { id: 'n2', type: 'default', position: { x: 200, y: 0 }, data: null },
    ]
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in', label: 'L' },
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

    const textEl = svg.querySelector('text.lf-edge-label-text') as SVGTextElement
    const xBefore = parseFloat(textEl.getAttribute('x')!)

    // Drag n1 by 60px horizontally
    stateMgr.toDragging('n1', 1, { x: 0, y: 0 }, { x: 0, y: 0 })
    const state = stateMgr.state()
    if (state.type === 'dragging') {
      state.localOffset.set({ x: 60, y: 0 })
    }

    // Source is now at 60, target still at 200 → midpoint shifts toward ~130
    const xAfter = parseFloat(textEl.getAttribute('x')!)
    expect(xAfter).toBeGreaterThan(xBefore)
    dispose()
  })

  // ── animated?: boolean ───────────────────────────────────────────────────

  it('path has NO lf-edge--animated class by default', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2' },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    expect(path.classList.contains('lf-edge--animated')).toBe(false)
    dispose()
  })

  it('path has NO lf-edge--animated class when animated is explicitly false', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', animated: false },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    expect(path.classList.contains('lf-edge--animated')).toBe(false)
    dispose()
  })

  it('path gets lf-edge--animated class when animated: true', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', animated: true },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    expect(path.classList.contains('lf-edge--animated')).toBe(true)
    dispose()
  })

  it('animated class is reactive — toggling animated true→false removes the class', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', animated: true },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()

    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    expect(path.classList.contains('lf-edge--animated')).toBe(true)

    // Turn animation off
    edges.set([{ id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', animated: false }])
    await tick()
    expect(path.classList.contains('lf-edge--animated')).toBe(false)

    dispose()
  })

  it('animated class is reactive — toggling animated false→true adds the class', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', animated: false },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()

    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    expect(path.classList.contains('lf-edge--animated')).toBe(false)

    edges.set([{ id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', animated: true }])
    await tick()
    expect(path.classList.contains('lf-edge--animated')).toBe(true)

    dispose()
  })

  it('multiple edges can have independent animated states', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', animated: true },
      { id: 'e2', source: 'n2', sourceHandle: 'h1', target: 'n3', targetHandle: 'h2', animated: false },
      { id: 'e3', source: 'n3', sourceHandle: 'h1', target: 'n4', targetHandle: 'h2' },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()

    const paths = svg.querySelectorAll('path.lf-edge')
    expect(paths.length).toBe(3)

    const byId = (id: string) =>
      svg.querySelector(`path[data-edge-id="${id}"]`) as SVGPathElement

    expect(byId('e1').classList.contains('lf-edge--animated')).toBe(true)
    expect(byId('e2').classList.contains('lf-edge--animated')).toBe(false)
    expect(byId('e3').classList.contains('lf-edge--animated')).toBe(false)

    dispose()
  })

  it('animated and selected can both be true simultaneously', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', animated: true, selected: true },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()

    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    expect(path.classList.contains('lf-edge--animated')).toBe(true)
    expect(path.classList.contains('lf-edge-selected')).toBe(true)

    dispose()
  })
})

// ---- Arrow marker tests ----

describe('createEdgeLayer — arrow markers', () => {
  let svg: SVGSVGElement

  beforeEach(() => { svg = makeEdgeSvg() })
  afterEach(() => { svg.remove() })

  it('injects a <defs> block into the SVG layer', async () => {
    const edges = signal<FlowEdge[]>([])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    expect(svg.querySelector('defs')).not.toBeNull()
    dispose()
  })

  it('defs contains an open arrow marker (lf-arrow-*)', async () => {
    const edges = signal<FlowEdge[]>([])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const markers = svg.querySelectorAll('marker')
    const ids = Array.from(markers).map(m => m.id)
    expect(ids.some(id => id.startsWith('lf-arrow-') && !id.startsWith('lf-arrowclosed-'))).toBe(true)
    dispose()
  })

  it('defs contains a closed arrow marker (lf-arrowclosed-*)', async () => {
    const edges = signal<FlowEdge[]>([])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const markers = svg.querySelectorAll('marker')
    const ids = Array.from(markers).map(m => m.id)
    expect(ids.some(id => id.startsWith('lf-arrowclosed-'))).toBe(true)
    dispose()
  })

  it('no marker-end attribute when markerEnd is absent', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2' },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    expect(path.getAttribute('marker-end')).toBeNull()
    dispose()
  })

  it('no marker-end attribute when markerEnd is "none"', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', markerEnd: 'none' },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    expect(path.getAttribute('marker-end')).toBeNull()
    dispose()
  })

  it('sets marker-end url for markerEnd: "arrow"', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', markerEnd: 'arrow' },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    const markerEnd = path.getAttribute('marker-end') ?? ''
    expect(markerEnd).toMatch(/^url\(#lf-arrow-/)
    expect(markerEnd).not.toMatch(/arrowclosed/)
    dispose()
  })

  it('sets marker-end url for markerEnd: "arrowclosed"', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', markerEnd: 'arrowclosed' },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    const markerEnd = path.getAttribute('marker-end') ?? ''
    expect(markerEnd).toMatch(/^url\(#lf-arrowclosed-/)
    dispose()
  })

  it('marker IDs are scoped — unique per EdgeLayer instance', async () => {
    const svg2 = makeEdgeSvg()
    const edges = signal<FlowEdge[]>([])
    const h1 = createEdgeLayer(makeCtx(edges), svg)
    const h2 = createEdgeLayer(makeCtx(edges), svg2)
    await tick()

    const id1 = (svg.querySelector('marker') as SVGMarkerElement).id
    const id2 = (svg2.querySelector('marker') as SVGMarkerElement).id
    expect(id1).not.toBe(id2)

    h1.dispose(); h2.dispose(); svg2.remove()
  })

  it('marker-end updates reactively from none to arrow', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2' },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    expect(path.getAttribute('marker-end')).toBeNull()

    edges.set([{ id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', markerEnd: 'arrow' }])
    await tick()
    expect(path.getAttribute('marker-end')).toMatch(/^url\(#lf-arrow-/)

    dispose()
  })

  it('marker-end updates reactively from arrow to none', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', markerEnd: 'arrow' },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    expect(path.getAttribute('marker-end')).toMatch(/^url\(#lf-arrow-/)

    edges.set([{ id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', markerEnd: 'none' }])
    await tick()
    expect(path.getAttribute('marker-end')).toBeNull()

    dispose()
  })

  it('marker-end switches reactively from arrow to arrowclosed', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', markerEnd: 'arrow' },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()
    const path = svg.querySelector('path.lf-edge') as SVGPathElement
    expect(path.getAttribute('marker-end')).toMatch(/^url\(#lf-arrow-(?!.*arrowclosed)/)

    edges.set([{ id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', markerEnd: 'arrowclosed' }])
    await tick()
    expect(path.getAttribute('marker-end')).toMatch(/^url\(#lf-arrowclosed-/)

    dispose()
  })

  it('multiple edges can have independent marker types', async () => {
    const edges = signal<FlowEdge[]>([
      { id: 'e1', source: 'n1', sourceHandle: 'h1', target: 'n2', targetHandle: 'h2', markerEnd: 'arrow' },
      { id: 'e2', source: 'n2', sourceHandle: 'h1', target: 'n3', targetHandle: 'h2', markerEnd: 'arrowclosed' },
      { id: 'e3', source: 'n3', sourceHandle: 'h1', target: 'n4', targetHandle: 'h2' },
    ])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()

    const byId = (id: string) => svg.querySelector(`path[data-edge-id="${id}"]`) as SVGPathElement
    expect(byId('e1').getAttribute('marker-end')).toMatch(/^url\(#lf-arrow-(?!.*arrowclosed)/)
    expect(byId('e2').getAttribute('marker-end')).toMatch(/^url\(#lf-arrowclosed-/)
    expect(byId('e3').getAttribute('marker-end')).toBeNull()

    dispose()
  })

  it('open arrow marker uses a polyline with fill:none', async () => {
    const edges = signal<FlowEdge[]>([])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()

    const markers = Array.from(svg.querySelectorAll('marker'))
    const openMarker = markers.find(m => m.id.startsWith('lf-arrow-') && !m.id.startsWith('lf-arrowclosed-'))!
    const shape = openMarker.querySelector('polyline')
    expect(shape).not.toBeNull()
    expect(shape!.getAttribute('fill')).toBe('none')

    dispose()
  })

  it('closed arrow marker uses a polygon with fill:currentColor', async () => {
    const edges = signal<FlowEdge[]>([])
    const ctx = makeCtx(edges)
    const { dispose } = createEdgeLayer(ctx, svg)
    await tick()

    const markers = Array.from(svg.querySelectorAll('marker'))
    const closedMarker = markers.find(m => m.id.startsWith('lf-arrowclosed-'))!
    const shape = closedMarker.querySelector('polygon')
    expect(shape).not.toBeNull()
    expect(shape!.getAttribute('fill')).toBe('currentColor')

    dispose()
  })
})
