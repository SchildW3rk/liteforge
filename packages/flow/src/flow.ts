import type {
  FlowOptions, FlowHandle, FlowInternals, FlowNode, FlowEdge,
  Rect, Transform, Viewport, ViewportAnimationOptions,
} from './types.js'
import { rectsOverlap } from './geometry/aabb.js'

const ZOOM_STEP = 1.2

export function createFlow(options: FlowOptions): FlowHandle {
  let internals: FlowInternals | null = null

  // ---- Animation helpers ----

  /**
   * Smoothly animate the transform from `from` to `to` over `duration` ms.
   * Uses requestAnimationFrame; resolves when complete.
   * If duration is 0 (or no internals), applies immediately.
   */
  function animateTransform(to: Transform, duration: number): void {
    if (!internals) return
    if (duration <= 0) {
      internals.setTransform(to)
      return
    }
    const from    = internals.getTransform()
    const start   = performance.now()

    function step(now: number) {
      if (!internals) return
      const elapsed = now - start
      const t       = Math.min(elapsed / duration, 1)
      const ease    = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t // ease-in-out quad

      internals.setTransform({
        x:     from.x     + (to.x     - from.x)     * ease,
        y:     from.y     + (to.y     - from.y)     * ease,
        scale: from.scale + (to.scale - from.scale) * ease,
      })

      if (t < 1) requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  }

  /**
   * Compute the transform that zooms to `newScale` keeping the viewport center fixed.
   */
  function zoomAroundCenter(newScale: number): Transform {
    if (!internals) return { x: 0, y: 0, scale: newScale }
    const { width, height } = internals.getRootSize()
    const current = internals.getTransform()
    const cx = width  / 2
    const cy = height / 2
    const clamped = Math.min(internals.maxZoom, Math.max(internals.minZoom, newScale))
    const ratio   = clamped / current.scale
    return {
      x:     cx - (cx - current.x) * ratio,
      y:     cy - (cy - current.y) * ratio,
      scale: clamped,
    }
  }

  // ---- Node bounding box ----

  function getNodeRect(node: FlowNode): Rect {
    const size = internals?.getNodeSize(node.id)
    return {
      x:      node.position.x,
      y:      node.position.y,
      width:  node.width  ?? size?.width  ?? 0,
      height: node.height ?? size?.height ?? 0,
    }
  }

  // ---- Public API ----

  const handle: FlowHandle = {
    options: Object.freeze({ ...options }),

    // ---- Viewport ----

    getViewport(): Viewport {
      if (!internals) return { x: 0, y: 0, zoom: 1 }
      const { x, y, scale } = internals.getTransform()
      return { x, y, zoom: scale }
    },

    setViewport(viewport: Viewport, opts?: ViewportAnimationOptions): void {
      if (!internals) return
      const { x, y, zoom } = viewport
      const clamped = Math.min(internals.maxZoom, Math.max(internals.minZoom, zoom))
      animateTransform({ x, y, scale: clamped }, opts?.duration ?? 0)
    },

    zoomTo(zoom: number, opts?: ViewportAnimationOptions): void {
      if (!internals) return
      const target = zoomAroundCenter(zoom)
      animateTransform(target, opts?.duration ?? 0)
    },

    zoomIn(opts?: ViewportAnimationOptions): void {
      if (!internals) return
      const current = internals.getTransform()
      handle.zoomTo(current.scale * ZOOM_STEP, opts)
    },

    zoomOut(opts?: ViewportAnimationOptions): void {
      if (!internals) return
      const current = internals.getTransform()
      handle.zoomTo(current.scale / ZOOM_STEP, opts)
    },

    fitBounds(bounds: Rect, opts?: ViewportAnimationOptions & { padding?: number }): void {
      if (!internals) return
      const { width, height } = internals.getRootSize()
      const padding = opts?.padding ?? 40

      const padded = {
        x:      bounds.x - padding,
        y:      bounds.y - padding,
        width:  bounds.width  + padding * 2,
        height: bounds.height + padding * 2,
      }

      const w = padded.width  > 0 ? padded.width  : 1
      const h = padded.height > 0 ? padded.height : 1

      const rawScale   = Math.min(width / w, height / h)
      const newScale   = Math.min(internals.maxZoom, Math.max(internals.minZoom, rawScale))
      const newX       = width  / 2 - (padded.x + padded.width  / 2) * newScale
      const newY       = height / 2 - (padded.y + padded.height / 2) * newScale

      animateTransform({ x: newX, y: newY, scale: newScale }, opts?.duration ?? 0)
    },

    // ---- Graph queries ----

    getNode(id: string): FlowNode | undefined {
      return internals?.getNodes().find(n => n.id === id)
    },

    getEdge(id: string): FlowEdge | undefined {
      return internals?.getEdges().find(e => e.id === id)
    },

    getIntersectingNodes(node: FlowNode): FlowNode[] {
      if (!internals) return []
      const a = getNodeRect(node)
      return internals.getNodes().filter(n => {
        if (n.id === node.id) return false
        return rectsOverlap(a, getNodeRect(n))
      })
    },

    isNodeIntersecting(node: FlowNode, area: Rect): boolean {
      return rectsOverlap(getNodeRect(node), area)
    },

    setEdgeActive(edgeId: string, active: boolean): void {
      internals?.setEdgeActive(edgeId, active)
    },

    // ---- Internal wiring ----

    _register(i: FlowInternals): void {
      internals = i
    },
  }

  return handle
}
