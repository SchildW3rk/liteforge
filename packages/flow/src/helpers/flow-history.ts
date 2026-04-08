import { signal, computed } from '@liteforge/core'
import type { Signal } from '@liteforge/core'
import { applyNodeChanges, applyEdgeChanges } from './apply-changes.js'
import type { FlowNode, FlowEdge, NodeChange, EdgeChange, Connection } from '../types.js'

export interface FlowHistorySnapshot {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export interface FlowHistoryOptions {
  /**
   * Maximum number of history entries to retain.
   * @default 100
   */
  maxHistory?: number
}

export interface FlowHistoryResult {
  /** Wrapped onNodesChange — apply + snapshot structural changes */
  onNodesChange: (changes: NodeChange[]) => void
  /** Wrapped onEdgesChange — apply + snapshot structural changes */
  onEdgesChange: (changes: EdgeChange[]) => void
  /** Wrapped onConnect — apply + snapshot */
  onConnect: (connection: Connection) => void
  /** Revert to previous snapshot */
  undo: () => void
  /** Re-apply previously undone snapshot */
  redo: () => void
  /** True when there is at least one entry in the undo stack */
  canUndo: Signal<boolean>
  /** True when there is at least one entry in the redo stack */
  canRedo: Signal<boolean>
  /**
   * Attach keyboard listeners to a target element (or document).
   * Returns a cleanup function to remove the listeners.
   * Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo.
   */
  attachKeyboard: (target?: EventTarget) => () => void
}

/** Changes that mutate graph structure and should be pushed to the undo stack. */
function isStructural(change: NodeChange | EdgeChange): boolean {
  return change.type === 'position' || change.type === 'remove' || change.type === 'data'
}

/**
 * createFlowHistory wraps a pair of node/edge Signals and returns
 * change handlers + undo/redo API.
 *
 * This keeps @liteforge/flow fully-controlled: the framework itself
 * never stores state. History lives entirely in user-space.
 *
 * @example
 * ```ts
 * const nodes = signal<FlowNode[]>([...])
 * const edges = signal<FlowEdge[]>([...])
 * const history = createFlowHistory(nodes, edges)
 *
 * FlowCanvas({
 *   flow,
 *   nodes,
 *   edges,
 *   onNodesChange: history.onNodesChange,
 *   onEdgesChange: history.onEdgesChange,
 *   onConnect:     history.onConnect,
 * })
 *
 * // Ctrl+Z / Ctrl+Y wired automatically:
 * history.attachKeyboard()
 * ```
 */
export function createFlowHistory(
  nodes: Signal<FlowNode[]>,
  edges: Signal<FlowEdge[]>,
  options: FlowHistoryOptions = {},
): FlowHistoryResult {
  const maxHistory = options.maxHistory ?? 100

  // Each entry is the state BEFORE a mutation — popping it restores that state.
  const undoStack: FlowHistorySnapshot[] = []
  const redoStack: FlowHistorySnapshot[] = []

  // Reactive signals so UI can bind canUndo/canRedo
  const _canUndo = signal(false)
  const _canRedo = signal(false)

  function syncFlags() {
    _canUndo.set(undoStack.length > 0)
    _canRedo.set(redoStack.length > 0)
  }

  function pushUndo() {
    undoStack.push({ nodes: nodes.peek(), edges: edges.peek() })
    if (undoStack.length > maxHistory) undoStack.shift()
    redoStack.length = 0   // any new action clears redo
    syncFlags()
  }

  const onNodesChange = (changes: NodeChange[]) => {
    // Snapshot only when a structural change is present
    if (changes.some(isStructural)) pushUndo()
    nodes.set(applyNodeChanges(changes, nodes.peek()))
  }

  const onEdgesChange = (changes: EdgeChange[]) => {
    if (changes.some(isStructural)) pushUndo()
    edges.set(applyEdgeChanges(changes, edges.peek()))
  }

  const onConnect = (connection: Connection) => {
    pushUndo()
    const id = `${connection.source}-${connection.sourceHandle}--${connection.target}-${connection.targetHandle}`
    edges.set([
      ...edges.peek(),
      {
        id,
        source:       connection.source,
        sourceHandle: connection.sourceHandle,
        target:       connection.target,
        targetHandle: connection.targetHandle,
      },
    ])
  }

  const undo = () => {
    const snapshot = undoStack.pop()
    if (!snapshot) return
    redoStack.push({ nodes: nodes.peek(), edges: edges.peek() })
    nodes.set(snapshot.nodes)
    edges.set(snapshot.edges)
    syncFlags()
  }

  const redo = () => {
    const snapshot = redoStack.pop()
    if (!snapshot) return
    undoStack.push({ nodes: nodes.peek(), edges: edges.peek() })
    nodes.set(snapshot.nodes)
    edges.set(snapshot.edges)
    syncFlags()
  }

  const attachKeyboard = (target: EventTarget = document): (() => void) => {
    const handler = (e: Event) => {
      const ke = e as KeyboardEvent
      if (!ke.ctrlKey && !ke.metaKey) return
      const tag = (ke.target as Element | null)?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea') return

      if (ke.key === 'z' && !ke.shiftKey) {
        e.preventDefault()
        undo()
      } else if (ke.key === 'y' || (ke.key === 'z' && ke.shiftKey)) {
        e.preventDefault()
        redo()
      }
    }
    target.addEventListener('keydown', handler)
    return () => target.removeEventListener('keydown', handler)
  }

  return {
    onNodesChange,
    onEdgesChange,
    onConnect,
    undo,
    redo,
    canUndo: computed(() => _canUndo()),
    canRedo: computed(() => _canRedo()),
    attachKeyboard,
  }
}
