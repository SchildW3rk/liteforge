import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { signal } from '@liteforge/core'
import type { FlowContextValue } from '../src/context.js'
import type { FlowNode, FlowEdge, Transform } from '../src/types.js'
import { createInteractionState } from '../src/state.js'
import { createHandleRegistry } from '../src/registry/handle-registry.js'
import { setupKeyboard } from '../src/interactions/keyboard.js'

// ---- Helpers ----

function makeNode(id: string, selected = false): FlowNode {
  return { id, type: 'default', position: { x: 0, y: 0 }, data: null, selected }
}

function makeEdge(id: string, selected = false): FlowEdge {
  return { id, source: 'a', sourceHandle: 'out', target: 'b', targetHandle: 'in', selected }
}

function makeCtx(
  nodesArr: FlowNode[],
  edgesArr: FlowEdge[],
  overrides: Partial<FlowContextValue> = {},
): FlowContextValue {
  const stateMgr = createInteractionState()
  const handleRegistry = createHandleRegistry()
  const transform = signal<Transform>({ x: 0, y: 0, scale: 1 })

  return {
    nodes: () => nodesArr,
    edges: () => edgesArr,
    getNode: (id) => nodesArr.find(n => n.id === id),
    getEdge: (id) => edgesArr.find(e => e.id === id),
    getNodes: () => nodesArr,
    getEdges: () => edgesArr,
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
}

function fire(root: HTMLElement, key: string, opts: KeyboardEventInit = {}) {
  root.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }))
}

// ---- Tests ----

describe('setupKeyboard', () => {
  let root: HTMLDivElement

  beforeEach(() => {
    root = document.createElement('div')
    document.body.appendChild(root)
  })

  afterEach(() => {
    root.remove()
  })

  // ── tabindex / focus setup ──────────────────────────────────────────────

  it('sets tabindex="-1" on root so canvas can receive keyboard focus', () => {
    const ctx = makeCtx([], [])
    setupKeyboard(ctx, root)
    expect(root.getAttribute('tabindex')).toBe('-1')
  })

  it('does not overwrite an existing tabindex attribute', () => {
    const ctx = makeCtx([], [])
    root.setAttribute('tabindex', '0')
    setupKeyboard(ctx, root)
    expect(root.getAttribute('tabindex')).toBe('0')
  })

  it('sets outline:none on root (removes focus ring)', () => {
    const ctx = makeCtx([], [])
    setupKeyboard(ctx, root)
    // happy-dom serializes `outline:none` as `none none`; just check it contains 'none'
    expect(root.style.outline).toContain('none')
  })

  // ── Delete key — nodes ──────────────────────────────────────────────────

  it('Delete key removes selected nodes via onNodesChange', () => {
    const nodes = [makeNode('n1', true), makeNode('n2', false)]
    const onNodesChange = vi.fn()
    const ctx = makeCtx(nodes, [], { onNodesChange })
    setupKeyboard(ctx, root)

    fire(root, 'Delete')

    expect(onNodesChange).toHaveBeenCalledTimes(1)
    const changes = onNodesChange.mock.calls[0]![0]
    expect(changes).toHaveLength(1)
    expect(changes[0]).toEqual({ type: 'remove', id: 'n1' })
  })

  it('Backspace key removes selected nodes', () => {
    const nodes = [makeNode('a', true), makeNode('b', true)]
    const onNodesChange = vi.fn()
    const ctx = makeCtx(nodes, [], { onNodesChange })
    setupKeyboard(ctx, root)

    fire(root, 'Backspace')

    expect(onNodesChange).toHaveBeenCalledTimes(1)
    const changes = onNodesChange.mock.calls[0]![0]
    expect(changes).toHaveLength(2)
    expect(changes.map((c: { id: string }) => c.id).sort()).toEqual(['a', 'b'])
  })

  it('Delete key with no selected nodes does not call onNodesChange', () => {
    const nodes = [makeNode('n1', false), makeNode('n2', false)]
    const onNodesChange = vi.fn()
    const ctx = makeCtx(nodes, [], { onNodesChange })
    setupKeyboard(ctx, root)

    fire(root, 'Delete')

    expect(onNodesChange).not.toHaveBeenCalled()
  })

  // ── Delete key — edges ──────────────────────────────────────────────────

  it('Delete key removes selected edges via onEdgesChange', () => {
    const edges = [makeEdge('e1', true), makeEdge('e2', false)]
    const onEdgesChange = vi.fn()
    const ctx = makeCtx([], edges, { onEdgesChange })
    setupKeyboard(ctx, root)

    fire(root, 'Delete')

    expect(onEdgesChange).toHaveBeenCalledTimes(1)
    const changes = onEdgesChange.mock.calls[0]![0]
    expect(changes).toHaveLength(1)
    expect(changes[0]).toEqual({ type: 'remove', id: 'e1' })
  })

  it('Delete key removes both selected nodes and edges simultaneously', () => {
    const nodes = [makeNode('n1', true)]
    const edges = [makeEdge('e1', true)]
    const onNodesChange = vi.fn()
    const onEdgesChange = vi.fn()
    const ctx = makeCtx(nodes, edges, { onNodesChange, onEdgesChange })
    setupKeyboard(ctx, root)

    fire(root, 'Delete')

    expect(onNodesChange).toHaveBeenCalledTimes(1)
    expect(onEdgesChange).toHaveBeenCalledTimes(1)
  })

  // ── Modifier keys — must NOT delete ────────────────────────────────────

  it('Ctrl+Delete does NOT trigger deletion', () => {
    const nodes = [makeNode('n1', true)]
    const onNodesChange = vi.fn()
    const ctx = makeCtx(nodes, [], { onNodesChange })
    setupKeyboard(ctx, root)

    fire(root, 'Delete', { ctrlKey: true })

    expect(onNodesChange).not.toHaveBeenCalled()
  })

  it('Meta+Delete does NOT trigger deletion', () => {
    const nodes = [makeNode('n1', true)]
    const onNodesChange = vi.fn()
    const ctx = makeCtx(nodes, [], { onNodesChange })
    setupKeyboard(ctx, root)

    fire(root, 'Delete', { metaKey: true })

    expect(onNodesChange).not.toHaveBeenCalled()
  })

  it('Alt+Backspace does NOT trigger deletion', () => {
    const nodes = [makeNode('n1', true)]
    const onNodesChange = vi.fn()
    const ctx = makeCtx(nodes, [], { onNodesChange })
    setupKeyboard(ctx, root)

    fire(root, 'Backspace', { altKey: true })

    expect(onNodesChange).not.toHaveBeenCalled()
  })

  // ── Unrelated keys ──────────────────────────────────────────────────────

  it('unhandled keys (e.g. "a", "F2") do not trigger deletion', () => {
    const nodes = [makeNode('n1', true)]
    const onNodesChange = vi.fn()
    const ctx = makeCtx(nodes, [], { onNodesChange })
    setupKeyboard(ctx, root)

    fire(root, 'a')
    fire(root, 'F2')
    fire(root, 'Home')

    expect(onNodesChange).not.toHaveBeenCalled()
  })

  // ── Input / editable element guard ─────────────────────────────────────

  it('Delete from an <input> inside the canvas does NOT delete nodes', () => {
    const nodes = [makeNode('n1', true)]
    const onNodesChange = vi.fn()
    const ctx = makeCtx(nodes, [], { onNodesChange })
    setupKeyboard(ctx, root)

    const input = document.createElement('input')
    root.appendChild(input)

    // Dispatch from the input element directly — target will be the input
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))

    expect(onNodesChange).not.toHaveBeenCalled()
  })

  it('Delete from a <textarea> inside the canvas does NOT delete nodes', () => {
    const nodes = [makeNode('n1', true)]
    const onNodesChange = vi.fn()
    const ctx = makeCtx(nodes, [], { onNodesChange })
    setupKeyboard(ctx, root)

    const ta = document.createElement('textarea')
    root.appendChild(ta)

    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }))

    expect(onNodesChange).not.toHaveBeenCalled()
  })

  // ── Cleanup ─────────────────────────────────────────────────────────────

  it('cleanup function removes the keydown listener', () => {
    const nodes = [makeNode('n1', true)]
    const onNodesChange = vi.fn()
    const ctx = makeCtx(nodes, [], { onNodesChange })
    const cleanup = setupKeyboard(ctx, root)

    cleanup()
    fire(root, 'Delete')

    expect(onNodesChange).not.toHaveBeenCalled()
  })
})
