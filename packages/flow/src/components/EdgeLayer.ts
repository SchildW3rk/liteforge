import { effect } from '@liteforge/core'
import { getBezierPath, getStepPath, getStraightPath } from '../geometry/paths.js'
import type { FlowContextValue } from '../context.js'

export interface EdgeLayerHandle {
  dispose: () => void
}

export function createEdgeLayer(
  ctx: FlowContextValue,
  edgesLayerEl: SVGElement,
): EdgeLayerHandle {
  // Map tracking per-edge disposers
  const edgeDisposers = new Map<string, () => void>()

  const outerDispose = effect(() => {
    const edges = ctx.edges()
    const currentIds = new Set(edges.map(e => e.id))

    // Remove edges no longer present
    for (const [id, disposer] of edgeDisposers) {
      if (!currentIds.has(id)) {
        disposer()
        edgeDisposers.delete(id)
      }
    }

    // Add new edges
    for (const edge of edges) {
      if (!edgeDisposers.has(edge.id)) {
        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        pathEl.dataset['edgeId'] = edge.id
        pathEl.classList.add('lf-edge')
        edgesLayerEl.appendChild(pathEl)

        // Inner effect for this edge — subscribes to handle positions + transform + drag
        const innerDispose = effect(() => {
          // Subscribe to registry version (handle positions)
          ctx.handleRegistry.version()
          // Subscribe to transform (pan/zoom)
          ctx.transform()
          // Subscribe to drag state so edges track live node movement
          const istate = ctx.interactionState()
          const dragOffset = istate.type === 'dragging' ? istate.localOffset() : null

          // Read current edge without subscribing to ctx.edges() again
          const currentEdge = ctx.edges().find(e => e.id === edge.id)
          if (!currentEdge) return

          const nodes = ctx.nodes()
          let src = ctx.handleRegistry.getAbsolutePosition(
            currentEdge.source,
            currentEdge.sourceHandle,
            nodes,
          )
          let tgt = ctx.handleRegistry.getAbsolutePosition(
            currentEdge.target,
            currentEdge.targetHandle,
            nodes,
          )

          // Fold in live drag offset for edges connected to any dragged node
          if (dragOffset) {
            const draggedNodes = istate.type === 'dragging' ? istate.draggedNodes : null
            if (src && draggedNodes?.has(currentEdge.source)) {
              src = { x: src.x + dragOffset.x, y: src.y + dragOffset.y }
            }
            if (tgt && draggedNodes?.has(currentEdge.target)) {
              tgt = { x: tgt.x + dragOffset.x, y: tgt.y + dragOffset.y }
            }
          }

          // Always update selection state regardless of handle availability
          pathEl.classList.toggle('lf-edge-selected', currentEdge.selected ?? false)

          if (!src || !tgt) {
            pathEl.removeAttribute('d')
            return
          }

          const pathType = ctx.connectionLineType ?? 'bezier'
          const d =
            pathType === 'step' ? getStepPath(src, tgt)
            : pathType === 'straight' ? getStraightPath(src, tgt)
            : getBezierPath(src, tgt)

          pathEl.setAttribute('d', d)
        })

        // Click for selection
        pathEl.addEventListener('click', (e: MouseEvent) => {
          if (!ctx.onEdgesChange) return
          const currentEdge = ctx.edges().find(ed => ed.id === edge.id)
          if (!currentEdge) return

          if (e.shiftKey) {
            ctx.onEdgesChange([{ type: 'select', id: edge.id, selected: !(currentEdge.selected ?? false) }])
          } else {
            // Select this edge, deselect all others
            const allEdges = ctx.edges()
            const changes = allEdges.map(ed => ({
              type: 'select' as const,
              id: ed.id,
              selected: ed.id === edge.id,
            }))
            ctx.onEdgesChange(changes)
          }
        })

        edgeDisposers.set(edge.id, () => {
          innerDispose()
          pathEl.remove()
        })
      }
    }
  })

  return {
    dispose: () => {
      outerDispose()
      for (const disposer of edgeDisposers.values()) {
        disposer()
      }
      edgeDisposers.clear()
    },
  }
}
