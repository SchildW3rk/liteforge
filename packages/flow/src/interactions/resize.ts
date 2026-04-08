import type { FlowContextValue } from '../context.js'
import type { Transform } from '../types.js'

export type ResizeDirection =
  | 'n' | 's' | 'e' | 'w'
  | 'ne' | 'nw' | 'se' | 'sw'

/**
 * Attaches pointer-event listeners for a single resize handle drag.
 *
 * Called from createNodeResizer when the user starts dragging a handle.
 * Computes new width/height (and possibly new position for N/W anchored
 * directions) and fires onNodesChange on pointerup.
 *
 * Constraints:
 *  - Minimum node size: 40 × 40 px (canvas units)
 *  - Position is adjusted for top/left edge drags so the opposite edge stays fixed
 *  - Fires onNodesChange only on pointerup (not on every move)
 *  - Uses document-level listeners (same pattern as drag-node.ts)
 */
export function setupNodeResize(
  ctx: FlowContextValue,
  getTransform: () => Transform,
  nodeId: string,
  direction: ResizeDirection,
  startClientX: number,
  startClientY: number,
  startWidth: number,
  startHeight: number,
  startX: number,
  startY: number,
  pointerId: number,
  captureTarget: Element,
): void {
  const MIN_SIZE = 40

  captureTarget.setPointerCapture(pointerId)

  let currentWidth  = startWidth
  let currentHeight = startHeight
  let currentX      = startX
  let currentY      = startY

  const onMove = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return
    const transform = getTransform()
    const scale = transform.scale

    // Delta in canvas units
    const dx = (e.clientX - startClientX) / scale
    const dy = (e.clientY - startClientY) / scale

    let newW = startWidth
    let newH = startHeight
    let newX = startX
    let newY = startY

    // Horizontal
    if (direction.includes('e')) {
      newW = Math.max(MIN_SIZE, startWidth + dx)
    }
    if (direction.includes('w')) {
      const raw = startWidth - dx
      newW = Math.max(MIN_SIZE, raw)
      // Clamp X: don't let node move further right than start + (startWidth - MIN_SIZE)
      newX = startX + startWidth - newW
    }

    // Vertical
    if (direction.includes('s')) {
      newH = Math.max(MIN_SIZE, startHeight + dy)
    }
    if (direction.includes('n')) {
      const raw = startHeight - dy
      newH = Math.max(MIN_SIZE, raw)
      newY = startY + startHeight - newH
    }

    currentWidth  = newW
    currentHeight = newH
    currentX      = newX
    currentY      = newY

    // Apply live visual feedback directly on the wrapper element
    // We look it up by node ID to avoid closing over a stale reference.
    const wrapperEl = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null
    if (wrapperEl) {
      wrapperEl.style.width  = `${newW}px`
      wrapperEl.style.height = `${newH}px`
      wrapperEl.style.left   = `${newX}px`
      wrapperEl.style.top    = `${newY}px`
    }
  }

  const onUp = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return
    cleanup()

    if (!ctx.onNodesChange) return

    const changes: Parameters<typeof ctx.onNodesChange>[0] = [
      { type: 'resize', id: nodeId, width: currentWidth, height: currentHeight },
    ]

    // If position changed (N or W edge drag) also emit a position change
    if (currentX !== startX || currentY !== startY) {
      changes.push({ type: 'position', id: nodeId, position: { x: currentX, y: currentY } })
    }

    ctx.onNodesChange(changes)
  }

  const onCancel = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return
    cleanup()
    // Restore visual to original on cancel
    const wrapperEl = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null
    if (wrapperEl) {
      wrapperEl.style.width  = `${startWidth}px`
      wrapperEl.style.height = `${startHeight}px`
      wrapperEl.style.left   = `${startX}px`
      wrapperEl.style.top    = `${startY}px`
    }
  }

  function cleanup() {
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup',   onUp)
    document.removeEventListener('pointercancel', onCancel)
  }

  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup',   onUp)
  document.addEventListener('pointercancel', onCancel)
}
