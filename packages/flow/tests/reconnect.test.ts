import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { signal } from '@liteforge/core'
import type { FlowContextValue } from '../src/context.js'
import type { FlowNode, FlowEdge, Transform } from '../src/types.js'
import { createInteractionState } from '../src/state.js'
import { createHandleRegistry } from '../src/registry/handle-registry.js'
import { setupReconnect } from '../src/interactions/reconnect.js'

// ---- Helpers ----

function makeEdge(overrides: Partial<FlowEdge> = {}): FlowEdge {
  return {
    id: 'e1',
    source: 'n1', sourceHandle: 'out',
    target: 'n2', targetHandle: 'in',
    ...overrides,
  }
}

function makeNode(id: string, x = 0, y = 0): FlowNode {
  return { id, type: 'default', position: { x, y }, data: {} }
}

function makeCtx(overrides: Partial<FlowContextValue> = {}): FlowContextValue {
  const nodes: FlowNode[] = [makeNode('n1', 0, 0), makeNode('n2', 200, 0), makeNode('n3', 400, 0)]
  const edges: FlowEdge[] = [makeEdge()]
  const stateMgr = createInteractionState()
  const handleRegistry = createHandleRegistry()
  // Register handles with known offsets
  handleRegistry.register('n1', 'out',  { x: 80, y: 20 }, 'source')
  handleRegistry.register('n2', 'in',   { x: 0,  y: 20 }, 'target')
  handleRegistry.register('n3', 'in',   { x: 0,  y: 20 }, 'target')
  handleRegistry.register('n3', 'out',  { x: 80, y: 20 }, 'source')
  const transform = signal<Transform>({ x: 0, y: 0, scale: 1 })

  const ctx: FlowContextValue = {
    nodes: () => nodes,
    edges: () => edges,
    getNode: (id) => nodes.find(n => n.id === id),
    getEdge: (id) => edges.find(e => e.id === id),
    getNodes: () => nodes,
    getEdges: () => edges,
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
    snapToGrid: undefined,
    nodeContextMenu: undefined,
    edgeContextMenu: undefined,
    paneContextMenu: undefined,
    ...overrides,
  }
  return ctx
}

function firePointerMove(x: number, y: number) {
  document.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }))
}

function firePointerUp(x: number, y: number) {
  document.dispatchEvent(new PointerEvent('pointerup', { clientX: x, clientY: y, bubbles: true }))
}

// ---- State machine ----

describe('ReconnectingState — state machine', () => {
  it('toReconnecting transitions to reconnecting state', () => {
    const ctx = makeCtx()
    ctx.stateMgr.toReconnecting('e1', 'target', { x: 80, y: 20 }, { x: 200, y: 20 })
    const state = ctx.interactionState()
    expect(state.type).toBe('reconnecting')
  })

  it('stores edgeId and movingEnd', () => {
    const ctx = makeCtx()
    ctx.stateMgr.toReconnecting('e1', 'target', { x: 80, y: 20 }, { x: 200, y: 20 })
    const state = ctx.interactionState()
    if (state.type !== 'reconnecting') throw new Error('wrong state')
    expect(state.edgeId).toBe('e1')
    expect(state.movingEnd).toBe('target')
  })

  it('stores fixedPoint', () => {
    const ctx = makeCtx()
    ctx.stateMgr.toReconnecting('e1', 'source', { x: 200, y: 20 }, { x: 80, y: 20 })
    const state = ctx.interactionState()
    if (state.type !== 'reconnecting') throw new Error('wrong state')
    expect(state.fixedPoint).toEqual({ x: 200, y: 20 })
  })

  it('initialises currentPoint from startPoint', () => {
    const ctx = makeCtx()
    ctx.stateMgr.toReconnecting('e1', 'target', { x: 80, y: 20 }, { x: 200, y: 20 })
    const state = ctx.interactionState()
    if (state.type !== 'reconnecting') throw new Error('wrong state')
    expect(state.currentPoint()).toEqual({ x: 200, y: 20 })
  })

  it('toIdle resets state', () => {
    const ctx = makeCtx()
    ctx.stateMgr.toReconnecting('e1', 'target', { x: 0, y: 0 }, { x: 0, y: 0 })
    ctx.stateMgr.toIdle()
    expect(ctx.interactionState().type).toBe('idle')
  })
})

// ---- setupReconnect pointermove ----

describe('setupReconnect — pointermove', () => {
  beforeEach(() => { document.body.innerHTML = '' })

  it('updates currentPoint on pointermove when reconnecting', () => {
    const ctx = makeCtx()
    setupReconnect(ctx, () => ctx.transform())
    ctx.stateMgr.toReconnecting('e1', 'target', { x: 80, y: 20 }, { x: 200, y: 20 })

    firePointerMove(350, 50)

    const state = ctx.interactionState()
    if (state.type !== 'reconnecting') throw new Error('wrong state')
    expect(state.currentPoint()).toEqual({ x: 350, y: 50 })
  })

  it('does NOT update currentPoint when state is idle', () => {
    const ctx = makeCtx()
    setupReconnect(ctx, () => ctx.transform())
    // state is idle
    firePointerMove(100, 100)
    expect(ctx.interactionState().type).toBe('idle')
  })

  it('does NOT update currentPoint when state is connecting', () => {
    const ctx = makeCtx()
    setupReconnect(ctx, () => ctx.transform())
    ctx.stateMgr.toConnecting('n1', 'out', 'source', { x: 80, y: 20 })
    firePointerMove(100, 100)
    // no crash; state remains connecting
    expect(ctx.interactionState().type).toBe('connecting')
  })
})

// ---- setupReconnect pointerup — success paths ----
// happy-dom does not implement document.elementsFromPoint, so we mock it.

function makeHandleEl(nodeId: string, handleId: string, type: 'source' | 'target'): HTMLElement {
  const el = document.createElement('div')
  el.className = 'lf-handle'
  el.dataset['nodeId']     = nodeId
  el.dataset['handleId']   = handleId
  el.dataset['handleType'] = type
  return el
}

describe('setupReconnect — pointerup success', () => {
  let origElementsFromPoint: typeof document.elementsFromPoint

  beforeEach(() => {
    origElementsFromPoint = document.elementsFromPoint
  })

  afterEach(() => {
    document.elementsFromPoint = origElementsFromPoint
  })

  it('calls onEdgesChange(remove) for old edge on valid reconnect', () => {
    const ctx = makeCtx()
    setupReconnect(ctx, () => ctx.transform())
    const handleEl = makeHandleEl('n3', 'in', 'target')
    document.elementsFromPoint = () => [handleEl]

    ctx.stateMgr.toReconnecting('e1', 'target', { x: 80, y: 20 }, { x: 200, y: 20 })
    firePointerUp(400, 5)

    expect(ctx.onEdgesChange).toHaveBeenCalledWith([{ type: 'remove', id: 'e1' }])
  })

  it('calls onConnect with new target on valid reconnect of target end', () => {
    const ctx = makeCtx()
    setupReconnect(ctx, () => ctx.transform())
    const handleEl = makeHandleEl('n3', 'in', 'target')
    document.elementsFromPoint = () => [handleEl]

    ctx.stateMgr.toReconnecting('e1', 'target', { x: 80, y: 20 }, { x: 200, y: 20 })
    firePointerUp(400, 5)

    expect(ctx.onConnect).toHaveBeenCalledWith({
      source: 'n1', sourceHandle: 'out',
      target: 'n3', targetHandle: 'in',
    })
  })

  it('calls onConnect with new source on valid reconnect of source end', () => {
    const ctx = makeCtx()
    setupReconnect(ctx, () => ctx.transform())
    const handleEl = makeHandleEl('n3', 'out', 'source')
    document.elementsFromPoint = () => [handleEl]

    ctx.stateMgr.toReconnecting('e1', 'source', { x: 200, y: 20 }, { x: 80, y: 20 })
    firePointerUp(400, 5)

    expect(ctx.onConnect).toHaveBeenCalledWith({
      source: 'n3', sourceHandle: 'out',
      target: 'n2', targetHandle: 'in',
    })
  })

  it('transitions back to idle after successful reconnect', () => {
    const ctx = makeCtx()
    setupReconnect(ctx, () => ctx.transform())
    const handleEl = makeHandleEl('n3', 'in', 'target')
    document.elementsFromPoint = () => [handleEl]

    ctx.stateMgr.toReconnecting('e1', 'target', { x: 80, y: 20 }, { x: 200, y: 20 })
    firePointerUp(400, 5)

    expect(ctx.interactionState().type).toBe('idle')
  })
})

// ---- setupReconnect pointerup — cancel / rejection paths ----

describe('setupReconnect — pointerup cancellation', () => {
  let origElementsFromPoint: typeof document.elementsFromPoint

  beforeEach(() => {
    origElementsFromPoint = document.elementsFromPoint
  })

  afterEach(() => {
    document.elementsFromPoint = origElementsFromPoint
  })

  it('does nothing when pointerup not over a handle (cancel)', () => {
    const ctx = makeCtx()
    setupReconnect(ctx, () => ctx.transform())
    document.elementsFromPoint = () => []  // nothing under cursor

    ctx.stateMgr.toReconnecting('e1', 'target', { x: 80, y: 20 }, { x: 200, y: 20 })
    firePointerUp(999, 999)

    expect(ctx.onEdgesChange).not.toHaveBeenCalled()
    expect(ctx.onConnect).not.toHaveBeenCalled()
    expect(ctx.interactionState().type).toBe('idle')
  })

  it('does nothing when state is not reconnecting on pointerup', () => {
    const ctx = makeCtx()
    setupReconnect(ctx, () => ctx.transform())
    document.elementsFromPoint = () => []

    // state is idle — listener is a no-op
    firePointerUp(400, 5)

    expect(ctx.onEdgesChange).not.toHaveBeenCalled()
    expect(ctx.onConnect).not.toHaveBeenCalled()
  })

  it('rejects connection to handle of wrong type (source→source)', () => {
    const ctx = makeCtx()
    setupReconnect(ctx, () => ctx.transform())
    // Target end trying to connect to another source handle — incompatible
    const handleEl = makeHandleEl('n3', 'out', 'source')
    document.elementsFromPoint = () => [handleEl]

    ctx.stateMgr.toReconnecting('e1', 'target', { x: 80, y: 20 }, { x: 200, y: 20 })
    firePointerUp(400, 5)

    expect(ctx.onConnect).not.toHaveBeenCalled()
    expect(ctx.onEdgesChange).not.toHaveBeenCalled()
    expect(ctx.interactionState().type).toBe('idle')
  })

  it('rejects when isValidConnection returns false', () => {
    const ctx = makeCtx({ isValidConnection: () => false })
    setupReconnect(ctx, () => ctx.transform())
    const handleEl = makeHandleEl('n3', 'in', 'target')
    document.elementsFromPoint = () => [handleEl]

    ctx.stateMgr.toReconnecting('e1', 'target', { x: 80, y: 20 }, { x: 200, y: 20 })
    firePointerUp(400, 5)

    expect(ctx.onConnect).not.toHaveBeenCalled()
    expect(ctx.interactionState().type).toBe('idle')
  })

  it('accepts when isValidConnection returns true', () => {
    const ctx = makeCtx({ isValidConnection: () => true })
    setupReconnect(ctx, () => ctx.transform())
    const handleEl = makeHandleEl('n3', 'in', 'target')
    document.elementsFromPoint = () => [handleEl]

    ctx.stateMgr.toReconnecting('e1', 'target', { x: 80, y: 20 }, { x: 200, y: 20 })
    firePointerUp(400, 5)

    expect(ctx.onConnect).toHaveBeenCalled()
  })
})

// ---- GhostEdge during reconnecting ----

describe('GhostEdge — reconnecting state', () => {
  let svgEl: SVGElement
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    container.appendChild(svgEl)
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('ghost edge becomes visible when state is reconnecting', async () => {
    const { createGhostEdge } = await import('../src/components/GhostEdge.js')
    const ctx = makeCtx()
    const { el } = createGhostEdge(ctx, svgEl)
    expect(el.style.display).toBe('none')

    ctx.stateMgr.toReconnecting('e1', 'target', { x: 80, y: 20 }, { x: 200, y: 20 })
    expect(el.style.display).toBe('')
  })

  it('ghost edge is hidden after returning to idle from reconnecting', async () => {
    const { createGhostEdge } = await import('../src/components/GhostEdge.js')
    const ctx = makeCtx()
    const { el } = createGhostEdge(ctx, svgEl)

    ctx.stateMgr.toReconnecting('e1', 'target', { x: 80, y: 20 }, { x: 200, y: 20 })
    expect(el.style.display).toBe('')

    ctx.stateMgr.toIdle()
    expect(el.style.display).toBe('none')
  })

  it('ghost edge has a d attribute when reconnecting', async () => {
    const { createGhostEdge } = await import('../src/components/GhostEdge.js')
    const ctx = makeCtx()
    const { el } = createGhostEdge(ctx, svgEl)

    ctx.stateMgr.toReconnecting('e1', 'target', { x: 80, y: 20 }, { x: 200, y: 20 })
    expect(el.getAttribute('d')).toBeTruthy()
  })

  it('ghost edge path updates when currentPoint changes', async () => {
    const { createGhostEdge } = await import('../src/components/GhostEdge.js')
    const ctx = makeCtx()
    const { el } = createGhostEdge(ctx, svgEl)

    ctx.stateMgr.toReconnecting('e1', 'target', { x: 80, y: 20 }, { x: 200, y: 20 })
    const d1 = el.getAttribute('d')

    const state = ctx.interactionState()
    if (state.type !== 'reconnecting') throw new Error('wrong state')
    state.currentPoint.set({ x: 350, y: 50 })
    const d2 = el.getAttribute('d')

    expect(d2).not.toBe(d1)
  })
})
