import type { Signal } from '@liteforge/core'
import type { FlowNode, FlowEdge } from '../types.js'

export interface FlowClipboardOptions {
  /**
   * Offset applied to pasted node positions so copies don't land
   * exactly on top of their originals.
   * @default { x: 20, y: 20 }
   */
  pasteOffset?: { x: number; y: number }
  /**
   * Custom ID generator for pasted nodes/edges.
   * Receives the original ID and must return a unique new ID.
   * @default (id) => `${id}-copy-${Date.now()}`
   */
  generateId?: (originalId: string) => string
}

export interface FlowClipboardResult {
  /**
   * Copy all currently-selected nodes (and edges between them) to the
   * internal clipboard. No-op if nothing is selected.
   */
  copy: () => void
  /**
   * Paste the clipboard contents into the graph with fresh IDs and a
   * position offset. Calls `onNodesChange` / `onEdgesChange` style
   * additions directly on the signals.
   *
   * Returns the IDs of the pasted nodes, or `[]` if clipboard is empty.
   */
  paste: () => string[]
  /**
   * True when the clipboard holds at least one node.
   */
  readonly hasContent: boolean
  /**
   * Attach Ctrl+C / Ctrl+V keyboard listeners to a target (default: document).
   * Returns a cleanup function to remove the listeners.
   */
  attachKeyboard: (target?: EventTarget) => () => void
}

interface ClipboardSnapshot {
  nodes: FlowNode[]
  /** Only edges where both source and target are in the copied node set. */
  edges: FlowEdge[]
}

/**
 * createFlowClipboard — copy/paste composable for @liteforge/flow.
 *
 * Fully user-space: reads your node/edge signals, writes back via direct
 * signal updates. The framework itself stays stateless.
 *
 * @example
 * ```ts
 * const nodes = signal<FlowNode[]>([...])
 * const edges = signal<FlowEdge[]>([...])
 * const clipboard = createFlowClipboard(nodes, edges)
 *
 * // Wire keyboard shortcuts (Ctrl+C / Ctrl+V):
 * clipboard.attachKeyboard()
 *
 * // Or wire to toolbar buttons:
 * copyBtn.addEventListener('click', () => clipboard.copy())
 * pasteBtn.addEventListener('click', () => clipboard.paste())
 * ```
 */
export function createFlowClipboard(
  nodes: Signal<FlowNode[]>,
  edges: Signal<FlowEdge[]>,
  options: FlowClipboardOptions = {},
): FlowClipboardResult {
  const offset   = options.pasteOffset  ?? { x: 20, y: 20 }
  const makeId   = options.generateId   ?? ((id: string) => `${id}-copy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)

  let clipboard: ClipboardSnapshot | null = null

  const copy = (): void => {
    const currentNodes = nodes.peek()
    const selectedNodes = currentNodes.filter(n => n.selected)
    if (selectedNodes.length === 0) return

    const selectedIds = new Set(selectedNodes.map(n => n.id))

    // Only copy edges where both endpoints are in the selection
    const selectedEdges = edges.peek().filter(
      e => selectedIds.has(e.source) && selectedIds.has(e.target),
    )

    clipboard = {
      nodes: selectedNodes,
      edges: selectedEdges,
    }
  }

  const paste = (): string[] => {
    if (!clipboard || clipboard.nodes.length === 0) return []

    // Build old→new ID map for nodes
    const idMap = new Map<string, string>()
    for (const node of clipboard.nodes) {
      idMap.set(node.id, makeId(node.id))
    }

    // Clone nodes with new IDs and offset positions
    const pastedNodes: FlowNode[] = clipboard.nodes.map(node => ({
      ...node,
      id:       idMap.get(node.id)!,
      position: {
        x: node.position.x + offset.x,
        y: node.position.y + offset.y,
      },
      selected: true,   // pasted nodes come in selected
    }))

    // Clone edges with remapped source/target IDs
    const pastedEdges: FlowEdge[] = clipboard.edges.map(edge => ({
      ...edge,
      id:     makeId(edge.id),
      source: idMap.get(edge.source)!,
      target: idMap.get(edge.target)!,
    }))

    // Deselect existing nodes, then append pasted ones
    nodes.set([
      ...nodes.peek().map(n => n.selected ? { ...n, selected: false } : n),
      ...pastedNodes,
    ])
    if (pastedEdges.length > 0) {
      edges.set([...edges.peek(), ...pastedEdges])
    }

    return pastedNodes.map(n => n.id)
  }

  const attachKeyboard = (target: EventTarget = document): (() => void) => {
    const handler = (e: Event) => {
      const ke = e as KeyboardEvent
      if (!ke.ctrlKey && !ke.metaKey) return
      const tag = (ke.target as Element | null)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return

      if (ke.key === 'c') {
        e.preventDefault()
        copy()
      } else if (ke.key === 'v') {
        e.preventDefault()
        paste()
      }
    }
    target.addEventListener('keydown', handler)
    return () => target.removeEventListener('keydown', handler)
  }

  return {
    copy,
    paste,
    get hasContent() { return clipboard !== null && clipboard.nodes.length > 0 },
    attachKeyboard,
  }
}
