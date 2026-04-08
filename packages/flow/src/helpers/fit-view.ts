import type { FlowNode, FitViewOptions, Transform } from '../types.js'

// FitViewOptions is defined in types.ts and re-exported from index.ts
export type { FitViewOptions }

/**
 * Compute the transform that fits all nodes into the viewport.
 * Returns identity transform if there are no nodes.
 *
 * @param getAbsolutePosition Optional resolver for absolute canvas positions.
 *   When provided, it is called for each node instead of using node.position directly.
 *   Required for correct behaviour when nodes have a parentId (their position is
 *   parent-relative, not canvas-absolute).
 */
export function computeFitView(
  nodes: FlowNode[],
  viewportWidth: number,
  viewportHeight: number,
  options?: FitViewOptions,
  getAbsolutePosition?: (nodeId: string) => { x: number; y: number },
): Transform {
  if (nodes.length === 0) return { x: 0, y: 0, scale: 1 }

  const padding = options?.padding ?? 40

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const node of nodes) {
    const pos = getAbsolutePosition ? getAbsolutePosition(node.id) : node.position
    if (pos.x < minX) minX = pos.x
    if (pos.y < minY) minY = pos.y
    if (pos.x > maxX) maxX = pos.x
    if (pos.y > maxY) maxY = pos.y
  }

  const bbox = {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  }

  // Guard against degenerate cases (single node → zero bbox dimensions)
  const bboxW = bbox.width  > 0 ? bbox.width  : 1
  const bboxH = bbox.height > 0 ? bbox.height : 1

  const scaleX = viewportWidth  / bboxW
  const scaleY = viewportHeight / bboxH
  let scale = Math.min(scaleX, scaleY, options?.maxScale ?? 1.5)
  scale = Math.max(scale, options?.minScale ?? 0.1)

  const x = viewportWidth  / 2 - (bbox.x + bbox.width  / 2) * scale
  const y = viewportHeight / 2 - (bbox.y + bbox.height / 2) * scale

  return { x, y, scale }
}
