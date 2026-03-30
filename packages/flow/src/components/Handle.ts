import type { FlowContextValue } from '../context.js'
import type { HandleType, HandlePosition, Point } from '../types.js'
import { screenToCanvas } from '../geometry/coords.js'

export interface HandleHandle {
  el:      HTMLDivElement
  dispose: () => void
}

/**
 * Creates a handle element — the dot on a node where edges connect.
 *
 * The element is NOT appended to the DOM here; the caller (node content) is
 * responsible for insertion. Measurement is deferred via queueMicrotask so
 * that layout has settled by the time getBoundingClientRect() is called.
 */
export function createHandle(
  nodeId:        string,
  handleId:      string,
  type:          HandleType,
  position:      HandlePosition,
  ctx:           FlowContextValue,
  nodeWrapperEl: HTMLElement,
): HandleHandle {
  const handleEl = document.createElement('div')
  handleEl.className = `lf-handle lf-handle--${type} lf-handle--${position}`
  handleEl.dataset['nodeId']     = nodeId
  handleEl.dataset['handleId']   = handleId
  handleEl.dataset['handleType'] = type

  // Measure position relative to node wrapper after layout has settled
  queueMicrotask(() => {
    const handleRect = handleEl.getBoundingClientRect()
    const nodeRect   = nodeWrapperEl.getBoundingClientRect()
    const offset: Point = {
      x: handleRect.left - nodeRect.left + handleRect.width  / 2,
      y: handleRect.top  - nodeRect.top  + handleRect.height / 2,
    }
    ctx.handleRegistry.register(nodeId, handleId, offset, type)
  })

  // Pointer down — start a connecting interaction
  const onPointerDown = (e: PointerEvent) => {
    e.stopPropagation() // prevent NodeWrapper from starting a drag
    e.preventDefault()

    const canvasPos = screenToCanvas(
      { x: e.clientX, y: e.clientY },
      ctx.transform.peek(),
    )
    ctx.stateMgr.toConnecting(nodeId, handleId, type, canvasPos)
  }

  handleEl.addEventListener('pointerdown', onPointerDown)

  function dispose() {
    handleEl.removeEventListener('pointerdown', onPointerDown)
    ctx.handleRegistry.unregister(nodeId, handleId)
    handleEl.remove()
  }

  return { el: handleEl, dispose }
}
