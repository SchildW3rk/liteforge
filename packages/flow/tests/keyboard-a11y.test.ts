/**
 * Keyboard Accessibility tests for @liteforge/flow
 *
 * Tests the roving-tabindex pattern, ARIA attributes, Tab/Arrow/Enter/Escape
 * key handling, and Delete/Backspace still work.
 *
 * Environment: happy-dom (vitest)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { signal } from '@liteforge/core'
import { setupKeyboard, initNodeTabIndex } from '../src/interactions/keyboard.js'
import type { FlowContextValue } from '../src/context.js'
import type { FlowNode, FlowEdge, InteractionState } from '../src/types.js'

// ---- minimal ctx factory ----

function makeNode(id: string, selected = false, position = { x: 0, y: 0 }): FlowNode {
  return { id, type: 'default', position, data: { label: `Node ${id}` }, selected }
}

function makeCtx(nodes: FlowNode[] = [], edges: FlowEdge[] = []) {
  const nodesSignal  = signal(nodes)
  const edgesSignal  = signal(edges)
  const interState   = signal<InteractionState>({ type: 'idle' })

  const onNodesChange = vi.fn()
  const onEdgesChange = vi.fn()

  const ctx = {
    nodes:  nodesSignal,
    edges:  edgesSignal,
    getNode:  (id: string) => nodesSignal().find(n => n.id === id),
    getEdge:  (id: string) => edgesSignal().find(e => e.id === id),
    getNodes: () => nodesSignal(),
    getEdges: () => edgesSignal(),
    getChildren: () => [],
    getAbsolutePosition: (id: string) => {
      const n = nodesSignal().find(n => n.id === id)
      return n?.position ?? { x: 0, y: 0 }
    },
    transform:  signal({ x: 0, y: 0, scale: 1 }),
    getRootRect: () => ({ left: 0, top: 0, width: 800, height: 600 } as DOMRect),
    interactionState: interState,
    stateMgr: { toDragging: vi.fn(), toConnecting: vi.fn(), toSelecting: vi.fn(), toIdle: vi.fn(), state: interState },
    interactionStateManager: { toDragging: vi.fn(), toConnecting: vi.fn(), toSelecting: vi.fn(), toIdle: vi.fn(), state: interState },
    handleRegistry: {} as FlowContextValue['handleRegistry'],
    onNodesChange,
    onEdgesChange,
    onConnect: undefined,
    onNodeMouseEnter: undefined,
    onNodeMouseLeave: undefined,
    onEdgeMouseEnter: undefined,
    onEdgeMouseLeave: undefined,
    isValidConnection: undefined,
    nodeTypes: {},
    edgeTypes: undefined,
    connectionLineType: 'bezier' as const,
    registerNodeSize: vi.fn(),
    getNodeSize: () => undefined,
    nodeSizeVersion: signal(0),
    snapToGrid: undefined,
    nodeContextMenu: undefined,
    edgeContextMenu: undefined,
    paneContextMenu: undefined,
    contextMenu: undefined,
  } as unknown as FlowContextValue

  return { ctx, onNodesChange, onEdgesChange, nodesSignal }
}

/** Creates a minimal root div with node wrappers appended. */
function makeRoot(nodeIds: string[]): HTMLElement {
  const root = document.createElement('div')
  root.className = 'lf-flow-root'
  for (const id of nodeIds) {
    const el = document.createElement('div')
    el.className = 'lf-node-wrapper'
    el.setAttribute('data-node-id', id)
    el.setAttribute('tabindex', '-1')
    root.appendChild(el)
  }
  document.body.appendChild(root)
  return root
}

function fireKey(target: EventTarget, key: string, extra: KeyboardEventInit = {}) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...extra }))
}

// ---- Tests ----

describe('setupKeyboard — roving tabindex + ARIA keyboard', () => {
  let root: HTMLElement

  beforeEach(() => {
    root = makeRoot(['a', 'b', 'c'])
  })

  describe('root element setup', () => {
    it('sets tabindex="-1" on root if not already set', () => {
      const { ctx } = makeCtx()
      setupKeyboard(ctx, root)
      expect(root.getAttribute('tabindex')).toBe('-1')
    })

    it('preserves existing tabindex on root', () => {
      root.setAttribute('tabindex', '0')
      const { ctx } = makeCtx()
      setupKeyboard(ctx, root)
      expect(root.getAttribute('tabindex')).toBe('0')
    })

    it('sets outline:none on root', () => {
      const { ctx } = makeCtx()
      setupKeyboard(ctx, root)
      // happy-dom may expand 'none' to 'none none' for the outline shorthand
      expect(root.style.outline).toContain('none')
    })
  })

  describe('initNodeTabIndex', () => {
    it('gives tabindex="0" to the first node when no node has it', () => {
      const root2 = document.createElement('div')
      root2.className = 'lf-flow-root'
      const el = document.createElement('div')
      el.className = 'lf-node-wrapper'
      root2.appendChild(el)

      initNodeTabIndex(el, root2)
      expect(el.getAttribute('tabindex')).toBe('0')
    })

    it('gives tabindex="-1" when another node already has tabindex="0"', () => {
      const root2 = document.createElement('div')
      root2.className = 'lf-flow-root'
      const el1 = document.createElement('div')
      el1.className = 'lf-node-wrapper'
      el1.setAttribute('tabindex', '0')
      root2.appendChild(el1)

      const el2 = document.createElement('div')
      el2.className = 'lf-node-wrapper'
      root2.appendChild(el2)

      initNodeTabIndex(el2, root2)
      expect(el2.getAttribute('tabindex')).toBe('-1')
    })
  })

  describe('Tab key — forward navigation', () => {
    it('moves tabindex="0" forward on Tab', () => {
      const { ctx } = makeCtx()
      setupKeyboard(ctx, root)

      // Set first node as active
      const wrappers = root.querySelectorAll<HTMLElement>('.lf-node-wrapper')
      wrappers[0].setAttribute('tabindex', '0')
      wrappers[1].setAttribute('tabindex', '-1')
      wrappers[2].setAttribute('tabindex', '-1')

      fireKey(root, 'Tab')

      expect(wrappers[0].getAttribute('tabindex')).toBe('-1')
      expect(wrappers[1].getAttribute('tabindex')).toBe('0')
      expect(wrappers[2].getAttribute('tabindex')).toBe('-1')
    })

    it('does not wrap around at the last node (lets focus leave canvas)', () => {
      const { ctx } = makeCtx()
      setupKeyboard(ctx, root)

      const wrappers = root.querySelectorAll<HTMLElement>('.lf-node-wrapper')
      wrappers[0].setAttribute('tabindex', '-1')
      wrappers[1].setAttribute('tabindex', '-1')
      wrappers[2].setAttribute('tabindex', '0') // last node active

      // Tab at last node: should NOT move focus (edge guard)
      fireKey(root, 'Tab')

      // tabindex="0" stays on last node (no wrap)
      expect(wrappers[2].getAttribute('tabindex')).toBe('0')
    })
  })

  describe('Shift+Tab key — backward navigation', () => {
    it('moves tabindex="0" backward on Shift+Tab', () => {
      const { ctx } = makeCtx()
      setupKeyboard(ctx, root)

      const wrappers = root.querySelectorAll<HTMLElement>('.lf-node-wrapper')
      wrappers[0].setAttribute('tabindex', '-1')
      wrappers[1].setAttribute('tabindex', '0')
      wrappers[2].setAttribute('tabindex', '-1')

      fireKey(root, 'Tab', { shiftKey: true })

      expect(wrappers[0].getAttribute('tabindex')).toBe('0')
      expect(wrappers[1].getAttribute('tabindex')).toBe('-1')
    })

    it('does not wrap around at the first node', () => {
      const { ctx } = makeCtx()
      setupKeyboard(ctx, root)

      const wrappers = root.querySelectorAll<HTMLElement>('.lf-node-wrapper')
      wrappers[0].setAttribute('tabindex', '0')
      wrappers[1].setAttribute('tabindex', '-1')
      wrappers[2].setAttribute('tabindex', '-1')

      fireKey(root, 'Tab', { shiftKey: true })

      expect(wrappers[0].getAttribute('tabindex')).toBe('0')
    })
  })

  describe('Enter key — select focused node', () => {
    it('fires onNodesChange select for the focused node', () => {
      const nodes = [makeNode('a'), makeNode('b'), makeNode('c')]
      const { ctx, onNodesChange } = makeCtx(nodes)
      setupKeyboard(ctx, root)

      const wrappers = root.querySelectorAll<HTMLElement>('.lf-node-wrapper')
      wrappers[1].setAttribute('tabindex', '0') // node 'b' active

      fireKey(root, 'Enter')

      expect(onNodesChange).toHaveBeenCalledOnce()
      const changes = onNodesChange.mock.calls[0][0]
      const bChange = changes.find((c: { id: string; selected: boolean }) => c.id === 'b')
      expect(bChange?.selected).toBe(true)
      // All others deselected
      const otherSelected = changes
        .filter((c: { id: string; selected: boolean }) => c.id !== 'b')
        .some((c: { selected: boolean }) => c.selected)
      expect(otherSelected).toBe(false)
    })

    it('does nothing when no nodes are present', () => {
      const { ctx, onNodesChange } = makeCtx([])
      const emptyRoot = makeRoot([])
      setupKeyboard(ctx, emptyRoot)
      fireKey(emptyRoot, 'Enter')
      expect(onNodesChange).not.toHaveBeenCalled()
    })
  })

  describe('Escape key — deselect all', () => {
    it('deselects all selected nodes', () => {
      const nodes = [makeNode('a', true), makeNode('b', true), makeNode('c', false)]
      const { ctx, onNodesChange } = makeCtx(nodes)
      setupKeyboard(ctx, root)

      fireKey(root, 'Escape')

      expect(onNodesChange).toHaveBeenCalledOnce()
      const changes = onNodesChange.mock.calls[0][0]
      expect(changes.every((c: { selected: boolean }) => c.selected === false)).toBe(true)
    })

    it('deselects selected edges', () => {
      const edges: FlowEdge[] = [
        { id: 'e1', source: 'a', sourceHandle: 'out', target: 'b', targetHandle: 'in', selected: true },
      ]
      const { ctx, onEdgesChange } = makeCtx([], edges)
      setupKeyboard(ctx, root)

      fireKey(root, 'Escape')

      expect(onEdgesChange).toHaveBeenCalledOnce()
      const changes = onEdgesChange.mock.calls[0][0]
      expect(changes[0].selected).toBe(false)
    })

    it('does not fire onNodesChange when nothing is selected', () => {
      const nodes = [makeNode('a', false)]
      const { ctx, onNodesChange } = makeCtx(nodes)
      setupKeyboard(ctx, root)

      fireKey(root, 'Escape')

      expect(onNodesChange).not.toHaveBeenCalled()
    })
  })

  describe('Arrow keys — move focused node', () => {
    it('moves focused node up (ArrowUp)', () => {
      const nodes = [makeNode('a', false, { x: 100, y: 200 })]
      const singleRoot = makeRoot(['a'])
      const { ctx, onNodesChange } = makeCtx(nodes)
      setupKeyboard(ctx, singleRoot)

      const wrappers = singleRoot.querySelectorAll<HTMLElement>('.lf-node-wrapper')
      wrappers[0].setAttribute('tabindex', '0')

      fireKey(singleRoot, 'ArrowUp')

      expect(onNodesChange).toHaveBeenCalledOnce()
      const change = onNodesChange.mock.calls[0][0][0]
      expect(change.type).toBe('position')
      expect(change.id).toBe('a')
      expect(change.position.x).toBe(100)
      expect(change.position.y).toBe(190)
    })

    it('moves focused node down (ArrowDown)', () => {
      const nodes = [makeNode('a', false, { x: 0, y: 0 })]
      const singleRoot = makeRoot(['a'])
      const { ctx, onNodesChange } = makeCtx(nodes)
      setupKeyboard(ctx, singleRoot)

      singleRoot.querySelector<HTMLElement>('.lf-node-wrapper')!.setAttribute('tabindex', '0')
      fireKey(singleRoot, 'ArrowDown')

      const change = onNodesChange.mock.calls[0][0][0]
      expect(change.position.y).toBe(10)
    })

    it('moves focused node left (ArrowLeft)', () => {
      const nodes = [makeNode('a', false, { x: 50, y: 50 })]
      const singleRoot = makeRoot(['a'])
      const { ctx, onNodesChange } = makeCtx(nodes)
      setupKeyboard(ctx, singleRoot)

      singleRoot.querySelector<HTMLElement>('.lf-node-wrapper')!.setAttribute('tabindex', '0')
      fireKey(singleRoot, 'ArrowLeft')

      const change = onNodesChange.mock.calls[0][0][0]
      expect(change.position.x).toBe(40)
    })

    it('moves focused node right (ArrowRight)', () => {
      const nodes = [makeNode('a', false, { x: 50, y: 50 })]
      const singleRoot = makeRoot(['a'])
      const { ctx, onNodesChange } = makeCtx(nodes)
      setupKeyboard(ctx, singleRoot)

      singleRoot.querySelector<HTMLElement>('.lf-node-wrapper')!.setAttribute('tabindex', '0')
      fireKey(singleRoot, 'ArrowRight')

      const change = onNodesChange.mock.calls[0][0][0]
      expect(change.position.x).toBe(60)
    })

    it('uses 5× step with Shift key', () => {
      const nodes = [makeNode('a', false, { x: 0, y: 0 })]
      const singleRoot = makeRoot(['a'])
      const { ctx, onNodesChange } = makeCtx(nodes)
      setupKeyboard(ctx, singleRoot)

      singleRoot.querySelector<HTMLElement>('.lf-node-wrapper')!.setAttribute('tabindex', '0')
      fireKey(singleRoot, 'ArrowRight', { shiftKey: true })

      const change = onNodesChange.mock.calls[0][0][0]
      expect(change.position.x).toBe(50) // 10 * 5
    })

    it('ignores Ctrl+Arrow (browser shortcuts)', () => {
      const nodes = [makeNode('a', false, { x: 0, y: 0 })]
      const singleRoot = makeRoot(['a'])
      const { ctx, onNodesChange } = makeCtx(nodes)
      setupKeyboard(ctx, singleRoot)

      singleRoot.querySelector<HTMLElement>('.lf-node-wrapper')!.setAttribute('tabindex', '0')
      fireKey(singleRoot, 'ArrowRight', { ctrlKey: true })

      expect(onNodesChange).not.toHaveBeenCalled()
    })
  })

  describe('Delete/Backspace — remove selected nodes/edges', () => {
    it('removes selected nodes on Delete', () => {
      const nodes = [makeNode('a', true), makeNode('b', false)]
      const { ctx, onNodesChange } = makeCtx(nodes)
      setupKeyboard(ctx, root)

      fireKey(root, 'Delete')

      expect(onNodesChange).toHaveBeenCalledOnce()
      const changes = onNodesChange.mock.calls[0][0]
      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ type: 'remove', id: 'a' })
    })

    it('removes selected edges on Backspace', () => {
      const edges: FlowEdge[] = [
        { id: 'e1', source: 'a', sourceHandle: 'o', target: 'b', targetHandle: 'i', selected: true },
        { id: 'e2', source: 'b', sourceHandle: 'o', target: 'c', targetHandle: 'i', selected: false },
      ]
      const { ctx, onEdgesChange } = makeCtx([], edges)
      setupKeyboard(ctx, root)

      fireKey(root, 'Backspace')

      expect(onEdgesChange).toHaveBeenCalledOnce()
      const changes = onEdgesChange.mock.calls[0][0]
      expect(changes).toHaveLength(1)
      expect(changes[0]).toEqual({ type: 'remove', id: 'e1' })
    })

    it('ignores Delete when target is an input', () => {
      const nodes = [makeNode('a', true)]
      const { ctx, onNodesChange } = makeCtx(nodes)
      setupKeyboard(ctx, root)

      const input = document.createElement('input')
      root.appendChild(input)
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))

      expect(onNodesChange).not.toHaveBeenCalled()
    })

    it('ignores Ctrl+Delete', () => {
      const nodes = [makeNode('a', true)]
      const { ctx, onNodesChange } = makeCtx(nodes)
      setupKeyboard(ctx, root)

      fireKey(root, 'Delete', { ctrlKey: true })

      expect(onNodesChange).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('removes listener after cleanup call', () => {
      const nodes = [makeNode('a', true)]
      const { ctx, onNodesChange } = makeCtx(nodes)
      const cleanup = setupKeyboard(ctx, root)

      cleanup()
      fireKey(root, 'Delete')

      expect(onNodesChange).not.toHaveBeenCalled()
    })
  })
})

describe('ARIA attributes on FlowCanvas root', () => {
  it('FlowCanvas adds role=application and aria-label to root', async () => {
    const { FlowCanvas } = await import('../src/components/FlowCanvas.js')
    const { createFlow } = await import('../src/flow.js')

    const flow = createFlow({ nodeTypes: {} })
    const nodesSignal = signal<FlowNode[]>([])
    const edgesSignal = signal<any[]>([])

    const root = FlowCanvas({
      flow,
      nodes: nodesSignal,
      edges: edgesSignal,
    }) as HTMLElement

    expect(root.getAttribute('role')).toBe('application')
    expect(root.getAttribute('aria-label')).toBe('Flow canvas')
  })
})
