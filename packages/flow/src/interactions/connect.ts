import type { FlowContextValue } from '../context.js'
import type { Transform, Connection, HandleType } from '../types.js'
import { screenToCanvas } from '../geometry/coords.js'

/**
 * Sets up document-level pointer listeners for the connecting interaction.
 *
 * Called once at FlowCanvas init. Listeners stay attached for the lifetime of
 * the canvas (they are no-ops when state is not 'connecting').
 */
export function setupConnect(
  ctx: FlowContextValue,
  getTransform: () => Transform,
): void {
  document.addEventListener('pointermove', (e: PointerEvent) => {
    const state = ctx.interactionState()
    if (state.type !== 'connecting') return
    state.currentPoint.set(screenToCanvas({ x: e.clientX, y: e.clientY }, getTransform()))
  })

  document.addEventListener('pointerup', (e: PointerEvent) => {
    const state = ctx.interactionState()
    if (state.type !== 'connecting') return

    // Find a handle element under the pointer
    const els = document.elementsFromPoint(e.clientX, e.clientY)
    const handleEl = els.find(el => el.classList.contains('lf-handle')) as HTMLElement | undefined

    if (handleEl) {
      const targetNodeId   = handleEl.dataset['nodeId']
      const targetHandleId = handleEl.dataset['handleId']
      const targetType     = handleEl.dataset['handleType'] as HandleType | undefined

      if (targetNodeId && targetHandleId && targetType && targetType !== state.sourceHandleType) {
        const connection: Connection = {
          source:       state.sourceNodeId,
          sourceHandle: state.sourceHandleId,
          target:       targetNodeId,
          targetHandle: targetHandleId,
        }
        if (!ctx.isValidConnection || ctx.isValidConnection(connection)) {
          ctx.onConnect?.(connection)
        }
      }
    }

    ctx.stateMgr.toIdle()
  })
}
