import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { clearContext } from '@liteforge/runtime'
import { createFlow, FlowCanvas } from '../src/index.js'
import type { FlowNode, FlowEdge } from '../src/types.js'

const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0))

describe('FlowCanvas', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    container.style.width = '800px'
    container.style.height = '600px'
    document.body.appendChild(container)
    clearContext()
  })

  afterEach(() => {
    container.remove()
    clearContext()
  })

  it('renders the expected DOM structure', async () => {
    const flow = createFlow({ nodeTypes: {} })
    const root = FlowCanvas({
      flow,
      nodes: () => [] as FlowNode[],
      edges: () => [] as FlowEdge[],
    }) as HTMLElement

    container.appendChild(root)
    await tick()

    expect(root.classList.contains('lf-flow-root')).toBe(true)
    expect(root.querySelector('.lf-transform-layer')).not.toBeNull()
    expect(root.querySelector('.lf-edges-layer')).not.toBeNull()
    expect(root.querySelector('.lf-nodes-layer')).not.toBeNull()
  })

  it('applies default viewport transform', async () => {
    const flow = createFlow({ nodeTypes: {} })
    const root = FlowCanvas({
      flow,
      nodes: () => [] as FlowNode[],
      edges: () => [] as FlowEdge[],
      defaultViewport: { x: 50, y: 30, scale: 1.5 },
    }) as HTMLElement

    container.appendChild(root)
    await tick()

    const layer = root.querySelector('.lf-transform-layer') as HTMLElement
    expect(layer.style.transform).toContain('translate(50px,30px)')
    expect(layer.style.transform).toContain('scale(1.5)')
  })

  it('applies identity transform by default', async () => {
    const flow = createFlow({ nodeTypes: {} })
    const root = FlowCanvas({
      flow,
      nodes: () => [] as FlowNode[],
      edges: () => [] as FlowEdge[],
    }) as HTMLElement

    container.appendChild(root)
    await tick()

    const layer = root.querySelector('.lf-transform-layer') as HTMLElement
    expect(layer.style.transform).toContain('translate(0px,0px)')
    expect(layer.style.transform).toContain('scale(1)')
  })
})

describe('fitView prop', () => {
  let container: HTMLDivElement
  // Capture and synchronously flush rAF callbacks without fake timers
  let rafCallbacks: FrameRequestCallback[]
  let originalRaf: typeof requestAnimationFrame

  function flushRaf() {
    const cbs = rafCallbacks.splice(0)
    cbs.forEach(cb => cb(0))
  }

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    clearContext()
    rafCallbacks = []
    originalRaf = globalThis.requestAnimationFrame
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb)
      return rafCallbacks.length
    }
  })

  afterEach(() => {
    container.remove()
    clearContext()
    globalThis.requestAnimationFrame = originalRaf
  })

  const makeNodes = (): FlowNode[] => [
    { id: 'a', type: 'default', position: { x: 0,   y: 0   }, data: {} },
    { id: 'b', type: 'default', position: { x: 200, y: 100 }, data: {} },
  ]

  it('does NOT schedule rAF when fitView is absent', () => {
    const flow = createFlow({ nodeTypes: {} })
    FlowCanvas({
      flow,
      nodes: makeNodes,
      edges: () => [],
      defaultViewport: { x: 99, y: 77, scale: 2 },
    })
    expect(rafCallbacks.length).toBe(0)
  })

  it('does NOT schedule rAF when fitView is false', () => {
    const flow = createFlow({ nodeTypes: {} })
    FlowCanvas({
      flow,
      nodes: makeNodes,
      edges: () => [],
      fitView: false,
    })
    expect(rafCallbacks.length).toBe(0)
  })

  it('preserves defaultViewport when fitView is absent (no rAF override)', async () => {
    const flow = createFlow({ nodeTypes: {} })
    const root = FlowCanvas({
      flow,
      nodes: makeNodes,
      edges: () => [],
      defaultViewport: { x: 99, y: 77, scale: 2 },
    }) as HTMLElement
    container.appendChild(root)
    await tick()

    const layer = root.querySelector('.lf-transform-layer') as HTMLElement
    expect(layer.style.transform).toContain('translate(99px,77px)')
    expect(layer.style.transform).toContain('scale(2)')
  })

  it('schedules rAF when fitView is true', () => {
    const flow = createFlow({ nodeTypes: {} })
    FlowCanvas({
      flow,
      nodes: makeNodes,
      edges: () => [],
      fitView: true,
    })
    expect(rafCallbacks.length).toBe(1)
  })

  it('updates transform after rAF fires with fitView:true', async () => {
    const flow = createFlow({ nodeTypes: {} })
    const root = FlowCanvas({
      flow,
      nodes: makeNodes,
      edges: () => [],
      fitView: true,
    }) as HTMLElement
    container.appendChild(root)

    const layer = root.querySelector('.lf-transform-layer') as HTMLElement
    const before = layer.style.transform

    flushRaf()
    await tick()

    const after = layer.style.transform
    expect(after).toMatch(/translate\([\d.-]+px,[\d.-]+px\)/)
    expect(after).toMatch(/scale\([\d.]+\)/)
    expect(after).not.toBe(before)
  })

  it('forwards fitViewOptions.padding — different padding produces different transforms', async () => {
    const flow = createFlow({ nodeTypes: {} })
    const root1 = FlowCanvas({
      flow,
      nodes: makeNodes,
      edges: () => [],
      fitView: true,
      fitViewOptions: { padding: 0 },
    }) as HTMLElement
    const root2 = FlowCanvas({
      flow,
      nodes: makeNodes,
      edges: () => [],
      fitView: true,
      fitViewOptions: { padding: 200 },
    }) as HTMLElement

    container.appendChild(root1)
    container.appendChild(root2)
    flushRaf()
    await tick()

    const t1 = (root1.querySelector('.lf-transform-layer') as HTMLElement).style.transform
    const t2 = (root2.querySelector('.lf-transform-layer') as HTMLElement).style.transform
    expect(t1).not.toBe(t2)
  })

  it('fitView with no nodes keeps identity transform', async () => {
    const flow = createFlow({ nodeTypes: {} })
    const root = FlowCanvas({
      flow,
      nodes: () => [],
      edges: () => [],
      fitView: true,
    }) as HTMLElement
    container.appendChild(root)
    flushRaf()
    await tick()

    const layer = root.querySelector('.lf-transform-layer') as HTMLElement
    expect(layer.style.transform).toContain('translate(0px,0px)')
    expect(layer.style.transform).toContain('scale(1)')
  })
})

describe('createFlow', () => {
  it('returns a FlowHandle with options', () => {
    const nodeTypes = { custom: () => document.createElement('div') }
    const flow = createFlow({ nodeTypes })
    expect(flow.options.nodeTypes).toBe(nodeTypes)
  })

  it('options are frozen (immutable)', () => {
    const flow = createFlow({ nodeTypes: {} })
    expect(Object.isFrozen(flow.options)).toBe(true)
  })

  it('defaults connectionLineType', () => {
    const flow = createFlow({ nodeTypes: {} })
    expect(flow.options.connectionLineType).toBeUndefined()
  })
})
