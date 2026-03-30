import type { FlowContextValue } from '../context.js'
import type { Transform } from '../types.js'
import { screenToCanvas } from '../geometry/coords.js'
import { rectsOverlap, rectFromPoints } from '../geometry/aabb.js'

/**
 * Sets up document-level pointer listeners for marquee (rubber-band) selection.
 *
 * Called once at FlowCanvas init. Listeners are no-ops when state is not
 * 'selecting'.
 */
export function setupMarqueeSelect(
  ctx: FlowContextValue,
  getTransform: () => Transform,
  _rootEl: HTMLElement,
): void {
  document.addEventListener('pointermove', (e: PointerEvent) => {
    const state = ctx.interactionState()
    if (state.type !== 'selecting') return
    const rect = ctx.getRootRect()
    state.currentCanvasPoint.set(
      screenToCanvas({ x: e.clientX - rect.left, y: e.clientY - rect.top }, getTransform()),
    )
  })

  document.addEventListener('pointerup', (_e: PointerEvent) => {
    const state = ctx.interactionState()
    if (state.type !== 'selecting') return

    const selectionRect = rectFromPoints(
      state.startCanvasPoint,
      state.currentCanvasPoint.peek(),
    )

    const allNodes = ctx.getNodes()
    const changes = allNodes.map(node => {
      const size = ctx.getNodeSize(node.id)
      if (!size) {
        return { type: 'select' as const, id: node.id, selected: false }
      }
      const nodeRect = {
        x: node.position.x,
        y: node.position.y,
        width: size.width,
        height: size.height,
      }
      return {
        type: 'select' as const,
        id: node.id,
        selected: rectsOverlap(selectionRect, nodeRect),
      }
    })

    if (changes.length > 0) {
      ctx.onNodesChange?.(changes)
    }

    ctx.interactionStateManager.toIdle()
  })
}
