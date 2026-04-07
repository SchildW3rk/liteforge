import { effect } from '@liteforge/core'
import type { FlowContextValue } from '../context.js'
import { pushFlowContext, popFlowContext } from '../context.js'
import type { Point } from '../types.js'
import { setupNodeDrag } from '../interactions/drag-node.js'

export interface NodeWrapperHandle {
  el: HTMLDivElement
  dispose: () => void
}

/**
 * Creates and manages the DOM wrapper for a single node.
 *
 * Responsibilities:
 *  - Absolutely-position the wrapper using the node's canvas position
 *  - Overlay the localOffset Signal during an active drag for visual feedback
 *  - Add/remove the `lf-node-selected` class reactively
 *  - Initiate drag on pointerdown (unless on a handle)
 *  - Render user content via ctx.nodeTypes
 */
export function createNodeWrapper(
  nodeId: string,
  ctx: FlowContextValue,
  nodesLayer: HTMLElement,
): NodeWrapperHandle {
  const startDrag = setupNodeDrag(ctx, () => ctx.transform())

  // ---- DOM element ----
  const wrapperEl = document.createElement('div')
  wrapperEl.className = 'lf-node-wrapper'
  wrapperEl.setAttribute('data-node-id', nodeId)
  wrapperEl.style.cssText = 'position:absolute;pointer-events:all;cursor:grab'

  // ---- Render user content ----
  const node = ctx.getNode(nodeId)
  if (node) {
    const nodeTypeFn = ctx.nodeTypes[node.type]
    if (nodeTypeFn) {
      pushFlowContext(ctx)
      const content = nodeTypeFn(node)
      popFlowContext()
      wrapperEl.appendChild(content)
    }
  }

  // ---- Effect: position (base + drag offset) ----
  const posEffect = effect(() => {
    const state = ctx.interactionState()
    const offset: Point =
      state.type === 'dragging' && state.draggedNodes.has(nodeId)
        ? state.localOffset()
        : { x: 0, y: 0 }

    const currentNode = ctx.getNode(nodeId)
    if (!currentNode) return

    wrapperEl.style.left = `${currentNode.position.x + offset.x}px`
    wrapperEl.style.top  = `${currentNode.position.y + offset.y}px`
  })

  // ---- Effect: selected class ----
  const selEffect = effect(() => {
    const currentNode = ctx.getNode(nodeId)
    wrapperEl.classList.toggle('lf-node-selected', currentNode?.selected ?? false)
  })

  // ---- Drag initiation ----
  const onPointerDown = (e: PointerEvent) => {
    // Only primary button
    if (e.button !== 0) return
    // Ignore if the event originated on a handle
    if ((e.target as Element).closest('.lf-handle') !== null) return

    e.stopPropagation()
    e.preventDefault()

    const currentNode = ctx.getNode(nodeId)
    if (!currentNode) return

    // Transition interaction state to dragging
    // We need the canvas-space pointer position to anchor the drag
    const transform = ctx.transform.peek()
    const rootRect = ctx.getRootRect()
    const canvasX = (e.clientX - rootRect.left - transform.x) / transform.scale
    const canvasY = (e.clientY - rootRect.top  - transform.y) / transform.scale
    const startCanvasPoint = { x: canvasX, y: canvasY }

    // Collect all currently selected nodes for group drag.
    // If the dragged node is not selected (or nothing else is selected), drag only it.
    const selectedIds = ctx.getNodes()
      .filter(n => n.selected)
      .map(n => n.id)
    const draggedNodes = selectedIds.includes(nodeId) && selectedIds.length > 1
      ? new Set(selectedIds)
      : new Set([nodeId])

    ctx.stateMgr.toDragging(nodeId, e.pointerId, startCanvasPoint, currentNode.position, draggedNodes)

    // Start listening for move / up
    startDrag(nodeId, e.pointerId, startCanvasPoint, wrapperEl)
  }

  wrapperEl.addEventListener('pointerdown', onPointerDown)

  // ---- Click select ----
  const onClickNode = (e: MouseEvent) => {
    e.stopPropagation()
    if (e.shiftKey) {
      // Toggle this node's selection
      const currentNode = ctx.getNode(nodeId)
      ctx.onNodesChange?.([{
        type: 'select',
        id: nodeId,
        selected: !(currentNode?.selected ?? false),
      }])
    } else {
      // Select only this node, deselect all others
      const allNodes = ctx.getNodes()
      const changes = allNodes.map(n => ({
        type: 'select' as const,
        id: n.id,
        selected: n.id === nodeId,
      }))
      ctx.onNodesChange?.(changes)
    }
  }

  wrapperEl.addEventListener('click', onClickNode)

  // ---- Append to layer ----
  nodesLayer.appendChild(wrapperEl)

  // ---- Register node size (after layout) ----
  queueMicrotask(() => {
    ctx.registerNodeSize(nodeId, wrapperEl.offsetWidth, wrapperEl.offsetHeight)
  })

  // ---- Dispose ----
  function dispose() {
    posEffect()   // calling the effect's dispose function
    selEffect()
    wrapperEl.removeEventListener('pointerdown', onPointerDown)
    wrapperEl.removeEventListener('click', onClickNode)
    wrapperEl.remove()
  }

  return { el: wrapperEl, dispose }
}
