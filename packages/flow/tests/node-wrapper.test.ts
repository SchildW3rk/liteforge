import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { signal } from '@liteforge/core'
import type { FlowContextValue } from '../src/context.js'
import type {
  InteractionState,
  FlowNode,
  Point,
  Transform,
  HandleType,
  HandlePosition,
  FlowEdge,
  NodeChange,
  EdgeChange,
  Connection,
} from '../src/types.js'
import type { InteractionStateManager } from '../src/state.js'
import { createInteractionState } from '../src/state.js'
import { createNodeWrapper } from '../src/components/NodeWrapper.js'
import type { HandleRegistry } from '../src/registry/handle-registry.js'
import { createHandleRegistry } from '../src/registry/handle-registry.js'

// ---- Helpers ----

function makeNode(id: string, x = 50, y = 80, selected = false): FlowNode {
  return { id, type: 'default', position: { x, y }, data: null, selected }
}

function makeCtx(
  node: FlowNode,
  overrides: Partial<FlowContextValue> = {},
): FlowContextValue {
  const nodesArr: FlowNode[] = [node]
  const stateMgr = createInteractionState()
  const handleRegistry = createHandleRegistry()
  const transform = signal<Transform>({ x: 0, y: 0, scale: 1 })

  const ctx: FlowContextValue = {
    nodes: () => nodesArr,
    edges: () => [],
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
    nodeTypes: {
      default: (_n: FlowNode) => {
        const el = document.createElement('div')
        el.className = 'test-node-content'
        return el
      },
    },
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

describe('createNodeWrapper', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('creates an element with class lf-node-wrapper', () => {
    const node = makeNode('n1')
    const ctx = makeCtx(node)
    const { el, dispose } = createNodeWrapper('n1', ctx, container)
    expect(el.classList.contains('lf-node-wrapper')).toBe(true)
    dispose()
  })

  it('sets data-node-id attribute', () => {
    const node = makeNode('n1')
    const ctx = makeCtx(node)
    const { el, dispose } = createNodeWrapper('n1', ctx, container)
    expect(el.getAttribute('data-node-id')).toBe('n1')
    dispose()
  })

  it('sets initial position from node coordinates', async () => {
    const node = makeNode('n1', 120, 240)
    const ctx = makeCtx(node)
    const { el, dispose } = createNodeWrapper('n1', ctx, container)
    // Effects run synchronously in happy-dom
    expect(el.style.left).toBe('120px')
    expect(el.style.top).toBe('240px')
    dispose()
  })

  it('appends the element to nodesLayer', () => {
    const node = makeNode('n1')
    const ctx = makeCtx(node)
    const { dispose } = createNodeWrapper('n1', ctx, container)
    expect(container.contains(container.querySelector('[data-node-id="n1"]'))).toBe(true)
    dispose()
  })

  it('renders user node content via nodeTypes', () => {
    const node = makeNode('n1')
    const ctx = makeCtx(node)
    const { el, dispose } = createNodeWrapper('n1', ctx, container)
    expect(el.querySelector('.test-node-content')).not.toBeNull()
    dispose()
  })

  it('applies drag offset when state is dragging for this node', () => {
    const node = makeNode('n1', 100, 200)
    const ctx = makeCtx(node)
    const { el, dispose } = createNodeWrapper('n1', ctx, container)

    // Transition to dragging for this node
    ctx.stateMgr.toDragging('n1', 1, { x: 100, y: 200 }, { x: 100, y: 200 })
    const state = ctx.interactionState()
    if (state.type === 'dragging') {
      state.localOffset.set({ x: 30, y: 40 })
    }

    // Position effect should pick up the offset
    expect(el.style.left).toBe('130px')
    expect(el.style.top).toBe('240px')
    dispose()
  })

  it('does NOT apply drag offset when state is dragging for a different node', () => {
    const node = makeNode('n1', 100, 200)
    const ctx = makeCtx(node)
    const { el, dispose } = createNodeWrapper('n1', ctx, container)

    ctx.stateMgr.toDragging('n2', 1, { x: 0, y: 0 }, { x: 0, y: 0 })
    const state = ctx.interactionState()
    if (state.type === 'dragging') {
      state.localOffset.set({ x: 999, y: 999 })
    }

    // n1 should NOT move
    expect(el.style.left).toBe('100px')
    expect(el.style.top).toBe('200px')
    dispose()
  })

  it('adds lf-node-selected class when node.selected is true', () => {
    const nodesArr = [makeNode('n1', 0, 0, true)]
    const ctx = makeCtx(nodesArr[0]!, {
      nodes: () => nodesArr,
      getNode: (id) => nodesArr.find(n => n.id === id),
    })
    const { el, dispose } = createNodeWrapper('n1', ctx, container)
    expect(el.classList.contains('lf-node-selected')).toBe(true)
    dispose()
  })

  it('does not add lf-node-selected class when node.selected is false', () => {
    const node = makeNode('n1', 0, 0, false)
    const ctx = makeCtx(node)
    const { el, dispose } = createNodeWrapper('n1', ctx, container)
    expect(el.classList.contains('lf-node-selected')).toBe(false)
    dispose()
  })

  it('dispose() removes the element from the DOM', () => {
    const node = makeNode('n1')
    const ctx = makeCtx(node)
    const { el, dispose } = createNodeWrapper('n1', ctx, container)
    expect(container.contains(el)).toBe(true)
    dispose()
    expect(container.contains(el)).toBe(false)
  })
})
