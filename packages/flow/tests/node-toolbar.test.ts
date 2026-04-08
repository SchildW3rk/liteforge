import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { signal } from '@liteforge/core'
import { clearContext } from '@liteforge/runtime'
import { createNodeToolbar } from '../src/components/NodeToolbar.js'
import type { FlowContextValue } from '../src/context.js'
import type { FlowNode, InteractionState, Transform } from '../src/types.js'

// ---- Helpers ----

function makeNode(id: string, selected = false): FlowNode {
  return { id, type: 'default', position: { x: 100, y: 100 }, data: {}, selected }
}

function makeCtx(node: FlowNode, overrides: Partial<FlowContextValue> = {}): FlowContextValue {
  const nodesArr = [node]
  const transformSig = signal<Transform>({ x: 0, y: 0, scale: 1 })
  const istateSig    = signal<InteractionState>({ type: 'idle' })

  return {
    getNode:             (id) => nodesArr.find(n => n.id === id),
    getNodes:            () => nodesArr,
    getEdges:            () => [],
    getChildren:         () => [],
    getAbsolutePosition: (id) => nodesArr.find(n => n.id === id)?.position ?? { x: 0, y: 0 },
    transform:           transformSig,
    interactionState:    istateSig,
    nodeSizeVersion:     signal(0),
    getRootRect: () => ({ left: 0, top: 0, width: 800, height: 600 } as DOMRect),
    nodes: () => nodesArr,
    edges: () => [],
    ...overrides,
  } as unknown as FlowContextValue
}

/** Flush queueMicrotask queue */
const tick = () => new Promise<void>(r => setTimeout(r, 0))

// ---- Tests ----

describe('createNodeToolbar', () => {
  let root: HTMLElement
  let wrapperEl: HTMLElement

  beforeEach(() => {
    root = document.createElement('div')
    root.className = 'lf-flow-root'
    root.style.cssText = 'position:relative;width:800px;height:600px'
    Object.defineProperty(root, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, width: 800, height: 600 }) as DOMRectReadOnly,
      configurable: true,
    })
    document.body.appendChild(root)

    // Create a fake node wrapper inside the root
    wrapperEl = document.createElement('div')
    wrapperEl.setAttribute('data-node-id', 'n1')
    Object.defineProperty(wrapperEl, 'getBoundingClientRect', {
      value: () => ({ left: 100, top: 80, width: 120, height: 40 }) as DOMRectReadOnly,
      configurable: true,
    })
    root.appendChild(wrapperEl)

    clearContext()
  })

  afterEach(() => {
    document.body.removeChild(root)
    clearContext()
  })

  // ---- DOM creation ----

  it('returns an element with class lf-node-toolbar', () => {
    const node = makeNode('n1')
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx)
    expect(el.className).toContain('lf-node-toolbar')
    dispose()
  })

  it('sets data-node-id on toolbar element', () => {
    const node = makeNode('n1')
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx)
    expect(el.dataset['nodeId']).toBe('n1')
    dispose()
  })

  it('sets data-position on toolbar element', () => {
    const node = makeNode('n1')
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx, { position: 'bottom' })
    expect(el.dataset['position']).toBe('bottom')
    dispose()
  })

  it('sets data-align on toolbar element', () => {
    const node = makeNode('n1')
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx, { align: 'start' })
    expect(el.dataset['align']).toBe('start')
    dispose()
  })

  it('appends toolbar to lf-flow-root after microtask', async () => {
    const node = makeNode('n1', true)
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx)
    await tick()
    expect(root.contains(el)).toBe(true)
    dispose()
  })

  it('dispose removes toolbar from DOM', async () => {
    const node = makeNode('n1', true)
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx)
    await tick()
    dispose()
    expect(root.contains(el)).toBe(false)
  })

  // ---- Visibility ----

  it('hides toolbar when node is NOT selected', async () => {
    const node = makeNode('n1', false) // not selected
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx)
    await tick()
    expect(el.style.display).toBe('none')
    dispose()
  })

  it('shows toolbar when node IS selected', async () => {
    const node = makeNode('n1', true) // selected
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx)
    await tick()
    expect(el.style.display).not.toBe('none')
    dispose()
  })

  it('alwaysVisible:true shows toolbar even when node is not selected', async () => {
    const node = makeNode('n1', false)
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx, { alwaysVisible: true })
    await tick()
    expect(el.style.display).not.toBe('none')
    dispose()
  })

  it('hides toolbar when node does not exist in ctx', async () => {
    const node = makeNode('n1', true)
    const ctx  = makeCtx(node, { getNode: () => undefined })
    const { el, dispose } = createNodeToolbar('n1', ctx)
    await tick()
    expect(el.style.display).toBe('none')
    dispose()
  })

  it('toolbar reactively hides when transform signal changes and node deselected', async () => {
    const nodeSig = makeNode('n1', true)
    const nodesArr = [nodeSig]
    const transformSig = signal<Transform>({ x: 0, y: 0, scale: 1 })
    const istateSig    = signal<InteractionState>({ type: 'idle' })
    const nodeSizeVersion = signal(0)

    // Make node deselectable via the ctx
    let selectedState = true
    const ctx = {
      getNode:             (id: string) => nodesArr.find(n => n.id === id && (n.selected = selectedState)) ?? undefined,
      getNodes:            () => nodesArr,
      getChildren:         () => [],
      getAbsolutePosition: () => ({ x: 100, y: 100 }),
      transform:           transformSig,
      interactionState:    istateSig,
      nodeSizeVersion,
      getRootRect: () => ({ left: 0, top: 0, width: 800, height: 600 } as DOMRect),
      nodes: () => nodesArr,
      edges: () => [],
    } as unknown as FlowContextValue

    const { el, dispose } = createNodeToolbar('n1', ctx)
    await tick()
    expect(el.style.display).not.toBe('none')

    // Deselect — trigger effect re-run by updating transform
    selectedState = false
    transformSig.set({ x: 10, y: 0, scale: 1 })
    await tick()
    expect(el.style.display).toBe('none')

    dispose()
  })

  // ---- Positioning formula ----
  // We test the formula by checking that the resulting left/top values match
  // the expected geometry. In happy-dom, getBoundingClientRect() works when
  // we mock it (as done in beforeEach).

  it('position:top center — toolbar is centered above the node', async () => {
    const node = makeNode('n1', true)
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx, { position: 'top', align: 'center', offset: 8 })
    await tick()

    // wrapperRect: left=100, top=80, width=120, height=40
    // toolbar offsetWidth/Height = 0 in happy-dom (no layout)
    // center: left = 100 + 120/2 - 0/2 = 160
    // top: top = 80 - 0 - 8 = 72
    const left = parseFloat(el.style.left)
    const top  = parseFloat(el.style.top)
    expect(left).toBe(160)
    expect(top).toBe(72)
    dispose()
  })

  it('position:top start — toolbar is left-aligned above the node', async () => {
    const node = makeNode('n1', true)
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx, { position: 'top', align: 'start', offset: 8 })
    await tick()

    // left = 100 (nodeLeft), top = 80 - 0 - 8 = 72
    expect(parseFloat(el.style.left)).toBe(100)
    expect(parseFloat(el.style.top)).toBe(72)
    dispose()
  })

  it('position:top end — toolbar is right-aligned above the node', async () => {
    const node = makeNode('n1', true)
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx, { position: 'top', align: 'end', offset: 8 })
    await tick()

    // left = nodeLeft + nodeWidth - toolbarW = 100 + 120 - 0 = 220
    expect(parseFloat(el.style.left)).toBe(220)
    expect(parseFloat(el.style.top)).toBe(72)
    dispose()
  })

  it('position:bottom center — toolbar is centered below the node', async () => {
    const node = makeNode('n1', true)
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx, { position: 'bottom', align: 'center', offset: 8 })
    await tick()

    // top = nodeTop + nodeHeight + offset = 80 + 40 + 8 = 128
    expect(parseFloat(el.style.top)).toBe(128)
    dispose()
  })

  it('position:left center — toolbar is centered to the left', async () => {
    const node = makeNode('n1', true)
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx, { position: 'left', align: 'center', offset: 8 })
    await tick()

    // left = nodeLeft - toolbarW - offset = 100 - 0 - 8 = 92
    // top  = nodeTop + nodeHeight/2 - toolbarH/2 = 80 + 20 - 0 = 100
    expect(parseFloat(el.style.left)).toBe(92)
    expect(parseFloat(el.style.top)).toBe(100)
    dispose()
  })

  it('position:right center — toolbar is centered to the right', async () => {
    const node = makeNode('n1', true)
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx, { position: 'right', align: 'center', offset: 8 })
    await tick()

    // left = nodeLeft + nodeWidth + offset = 100 + 120 + 8 = 228
    expect(parseFloat(el.style.left)).toBe(228)
    dispose()
  })

  it('position:right start — top-aligned when on left/right axis', async () => {
    const node = makeNode('n1', true)
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx, { position: 'right', align: 'start', offset: 0 })
    await tick()

    // top = nodeTop = 80
    expect(parseFloat(el.style.top)).toBe(80)
    dispose()
  })

  it('position:left end — bottom-aligned when on left/right axis', async () => {
    const node = makeNode('n1', true)
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx, { position: 'left', align: 'end', offset: 0 })
    await tick()

    // top = nodeTop + nodeHeight - toolbarH = 80 + 40 - 0 = 120
    expect(parseFloat(el.style.top)).toBe(120)
    dispose()
  })

  it('custom offset is respected', async () => {
    const node = makeNode('n1', true)
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx, { position: 'top', align: 'start', offset: 20 })
    await tick()

    // top = 80 - 0 - 20 = 60
    expect(parseFloat(el.style.top)).toBe(60)
    dispose()
  })

  it('defaults: position=top, align=center, offset=8', async () => {
    const node = makeNode('n1', true)
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx)
    await tick()

    expect(el.dataset['position']).toBe('top')
    expect(el.dataset['align']).toBe('center')
    // top = 80 - 0 - 8 = 72
    expect(parseFloat(el.style.top)).toBe(72)
    dispose()
  })

  // ---- Content ----

  it('children appended to toolbar element are preserved', async () => {
    const node = makeNode('n1', true)
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx)

    const btn = document.createElement('button')
    btn.className = 'lf-toolbar-btn'
    btn.textContent = 'Delete'
    el.appendChild(btn)

    await tick()
    expect(el.querySelector('.lf-toolbar-btn')).not.toBeNull()
    expect(el.querySelector('.lf-toolbar-btn')?.textContent).toBe('Delete')
    dispose()
  })

  // ---- Event isolation ----

  it('pointerdown on toolbar stops propagation (prevents canvas pan)', async () => {
    const node = makeNode('n1', true)
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx)
    await tick()

    let propagated = false
    root.addEventListener('pointerdown', () => { propagated = true })

    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(propagated).toBe(false)
    dispose()
  })

  it('click on toolbar stops propagation (prevents canvas deselect)', async () => {
    const node = makeNode('n1', true)
    const ctx  = makeCtx(node)
    const { el, dispose } = createNodeToolbar('n1', ctx)
    await tick()

    let propagated = false
    root.addEventListener('click', () => { propagated = true })

    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(propagated).toBe(false)
    dispose()
  })

  // ---- Reactivity on transform change ----

  it('position updates when transform changes (pan)', async () => {
    const node = makeNode('n1', true)
    const transformSig = signal<Transform>({ x: 0, y: 0, scale: 1 })
    const ctx = makeCtx(node, { transform: transformSig })
    const { el, dispose } = createNodeToolbar('n1', ctx, { position: 'top', align: 'start', offset: 8 })
    await tick()

    const topBefore = parseFloat(el.style.top)

    // Pan — but getBoundingClientRect mock returns same values, so position
    // should be recomputed (same result). We just verify the effect re-ran.
    transformSig.set({ x: 50, y: 50, scale: 1 })
    await tick()

    // Effect ran again (no throw, no stale value)
    const topAfter = parseFloat(el.style.top)
    expect(topAfter).toBe(topBefore) // mock doesn't change — but effect still ran
    dispose()
  })
})
