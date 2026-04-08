import type { Signal } from '@liteforge/core'
import type { Transform } from '../types.js'

// Signal<T> from @liteforge/core already exposes peek(), so no augmentation needed.

/**
 * setupPanZoom — unified pan + pinch-zoom via Pointer Events.
 *
 * Strategy (Approach 2: Pointer Events with pointerId tracking):
 *   - All active pointers are tracked in a Map<pointerId, {x, y}>
 *   - 1 pointer on the canvas background → pan
 *   - 2 pointers active → pinch-zoom:
 *       • mid-point of both touches = zoom anchor (canvas point under midpoint stays fixed)
 *       • distance change between the two pointers drives scale
 *       • mid-point movement also applies simultaneous pan
 *   - Wheel event remains for desktop scroll/trackpad zoom
 *   - `touch-action: none` on the root suppresses browser native scroll/zoom
 *
 * Why Pointer Events over Touch Events:
 *   - Unified: works for mouse, touch, and stylus with one code path
 *   - No synthesized mouse event duplication (touch events fire *in addition* to
 *     pointer events, requiring careful deduplication)
 *   - setPointerCapture works reliably across platforms
 *   - GestureEvent (Approach 3) is Safari-only — non-standard
 */

export interface PanZoomOptions {
  minZoom: number
  maxZoom: number
  /** Returns true when the space key is currently held (for space+drag pan). */
  isSpacePressed: () => boolean
}

export function setupPanZoom(
  root: HTMLElement,
  transform: Signal<Transform>,
  opts: PanZoomOptions,
): () => void {
  const { minZoom, maxZoom, isSpacePressed } = opts

  // ---- Active pointer tracking ----
  // Stores the latest client position per pointerId.
  // All pointers that belong to canvas pan/pinch interactions are kept here.
  const ptrs = new Map<number, { x: number; y: number }>()

  // Last computed pinch state — needed to delta between move events
  let lastPinchDist = 0
  let lastPinchMid  = { x: 0, y: 0 }

  function getPinchState(): { dist: number; mid: { x: number; y: number } } {
    const vals = Array.from(ptrs.values())
    const a = vals[0]!
    const b = vals[1]!
    const dx = b.x - a.x
    const dy = b.y - a.y
    return {
      dist: Math.sqrt(dx * dx + dy * dy),
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    }
  }

  function isBackgroundTarget(target: EventTarget | null): boolean {
    return target === root
  }

  const onPointerDown = (e: PointerEvent) => {
    const isMiddle   = e.button === 1
    const isSpace    = e.button === 0 && isSpacePressed()
    const isBgTouch  = isBackgroundTarget(e.target)

    // Accept: middle-button, space+primary, primary on background, touch on background
    if (!isMiddle && !isSpace && !isBgTouch) return

    e.preventDefault()
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })
    root.setPointerCapture(e.pointerId)

    if (ptrs.size === 2) {
      // Entering pinch mode — snapshot initial distance and mid-point
      const state = getPinchState()
      lastPinchDist = state.dist
      lastPinchMid  = state.mid
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    if (!ptrs.has(e.pointerId)) return

    const prev = ptrs.get(e.pointerId)!
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (ptrs.size === 1) {
      // ---- Single pointer → pan ----
      const dx = e.clientX - prev.x
      const dy = e.clientY - prev.y
      transform.update(t => ({ x: t.x + dx, y: t.y + dy, scale: t.scale }))

    } else if (ptrs.size === 2) {
      // ---- Two pointers → pinch-zoom + simultaneous pan ----
      const { dist, mid } = getPinchState()

      if (lastPinchDist > 0) {
        const rect    = root.getBoundingClientRect()
        const anchorX = mid.x - rect.left
        const anchorY = mid.y - rect.top

        const current   = transform.peek()
        const newScale  = Math.min(maxZoom, Math.max(minZoom, current.scale * (dist / lastPinchDist)))
        const ratio     = newScale / current.scale

        // Pan component from mid-point drift
        const panDx = mid.x - lastPinchMid.x
        const panDy = mid.y - lastPinchMid.y

        // Zoom component: pin the canvas point under the mid-point
        transform.set({
          x: anchorX - (anchorX - current.x) * ratio + panDx,
          y: anchorY - (anchorY - current.y) * ratio + panDy,
          scale: newScale,
        })
      }

      lastPinchDist = dist
      lastPinchMid  = mid
    }
  }

  const onPointerUp = (e: PointerEvent) => {
    if (!ptrs.has(e.pointerId)) return
    ptrs.delete(e.pointerId)

    // If dropping from pinch to single-finger: re-snapshot remaining pointer
    // as the new pan start point (no position jump).
    if (ptrs.size === 1) {
      lastPinchDist = 0
    } else if (ptrs.size === 0) {
      lastPinchDist = 0
    }
  }

  // ---- Wheel — desktop mouse + trackpad ----
  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const rect    = root.getBoundingClientRect()
    const mouseX  = e.clientX - rect.left
    const mouseY  = e.clientY - rect.top
    const current = transform.peek()
    // ctrlKey is set by browsers on trackpad pinch-to-zoom wheel events
    const delta   = e.ctrlKey ? -e.deltaY * 0.01 : -e.deltaY * 0.001
    const newScale = Math.min(maxZoom, Math.max(minZoom, current.scale * (1 + delta)))
    const ratio    = newScale / current.scale
    transform.set({
      x: mouseX - (mouseX - current.x) * ratio,
      y: mouseY - (mouseY - current.y) * ratio,
      scale: newScale,
    })
  }

  // touch-action:none prevents browser native scroll / pinch-zoom from
  // interfering — required for pointer events to fire reliably on touch
  root.style.touchAction = 'none'

  root.addEventListener('pointerdown',   onPointerDown)
  document.addEventListener('pointermove',   onPointerMove)
  document.addEventListener('pointerup',     onPointerUp)
  document.addEventListener('pointercancel', onPointerUp)
  root.addEventListener('wheel', onWheel, { passive: false })

  return function cleanup() {
    root.removeEventListener('pointerdown',   onPointerDown)
    document.removeEventListener('pointermove',   onPointerMove)
    document.removeEventListener('pointerup',     onPointerUp)
    document.removeEventListener('pointercancel', onPointerUp)
    root.removeEventListener('wheel', onWheel)
  }
}
