import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { clearContext } from '@liteforge/runtime'
import { createFlow, FlowCanvas } from '../src/index.js'
import type { FlowNode, FlowEdge } from '../src/types.js'

const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0))

function buildCanvas(opts: { showGrid?: boolean } = {}) {
  const flow = createFlow({ nodeTypes: {} })
  const container = document.createElement('div')
  container.style.width = '800px'
  container.style.height = '600px'
  document.body.appendChild(container)

  const el = FlowCanvas({
    flow,
    nodes: () => [] as FlowNode[],
    edges: () => [] as FlowEdge[],
    ...opts,
  }) as HTMLElement

  container.appendChild(el)
  return { el, container }
}

describe('Grid Background', () => {
  beforeEach(() => clearContext())
  afterEach(() => clearContext())

  it('renders .lf-grid-svg by default', async () => {
    const { el, container } = buildCanvas()
    await tick()
    expect(el.querySelector('.lf-grid-svg')).not.toBeNull()
    container.remove()
  })

  it('renders .lf-grid-svg when showGrid is explicitly true', async () => {
    const { el, container } = buildCanvas({ showGrid: true })
    await tick()
    expect(el.querySelector('.lf-grid-svg')).not.toBeNull()
    container.remove()
  })

  it('does NOT render .lf-grid-svg when showGrid is false', async () => {
    const { el, container } = buildCanvas({ showGrid: false })
    await tick()
    expect(el.querySelector('.lf-grid-svg')).toBeNull()
    container.remove()
  })

  it('grid SVG contains a <pattern> element', async () => {
    const { el, container } = buildCanvas()
    await tick()
    const pattern = el.querySelector('pattern')
    expect(pattern).not.toBeNull()
    container.remove()
  })

  it('pattern has an id attribute', async () => {
    const { el, container } = buildCanvas()
    await tick()
    const pattern = el.querySelector('pattern')
    expect(pattern?.getAttribute('id')).toBeTruthy()
    container.remove()
  })

  it('pattern contains a <circle> dot element', async () => {
    const { el, container } = buildCanvas()
    await tick()
    const dot = el.querySelector('pattern circle')
    expect(dot).not.toBeNull()
    container.remove()
  })

  it('dot has class lf-grid-dot', async () => {
    const { el, container } = buildCanvas()
    await tick()
    const dot = el.querySelector('pattern circle')
    expect(dot?.classList.contains('lf-grid-dot')).toBe(true)
    container.remove()
  })

  it('grid rect uses url(#...) fill referencing the pattern', async () => {
    const { el, container } = buildCanvas()
    await tick()
    const gridRect = el.querySelector('.lf-grid-svg rect')
    expect(gridRect?.getAttribute('fill')).toMatch(/^url\(#/)
    container.remove()
  })

  it('grid SVG is positioned before the transform layer in DOM', async () => {
    const { el, container } = buildCanvas()
    await tick()
    const children = Array.from(el.children)
    const gridIdx = children.findIndex(c => c.classList.contains('lf-grid-svg'))
    const transformIdx = children.findIndex(c => c.classList.contains('lf-transform-layer'))
    expect(gridIdx).toBeGreaterThanOrEqual(0)
    expect(gridIdx).toBeLessThan(transformIdx)
    container.remove()
  })

  it('grid SVG has pointer-events:none so it does not block interactions', async () => {
    const { el, container } = buildCanvas()
    await tick()
    const gridSvg = el.querySelector('.lf-grid-svg') as SVGElement
    expect(gridSvg.style.pointerEvents).toBe('none')
    container.remove()
  })

  it('pattern width and height attributes are set (numeric)', async () => {
    const { el, container } = buildCanvas()
    await tick()
    const pattern = el.querySelector('pattern')!
    const w = parseFloat(pattern.getAttribute('width') ?? '0')
    const h = parseFloat(pattern.getAttribute('height') ?? '0')
    expect(w).toBeGreaterThan(0)
    expect(h).toBeGreaterThan(0)
    container.remove()
  })
})
