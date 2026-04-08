import { pushContext, popContext, use } from '@liteforge/runtime'
import type { Signal } from '@liteforge/core'
import type {
  FlowNode,
  FlowEdge,
  Transform,
  NodeChange,
  EdgeChange,
  Connection,
  InteractionState,
  HandleType,
  Point,
  FlowOptions,
  HandlePosition,
  NodeContextMenuItem,
  EdgeContextMenuItem,
  PaneContextMenuItem,
} from './types.js'
import type { HandleRegistry } from './registry/handle-registry.js'
import type { InteractionStateManager } from './state.js'
import type { ContextMenuHandle } from './components/ContextMenu.js'

export const FLOW_CONTEXT_KEY = '__lf_flow'

export interface FlowContextValue {
  nodes:               () => FlowNode[]
  edges:               () => FlowEdge[]
  getNode:             (id: string) => FlowNode | undefined
  getEdge:             (id: string) => FlowEdge | undefined
  getNodes:            () => FlowNode[]
  getEdges:            () => FlowEdge[]
  /** Returns all direct children of the given node id. */
  getChildren:         (parentId: string) => FlowNode[]
  /**
   * Returns the absolute canvas position of a node (summing parent chain).
   * For root nodes this equals `node.position`.
   */
  getAbsolutePosition: (nodeId: string) => Point
  transform:           Signal<Transform>
  getRootRect:         () => DOMRect
  interactionState:    Signal<InteractionState>
  stateMgr:            InteractionStateManager
  handleRegistry:      HandleRegistry
  onNodesChange:       ((changes: NodeChange[]) => void) | undefined
  onEdgesChange:       ((changes: EdgeChange[]) => void) | undefined
  onConnect:           ((connection: Connection) => void) | undefined
  onNodeMouseEnter:    ((node: FlowNode) => void) | undefined
  onNodeMouseLeave:    ((node: FlowNode) => void) | undefined
  onEdgeMouseEnter:    ((edge: FlowEdge) => void) | undefined
  onEdgeMouseLeave:    ((edge: FlowEdge) => void) | undefined
  isValidConnection:   ((conn: Connection) => boolean) | undefined
  nodeTypes:           Record<string, (node: FlowNode) => Node>
  edgeTypes:           Record<string, (edge: FlowEdge, src: Point, tgt: Point, sp: HandlePosition, tp: HandlePosition) => string> | undefined
  connectionLineType:  'bezier' | 'step' | 'straight'
  registerNodeSize:    (nodeId: string, width: number, height: number) => void
  getNodeSize:         (nodeId: string) => { width: number; height: number } | undefined
  nodeSizeVersion:     Signal<number>
  interactionStateManager: InteractionStateManager
  snapToGrid:          [number, number] | undefined
  /** Context menu item definitions — set from FlowCanvasProps. */
  nodeContextMenu:     NodeContextMenuItem[] | undefined
  edgeContextMenu:     EdgeContextMenuItem[] | undefined
  paneContextMenu:     PaneContextMenuItem[] | undefined
  /** The live context menu DOM handle — assigned after ctx is built. */
  contextMenu?:        ContextMenuHandle
}

// Extend PluginRegistry via declaration merging so `use()` is typed
declare module '@liteforge/runtime' {
  interface PluginRegistry {
    [key: string]: unknown
  }
}

export function pushFlowContext(ctx: FlowContextValue): void {
  pushContext({ [FLOW_CONTEXT_KEY]: ctx })
}

export function popFlowContext(): void {
  popContext()
}

export function getFlowContext(): FlowContextValue {
  return use<FlowContextValue>(FLOW_CONTEXT_KEY)
}

// Re-export for convenience
export type { HandleType, FlowOptions }
