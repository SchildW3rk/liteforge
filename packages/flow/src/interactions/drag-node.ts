import type { FlowContextValue } from '../context.js'
import type { Point, Transform, DraggingState } from '../types.js'
import { screenToCanvas } from '../geometry/coords.js'

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
      const delta: Point = {
        x: canvasPoint.x - startCanvasPoint.x,
        y: canvasPoint.y - startCanvasPoint.y,
      }

      // Update the Signal that lives inside DraggingState — this triggers
      // NodeWrapper's positioning effect for visual drag feedback.
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
      const node = ctx.getNode(nodeId)

      if (node && ctx.onNodesChange) {
        ctx.onNodesChange([{
          type: 'position',
          id: nodeId,
          position: {
            x: node.position.x + offset.x,
            y: node.position.y + offset.y,
          },
        }])
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
