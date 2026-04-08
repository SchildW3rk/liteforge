import type { FlowContextValue } from '../context.js'
import type { Transform, Connection, HandleType } from '../types.js'
import { screenToCanvas } from '../geometry/coords.js'
import { isNoSelfConnection } from '../helpers/connection-validators.js'

/**
 * Sets up document-level pointer listeners for the reconnecting interaction.
 *
 * When the user grabs an endpoint circle on an existing edge and drags it
 * to a new handle, this module:
 *   1. Tracks cursor position → drives GhostEdge via ReconnectingState.currentPoint
 *   2. On pointerup over a compatible handle:
 *      - Fires onEdgesChange with `type:'remove'` for the old edge
 *      - Fires onConnect with the new connection
 *   3. On pointerup over empty space: cancels (toIdle, no change)
 *
 * Called once at FlowCanvas init. No-op when state is not 'reconnecting'.
 */
export function setupReconnect(
  ctx: FlowContextValue,
  getTransform: () => Transform,
): void {
  document.addEventListener('pointermove', (e: PointerEvent) => {
    const state = ctx.interactionState()
    if (state.type !== 'reconnecting') return
    const rect = ctx.getRootRect()
    state.currentPoint.set(
      screenToCanvas(
        { x: e.clientX - rect.left, y: e.clientY - rect.top },
        getTransform(),
      ),
    )
  })

  document.addEventListener('pointerup', (e: PointerEvent) => {
    const state = ctx.interactionState()
    if (state.type !== 'reconnecting') return

    const edge = ctx.getEdge(state.edgeId)

    // Find a handle element under the pointer
    const els = document.elementsFromPoint(e.clientX, e.clientY)
    const handleEl = els.find(el => el.classList.contains('lf-handle')) as HTMLElement | undefined

    if (handleEl && edge) {
      const targetNodeId   = handleEl.dataset['nodeId']
      const targetHandleId = handleEl.dataset['handleId']
      const targetType     = handleEl.dataset['handleType'] as HandleType | undefined

      if (targetNodeId && targetHandleId && targetType) {
        // Determine the new connection: fixed end stays, moving end changes
        const newConn: Connection = state.movingEnd === 'target'
          ? {
              source:       edge.source,
              sourceHandle: edge.sourceHandle,
              target:       targetNodeId,
              targetHandle: targetHandleId,
            }
          : {
              source:       targetNodeId,
              sourceHandle: targetHandleId,
              target:       edge.target,
              targetHandle: edge.targetHandle,
            }

        // Validate: moving end type must differ from target type (source→target)
        const fixedType: HandleType = state.movingEnd === 'target' ? 'source' : 'target'
        const movingExpectedType: HandleType = fixedType === 'source' ? 'target' : 'source'

        const compatible    = targetType === movingExpectedType
        // Built-in guard: never allow source === target (self-connection)
        const builtInValid  = isNoSelfConnection(newConn)
        const userValid     = !ctx.isValidConnection || ctx.isValidConnection(newConn)

        if (compatible && builtInValid && userValid) {
          // Remove old edge, fire connect for new one
          ctx.onEdgesChange?.([{ type: 'remove', id: state.edgeId }])
          ctx.onConnect?.(newConn)
        }
      }
    }

    ctx.stateMgr.toIdle()
  })
}
