import { effect, signal } from '@liteforge/core'
import type { FlowContextValue } from '../context.js'

export type ToolbarPosition = 'top' | 'bottom' | 'left' | 'right'
export type ToolbarAlign    = 'start' | 'center' | 'end'

export interface NodeToolbarOptions {
  /**
   * Which side of the node the toolbar appears on.
   * @default 'top'
   */
  position?: ToolbarPosition
  /**
   * Alignment along the cross-axis.
   * - `'start'`  — left-aligned (top/bottom) or top-aligned (left/right)
   * - `'center'` — centered
   * - `'end'`    — right-aligned (top/bottom) or bottom-aligned (left/right)
   * @default 'center'
   */
  align?: ToolbarAlign
  /**
   * Gap in pixels between the node edge and the toolbar.
   * @default 8
   */
  offset?: number
  /**
   * When true, the toolbar is always visible (ignores node.selected).
   * @default false
   */
  alwaysVisible?: boolean
}

export interface NodeToolbarHandle {
  el:      HTMLDivElement
  dispose: () => void
}

/**
 * createNodeToolbar — floating toolbar that tracks a node's screen position.
 *
 * Architecture:
 *   The toolbar element is appended to the lf-flow-root (outside the transform
 *   layer), so its CSS left/top are in root-relative pixel space. A reactive
 *   effect recalculates position whenever:
 *     - ctx.transform changes (pan or zoom)
 *     - ctx.nodeSizeVersion changes (node resize)
 *     - ctx.interactionState changes (drag offset)
 *   A `mounted` signal flips to true after the microtask that attaches the
 *   toolbar to the root, which triggers a final effect re-run with correct rects.
 *
 * Usage inside a nodeType renderer:
 *   ```ts
 *   const toolbar = createNodeToolbar(nodeId, ctx, { position: 'top' })
 *   toolbar.el.appendChild(myButton)
 *   return myNodeDomElement  // toolbar is appended to root automatically
 *   ```
 *
 * The toolbar is automatically shown/hidden based on `node.selected` unless
 * `alwaysVisible: true` is set.
 */
export function createNodeToolbar(
  nodeId:  string,
  ctx:     FlowContextValue,
  options: NodeToolbarOptions = {},
): NodeToolbarHandle {
  const {
    position      = 'top',
    align         = 'center',
    offset        = 8,
    alwaysVisible = false,
  } = options

  // ---- Create toolbar element ----
  const el = document.createElement('div')
  el.className = 'lf-node-toolbar'
  el.dataset['nodeId']   = nodeId
  el.dataset['position'] = position
  el.dataset['align']    = align
  el.style.display = 'none'

  // Prevent pointer events from bubbling to canvas (no accidental pan/deselect)
  el.addEventListener('pointerdown', e => e.stopPropagation())
  el.addEventListener('click',       e => e.stopPropagation())

  // Signal that flips true once the toolbar has been attached to the root.
  // This causes the effect to re-run with correct getBoundingClientRect values.
  const mounted = signal(false)

  let rootEl: HTMLElement | null = null
  let disposed = false

  // ---- Reactive position + visibility effect ----
  const disposeEffect = effect(() => {
    // Subscribe to all signals that affect toolbar position/visibility:
    ctx.transform()          // pan + zoom
    ctx.nodeSizeVersion()    // node resize
    const istate = ctx.interactionState()
    // Subscribe to drag offset signal when dragging this node
    if (istate.type === 'dragging' && istate.draggedNodes.has(nodeId)) {
      istate.localOffset()
    }
    mounted() // re-run once the toolbar is attached to the root

    // Determine visibility
    const node = ctx.getNode(nodeId)
    if (!node || !rootEl) {
      el.style.display = 'none'
      return
    }

    const visible = alwaysVisible || (node.selected ?? false)
    if (!visible) {
      el.style.display = 'none'
      return
    }

    // Find the node wrapper in the DOM
    const wrapperEl = rootEl.querySelector<HTMLElement>(`[data-node-id="${nodeId}"]`)
    if (!wrapperEl) {
      el.style.display = 'none'
      return
    }

    el.style.display = ''

    // Get bounding rects in screen space
    const rootRect    = rootEl.getBoundingClientRect()
    const wrapperRect = wrapperEl.getBoundingClientRect()

    // Node bounds in root-relative pixels
    const nodeLeft   = wrapperRect.left   - rootRect.left
    const nodeTop    = wrapperRect.top    - rootRect.top
    const nodeWidth  = wrapperRect.width
    const nodeHeight = wrapperRect.height

    const toolbarW = el.offsetWidth  || 0
    const toolbarH = el.offsetHeight || 0

    let left = 0
    let top  = 0

    if (position === 'top' || position === 'bottom') {
      top = position === 'top'
        ? nodeTop - toolbarH - offset
        : nodeTop + nodeHeight + offset

      if (align === 'start') {
        left = nodeLeft
      } else if (align === 'center') {
        left = nodeLeft + nodeWidth / 2 - toolbarW / 2
      } else {
        left = nodeLeft + nodeWidth - toolbarW
      }
    } else {
      // 'left' | 'right'
      left = position === 'left'
        ? nodeLeft - toolbarW - offset
        : nodeLeft + nodeWidth + offset

      if (align === 'start') {
        top = nodeTop
      } else if (align === 'center') {
        top = nodeTop + nodeHeight / 2 - toolbarH / 2
      } else {
        top = nodeTop + nodeHeight - toolbarH
      }
    }

    el.style.left = `${left}px`
    el.style.top  = `${top}px`
  })

  // Attach to root after the current microtask queue drains.
  // By then FlowCanvas has appended the node wrapper to the DOM, so
  // document.querySelector('[data-node-id]') will find it, and
  // closest('.lf-flow-root') will return the canvas root.
  queueMicrotask(() => {
    if (disposed) return
    const wrapper = document.querySelector(`[data-node-id="${nodeId}"]`)
    rootEl = wrapper?.closest('.lf-flow-root') as HTMLElement | null
    if (rootEl) {
      rootEl.appendChild(el)
      // Flip signal → triggers effect re-run with correct rects
      mounted.set(true)
    }
  })

  function dispose() {
    disposed = true
    disposeEffect()
    el.remove()
  }

  return { el, dispose }
}
