import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { signal } from '@liteforge/core'
import type { FlowContextValue } from '../src/context.js'
import type {
  FlowNode,
  FlowEdge,
  Transform,
  NodeChange,
} from '../src/types.js'
import { createInteractionState } from '../src/state.js'
import { createHandleRegistry } from '../src/registry/handle-registry.js'
import { createNodeWrapper } from '../src/components/NodeWrapper.js'
import { createMarquee } from '../src/components/Marquee.js'

// ---- Helpers ----

function makeNode(id: string, x = 50, y = 80, selected = false): FlowNode {
  return { id, type: 'default', position: { x, y }, data: null, selected }
}

function makeCtx(
  nodesArr: FlowNode[],
  overrides: Partial<FlowContextValue> = {},
): FlowContextValue {
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
    getChildren: () => [],
    getAbsolutePosition: (id) => nodesArr.find(n => n.id === id)?.position ?? { x: 0, y: 0 },
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
    snapToGrid: undefined,
    nodeContextMenu: undefined,
    edgeContextMenu: undefined,
    paneContextMenu: undefined,
    ...overrides,
  }
  return ctx
}

// ---- Tests ----

describe('Node click-select', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('plain click calls onNodesChange with selected:true for clicked node', () => {
    const node = makeNode('n1', 0, 0, false)
    const onNodesChange = vi.fn()
    const ctx = makeCtx([node], { onNodesChange })

    const { el, dispose } = createNodeWrapper('n1', ctx, container)
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(onNodesChange).toHaveBeenCalledTimes(1)
    const changes: NodeChange[] = onNodesChange.mock.calls[0]![0]
    const change = changes.find(c => c.id === 'n1')
    expect(change?.type).toBe('select')
    if (change?.type === 'select') {
      expect(change.selected).toBe(true)
    }
    dispose()
  })

  it('shift-click toggles selection from false to true', () => {
    const node = makeNode('n1', 0, 0, false)
    const onNodesChange = vi.fn()
    const ctx = makeCtx([node], { onNodesChange })

    const { el, dispose } = createNodeWrapper('n1', ctx, container)
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }))

    expect(onNodesChange).toHaveBeenCalledTimes(1)
    const changes: NodeChange[] = onNodesChange.mock.calls[0]![0]
    const change = changes.find(c => c.id === 'n1')
    if (change?.type === 'select') {
      expect(change.selected).toBe(true)
    }
    dispose()
  })

  it('shift-click toggles selection from true to false', () => {
    const node = makeNode('n1', 0, 0, true)
    const onNodesChange = vi.fn()
    const ctx = makeCtx([node], { onNodesChange })

    const { el, dispose } = createNodeWrapper('n1', ctx, container)
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey: true }))

    expect(onNodesChange).toHaveBeenCalledTimes(1)
    const changes: NodeChange[] = onNodesChange.mock.calls[0]![0]
    const change = changes.find(c => c.id === 'n1')
    if (change?.type === 'select') {
      expect(change.selected).toBe(false)
    }
    dispose()
  })

  it('plain click deselects other nodes', () => {
    const n1 = makeNode('n1', 0, 0, true)
    const n2 = makeNode('n2', 100, 0, true)
    const n3 = makeNode('n3', 200, 0, false)
    const onNodesChange = vi.fn()
    const ctx = makeCtx([n1, n2, n3], { onNodesChange })

    const { el: el2, dispose } = createNodeWrapper('n2', ctx, container)
    el2.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

    expect(onNodesChange).toHaveBeenCalledTimes(1)
    const changes: NodeChange[] = onNodesChange.mock.calls[0]![0]
    // n2 should be selected
    const c2 = changes.find(c => c.id === 'n2')
    if (c2?.type === 'select') expect(c2.selected).toBe(true)
    // n1 should be deselected
    const c1 = changes.find(c => c.id === 'n1')
    if (c1?.type === 'select') expect(c1.selected).toBe(false)
    dispose()
  })

  it('NodeWrapper has lf-node-selected class when node.selected is true', () => {
    const node = makeNode('n1', 0, 0, true)
    const ctx = makeCtx([node])
    const { el, dispose } = createNodeWrapper('n1', ctx, container)
    expect(el.classList.contains('lf-node-selected')).toBe(true)
    dispose()
  })

  it('NodeWrapper does NOT have lf-node-selected class when node.selected is false', () => {
    const node = makeNode('n1', 0, 0, false)
    const ctx = makeCtx([node])
    const { el, dispose } = createNodeWrapper('n1', ctx, container)
    expect(el.classList.contains('lf-node-selected')).toBe(false)
    dispose()
  })
})

describe('Marquee component', () => {
  let transformLayer: HTMLDivElement

  beforeEach(() => {
    transformLayer = document.createElement('div')
    transformLayer.className = 'lf-transform-layer'
    document.body.appendChild(transformLayer)
  })

  afterEach(() => {
    transformLayer.remove()
  })

  it('creates marquee element with class lf-marquee', () => {
    const ctx = makeCtx([])
    const { el, dispose } = createMarquee(ctx, transformLayer)
    expect(el.classList.contains('lf-marquee')).toBe(true)
    dispose()
  })

  it('marquee is hidden (display:none) when state is idle', () => {
    const ctx = makeCtx([])
    const { el, dispose } = createMarquee(ctx, transformLayer)
    expect(ctx.interactionState().type).toBe('idle')
    expect(el.style.display).toBe('none')
    dispose()
  })

  it('marquee becomes visible when state transitions to selecting', () => {
    const ctx = makeCtx([])
    const { el, dispose } = createMarquee(ctx, transformLayer)

    ctx.stateMgr.toSelecting({ x: 10, y: 20 }, 1)

    expect(el.style.display).not.toBe('none')
    dispose()
  })

  it('marquee rect updates when currentCanvasPoint changes', () => {
    const ctx = makeCtx([])
    const { el, dispose } = createMarquee(ctx, transformLayer)

    ctx.stateMgr.toSelecting({ x: 10, y: 20 }, 1)

    const state = ctx.interactionState()
    if (state.type === 'selecting') {
      state.currentCanvasPoint.set({ x: 110, y: 120 })
    }

    expect(el.style.left).toBe('10px')
    expect(el.style.top).toBe('20px')
    expect(el.style.width).toBe('100px')
    expect(el.style.height).toBe('100px')
    dispose()
  })

  it('marquee is hidden again after returning to idle', () => {
    const ctx = makeCtx([])
    const { el, dispose } = createMarquee(ctx, transformLayer)

    ctx.stateMgr.toSelecting({ x: 10, y: 20 }, 1)
    expect(el.style.display).not.toBe('none')

    ctx.stateMgr.toIdle()
    expect(el.style.display).toBe('none')
    dispose()
  })

  it('marquee dispose removes element from the transform layer', () => {
    const ctx = makeCtx([])
    const { el, dispose } = createMarquee(ctx, transformLayer)
    expect(transformLayer.contains(el)).toBe(true)
    dispose()
    expect(transformLayer.contains(el)).toBe(false)
  })
})
