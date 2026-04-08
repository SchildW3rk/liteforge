import { describe, it, expect, beforeEach, vi } from 'vitest'
import { signal } from '@liteforge/core'
import type { FlowContextValue } from '../src/context.js'
import type { FlowNode, InteractionState, Transform } from '../src/types.js'
import { createNodeResizer } from '../src/components/NodeResizer.js'
import { setupNodeResize } from '../src/interactions/resize.js'

// ---- Helpers ----

function makeCtx(overrides: Partial<FlowContextValue> = {}): FlowContextValue {
  const transform = signal<Transform>({ x: 0, y: 0, scale: 1 })
  ;(transform as any).peek = () => transform()

  const nodes: FlowNode[] = [
    { id: 'n1', type: 'default', position: { x: 50, y: 100 }, data: {}, width: 200, height: 120 },
  ]

  return {
    transform,
    interactionState: signal<InteractionState>({ type: 'idle' }),
    getNode: (id) => nodes.find(n => n.id === id) ?? null,
    getNodes: () => nodes,
    getEdge: () => null,
    getEdges: () => [],
    registerHandle: vi.fn(),
    unregisterHandle: vi.fn(),
    getHandlePosition: () => null,
    registerNodeSize: vi.fn(),
    getRootRect: () => ({ left: 0, top: 0, width: 800, height: 600 } as DOMRect),
    nodeTypes: {},
    edgeTypes: {},
    connectionLineType: 'bezier',
    onNodesChange: vi.fn(),
    onEdgesChange: undefined,
    onConnect: undefined,
    isValidConnection: undefined,
    stateMgr: {
      toIdle: vi.fn(),
      toDragging: vi.fn(),
      toConnecting: vi.fn(),
      toSelecting: vi.fn(),
      toReconnecting: vi.fn(),
    },
    contextMenu: undefined,
    snapToGrid: undefined,
    ...overrides,
  } as unknown as FlowContextValue
}

// ---- createNodeResizer ----

describe('createNodeResizer', () => {
  it('returns a div with class lf-node-resizer', () => {
    const ctx = makeCtx()
    const el = createNodeResizer('n1', ctx)
    expect(el.tagName).toBe('DIV')
    expect(el.className).toBe('lf-node-resizer')
  })

  it('creates exactly 8 handle children', () => {
    const ctx = makeCtx()
    const el = createNodeResizer('n1', ctx)
    expect(el.children.length).toBe(8)
  })

  it('each handle has the correct direction class and dataset attribute', () => {
    const ctx = makeCtx()
    const el = createNodeResizer('n1', ctx)
    const dirs = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']
    const handles = Array.from(el.children) as HTMLElement[]
    for (let i = 0; i < dirs.length; i++) {
      const dir = dirs[i]
      expect(handles[i].className).toBe(`lf-resize-handle lf-resize-handle--${dir}`)
      expect(handles[i].dataset['resizeDir']).toBe(dir)
    }
  })

  it('pointerdown on handle calls stopPropagation and preventDefault', () => {
    const ctx = makeCtx()
    const el = createNodeResizer('n1', ctx)

    // Set up a fake wrapper in the document
    const wrapperEl = document.createElement('div')
    wrapperEl.setAttribute('data-node-id', 'n1')
    Object.defineProperty(wrapperEl, 'getBoundingClientRect', {
      value: () => ({ left: 50, top: 100, width: 200, height: 120 }),
    })
    document.body.appendChild(wrapperEl)

    const handle = el.children[0] as HTMLElement // 'n' direction
    const e = new PointerEvent('pointerdown', {
      button: 0,
      bubbles: true,
      pointerId: 1,
      clientX: 150,
      clientY: 100,
    })
    const stopSpy = vi.spyOn(e, 'stopPropagation')
    const preventSpy = vi.spyOn(e, 'preventDefault')
    ;(handle as any).setPointerCapture = vi.fn()

    handle.dispatchEvent(e)

    expect(stopSpy).toHaveBeenCalled()
    expect(preventSpy).toHaveBeenCalled()

    document.body.removeChild(wrapperEl)
  })

  it('pointerdown with button !== 0 does nothing', () => {
    const ctx = makeCtx()
    const el = createNodeResizer('n1', ctx)
    const handle = el.children[0] as HTMLElement
    const e = new PointerEvent('pointerdown', {
      button: 2,
      bubbles: true,
      pointerId: 1,
    })
    const stopSpy = vi.spyOn(e, 'stopPropagation')
    handle.dispatchEvent(e)
    expect(stopSpy).not.toHaveBeenCalled()
  })

  it('pointerdown does nothing if wrapper element not found', () => {
    const ctx = makeCtx()
    const el = createNodeResizer('n1', ctx)
    const handle = el.children[0] as HTMLElement
    // No wrapperEl in DOM

    const e = new PointerEvent('pointerdown', {
      button: 0,
      bubbles: true,
      pointerId: 1,
      clientX: 150,
      clientY: 100,
    })
    ;(handle as any).setPointerCapture = vi.fn()
    // Should not throw
    expect(() => handle.dispatchEvent(e)).not.toThrow()
  })
})

// ---- setupNodeResize ----

describe('setupNodeResize', () => {
  let ctx: FlowContextValue
  let wrapperEl: HTMLDivElement
  const nodeId = 'n1'

  beforeEach(() => {
    ctx = makeCtx()
    wrapperEl = document.createElement('div')
    wrapperEl.setAttribute('data-node-id', nodeId)
    document.body.appendChild(wrapperEl)
  })

  afterEach(() => {
    if (wrapperEl.parentNode) wrapperEl.parentNode.removeChild(wrapperEl)
  })

  function makeHandle() {
    const handle = document.createElement('div')
    ;(handle as any).setPointerCapture = vi.fn()
    ;(handle as any).releasePointerCapture = vi.fn()
    return handle
  }

  function fire(type: string, init: PointerEventInit) {
    document.dispatchEvent(new PointerEvent(type, init))
  }

  // ---- East (e) ----
  it('e: increases width on move right', () => {
    const handle = makeHandle()
    setupNodeResize(ctx, () => ({ x: 0, y: 0, scale: 1 }), nodeId, 'e',
      100, 200, 200, 120, 50, 100, 1, handle)

    fire('pointermove', { pointerId: 1, clientX: 150, clientY: 200 })

    expect(wrapperEl.style.width).toBe('250px')
    expect(wrapperEl.style.height).toBe('120px')
    // position unchanged
    expect(wrapperEl.style.left).toBe('50px')
    expect(wrapperEl.style.top).toBe('100px')
  })

  it('e: clamps to MIN_SIZE 40', () => {
    const handle = makeHandle()
    setupNodeResize(ctx, () => ({ x: 0, y: 0, scale: 1 }), nodeId, 'e',
      100, 200, 200, 120, 50, 100, 1, handle)

    // dx = -400: startWidth(200) + (-400) = -200, clamped to 40
    fire('pointermove', { pointerId: 1, clientX: -300, clientY: 200 })

    expect(wrapperEl.style.width).toBe('40px')
  })

  // ---- West (w) ----
  it('w: decreases width and moves X on move right', () => {
    const handle = makeHandle()
    setupNodeResize(ctx, () => ({ x: 0, y: 0, scale: 1 }), nodeId, 'w',
      100, 200, 200, 120, 50, 100, 1, handle)

    fire('pointermove', { pointerId: 1, clientX: 130, clientY: 200 }) // dx = +30

    expect(wrapperEl.style.width).toBe('170px')
    expect(wrapperEl.style.left).toBe('80px')
  })

  it('w: clamps to MIN_SIZE and stops X from going too far', () => {
    const handle = makeHandle()
    setupNodeResize(ctx, () => ({ x: 0, y: 0, scale: 1 }), nodeId, 'w',
      100, 200, 200, 120, 50, 100, 1, handle)

    // drag so far right that raw width would be negative
    fire('pointermove', { pointerId: 1, clientX: 400, clientY: 200 })

    expect(wrapperEl.style.width).toBe('40px')
    // X should be startX + startWidth - MIN_SIZE = 50 + 200 - 40 = 210
    expect(wrapperEl.style.left).toBe('210px')
  })

  // ---- South (s) ----
  it('s: increases height on move down', () => {
    const handle = makeHandle()
    setupNodeResize(ctx, () => ({ x: 0, y: 0, scale: 1 }), nodeId, 's',
      100, 200, 200, 120, 50, 100, 1, handle)

    fire('pointermove', { pointerId: 1, clientX: 100, clientY: 260 })

    expect(wrapperEl.style.height).toBe('180px')
    expect(wrapperEl.style.top).toBe('100px')
  })

  // ---- North (n) ----
  it('n: decreases height and moves Y on move down', () => {
    const handle = makeHandle()
    setupNodeResize(ctx, () => ({ x: 0, y: 0, scale: 1 }), nodeId, 'n',
      100, 200, 200, 120, 50, 100, 1, handle)

    fire('pointermove', { pointerId: 1, clientX: 100, clientY: 230 }) // dy = +30

    expect(wrapperEl.style.height).toBe('90px')
    expect(wrapperEl.style.top).toBe('130px')
  })

  // ---- SE corner ----
  it('se: increases both width and height', () => {
    const handle = makeHandle()
    setupNodeResize(ctx, () => ({ x: 0, y: 0, scale: 1 }), nodeId, 'se',
      100, 200, 200, 120, 50, 100, 1, handle)

    fire('pointermove', { pointerId: 1, clientX: 150, clientY: 260 })

    expect(wrapperEl.style.width).toBe('250px')
    expect(wrapperEl.style.height).toBe('180px')
  })

  // ---- NW corner ----
  it('nw: adjusts position for both axes', () => {
    const handle = makeHandle()
    setupNodeResize(ctx, () => ({ x: 0, y: 0, scale: 1 }), nodeId, 'nw',
      100, 200, 200, 120, 50, 100, 1, handle)

    fire('pointermove', { pointerId: 1, clientX: 130, clientY: 230 }) // dx=+30, dy=+30

    expect(wrapperEl.style.width).toBe('170px')
    expect(wrapperEl.style.left).toBe('80px')
    expect(wrapperEl.style.height).toBe('90px')
    expect(wrapperEl.style.top).toBe('130px')
  })

  // ---- scale factor ----
  it('applies scale factor correctly', () => {
    const handle = makeHandle()
    setupNodeResize(ctx, () => ({ x: 0, y: 0, scale: 2 }), nodeId, 'e',
      100, 200, 200, 120, 50, 100, 1, handle)

    // 50px client delta / scale 2 = 25 canvas units
    fire('pointermove', { pointerId: 1, clientX: 150, clientY: 200 })

    expect(wrapperEl.style.width).toBe('225px')
  })

  // ---- pointerup fires onNodesChange ----
  it('pointerup fires resize change', () => {
    const handle = makeHandle()
    setupNodeResize(ctx, () => ({ x: 0, y: 0, scale: 1 }), nodeId, 'e',
      100, 200, 200, 120, 50, 100, 1, handle)

    fire('pointermove', { pointerId: 1, clientX: 150, clientY: 200 })
    fire('pointerup',   { pointerId: 1, clientX: 150, clientY: 200 })

    expect(ctx.onNodesChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        { type: 'resize', id: nodeId, width: 250, height: 120 },
      ])
    )
  })

  it('pointerup also fires position change when N edge moved', () => {
    const handle = makeHandle()
    setupNodeResize(ctx, () => ({ x: 0, y: 0, scale: 1 }), nodeId, 'n',
      100, 200, 200, 120, 50, 100, 1, handle)

    fire('pointermove', { pointerId: 1, clientX: 100, clientY: 230 })
    fire('pointerup',   { pointerId: 1, clientX: 100, clientY: 230 })

    const calls = (ctx.onNodesChange as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const types = calls.map((c: { type: string }) => c.type)
    expect(types).toContain('resize')
    expect(types).toContain('position')
  })

  it('pointerup does NOT fire position change when only E edge moved', () => {
    const handle = makeHandle()
    setupNodeResize(ctx, () => ({ x: 0, y: 0, scale: 1 }), nodeId, 'e',
      100, 200, 200, 120, 50, 100, 1, handle)

    fire('pointermove', { pointerId: 1, clientX: 150, clientY: 200 })
    fire('pointerup',   { pointerId: 1, clientX: 150, clientY: 200 })

    const calls = (ctx.onNodesChange as ReturnType<typeof vi.fn>).mock.calls[0][0]
    const types = calls.map((c: { type: string }) => c.type)
    expect(types).not.toContain('position')
  })

  // ---- pointercancel restores ----
  it('pointercancel restores original dimensions', () => {
    const handle = makeHandle()
    setupNodeResize(ctx, () => ({ x: 0, y: 0, scale: 1 }), nodeId, 'e',
      100, 200, 200, 120, 50, 100, 1, handle)

    fire('pointermove',   { pointerId: 1, clientX: 150, clientY: 200 })
    expect(wrapperEl.style.width).toBe('250px')

    fire('pointercancel', { pointerId: 1 })

    expect(wrapperEl.style.width).toBe('200px')
    expect(wrapperEl.style.height).toBe('120px')
    expect(wrapperEl.style.left).toBe('50px')
    expect(wrapperEl.style.top).toBe('100px')
  })

  // ---- ignores events from other pointer IDs ----
  it('ignores pointermove from different pointerId', () => {
    const handle = makeHandle()
    setupNodeResize(ctx, () => ({ x: 0, y: 0, scale: 1 }), nodeId, 'e',
      100, 200, 200, 120, 50, 100, 1, handle)

    fire('pointermove', { pointerId: 2, clientX: 200, clientY: 200 })
    expect(wrapperEl.style.width).toBe('')
  })

  // ---- does not fire onNodesChange without a move ----
  it('does not fire if no onNodesChange registered', () => {
    const ctxNoChange = makeCtx({ onNodesChange: undefined })
    const handle = makeHandle()
    setupNodeResize(ctxNoChange, () => ({ x: 0, y: 0, scale: 1 }), nodeId, 'e',
      100, 200, 200, 120, 50, 100, 1, handle)

    fire('pointerup', { pointerId: 1 })
    // no throw
  })
})
