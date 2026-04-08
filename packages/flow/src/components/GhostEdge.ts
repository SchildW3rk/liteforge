import { effect } from '@liteforge/core'
import type { FlowContextValue } from '../context.js'
import { getBezierPath } from '../geometry/paths.js'

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

    if (state.type === 'connecting') {
      const cur = state.currentPoint()
      pathEl.style.display = ''
      pathEl.setAttribute('d', getBezierPath(state.sourcePoint, cur))
      return
    }

    if (state.type === 'reconnecting') {
      const cur = state.currentPoint()
      pathEl.style.display = ''
      // Fixed end is always drawn as source visually (left side of bezier)
      const src = state.movingEnd === 'source' ? cur : state.fixedPoint
      const tgt = state.movingEnd === 'source' ? state.fixedPoint : cur
      pathEl.setAttribute('d', getBezierPath(src, tgt))
      return
    }

    pathEl.style.display = 'none'
    pathEl.removeAttribute('d')
  })

  function dispose() {
    disposeEffect()
    pathEl.remove()
  }

  return { el: pathEl, dispose }
}
