import { effect } from '@liteforge/core'
import type { FlowContextValue } from '../context.js'

export interface GhostEdgeHandle {
  el:      SVGPathElement
  dispose: () => void
}

/**
 * Creates the SVG path element shown while the user drags a new connection.
 *
 * Phase 3: renders a straight line from source handle to cursor position.
 * Phase 4 will replace this with bezier curves.
 */
export function createGhostEdge(
  ctx:        FlowContextValue,
  edgesLayer: SVGElement,
): GhostEdgeHandle {
  const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  pathEl.classList.add('lf-ghost-edge')
  pathEl.style.display = 'none'
  edgesLayer.appendChild(pathEl)

  const disposeEffect = effect(() => {
    const state = ctx.interactionState()

    if (state.type !== 'connecting') {
      pathEl.style.display = 'none'
      pathEl.removeAttribute('d')
      return
    }

    const cur = state.currentPoint()   // subscribes to per-state Signal
    pathEl.style.display = ''
    const src = state.sourcePoint
    pathEl.setAttribute('d', `M ${src.x} ${src.y} L ${cur.x} ${cur.y}`)
  })

  function dispose() {
    disposeEffect()
    pathEl.remove()
  }

  return { el: pathEl, dispose }
}
