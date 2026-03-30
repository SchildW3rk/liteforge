import { effect } from '@liteforge/core'
import type { FlowContextValue } from '../context.js'
import { rectFromPoints } from '../geometry/aabb.js'

export interface MarqueeHandle {
  el: HTMLDivElement
  dispose: () => void
}

/**
 * Creates the visual rubber-band selection rectangle.
 *
 * The element is appended inside the transform layer so it can be positioned
 * using canvas coordinates directly.
 */
export function createMarquee(
  ctx: FlowContextValue,
  transformLayerEl: HTMLElement,
): MarqueeHandle {
  const marqueeEl = document.createElement('div')
  marqueeEl.className = 'lf-marquee'
  marqueeEl.style.cssText =
    'position:absolute;display:none;pointer-events:none;' +
    'border:1px solid #3b82f6;background:rgba(59,130,246,0.1);' +
    'box-sizing:border-box;'

  transformLayerEl.appendChild(marqueeEl)

  const disposeEffect = effect(() => {
    const state = ctx.interactionState()
    if (state.type !== 'selecting') {
      marqueeEl.style.display = 'none'
      return
    }

    const cur = state.currentCanvasPoint()
    const rect = rectFromPoints(state.startCanvasPoint, cur)

    marqueeEl.style.display = ''
    marqueeEl.style.left   = `${rect.x}px`
    marqueeEl.style.top    = `${rect.y}px`
    marqueeEl.style.width  = `${rect.width}px`
    marqueeEl.style.height = `${rect.height}px`
  })

  function dispose() {
    disposeEffect()
    marqueeEl.remove()
  }

  return { el: marqueeEl, dispose }
}
