import { effect } from '@liteforge/core'
import type { Signal } from '@liteforge/core'
import type { Transform } from '../types.js'
import type { FlowContextValue } from '../context.js'

const MINI_W = 160
const MINI_H = 100
const PADDING = 10

export function createMiniMap(
  ctx: FlowContextValue,
  transform: Signal<Transform>,
  rootEl: HTMLElement,
): { el: HTMLDivElement; dispose: () => void } {
  const el = document.createElement('div')
  el.className = 'lf-minimap'

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('class', 'lf-minimap-svg')
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')
  svg.setAttribute('viewBox', `0 0 ${MINI_W} ${MINI_H}`)

  const viewportRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  viewportRect.setAttribute('class', 'lf-minimap-viewport')
  viewportRect.setAttribute('x', '0')
  viewportRect.setAttribute('y', '0')
  viewportRect.setAttribute('width', String(MINI_W))
  viewportRect.setAttribute('height', String(MINI_H))
  svg.appendChild(viewportRect)

  el.appendChild(svg)
  rootEl.appendChild(el)

  const disposeEffect = effect(() => {
    const nodes = ctx.getNodes()   // subscribe to node array
    ctx.nodeSizeVersion()          // subscribe to size changes
    const t = transform()

    if (nodes.length === 0) {
      svg.setAttribute('viewBox', `0 0 ${MINI_W} ${MINI_H}`)

      // Remove stale node rects
      for (const existing of svg.querySelectorAll('[data-minimap-node]')) {
        existing.remove()
      }

      // Update viewport indicator
      const vpW = (rootEl.offsetWidth || 200) / t.scale
      const vpH = (rootEl.offsetHeight || 150) / t.scale
      const vpX = -t.x / t.scale
      const vpY = -t.y / t.scale
      viewportRect.setAttribute('x', String(vpX))
      viewportRect.setAttribute('y', String(vpY))
      viewportRect.setAttribute('width', String(vpW))
      viewportRect.setAttribute('height', String(vpH))
      return
    }

    // Compute bounding box of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const node of nodes) {
      const size = ctx.getNodeSize(node.id) ?? { width: 80, height: 40 }
      if (node.position.x < minX) minX = node.position.x
      if (node.position.y < minY) minY = node.position.y
      const nx = node.position.x + size.width
      const ny = node.position.y + size.height
      if (nx > maxX) maxX = nx
      if (ny > maxY) maxY = ny
    }

    const contentW = maxX - minX + PADDING * 2
    const contentH = maxY - minY + PADDING * 2
    const vbX = minX - PADDING
    const vbY = minY - PADDING
    svg.setAttribute('viewBox', `${vbX} ${vbY} ${contentW} ${contentH}`)

    // Sync node rects
    const existingRects = new Map<string, SVGRectElement>()
    for (const existing of svg.querySelectorAll('[data-minimap-node]')) {
      const rectEl = existing as SVGRectElement
      const nodeId = rectEl.dataset['minimapNode']
      if (nodeId !== undefined) {
        existingRects.set(nodeId, rectEl)
      }
    }

    for (const node of nodes) {
      let rect = existingRects.get(node.id)
      if (!rect) {
        rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        rect.setAttribute('class', 'lf-minimap-node')
        rect.dataset['minimapNode'] = node.id
        svg.insertBefore(rect, viewportRect)
      }
      const size = ctx.getNodeSize(node.id) ?? { width: 80, height: 40 }
      rect.setAttribute('x', String(node.position.x))
      rect.setAttribute('y', String(node.position.y))
      rect.setAttribute('width', String(size.width))
      rect.setAttribute('height', String(size.height))
      if (node.selected) {
        rect.classList.add('lf-minimap-node-selected')
      } else {
        rect.classList.remove('lf-minimap-node-selected')
      }
      existingRects.delete(node.id)
    }

    // Remove stale rects
    for (const staleRect of existingRects.values()) {
      staleRect.remove()
    }

    // Update viewport indicator rect
    const vpW = (rootEl.offsetWidth || 200) / t.scale
    const vpH = (rootEl.offsetHeight || 150) / t.scale
    const vpX = -t.x / t.scale
    const vpY = -t.y / t.scale
    viewportRect.setAttribute('x', String(vpX))
    viewportRect.setAttribute('y', String(vpY))
    viewportRect.setAttribute('width', String(vpW))
    viewportRect.setAttribute('height', String(vpH))
  })

  const dispose = () => {
    disposeEffect()
    el.remove()
  }

  return { el, dispose }
}
