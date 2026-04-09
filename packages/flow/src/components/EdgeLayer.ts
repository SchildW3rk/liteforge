import { effect } from '@liteforge/core'
import {
  getBezierPath, getStepPath, getStraightPath,
  getBezierMidpoint, getStepMidpoint, getStraightMidpoint,
} from '../geometry/paths.js'
import type { FlowContextValue } from '../context.js'
import type { FlowEdge, Point } from '../types.js'

export interface EdgeLayerHandle {
  dispose: () => void
}

/**
 * Inject a shared <defs> block with reusable arrow markers into the SVG layer.
 * Both markers use `currentColor` so they automatically inherit the edge stroke.
 * IDs are scoped with a random suffix so multiple canvases don't collide.
 */
function injectMarkerDefs(svg: SVGElement): { arrowId: string; arrowClosedId: string } {
  const suffix = Math.random().toString(36).slice(2, 8)
  const arrowId       = `lf-arrow-${suffix}`
  const arrowClosedId = `lf-arrowclosed-${suffix}`

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')

  // Arrow markers use userSpaceOnUse so dimensions are in canvas pixels regardless
  // of stroke-width. viewBox="0 0 10 6" maps the arrow shape; refX=10 anchors the
  // tip (rightmost point) exactly on the path endpoint.
  const markerOpen = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
  markerOpen.setAttribute('id', arrowId)
  markerOpen.setAttribute('viewBox', '0 0 10 6')
  markerOpen.setAttribute('refX', '10')
  markerOpen.setAttribute('refY', '3')
  markerOpen.setAttribute('markerWidth',  '10')
  markerOpen.setAttribute('markerHeight', '6')
  markerOpen.setAttribute('orient', 'auto-start-reverse')
  markerOpen.setAttribute('markerUnits', 'userSpaceOnUse')
  const polyOpen = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
  polyOpen.setAttribute('points', '0,0 10,3 0,6')
  polyOpen.setAttribute('fill', 'none')
  polyOpen.setAttribute('stroke', 'currentColor')
  polyOpen.setAttribute('stroke-width', '1.5')
  polyOpen.setAttribute('stroke-linejoin', 'round')
  polyOpen.setAttribute('stroke-linecap', 'round')
  markerOpen.appendChild(polyOpen)

  const markerClosed = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
  markerClosed.setAttribute('id', arrowClosedId)
  markerClosed.setAttribute('viewBox', '0 0 10 6')
  markerClosed.setAttribute('refX', '10')
  markerClosed.setAttribute('refY', '3')
  markerClosed.setAttribute('markerWidth',  '10')
  markerClosed.setAttribute('markerHeight', '6')
  markerClosed.setAttribute('orient', 'auto-start-reverse')
  markerClosed.setAttribute('markerUnits', 'userSpaceOnUse')
  const polyClosed = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
  polyClosed.setAttribute('points', '0,0 10,3 0,6')
  polyClosed.setAttribute('fill', 'currentColor')
  polyClosed.setAttribute('stroke', 'none')
  markerClosed.appendChild(polyClosed)

  defs.appendChild(markerOpen)
  defs.appendChild(markerClosed)
  svg.insertBefore(defs, svg.firstChild)

  return { arrowId, arrowClosedId }
}

/**
 * Per-edge DOM bundle — one set of SVG elements for a single edge.
 */
interface EdgeBundle {
  pathEl:    SVGPathElement
  labelG:    SVGGElement
  labelBg:   SVGRectElement
  labelText: SVGTextElement
  srcDot:    SVGCircleElement
  tgtDot:    SVGCircleElement
  /** Cleanup for event listeners (reconnect pointerdown, click, context, hover) */
  cleanupListeners: () => void
}

function createEdgeBundle(
  edge: FlowEdge,
  edgesLayerEl: SVGElement,
  ctx: FlowContextValue,
): EdgeBundle {
  const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  pathEl.dataset['edgeId'] = edge.id
  pathEl.classList.add('lf-edge')
  edgesLayerEl.appendChild(pathEl)

  const labelG = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  labelG.classList.add('lf-edge-label')
  labelG.setAttribute('pointer-events', 'none')
  const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  labelBg.classList.add('lf-edge-label-bg')
  const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  labelText.classList.add('lf-edge-label-text')
  labelText.setAttribute('text-anchor', 'middle')
  labelText.setAttribute('dominant-baseline', 'middle')
  labelText.setAttribute('dy', '0.35em')
  labelG.appendChild(labelBg)
  labelG.appendChild(labelText)
  edgesLayerEl.appendChild(labelG)

  const srcDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  srcDot.setAttribute('r', '5')
  srcDot.classList.add('lf-edge-endpoint')
  srcDot.dataset['end']    = 'source'
  srcDot.dataset['edgeId'] = edge.id
  edgesLayerEl.appendChild(srcDot)

  const tgtDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  tgtDot.setAttribute('r', '5')
  tgtDot.classList.add('lf-edge-endpoint')
  tgtDot.dataset['end']    = 'target'
  tgtDot.dataset['edgeId'] = edge.id
  edgesLayerEl.appendChild(tgtDot)

  // ---- Event listeners ----
  const startReconnect = (e: PointerEvent, movingEnd: 'source' | 'target') => {
    e.stopPropagation()
    const currentEdge = ctx.edges().find(ed => ed.id === edge.id)
    if (!currentEdge) return
    const nodes    = ctx.nodes()
    const fixedEnd = movingEnd === 'source' ? 'target' : 'source'
    const fixedNodeId   = fixedEnd === 'source' ? currentEdge.source : currentEdge.target
    const fixedHandleId = fixedEnd === 'source' ? currentEdge.sourceHandle : currentEdge.targetHandle
    const movingNodeId   = movingEnd === 'source' ? currentEdge.source : currentEdge.target
    const movingHandleId = movingEnd === 'source' ? currentEdge.sourceHandle : currentEdge.targetHandle
    const fixedPt  = ctx.handleRegistry.getAbsolutePosition(fixedNodeId,  fixedHandleId,  nodes)
    const startPt  = ctx.handleRegistry.getAbsolutePosition(movingNodeId, movingHandleId, nodes)
    if (!fixedPt || !startPt) return
    ctx.stateMgr.toReconnecting(edge.id, movingEnd, fixedPt, startPt)
  }

  const onSrcDotDown = (e: PointerEvent) => startReconnect(e, 'source')
  const onTgtDotDown = (e: PointerEvent) => startReconnect(e, 'target')
  srcDot.addEventListener('pointerdown', onSrcDotDown)
  tgtDot.addEventListener('pointerdown', onTgtDotDown)

  const onPathClick = (e: MouseEvent) => {
    if (!ctx.onEdgesChange) return
    const currentEdge = ctx.edges().find(ed => ed.id === edge.id)
    if (!currentEdge) return
    if (e.shiftKey) {
      ctx.onEdgesChange([{ type: 'select', id: edge.id, selected: !(currentEdge.selected ?? false) }])
    } else {
      ctx.onEdgesChange(ctx.edges().map(ed => ({ type: 'select' as const, id: ed.id, selected: ed.id === edge.id })))
    }
  }

  const onPathContextMenu = (e: MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    const currentEdge = ctx.edges().find(ed => ed.id === edge.id)
    if (!currentEdge || !ctx.contextMenu) return
    ctx.contextMenu.showForEdge(currentEdge, e.clientX, e.clientY)
  }

  const onEdgeEnter = () => {
    const currentEdge = ctx.edges().find(ed => ed.id === edge.id)
    if (currentEdge) ctx.onEdgeMouseEnter?.(currentEdge)
  }
  const onEdgeLeave = () => {
    const currentEdge = ctx.edges().find(ed => ed.id === edge.id)
    if (currentEdge) ctx.onEdgeMouseLeave?.(currentEdge)
  }

  pathEl.addEventListener('click', onPathClick)
  pathEl.addEventListener('contextmenu', onPathContextMenu)
  pathEl.addEventListener('pointerenter', onEdgeEnter)
  pathEl.addEventListener('pointerleave', onEdgeLeave)

  const cleanupListeners = () => {
    srcDot.removeEventListener('pointerdown', onSrcDotDown)
    tgtDot.removeEventListener('pointerdown', onTgtDotDown)
    pathEl.removeEventListener('click', onPathClick)
    pathEl.removeEventListener('contextmenu', onPathContextMenu)
    pathEl.removeEventListener('pointerenter', onEdgeEnter)
    pathEl.removeEventListener('pointerleave', onEdgeLeave)
  }

  return { pathEl, labelG, labelBg, labelText, srcDot, tgtDot, cleanupListeners }
}

function removeEdgeBundle(bundle: EdgeBundle): void {
  bundle.cleanupListeners()
  bundle.pathEl.remove()
  bundle.labelG.remove()
  bundle.srcDot.remove()
  bundle.tgtDot.remove()
}

/**
 * Update geometry + visual state for one edge bundle.
 * Pure function — called from the single batched effect.
 */
function updateEdgeBundle(
  bundle: EdgeBundle,
  edge: FlowEdge,
  ctx: FlowContextValue,
  draggedNodes: ReadonlySet<string> | null,
  dragOffset: Point | null,
  arrowId: string,
  arrowClosedId: string,
): void {
  const { pathEl, labelG, labelBg, labelText, srcDot, tgtDot } = bundle
  const nodes = ctx.nodes()

  let src = ctx.handleRegistry.getAbsolutePosition(edge.source, edge.sourceHandle, nodes)
  let tgt = ctx.handleRegistry.getAbsolutePosition(edge.target, edge.targetHandle, nodes)

  if (dragOffset && draggedNodes) {
    if (src && draggedNodes.has(edge.source)) src = { x: src.x + dragOffset.x, y: src.y + dragOffset.y }
    if (tgt && draggedNodes.has(edge.target)) tgt = { x: tgt.x + dragOffset.x, y: tgt.y + dragOffset.y }
  }

  // Selection + animation
  pathEl.classList.toggle('lf-edge-selected', edge.selected ?? false)
  pathEl.classList.toggle('lf-edge--animated', edge.animated ?? false)

  // Arrow marker
  const marker = edge.markerEnd
  if (!marker || marker === 'none') {
    pathEl.removeAttribute('marker-end')
  } else if (marker === 'arrowclosed') {
    pathEl.setAttribute('marker-end', `url(#${arrowClosedId})`)
  } else {
    pathEl.setAttribute('marker-end', `url(#${arrowId})`)
  }

  // Endpoint dots
  if (src) { srcDot.setAttribute('cx', String(src.x)); srcDot.setAttribute('cy', String(src.y)) }
  if (tgt) { tgtDot.setAttribute('cx', String(tgt.x)); tgtDot.setAttribute('cy', String(tgt.y)) }

  if (!src || !tgt) {
    pathEl.removeAttribute('d')
    labelG.style.display = 'none'
    return
  }

  const pathType = ctx.connectionLineType ?? 'bezier'
  const d =
    pathType === 'step'     ? getStepPath(src, tgt)
    : pathType === 'straight' ? getStraightPath(src, tgt)
    : getBezierPath(src, tgt)
  pathEl.setAttribute('d', d)

  // Label
  const label = edge.label
  if (!label) { labelG.style.display = 'none'; return }

  labelG.style.display = ''
  labelText.textContent = label

  let mid: Point
  if (pathType === 'step')           mid = getStepMidpoint(src, tgt)
  else if (pathType === 'straight')  mid = getStraightMidpoint(src, tgt)
  else                               mid = getBezierMidpoint(src, tgt)

  labelText.setAttribute('x', String(mid.x))
  labelText.setAttribute('y', String(mid.y))

  const charW = 7; const padX = 6; const padY = 3
  const bgW = label.length * charW + padX * 2
  const bgH = 14 + padY * 2
  labelBg.setAttribute('x', String(mid.x - bgW / 2))
  labelBg.setAttribute('y', String(mid.y - bgH / 2))
  labelBg.setAttribute('width', String(bgW))
  labelBg.setAttribute('height', String(bgH))
  labelBg.setAttribute('rx', '3')
}

/**
 * createEdgeLayer — Performance-optimized SVG edge renderer.
 *
 * ## Architecture (two-level effect pattern)
 *
 * **Outer effect** — subscribes only to `ctx.edges()` (array identity/length).
 * Creates/removes DOM element bundles when edges are added or removed.
 * Does NOT subscribe to transform or handle positions.
 *
 * **Single batched inner effect** — subscribes ONCE to:
 *   - `ctx.handleRegistry.version()` (handle measurements)
 *   - `ctx.transform()` (pan/zoom)
 *   - `ctx.interactionState()` (drag offset)
 *   - `ctx.edges()` (edge data: selection, labels, markers)
 *
 * On each tick this one effect iterates all live bundles and updates their
 * geometry in a tight loop — O(edges) DOM writes per frame instead of
 * O(edges) effect firings per frame.
 *
 * ## Performance impact
 *
 * Before: 400 edges × 3 effects = ~1200 reactive subscriptions on transform.
 * After:  1 batched effect — one subscription on transform, one loop body.
 *
 * This is the dominant win for 500+ node graphs. The batched loop is
 * cache-friendly (sequential Map iteration), and the single-effect overhead
 * is constant rather than per-edge.
 */
export function createEdgeLayer(
  ctx: FlowContextValue,
  edgesLayerEl: SVGElement,
): EdgeLayerHandle {
  const { arrowId, arrowClosedId } = injectMarkerDefs(edgesLayerEl)

  // Live bundle registry: edgeId → EdgeBundle
  const bundles = new Map<string, EdgeBundle>()

  // ---- Outer effect: DOM lifecycle only ----
  // Subscribes to edges() to add/remove bundles. Does NOT subscribe to
  // transform, interactionState, or handleRegistry — those are all handled
  // by the single batched effect below.
  const outerDispose = effect(() => {
    const edges      = ctx.edges()
    const currentIds = new Set(edges.map(e => e.id))

    // Remove bundles for edges that are gone
    for (const [id, bundle] of bundles) {
      if (!currentIds.has(id)) {
        removeEdgeBundle(bundle)
        bundles.delete(id)
      }
    }

    // Create bundles for new edges
    for (const edge of edges) {
      if (!bundles.has(edge.id)) {
        bundles.set(edge.id, createEdgeBundle(edge, edgesLayerEl, ctx))
      }
    }
  })

  // ---- Single batched inner effect: geometry + visuals for all edges ----
  // One subscription on each reactive source, one loop over all bundles.
  const innerDispose = effect(() => {
    // Subscribe to all reactive sources ONCE
    ctx.handleRegistry.version()
    ctx.transform()          // pan/zoom changes require path recalculation
    const istate     = ctx.interactionState()
    const dragOffset = istate.type === 'dragging' ? istate.localOffset() : null
    const draggedNodes: ReadonlySet<string> | null =
      istate.type === 'dragging' ? istate.draggedNodes : null

    // Read current edge data (selection, label, marker, etc.)
    const edgeMap = new Map(ctx.edges().map(e => [e.id, e]))

    // Single loop — update every live bundle
    for (const [id, bundle] of bundles) {
      const edge = edgeMap.get(id)
      if (!edge) continue
      updateEdgeBundle(bundle, edge, ctx, draggedNodes, dragOffset, arrowId, arrowClosedId)
    }
  })

  return {
    dispose: () => {
      outerDispose()
      innerDispose()
      for (const bundle of bundles.values()) {
        removeEdgeBundle(bundle)
      }
      bundles.clear()
    },
  }
}
