import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { signal } from '@liteforge/core'
import type { FlowContextValue } from '../src/context.js'
import type {
  FlowNode,
  FlowEdge,
  Transform,
  HandlePosition,
} from '../src/types.js'
import { createInteractionState } from '../src/state.js'
import { createMiniMap } from '../src/components/MiniMap.js'
import { createHandleRegistry } from '../src/registry/handle-registry.js'

// ---- Helpers ----

function makeNode(id: string, x: number, y: number): FlowNode {
  return { id, type: 'default', position: { x, y }, data: null }
}

function makeCtx(
  nodesArr: FlowNode[],
  overrides: Partial<FlowContextValue> = {},
): { ctx: FlowContextValue; stateMgr: ReturnType<typeof createInteractionState> } {
  const stateMgr = createInteractionState()
  const handleRegistry = createHandleRegistry()
  const transform = signal<Transform>({ x: 0, y: 0, scale: 1 })
  const nodeSizeMap = new Map<string, { width: number; height: number }>()

  const ctx: FlowContextValue = {
    nodes: () => nodesArr,
    edges: () => [] as FlowEdge[],
    getNode: (id) => nodesArr.find(n => n.id === id),
    getEdge: () => undefined,
    getNodes: () => nodesArr,
    getEdges: () => [],
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
    registerNodeSize: (id, w, h) => { nodeSizeMap.set(id, { width: w, height: h }) },
    getNodeSize: (id) => nodeSizeMap.get(id),
    getRootRect: () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}) } as DOMRect),
    nodeSizeVersion: signal(0),
    ...overrides,
  }
  return { ctx, stateMgr }
}

describe('createMiniMap', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    container.style.width = '800px'
    container.style.height = '600px'
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('renders a minimap element into the root', () => {
    const nodes = [makeNode('a', 100, 100)]
    const { ctx } = makeCtx(nodes)
    createMiniMap(ctx, ctx.transform, container)

    expect(container.querySelector('.lf-minimap')).not.toBeNull()
    expect(container.querySelector('.lf-minimap-svg')).not.toBeNull()
    expect(container.querySelector('.lf-minimap-viewport')).not.toBeNull()
  })

  it('renders a rect for each node', () => {
    const nodes = [makeNode('a', 0, 0), makeNode('b', 200, 100)]
    const { ctx } = makeCtx(nodes)
    createMiniMap(ctx, ctx.transform, container)

    const rects = container.querySelectorAll('[data-minimap-node]')
    expect(rects.length).toBe(2)
  })

  it('positions node rects at node canvas coordinates', () => {
    const nodes = [makeNode('n1', 150, 75)]
    const { ctx } = makeCtx(nodes)
    createMiniMap(ctx, ctx.transform, container)

    const rect = container.querySelector('[data-minimap-node="n1"]')
    expect(rect?.getAttribute('x')).toBe('150')
    expect(rect?.getAttribute('y')).toBe('75')
  })

  it('dispose removes the minimap element', () => {
    const nodes = [makeNode('a', 0, 0)]
    const { ctx } = makeCtx(nodes)
    const { dispose } = createMiniMap(ctx, ctx.transform, container)

    dispose()
    expect(container.querySelector('.lf-minimap')).toBeNull()
  })

  // ---- The bug fix: MiniMap must react to drag (localOffset) ----

  it('node rect moves reactively when drag localOffset changes', () => {
    const nodes = [makeNode('n1', 100, 50)]
    const { ctx, stateMgr } = makeCtx(nodes)
    createMiniMap(ctx, ctx.transform, container)

    const rect = container.querySelector('[data-minimap-node="n1"]')
    expect(rect?.getAttribute('x')).toBe('100')
    expect(rect?.getAttribute('y')).toBe('50')

    // Transition to dragging — creates a localOffset Signal
    stateMgr.toDragging('n1', 1, { x: 100, y: 50 }, { x: 100, y: 50 })

    // localOffset starts at {0,0} — rect should still be at base position
    expect(rect?.getAttribute('x')).toBe('100')
    expect(rect?.getAttribute('y')).toBe('50')

    // Update localOffset — MiniMap effect must re-run
    const state = stateMgr.state()
    if (state.type === 'dragging') {
      state.localOffset.set({ x: 60, y: 30 })
    }

    // Rect must now reflect base + offset
    expect(rect?.getAttribute('x')).toBe('160')
    expect(rect?.getAttribute('y')).toBe('80')
  })

  it('node rect snaps back to base position after drag ends', () => {
    const nodes = [makeNode('n1', 100, 50)]
    const { ctx, stateMgr } = makeCtx(nodes)
    createMiniMap(ctx, ctx.transform, container)

    stateMgr.toDragging('n1', 1, { x: 100, y: 50 }, { x: 100, y: 50 })
    const state = stateMgr.state()
    if (state.type === 'dragging') {
      state.localOffset.set({ x: 40, y: 20 })
    }
    expect(container.querySelector('[data-minimap-node="n1"]')?.getAttribute('x')).toBe('140')

    // Drag ends → toIdle
    stateMgr.toIdle()

    // Rect snaps back to base (props.nodes() position not yet updated)
    expect(container.querySelector('[data-minimap-node="n1"]')?.getAttribute('x')).toBe('100')
  })

  it('only the dragged node is offset; other nodes stay at base', () => {
    const nodes = [makeNode('n1', 100, 50), makeNode('n2', 300, 200)]
    const { ctx, stateMgr } = makeCtx(nodes)
    createMiniMap(ctx, ctx.transform, container)

    stateMgr.toDragging('n1', 1, { x: 100, y: 50 }, { x: 100, y: 50 })
    const state = stateMgr.state()
    if (state.type === 'dragging') {
      state.localOffset.set({ x: 50, y: 50 })
    }

    const r1 = container.querySelector('[data-minimap-node="n1"]')
    const r2 = container.querySelector('[data-minimap-node="n2"]')

    expect(r1?.getAttribute('x')).toBe('150')  // 100 + 50
    expect(r2?.getAttribute('x')).toBe('300')  // untouched
  })

  it('viewBox bounding box expands to include dragged position', () => {
    // n1 at (0,0), n2 at (100,100). Drag n2 right by 200px.
    const nodes = [makeNode('n1', 0, 0), makeNode('n2', 100, 100)]
    const { ctx, stateMgr } = makeCtx(nodes)
    createMiniMap(ctx, ctx.transform, container)

    const svg = container.querySelector('.lf-minimap-svg')!

    const vbBefore = svg.getAttribute('viewBox')!
    // Drag n2 far to the right
    stateMgr.toDragging('n2', 1, { x: 100, y: 100 }, { x: 100, y: 100 })
    const state = stateMgr.state()
    if (state.type === 'dragging') {
      state.localOffset.set({ x: 200, y: 0 })
    }

    const vbAfter = svg.getAttribute('viewBox')!
    // The viewBox width must have grown
    const [,, wBefore] = vbBefore.split(' ').map(Number)
    const [,, wAfter]  = vbAfter.split(' ').map(Number)
    expect(wAfter).toBeGreaterThan(wBefore!)
  })
})
