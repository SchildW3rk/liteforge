import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { signal } from '@liteforge/core'
import type { FlowContextValue } from '../src/context.js'
import type {
  InteractionState,
  FlowNode,
  Transform,
  HandleType,
  HandlePosition,
  FlowEdge,
} from '../src/types.js'
import { createInteractionState } from '../src/state.js'
import { createHandleRegistry } from '../src/registry/handle-registry.js'
import { createHandle } from '../src/components/Handle.js'
import { createGhostEdge } from '../src/components/GhostEdge.js'

// ---- Helpers ----

function makeCtx(overrides: Partial<FlowContextValue> = {}): FlowContextValue {
  const nodesArr: FlowNode[] = []
  const stateMgr = createInteractionState()
  const handleRegistry = createHandleRegistry()
  const transform = signal<Transform>({ x: 0, y: 0, scale: 1 })

  const ctx: FlowContextValue = {
    nodes: () => nodesArr,
    edges: () => [] as FlowEdge[],
    getNode: (id) => nodesArr.find(n => n.id === id),
    getEdge: () => undefined,
    getNodes: () => nodesArr,
    getEdges: () => [] as FlowEdge[],
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
    ...overrides,
  }
  return ctx
}

// ---- createHandle tests ----

describe('createHandle', () => {
  let container: HTMLDivElement
  let nodeWrapper: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    nodeWrapper = document.createElement('div')
    container.appendChild(nodeWrapper)
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('creates element with correct base class lf-handle', () => {
    const ctx = makeCtx()
    const { el, dispose } = createHandle('n1', 'h1', 'source', 'right', ctx, nodeWrapper)
    nodeWrapper.appendChild(el)
    expect(el.classList.contains('lf-handle')).toBe(true)
    dispose()
  })

  it('creates element with type modifier class', () => {
    const ctx = makeCtx()
    const { el, dispose } = createHandle('n1', 'h1', 'source', 'right', ctx, nodeWrapper)
    nodeWrapper.appendChild(el)
    expect(el.classList.contains('lf-handle--source')).toBe(true)
    dispose()
  })

  it('creates element with position modifier class', () => {
    const ctx = makeCtx()
    const { el, dispose } = createHandle('n1', 'h1', 'source', 'right', ctx, nodeWrapper)
    nodeWrapper.appendChild(el)
    expect(el.classList.contains('lf-handle--right')).toBe(true)
    dispose()
  })

  it('has correct data-node-id attribute', () => {
    const ctx = makeCtx()
    const { el, dispose } = createHandle('n1', 'h1', 'source', 'right', ctx, nodeWrapper)
    nodeWrapper.appendChild(el)
    expect(el.dataset['nodeId']).toBe('n1')
    dispose()
  })

  it('has correct data-handle-id attribute', () => {
    const ctx = makeCtx()
    const { el, dispose } = createHandle('n1', 'h1', 'source', 'right', ctx, nodeWrapper)
    nodeWrapper.appendChild(el)
    expect(el.dataset['handleId']).toBe('h1')
    dispose()
  })

  it('has correct data-handle-type attribute', () => {
    const ctx = makeCtx()
    const { el, dispose } = createHandle('n1', 'h1', 'source', 'right', ctx, nodeWrapper)
    nodeWrapper.appendChild(el)
    expect(el.dataset['handleType']).toBe('source')
    dispose()
  })

  it('pointerdown transitions interaction state to connecting', () => {
    const ctx = makeCtx()
    const { el, dispose } = createHandle('n1', 'h1', 'source', 'right', ctx, nodeWrapper)
    nodeWrapper.appendChild(el)

    const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 0, clientY: 0 })
    el.dispatchEvent(event)

    expect(ctx.interactionState().type).toBe('connecting')
    dispose()
  })

  it('pointerdown sets correct sourceNodeId and sourceHandleId in connecting state', () => {
    const ctx = makeCtx()
    const { el, dispose } = createHandle('n1', 'h1', 'source', 'right', ctx, nodeWrapper)
    nodeWrapper.appendChild(el)

    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))

    const state = ctx.interactionState()
    if (state.type === 'connecting') {
      expect(state.sourceNodeId).toBe('n1')
      expect(state.sourceHandleId).toBe('h1')
      expect(state.sourceHandleType).toBe('source')
    } else {
      expect.fail('Expected connecting state')
    }
    dispose()
  })

  it('pointerdown stops propagation', () => {
    const ctx = makeCtx()
    const { el, dispose } = createHandle('n1', 'h1', 'source', 'right', ctx, nodeWrapper)
    nodeWrapper.appendChild(el)

    const parentHandler = vi.fn()
    nodeWrapper.addEventListener('pointerdown', parentHandler)

    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))

    expect(parentHandler).not.toHaveBeenCalled()
    nodeWrapper.removeEventListener('pointerdown', parentHandler)
    dispose()
  })

  it('dispose() calls unregisterHandle on the registry', () => {
    const ctx = makeCtx()
    const unregisterSpy = vi.spyOn(ctx.handleRegistry, 'unregister')
    const { el, dispose } = createHandle('n1', 'h1', 'source', 'right', ctx, nodeWrapper)
    nodeWrapper.appendChild(el)

    dispose()

    expect(unregisterSpy).toHaveBeenCalledWith('n1', 'h1')
  })

  it('dispose() removes the element from the DOM', () => {
    const ctx = makeCtx()
    const { el, dispose } = createHandle('n1', 'h1', 'source', 'right', ctx, nodeWrapper)
    nodeWrapper.appendChild(el)

    expect(nodeWrapper.contains(el)).toBe(true)
    dispose()
    expect(nodeWrapper.contains(el)).toBe(false)
  })
})

// ---- createGhostEdge tests ----

describe('createGhostEdge', () => {
  let svgContainer: SVGSVGElement

  beforeEach(() => {
    svgContainer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    document.body.appendChild(svgContainer)
  })

  afterEach(() => {
    svgContainer.remove()
  })

  it('creates an SVG path element', () => {
    const ctx = makeCtx()
    const { el, dispose } = createGhostEdge(ctx, svgContainer)
    expect(el.tagName.toLowerCase()).toBe('path')
    dispose()
  })

  it('path element has class lf-ghost-edge', () => {
    const ctx = makeCtx()
    const { el, dispose } = createGhostEdge(ctx, svgContainer)
    expect(el.classList.contains('lf-ghost-edge')).toBe(true)
    dispose()
  })

  it('path is appended to the edges layer', () => {
    const ctx = makeCtx()
    const { el, dispose } = createGhostEdge(ctx, svgContainer)
    expect(svgContainer.contains(el)).toBe(true)
    dispose()
  })

  it('ghost edge is hidden (display:none) when state is idle', () => {
    const ctx = makeCtx()
    // State starts as idle
    expect(ctx.interactionState().type).toBe('idle')
    const { el, dispose } = createGhostEdge(ctx, svgContainer)
    expect(el.style.display).toBe('none')
    dispose()
  })

  it('ghost edge becomes visible when state transitions to connecting', () => {
    const ctx = makeCtx()
    const { el, dispose } = createGhostEdge(ctx, svgContainer)

    ctx.stateMgr.toConnecting('n1', 'h1', 'source', { x: 100, y: 200 })

    expect(el.style.display).not.toBe('none')
    dispose()
  })

  it('ghost edge is hidden again after returning to idle', () => {
    const ctx = makeCtx()
    const { el, dispose } = createGhostEdge(ctx, svgContainer)

    ctx.stateMgr.toConnecting('n1', 'h1', 'source', { x: 100, y: 200 })
    expect(el.style.display).not.toBe('none')

    ctx.stateMgr.toIdle()
    expect(el.style.display).toBe('none')
    dispose()
  })

  it('ghost edge path string starts from sourcePoint when connecting', () => {
    const ctx = makeCtx()
    const { el, dispose } = createGhostEdge(ctx, svgContainer)

    ctx.stateMgr.toConnecting('n1', 'h1', 'source', { x: 50, y: 75 })

    const d = el.getAttribute('d') ?? ''
    expect(d).toContain('M 50 75')
    dispose()
  })

  it('ghost edge path updates when currentPoint Signal changes', () => {
    const ctx = makeCtx()
    const { el, dispose } = createGhostEdge(ctx, svgContainer)

    ctx.stateMgr.toConnecting('n1', 'h1', 'source', { x: 50, y: 75 })

    const state = ctx.interactionState()
    if (state.type === 'connecting') {
      state.currentPoint.set({ x: 300, y: 400 })
    }

    const d = el.getAttribute('d') ?? ''
    // Bezier path ends at target coordinates (no L prefix)
    expect(d).toContain('300 400')
    expect(d).not.toMatch(/^M 50 75 L/)  // must be bezier, not straight line
    dispose()
  })

  it('dispose() removes the path element from the SVG', () => {
    const ctx = makeCtx()
    const { el, dispose } = createGhostEdge(ctx, svgContainer)
    expect(svgContainer.contains(el)).toBe(true)
    dispose()
    expect(svgContainer.contains(el)).toBe(false)
  })
})
