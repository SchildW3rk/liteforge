import type { FlowContextValue } from '../context.js'
import type { FlowNode, Point, Transform, DraggingState } from '../types.js'
import { screenToCanvas } from '../geometry/coords.js'

/** Round a value to the nearest multiple of step. */
function snap(value: number, step: number): number {
  return Math.round(value / step) * step
}

/**
 * Collect the given nodeId and all its direct and indirect children into `out`.
 * Exported so NodeWrapper can use it when building draggedNodes.
 */
export function collectDragGroup(nodeId: string, nodes: FlowNode[], out: Set<string>): void {
  out.add(nodeId)
  for (const n of nodes) {
    if (n.parentId === nodeId && !out.has(n.id)) {
      collectDragGroup(n.id, nodes, out)
    }
  }
}

/** Quantize a delta so that base + delta snaps to the grid. */
function snapDelta(base: Point, delta: Point, grid: [number, number]): Point {
  return {
    x: snap(base.x + delta.x, grid[0]) - base.x,
    y: snap(base.y + delta.y, grid[1]) - base.y,
  }
}

/**
 * Sets up pointer-event driven node drag behaviour.
 *
 * Returns a function that should be called from the NodeWrapper's pointerdown
 * handler AFTER the interaction state has been transitioned to 'dragging'.
 *
 * The function attaches document-level listeners for the duration of the drag
 * and removes them on pointerup / pointercancel.
 *
 * Constraints:
 *  - localOffset Signal is updated on every pointermove (visual feedback only)
 *  - onNodesChange is called ONLY on pointerup with the final committed position
 *  - toIdle() is called on pointerup / pointercancel
 */
export function setupNodeDrag(
  ctx: FlowContextValue,
  getTransform: () => Transform,
): (
  nodeId: string,
  pointerId: number,
  startCanvasPoint: Point,
  captureTarget: Element,
) => void {
  return (nodeId, pointerId, startCanvasPoint, captureTarget) => {
    // Capture pointer so we receive events even when the cursor leaves the element
    captureTarget.setPointerCapture(pointerId)

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return

      const state = ctx.interactionState()
      if (state.type !== 'dragging' || state.nodeId !== nodeId) {
        cleanup()
        return
      }

      const rect = ctx.getRootRect()
      const canvasPoint = screenToCanvas({ x: e.clientX - rect.left, y: e.clientY - rect.top }, getTransform())
      let delta: Point = {
        x: canvasPoint.x - startCanvasPoint.x,
        y: canvasPoint.y - startCanvasPoint.y,
      }

      // Quantize visual offset so the node snaps to grid during drag.
      // We snap relative to startPosition (the first node in the group)
      // so all group members snap consistently.
      if (ctx.snapToGrid) {
        const startNode = ctx.getNode(nodeId)
        if (startNode) delta = snapDelta(startNode.position, delta, ctx.snapToGrid)
      }

      // Update the shared Signal — all nodes in draggedNodes react to this.
      ;(state as DraggingState).localOffset.set(delta)
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      commit(e)
    }

    const handlePointerCancel = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return
      // Cancel: just return to idle without committing
      cleanup()
      ctx.stateMgr.toIdle()
    }

    const commit = (_e: PointerEvent) => {
      cleanup()

      const state = ctx.interactionState()
      if (state.type !== 'dragging' || state.nodeId !== nodeId) {
        ctx.stateMgr.toIdle()
        return
      }

      const dragging = state as DraggingState
      const offset = dragging.localOffset()

      if (ctx.onNodesChange) {
        // Commit final positions.
        // Only emit position changes for "root" drag nodes — nodes whose parent
        // is NOT also in draggedNodes. Child nodes follow their parent's DOM
        // element automatically (positions are parent-relative, parent moves).
        const changes = Array.from(dragging.draggedNodes).flatMap(id => {
          const n = ctx.getNode(id)
          if (!n) return []
          // Skip if this node's parent is also being dragged — it's handled implicitly
          if (n.parentId && dragging.draggedNodes.has(n.parentId)) return []
          const raw = { x: n.position.x + offset.x, y: n.position.y + offset.y }
          const position = ctx.snapToGrid
            ? { x: snap(raw.x, ctx.snapToGrid[0]), y: snap(raw.y, ctx.snapToGrid[1]) }
            : raw
          return [{ type: 'position' as const, id, position }]
        })
        if (changes.length > 0) ctx.onNodesChange(changes)
      }

      ctx.stateMgr.toIdle()
    }

    function cleanup() {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('pointercancel', handlePointerCancel)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('pointercancel', handlePointerCancel)
  }
}
