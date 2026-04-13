import { signal, effect } from '@liteforge/core'
import type { Transform, FlowCanvasProps } from '../types.js'
import { createInteractionState } from '../state.js'
import { createHandleRegistry } from '../registry/handle-registry.js'
import { pushFlowContext, popFlowContext } from '../context.js'
import type { FlowContextValue } from '../context.js'
import { injectFlowStyles } from '../styles.js'
import { createNodeWrapper } from './NodeWrapper.js'
import type { NodeWrapperHandle } from './NodeWrapper.js'
import { setupConnect } from '../interactions/connect.js'
import { setupReconnect } from '../interactions/reconnect.js'
import { createGhostEdge } from './GhostEdge.js'
import { createEdgeLayer } from './EdgeLayer.js'
import { setupMarqueeSelect } from '../interactions/marquee-select.js'
import { createMarquee } from './Marquee.js'
import { screenToCanvas } from '../geometry/coords.js'
import { createControls } from './Controls.js'
import { createMiniMap } from './MiniMap.js'
import { computeFitView } from '../helpers/fit-view.js'
import { createContextMenu } from './ContextMenu.js'
import { setupKeyboard } from '../interactions/keyboard.js'
import { setupPanZoom } from '../interactions/pan-zoom.js'

const DEFAULT_MIN_ZOOM = 0.1
const DEFAULT_MAX_ZOOM = 4

/**
 * Sort nodes so parents always appear before their children.
 * Root nodes (no parentId) come first, then children in BFS order.
 */
function sortNodesByDepth(nodes: import('../types.js').FlowNode[]): import('../types.js').FlowNode[] {
  const byId = new Map(nodes.map(n => [n.id, n]))
  const result: import('../types.js').FlowNode[] = []
  const visited = new Set<string>()

  function visit(node: import('../types.js').FlowNode) {
    if (visited.has(node.id)) return
    if (node.parentId && !visited.has(node.parentId)) {
      const parent = byId.get(node.parentId)
      if (parent) visit(parent)
    }
    visited.add(node.id)
    result.push(node)
  }

  for (const node of nodes) visit(node)
  return result
}

export function FlowCanvas(props: FlowCanvasProps): Node {
  const minZoom = props.minZoom ?? DEFAULT_MIN_ZOOM
  const maxZoom = props.maxZoom ?? DEFAULT_MAX_ZOOM

  // Inject default styles unless unstyled
  if (!props.flow.options.unstyled) {
    injectFlowStyles()
  }

  // ---- Signals ----
  const transform = signal<Transform>(
    props.defaultViewport ?? { x: 0, y: 0, scale: 1 },
  )
  const stateMgr = createInteractionState()
  const handleRegistry = createHandleRegistry()

  // ---- Node size registry ----
  const nodeSizeMap = new Map<string, { width: number; height: number }>()
  const nodeSizeVersion = signal(0)

  // ---- Build FlowContext ----
  const ctx: FlowContextValue = {
    nodes: props.nodes,
    edges: props.edges,
    getNode: (id) => props.nodes().find(n => n.id === id),
    getEdge: (id) => props.edges().find(e => e.id === id),
    getNodes: () => props.nodes(),
    getEdges: () => props.edges(),
    getChildren: (parentId) => props.nodes().filter(n => n.parentId === parentId),
    getAbsolutePosition: (nodeId) => {
      const visited = new Set<string>()
      let pos = { x: 0, y: 0 }
      let current = props.nodes().find(n => n.id === nodeId)
      while (current) {
        if (visited.has(current.id)) break // cycle guard
        visited.add(current.id)
        pos = { x: pos.x + current.position.x, y: pos.y + current.position.y }
        if (!current.parentId) break
        current = props.nodes().find(n => n.id === current!.parentId)
      }
      return pos
    },
    transform,
    interactionState: stateMgr.state,
    stateMgr,
    interactionStateManager: stateMgr,
    handleRegistry,
    onNodesChange: props.onNodesChange,
    onEdgesChange: props.onEdgesChange,
    onConnect: props.onConnect,
    onNodeClick:      props.onNodeClick,
    onNodeMouseEnter: props.onNodeMouseEnter,
    onNodeMouseLeave: props.onNodeMouseLeave,
    onEdgeMouseEnter: props.onEdgeMouseEnter,
    onEdgeMouseLeave: props.onEdgeMouseLeave,
    isValidConnection: props.flow.options.isValidConnection,
    nodeTypes: props.flow.options.nodeTypes,
    edgeTypes: props.flow.options.edgeTypes,
    connectionLineType: props.flow.options.connectionLineType ?? 'bezier',
    registerNodeSize: (nodeId, width, height) => {
      nodeSizeMap.set(nodeId, { width, height })
      nodeSizeVersion.update(v => v + 1)
    },
    getNodeSize: (nodeId) => nodeSizeMap.get(nodeId),
    nodeSizeVersion,
    snapToGrid: props.snapToGrid,
    nodeContextMenu: props.nodeContextMenu,
    edgeContextMenu: props.edgeContextMenu,
    paneContextMenu: props.paneContextMenu,
    // Lazy — root is assigned after ctx is built
    getRootRect: () => root.getBoundingClientRect(),
  }

  // Push context so child components (when added later) can read it
  pushFlowContext(ctx)

  // ---- DOM Structure ----

  // SVG edges layer
  const edgesLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  edgesLayer.setAttribute('class', 'lf-edges-layer')
  edgesLayer.setAttribute('style', 'position:absolute;width:100%;height:100%;overflow:visible;pointer-events:none')

  // Nodes layer
  const nodesLayer = document.createElement('div')
  nodesLayer.className = 'lf-nodes-layer'
  nodesLayer.style.cssText = 'position:absolute;width:100%;height:100%;pointer-events:none'

  // Transform layer (wraps edges + nodes)
  const transformLayer = document.createElement('div')
  transformLayer.className = 'lf-transform-layer'
  transformLayer.style.cssText = 'position:absolute;width:100%;height:100%;transform-origin:0 0;will-change:transform'
  transformLayer.appendChild(edgesLayer)
  transformLayer.appendChild(nodesLayer)

  // Root
  const root = document.createElement('div')
  root.className = 'lf-flow-root'
  root.style.cssText = 'overflow:hidden;position:relative;width:100%;height:100%;user-select:none'
  // ARIA: "application" landmark — screen readers expose keyboard interaction hints.
  root.setAttribute('role', 'application')
  root.setAttribute('aria-label', 'Flow canvas')

  // ---- Grid Background (SVG pattern, sits behind transform layer) ----
  // Only rendered when showGrid !== false
  let gridPatternEl: SVGCircleElement | null = null
  let gridPatternTransform: SVGPatternElement | null = null

  if (props.showGrid !== false) {
    const gridSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    gridSvg.setAttribute('class', 'lf-grid-svg')
    gridSvg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible'

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern')
    pattern.setAttribute('id', 'lf-grid-pattern')
    pattern.setAttribute('patternUnits', 'userSpaceOnUse')
    pattern.setAttribute('width', '20')
    pattern.setAttribute('height', '20')

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    dot.setAttribute('cx', '1')
    dot.setAttribute('cy', '1')
    dot.setAttribute('r', '1')
    dot.setAttribute('class', 'lf-grid-dot')

    pattern.appendChild(dot)
    defs.appendChild(pattern)
    gridSvg.appendChild(defs)

    const gridRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    gridRect.setAttribute('width', '100%')
    gridRect.setAttribute('height', '100%')
    gridRect.setAttribute('fill', 'url(#lf-grid-pattern)')

    gridSvg.appendChild(gridRect)
    root.appendChild(gridSvg)

    gridPatternEl = dot
    gridPatternTransform = pattern
  }

  root.appendChild(transformLayer)

  // Pop context — the DOM is now built synchronously
  popFlowContext()

  // fitView helper (needs ctx + transform + root)
  function fitView() {
    const t = computeFitView(
      ctx.getNodes(),
      root.offsetWidth || 800,
      root.offsetHeight || 600,
      props.fitViewOptions,
      (nodeId) => ctx.getAbsolutePosition(nodeId),
    )
    transform.set(t)
  }

  // fitView prop — fit all nodes into view once after the canvas is mounted.
  // requestAnimationFrame defers until the root element has a real layout
  // (offsetWidth / offsetHeight are 0 when FlowCanvas() first returns because
  // the element is not yet inserted into the DOM).
  // Takes precedence over defaultViewport.
  if (props.fitView) {
    requestAnimationFrame(fitView)
  }

  // Controls overlay (appended outside transform layer) — hidden via showControls: false
  if (props.showControls !== false) {
    createControls(ctx, transform, root, fitView)
  }

  // MiniMap overlay (appended outside transform layer) — hidden via showMiniMap: false
  if (props.showMiniMap !== false) {
    createMiniMap(ctx, transform, root)
  }

  // ---- Context Menu ----
  const contextMenuHandle = createContextMenu(ctx, root)
  ctx.contextMenu = contextMenuHandle

  // Pane right-click → show pane context menu
  root.addEventListener('contextmenu', (e: MouseEvent) => {
    const target = e.target as Element
    // Only fire if the user clicked on the root background or transform layer
    // (nodes and edges call stopPropagation on their own contextmenu handlers)
    if (target !== root && target !== transformLayer) return
    e.preventDefault()
    const rootRect = root.getBoundingClientRect()
    const t = transform.peek()
    const canvasPos = screenToCanvas(
      { x: e.clientX - rootRect.left, y: e.clientY - rootRect.top },
      t,
    )
    ctx.contextMenu?.showForPane(canvasPos, e.clientX, e.clientY)
  })

  // ---- Connect interaction, EdgeLayer & GhostEdge ----
  setupConnect(ctx, () => transform.peek())
  setupReconnect(ctx, () => transform.peek())
  const edgeLayerHandle = createEdgeLayer(ctx, edgesLayer)
  createGhostEdge(ctx, edgesLayer)

  // ---- Marquee selection ----
  createMarquee(ctx, transformLayer)
  setupMarqueeSelect(ctx, () => transform.peek(), root)

  // ---- Effect: manage NodeWrapper instances ----
  const wrapperMap = new Map<string, NodeWrapperHandle>()

  effect(() => {
    const currentNodes = props.nodes()
    const currentIds = new Set(currentNodes.map(n => n.id))

    // Dispose wrappers for nodes that are no longer present
    for (const [id, handle] of wrapperMap) {
      if (!currentIds.has(id)) {
        handle.dispose()
        wrapperMap.delete(id)
        nodeSizeMap.delete(id)
      }
    }

    // Create wrappers for newly added nodes.
    // Parent nodes must be created before their children so the child can
    // find the parent wrapper element to nest inside.
    // Sort: nodes without parentId first, then by depth.
    const sorted = sortNodesByDepth(currentNodes)
    for (const node of sorted) {
      if (wrapperMap.has(node.id)) continue

      // If this node has a parent, nest inside the parent wrapper's element.
      // Otherwise use the shared nodesLayer.
      let container: HTMLElement = nodesLayer
      if (node.parentId) {
        const parentHandle = wrapperMap.get(node.parentId)
        if (parentHandle) container = parentHandle.el
      }

      const handle = createNodeWrapper(node.id, ctx, container)
      wrapperMap.set(node.id, handle)
    }
  })

  // ---- Effect: sync CSS transform ----
  effect(() => {
    const t = transform()
    transformLayer.style.transform = `translate(${t.x}px,${t.y}px) scale(${t.scale})`
  })

  // ---- Effect: viewport change callback ----
  if (props.onViewportChange) {
    const cb = props.onViewportChange
    effect(() => {
      const { x, y, scale } = transform()
      cb({ x, y, zoom: scale })
    })
  }

  // ---- Effect: sync grid pattern with pan + zoom ----
  // patternTransform="translate(tx ty) scale(s)" keeps the dot grid
  // locked to canvas-space so it moves/scales exactly with the nodes.
  if (gridPatternTransform) {
    const pt = gridPatternTransform
    effect(() => {
      const t = transform()
      // Scale the pattern cell size with zoom (20px grid cell × scale)
      const cellSize = 20 * t.scale
      pt.setAttribute('width',  String(cellSize))
      pt.setAttribute('height', String(cellSize))
      // Offset the origin so dots stay aligned to canvas position 0,0
      // mod wraps the pan offset into [0, cellSize) so the pattern tiles seamlessly
      const ox = ((t.x % cellSize) + cellSize) % cellSize
      const oy = ((t.y % cellSize) + cellSize) % cellSize
      pt.setAttribute('patternTransform', `translate(${ox} ${oy})`)
      // Scale the dot radius slightly with zoom (min 0.8, max 1.8)
      if (gridPatternEl) {
        const r = Math.min(1.8, Math.max(0.8, t.scale))
        gridPatternEl.setAttribute('r', String(r))
      }
    })
  }

  // ---- Pan / Zoom (mouse, touch, stylus) ----
  let spacePressed = false

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space' && !e.repeat) {
      spacePressed = true
      e.preventDefault()
    }
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') spacePressed = false
  }
  document.addEventListener('keydown', onKeyDown)
  document.addEventListener('keyup', onKeyUp)

  // ---- Keyboard handler (Delete/Backspace) — scoped to root element ----
  setupKeyboard(ctx, root)

  // setupPanZoom handles: wheel zoom, middle-button pan, space+drag pan,
  // single-touch pan, two-finger pinch-zoom (touch + trackpad).
  // Sets touch-action:none on root.
  setupPanZoom(root, transform, {
    minZoom,
    maxZoom,
    isSpacePressed: () => spacePressed,
  })

  // ---- Background pointerdown → start marquee selection ----
  // Only fires for primary button on the canvas background when not panning.
  root.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button !== 0) return
    if (spacePressed) return
    // Only touch that hits non-background targets is handled by node/handle listeners
    if (e.pointerType === 'touch') return
    const target = e.target as Element
    if (target !== root && target !== transformLayer) return

    const rootRect = root.getBoundingClientRect()
    const canvasPoint = screenToCanvas(
      { x: e.clientX - rootRect.left, y: e.clientY - rootRect.top },
      transform.peek(),
    )
    ctx.interactionStateManager.toSelecting(canvasPoint, e.pointerId)
  })

  // ---- Background click → deselect all ----
  root.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as Element
    if (target !== root && target !== transformLayer) return

    const allNodes = ctx.getNodes()
    const allEdges = ctx.getEdges()
    const hasSelectedNodes = allNodes.some(n => n.selected)
    const hasSelectedEdges = allEdges.some(ed => ed.selected)

    if (hasSelectedNodes || hasSelectedEdges) {
      if (hasSelectedNodes) {
        ctx.onNodesChange?.(allNodes.map(n => ({ type: 'select' as const, id: n.id, selected: false })))
      }
      if (hasSelectedEdges) {
        ctx.onEdgesChange?.(allEdges.map(ed => ({ type: 'select' as const, id: ed.id, selected: false })))
      }
    }
  })

  // ---- Register imperative API internals on the flow handle ----
  props.flow._register({
    getTransform:  () => transform.peek(),
    setTransform:  (t) => transform.set(t),
    getRootSize:   () => ({ width: root.offsetWidth || 800, height: root.offsetHeight || 600 }),
    getNodes:      () => props.nodes(),
    getEdges:      () => props.edges(),
    getNodeSize:   (id) => nodeSizeMap.get(id),
    setEdgeActive: (edgeId, active) => edgeLayerHandle.setEdgeActive(edgeId, active),
    minZoom,
    maxZoom,
  })

  return root
}
