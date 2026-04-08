import type { FlowNode, FlowEdge, NodeChange, Point } from '../types.js'

export type LayoutDirection = 'LR' | 'TB' | 'RL' | 'BT'

export interface AutoLayoutOptions {
  /**
   * Layout direction.
   * - 'LR' = left to right (default)
   * - 'TB' = top to bottom
   * - 'RL' = right to left
   * - 'BT' = bottom to top
   */
  direction?: LayoutDirection
  /**
   * Default node width (used when actual size is unknown).
   * @default 160
   */
  nodeWidth?: number
  /**
   * Default node height (used when actual size is unknown).
   * @default 60
   */
  nodeHeight?: number
  /**
   * Gap between nodes in the same rank (along the secondary axis).
   * @default 40
   */
  nodeSpacing?: number
  /**
   * Gap between ranks (along the primary axis).
   * @default 80
   */
  rankSpacing?: number
  /**
   * Custom size resolver. When provided, called for each node instead
   * of using nodeWidth/nodeHeight defaults.
   */
  getNodeSize?: (node: FlowNode) => { width: number; height: number }
}

export interface AutoLayoutResult {
  /**
   * Apply layout to the given nodes and edges.
   * Returns a NodeChange[] with type:'position' for every node.
   * Pass the result directly to onNodesChange().
   *
   * @example
   * const changes = layout(nodes, edges)
   * onNodesChange(changes)
   */
  layout: (nodes: FlowNode[], edges: FlowEdge[]) => NodeChange[]

  /**
   * Compute new positions without producing NodeChange objects.
   * Useful when you want to inspect positions before committing.
   */
  computePositions: (nodes: FlowNode[], edges: FlowEdge[]) => Map<string, Point>
}

/**
 * createAutoLayout — fully-controlled layout composable.
 *
 * Uses a Sugiyama-inspired algorithm:
 *   1. Build adjacency from edges
 *   2. Topological sort (Kahn's algorithm) — handles cycles via fallback
 *   3. Assign ranks (layers) based on longest path from source
 *   4. Within each rank, order nodes by their first-appearance index
 *   5. Compute (x, y) from rank × (nodeSize + rankSpacing) and
 *      position-in-rank × (nodeSize + nodeSpacing)
 *
 * No external dependencies. Zero bundle cost beyond this file.
 *
 * @example
 * ```ts
 * const autoLayout = createAutoLayout({ direction: 'LR', nodeSpacing: 40 })
 *
 * // Apply layout:
 * onNodesChange(autoLayout.layout(nodes, edges))
 * ```
 */
export function createAutoLayout(options: AutoLayoutOptions = {}): AutoLayoutResult {
  const direction   = options.direction   ?? 'LR'
  const nodeWidth   = options.nodeWidth   ?? 160
  const nodeHeight  = options.nodeHeight  ?? 60
  const nodeSpacing = options.nodeSpacing ?? 40
  const rankSpacing = options.rankSpacing ?? 80
  const getSize     = options.getNodeSize
    ?? (() => ({ width: nodeWidth, height: nodeHeight }))

  function computePositions(nodes: FlowNode[], edges: FlowEdge[]): Map<string, Point> {
    if (nodes.length === 0) return new Map()

    const nodeIds = new Set(nodes.map(n => n.id))

    // ---- Build adjacency (only consider edges between known nodes) ----
    const outEdges = new Map<string, string[]>()   // source → [target]
    const inDegree = new Map<string, number>()

    for (const n of nodes) {
      outEdges.set(n.id, [])
      inDegree.set(n.id, 0)
    }

    for (const e of edges) {
      if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue
      if (e.source === e.target) continue  // self-loops ignored
      outEdges.get(e.source)!.push(e.target)
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
    }

    // ---- Kahn's topological sort ----
    const sorted: string[] = []
    const queue: string[] = []
    const degCopy = new Map(inDegree)

    for (const [id, deg] of degCopy) {
      if (deg === 0) queue.push(id)
    }

    // Stable sort: process nodes in their original array order
    queue.sort((a, b) => nodes.findIndex(n => n.id === a) - nodes.findIndex(n => n.id === b))

    while (queue.length > 0) {
      const id = queue.shift()!
      sorted.push(id)
      const children = outEdges.get(id) ?? []
      const toAdd: string[] = []
      for (const child of children) {
        const newDeg = (degCopy.get(child) ?? 1) - 1
        degCopy.set(child, newDeg)
        if (newDeg === 0) toAdd.push(child)
      }
      // Stable: sort by original index before pushing
      toAdd.sort((a, b) => nodes.findIndex(n => n.id === a) - nodes.findIndex(n => n.id === b))
      queue.push(...toAdd)
    }

    // Nodes not reached (in cycles) — append in original order
    const notSorted = nodes.filter(n => !sorted.includes(n.id)).map(n => n.id)
    sorted.push(...notSorted)

    // ---- Assign ranks (longest path from any root) ----
    const rank = new Map<string, number>()
    for (const id of sorted) {
      const r = rank.get(id) ?? 0
      rank.set(id, r)
      for (const child of (outEdges.get(id) ?? [])) {
        const childRank = rank.get(child) ?? 0
        if (r + 1 > childRank) rank.set(child, r + 1)
      }
    }

    // ---- Group nodes by rank ----
    const maxRank = Math.max(...Array.from(rank.values()))
    const rankGroups: string[][] = Array.from({ length: maxRank + 1 }, () => [])
    for (const id of sorted) {
      rankGroups[rank.get(id)!]!.push(id)
    }

    // ---- Compute positions ----
    const positions = new Map<string, Point>()

    // Track the maximum size in each rank for rank-axis placement
    const rankMainSize: number[] = rankGroups.map(group =>
      Math.max(...group.map(id => {
        const node = nodes.find(n => n.id === id)!
        const size = getSize(node)
        return isMainAxis(direction) ? size.width : size.height
      }))
    )

    // Cumulative offset along the main axis
    const rankOffset: number[] = []
    let cumulative = 0
    for (let r = 0; r <= maxRank; r++) {
      rankOffset[r] = cumulative
      cumulative += rankMainSize[r]! + rankSpacing
    }

    for (let r = 0; r <= maxRank; r++) {
      const group = rankGroups[r]!
      let crossOffset = 0

      for (const id of group) {
        const node = nodes.find(n => n.id === id)!
        const size = getSize(node)
        const main  = rankOffset[r]!
        const cross = crossOffset

        positions.set(id, toPoint(direction, main, cross))
        crossOffset += crossSize(direction, size) + nodeSpacing
      }
    }

    return positions
  }

  function layout(nodes: FlowNode[], edges: FlowEdge[]): NodeChange[] {
    const positions = computePositions(nodes, edges)
    const changes: NodeChange[] = []
    for (const [id, position] of positions) {
      changes.push({ type: 'position', id, position })
    }
    return changes
  }

  return { layout, computePositions }
}

// ---- helpers ----

function isMainAxis(dir: LayoutDirection): boolean {
  return dir === 'LR' || dir === 'RL'
}

function crossSize(dir: LayoutDirection, size: { width: number; height: number }): number {
  return (dir === 'LR' || dir === 'RL') ? size.height : size.width
}

function toPoint(dir: LayoutDirection, main: number, cross: number): Point {
  switch (dir) {
    case 'LR': return { x: main,   y: cross }
    case 'RL': return { x: -main,  y: cross }
    case 'TB': return { x: cross,  y: main  }
    case 'BT': return { x: cross,  y: -main }
  }
}
