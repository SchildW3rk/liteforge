import type { FlowNode, FlowEdge, NodeChange, EdgeChange } from '../types.js'

/**
 * Apply a list of NodeChanges to a nodes array, returning a new array.
 * Nodes not referenced in any change pass through unchanged.
 *
 * Change semantics:
 *  - `position` — update position (parent-relative for child nodes)
 *  - `select`   — toggle selected flag
 *  - `remove`   — remove from array (also removes all children recursively)
 *  - `data`     — replace data payload
 *  - `resize`   — set explicit width/height
 *  - `add`      — append a new node
 */
export function applyNodeChanges<T>(
  changes: NodeChange[],
  nodes: FlowNode<T>[],
): FlowNode<T>[] {
  if (changes.length === 0) return nodes

  // Collect 'add' changes separately — they append to the result
  const toAdd: FlowNode<T>[] = []

  // Build a lookup for non-add changes by node id
  const byId = new Map<string, NodeChange>()
  for (const change of changes) {
    if (change.type === 'add') {
      toAdd.push(change.node as FlowNode<T>)
    } else {
      byId.set(change.id, change)
    }
  }

  // Collect ids to remove (including children of removed parents)
  const removeIds = new Set<string>()
  for (const change of changes) {
    if (change.type === 'remove') {
      collectDescendantIds(change.id, nodes, removeIds)
    }
  }

  const result: FlowNode<T>[] = []
  for (const node of nodes) {
    if (removeIds.has(node.id)) continue

    const change = byId.get(node.id)
    if (!change) {
      result.push(node)
      continue
    }
    if (change.type === 'position') {
      result.push({ ...node, position: change.position })
    } else if (change.type === 'select') {
      result.push({ ...node, selected: change.selected })
    } else if (change.type === 'data') {
      result.push({ ...node, data: change.data as T })
    } else if (change.type === 'resize') {
      result.push({ ...node, width: change.width, height: change.height })
    } else {
      result.push(node)
    }
  }

  return toAdd.length > 0 ? [...result, ...toAdd] : result
}

/** Collect nodeId and all direct/indirect children into the given Set. */
function collectDescendantIds<T>(
  rootId: string,
  nodes: FlowNode<T>[],
  out: Set<string>,
): void {
  out.add(rootId)
  for (const node of nodes) {
    if (node.parentId === rootId && !out.has(node.id)) {
      collectDescendantIds(node.id, nodes, out)
    }
  }
}

/**
 * Apply a list of EdgeChanges to an edges array, returning a new array.
 * Edges not referenced in any change pass through unchanged.
 */
export function applyEdgeChanges<T>(
  changes: EdgeChange[],
  edges: FlowEdge<T>[],
): FlowEdge<T>[] {
  if (changes.length === 0) return edges

  const byId = new Map<string, EdgeChange>()
  for (const change of changes) {
    byId.set(change.id, change)
  }

  const result: FlowEdge<T>[] = []
  for (const edge of edges) {
    const change = byId.get(edge.id)
    if (!change) {
      result.push(edge)
      continue
    }
    if (change.type === 'remove') {
      // omit
      continue
    }
    if (change.type === 'select') {
      result.push({ ...edge, selected: change.selected })
    } else if (change.type === 'waypoints') {
      result.push({ ...edge, waypoints: change.waypoints.length > 0 ? change.waypoints : undefined })
    } else {
      result.push(edge)
    }
  }
  return result
}
