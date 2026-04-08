import { effect } from '@liteforge/core'
import type { FlowContextValue } from '../context.js'
import { pushFlowContext, popFlowContext } from '../context.js'
import type { Point } from '../types.js'
import { setupNodeDrag, collectDragGroup } from '../interactions/drag-node.js'
import { initNodeTabIndex } from '../interactions/keyboard.js'

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

  // ARIA: composite widget item — "button" role makes nodes activatable via Enter.
  // aria-label uses node.data.label if present, otherwise falls back to node type + id.
  wrapperEl.setAttribute('role', 'button')
  const node0 = ctx.getNode(nodeId)
  const label0 = (node0?.data as Record<string, unknown> | undefined)?.label
  wrapperEl.setAttribute(
    'aria-label',
    typeof label0 === 'string' ? label0 : `${node0?.type ?? 'node'} ${nodeId}`,
  )

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

  // ---- Effect: group class (reactive — children may be added after creation) ----
  // A node is a "group" if it has no parentId itself and has at least one child.
  const groupEffect = effect(() => {
    const currentNode = ctx.getNode(nodeId)
    const hasChildren = ctx.getChildren(nodeId).length > 0
    const isParent = !currentNode?.parentId && hasChildren
    wrapperEl.classList.toggle('lf-node-group', isParent)
  })

  // ---- Effect: position (base + drag offset) + explicit size ----
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

    // Apply explicit dimensions when present (set by resize interaction)
    if (currentNode.width  != null) wrapperEl.style.width  = `${currentNode.width}px`
    if (currentNode.height != null) wrapperEl.style.height = `${currentNode.height}px`
  })

  // ---- Effect: selected class + aria-selected ----
  const selEffect = effect(() => {
    const currentNode = ctx.getNode(nodeId)
    const sel = currentNode?.selected ?? false
    wrapperEl.classList.toggle('lf-node-selected', sel)
    wrapperEl.setAttribute('aria-selected', String(sel))
  })

  // ---- Effect: viewport culling ----
  // Hides nodes whose bounding box is entirely outside the visible viewport
  // using display:none — removes them from paint but keeps them in the DOM
  // so Handle-Registry, MiniMap, fitView, and all measurements stay intact.
  //
  // Nodes being dragged or selected are always visible (drag can carry a node
  // partially out of view; selected nodes need to be interactable).
  const cullEffect = effect(() => {
    const t = ctx.transform()
    const currentNode = ctx.getNode(nodeId)
    if (!currentNode) return

    // Never cull selected nodes or nodes being dragged
    const istate = ctx.interactionState()
    if (currentNode.selected) { wrapperEl.style.display = ''; return }
    if (istate.type === 'dragging' && istate.draggedNodes.has(nodeId)) { wrapperEl.style.display = ''; return }

    // Node bounding box in canvas units
    const size = ctx.getNodeSize(nodeId)
    const nw = currentNode.width  ?? size?.width  ?? 0
    const nh = currentNode.height ?? size?.height ?? 0

    // Convert node corners to screen space
    const nx1 = currentNode.position.x * t.scale + t.x
    const ny1 = currentNode.position.y * t.scale + t.y
    const nx2 = nx1 + nw * t.scale
    const ny2 = ny1 + nh * t.scale

    // Viewport screen bounds — use a generous margin so nodes pop in before
    // their edge visually reaches the viewport boundary (100px margin)
    const margin = 100
    const rootSize = ctx.getRootRect()
    const vw = rootSize.width
    const vh = rootSize.height

    const culled = nx2 < -margin || ny2 < -margin || nx1 > vw + margin || ny1 > vh + margin

    // Only update the style property when the culled state changes to avoid
    // forcing style recalc on every frame when the node is stably visible.
    const current = wrapperEl.style.display
    const desired = culled ? 'none' : ''
    if (current !== desired) wrapperEl.style.display = desired
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
    // In either case, always include all descendants of each dragged root node so
    // parent-drag moves children along with it (children share the same localOffset signal).
    const allNodes = ctx.getNodes()
    const selectedIds = allNodes.filter(n => n.selected).map(n => n.id)
    const rootIds: string[] = selectedIds.includes(nodeId) && selectedIds.length > 1
      ? selectedIds
      : [nodeId]
    const draggedNodes = new Set<string>()
    for (const id of rootIds) {
      collectDragGroup(id, allNodes, draggedNodes)
    }

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

  // ---- Context menu ----
  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const currentNode = ctx.getNode(nodeId)
    if (!currentNode || !ctx.contextMenu) return
    ctx.contextMenu.showForNode(currentNode, e.clientX, e.clientY)
  }
  wrapperEl.addEventListener('contextmenu', onContextMenu)

  // ---- Mouse enter / leave ----
  // Use pointerenter/pointerleave (non-bubbling) for consistency with the
  // existing pointer-event architecture and to avoid child-element noise.
  const onPointerEnter = () => {
    const currentNode = ctx.getNode(nodeId)
    if (currentNode) ctx.onNodeMouseEnter?.(currentNode)
  }
  const onPointerLeave = () => {
    const currentNode = ctx.getNode(nodeId)
    if (currentNode) ctx.onNodeMouseLeave?.(currentNode)
  }
  wrapperEl.addEventListener('pointerenter', onPointerEnter)
  wrapperEl.addEventListener('pointerleave', onPointerLeave)

  // ---- Append to layer ----
  nodesLayer.appendChild(wrapperEl)

  // ---- Roving tabindex: initialize this node's seat ----
  // Must happen after append so the querySelectorAll in initNodeTabIndex can see it.
  // getRootRect() always has the root el reference; walk up from nodesLayer to find root.
  queueMicrotask(() => {
    // Find the flow root ancestor (has class lf-flow-root)
    let el: HTMLElement | null = nodesLayer
    while (el && !el.classList.contains('lf-flow-root')) el = el.parentElement
    if (el) initNodeTabIndex(wrapperEl, el)
  })

  // ---- Register node size (after layout) ----
  queueMicrotask(() => {
    ctx.registerNodeSize(nodeId, wrapperEl.offsetWidth, wrapperEl.offsetHeight)
  })

  // ---- Dispose ----
  function dispose() {
    groupEffect()
    posEffect()
    selEffect()
    cullEffect()
    wrapperEl.removeEventListener('pointerdown', onPointerDown)
    wrapperEl.removeEventListener('click', onClickNode)
    wrapperEl.removeEventListener('contextmenu', onContextMenu)
    wrapperEl.removeEventListener('pointerenter', onPointerEnter)
    wrapperEl.removeEventListener('pointerleave', onPointerLeave)
    wrapperEl.remove()
  }

  return { el: wrapperEl, dispose }
}
