import type { FlowContextValue } from '../context.js'
import type { ResizeDirection } from '../interactions/resize.js'
import { setupNodeResize } from '../interactions/resize.js'

export interface NodeResizerOptions {
  /** Minimum allowed width in canvas units. @default 40 */
  minWidth?: number
  /** Minimum allowed height in canvas units. @default 40 */
  minHeight?: number
}

/**
 * createNodeResizer — resize handles for a flow node.
 *
 * Call this inside your NodeComponentFn and append the returned element
 * to your node's root DOM node. It renders 8 invisible handles (edges +
 * corners) that become visible on hover and allow the user to drag-resize
 * the node.
 *
 * @example
 * ```ts
 * function MyNode(node: FlowNode<{ label: string }>) {
 *   const ctx = getFlowContext()
 *   const wrapper = document.createElement('div')
 *   wrapper.className = 'my-node'
 *   wrapper.textContent = node.data.label
 *   wrapper.appendChild(createNodeResizer(node.id, ctx))
 *   return wrapper
 * }
 * ```
 */
export function createNodeResizer(
  nodeId: string,
  ctx: FlowContextValue,
  _options: NodeResizerOptions = {},
): HTMLDivElement {
  const container = document.createElement('div')
  container.className = 'lf-node-resizer'

  // 8 handles: 4 edges + 4 corners
  const directions: ResizeDirection[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

  for (const dir of directions) {
    const handle = document.createElement('div')
    handle.className = `lf-resize-handle lf-resize-handle--${dir}`
    handle.dataset['resizeDir'] = dir

    handle.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button !== 0) return

      // Prevent NodeWrapper's pointerdown (drag) from firing
      e.stopPropagation()
      e.preventDefault()

      // Find the wrapper element to read current rendered dimensions
      const wrapperEl = document.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null
      if (!wrapperEl) return

      const rect   = wrapperEl.getBoundingClientRect()
      const transform = ctx.transform.peek()

      // Current dimensions in canvas units (reverse the scale)
      const startWidth  = rect.width  / transform.scale
      const startHeight = rect.height / transform.scale

      // Current canvas position (top-left of wrapper in canvas space)
      const node = ctx.getNode(nodeId)
      const startX = node?.position.x ?? 0
      const startY = node?.position.y ?? 0

      setupNodeResize(
        ctx,
        () => ctx.transform.peek(),
        nodeId,
        dir,
        e.clientX,
        e.clientY,
        startWidth,
        startHeight,
        startX,
        startY,
        e.pointerId,
        handle,
      )
    })

    container.appendChild(handle)
  }

  return container
}
