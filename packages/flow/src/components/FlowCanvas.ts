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
import { createGhostEdge } from './GhostEdge.js'
import { createEdgeLayer } from './EdgeLayer.js'
import { setupMarqueeSelect } from '../interactions/marquee-select.js'
import { createMarquee } from './Marquee.js'
import { screenToCanvas } from '../geometry/coords.js'

const DEFAULT_MIN_ZOOM = 0.1
const DEFAULT_MAX_ZOOM = 4

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

  // ---- Build FlowContext ----
  const ctx: FlowContextValue = {
    nodes: props.nodes,
    edges: props.edges,
    getNode: (id) => props.nodes().find(n => n.id === id),
    getEdge: (id) => props.edges().find(e => e.id === id),
    getNodes: () => props.nodes(),
    getEdges: () => props.edges(),
    transform,
    interactionState: stateMgr.state,
    stateMgr,
    interactionStateManager: stateMgr,
    handleRegistry,
    onNodesChange: props.onNodesChange,
    onEdgesChange: props.onEdgesChange,
    onConnect: props.onConnect,
    isValidConnection: props.flow.options.isValidConnection,
    nodeTypes: props.flow.options.nodeTypes,
    edgeTypes: props.flow.options.edgeTypes,
    connectionLineType: props.flow.options.connectionLineType ?? 'bezier',
    registerNodeSize: (nodeId, width, height) => {
      nodeSizeMap.set(nodeId, { width, height })
    },
    getNodeSize: (nodeId) => nodeSizeMap.get(nodeId),
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
  nodesLayer.style.cssText = 'position:relative;width:100%;height:100%;pointer-events:none'

  // Transform layer (wraps edges + nodes)
  const transformLayer = document.createElement('div')
  transformLayer.className = 'lf-transform-layer'
  transformLayer.style.cssText = 'position:absolute;width:100%;height:100%;transform-origin:0 0;will-change:transform'
  transformLayer.appendChild(edgesLayer)
  transformLayer.appendChild(nodesLayer)

  // Controls (empty in Phase 1)
  const controls = document.createElement('div')
  controls.className = 'lf-controls'
  controls.style.cssText = 'position:absolute;bottom:16px;right:16px'

  // Minimap (empty in Phase 1)
  const minimap = document.createElement('div')
  minimap.className = 'lf-minimap'
  minimap.style.cssText = 'position:absolute;bottom:16px;left:16px'

  // Root
  const root = document.createElement('div')
  root.className = 'lf-flow-root'
  root.style.cssText = 'overflow:hidden;position:relative;width:100%;height:100%;user-select:none'
  root.appendChild(transformLayer)
  root.appendChild(controls)
  root.appendChild(minimap)

  // Pop context — the DOM is now built synchronously
  popFlowContext()

  // ---- Connect interaction, EdgeLayer & GhostEdge ----
  setupConnect(ctx, () => transform.peek())
  createEdgeLayer(ctx, edgesLayer)
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

    // Create wrappers for newly added nodes
    for (const node of currentNodes) {
      if (!wrapperMap.has(node.id)) {
        const handle = createNodeWrapper(node.id, ctx, nodesLayer)
        wrapperMap.set(node.id, handle)
      }
    }
  })

  // ---- Effect: sync CSS transform ----
  effect(() => {
    const t = transform()
    transformLayer.style.transform = `translate(${t.x}px,${t.y}px) scale(${t.scale})`
  })

  // ---- Pan / Zoom ----
  const panState = { active: false, lastX: 0, lastY: 0, pointerId: -1 }
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

  // ---- Delete key handler ----
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Delete' && e.key !== 'Backspace') return
    const tag = (e.target as Element).tagName.toLowerCase()
    if (
      tag === 'input' ||
      tag === 'textarea' ||
      (e.target as HTMLElement).isContentEditable
    ) return

    const nodesToRemove = ctx.getNodes().filter(n => n.selected)
    const edgesToRemove = ctx.getEdges().filter(ed => ed.selected)

    if (nodesToRemove.length > 0) {
      ctx.onNodesChange?.(nodesToRemove.map(n => ({ type: 'remove' as const, id: n.id })))
    }
    if (edgesToRemove.length > 0) {
      ctx.onEdgesChange?.(edgesToRemove.map(ed => ({ type: 'remove' as const, id: ed.id })))
    }
  }
  document.addEventListener('keydown', handleKeyDown)

  // Zoom via wheel
  root.addEventListener('wheel', (e: WheelEvent) => {
    e.preventDefault()
    const rect = root.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const current = transform.peek()
    const delta = e.ctrlKey ? -e.deltaY * 0.01 : -e.deltaY * 0.001
    const newScale = Math.min(maxZoom, Math.max(minZoom, current.scale * (1 + delta)))
    const scaleRatio = newScale / current.scale
    transform.set({
      x: mouseX - (mouseX - current.x) * scaleRatio,
      y: mouseY - (mouseY - current.y) * scaleRatio,
      scale: newScale,
    })
  }, { passive: false })

  // Pan via middle-button or space + left-button
  transformLayer.addEventListener('pointerdown', (e: PointerEvent) => {
    const isMiddle = e.button === 1
    const isSpacePan = e.button === 0 && spacePressed
    if (!isMiddle && !isSpacePan) return
    e.preventDefault()
    panState.active = true
    panState.lastX = e.clientX
    panState.lastY = e.clientY
    panState.pointerId = e.pointerId
    transformLayer.setPointerCapture(e.pointerId)
  })

  transformLayer.addEventListener('pointermove', (e: PointerEvent) => {
    if (!panState.active || e.pointerId !== panState.pointerId) return
    const dx = e.clientX - panState.lastX
    const dy = e.clientY - panState.lastY
    panState.lastX = e.clientX
    panState.lastY = e.clientY
    transform.update(t => ({ x: t.x + dx, y: t.y + dy, scale: t.scale }))
  })

  const stopPan = (e: PointerEvent) => {
    if (e.pointerId !== panState.pointerId) return
    panState.active = false
    panState.pointerId = -1
  }
  transformLayer.addEventListener('pointerup', stopPan)
  transformLayer.addEventListener('pointercancel', stopPan)

  // ---- Background pointerdown → start marquee selection ----
  root.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button !== 0) return
    if (spacePressed) return
    const target = e.target as Element
    if (target !== root && target !== transformLayer) return

    const canvasPoint = screenToCanvas(
      { x: e.clientX, y: e.clientY },
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

  return root
}
