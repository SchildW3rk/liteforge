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
} from './types.js'
import type { HandleRegistry } from './registry/handle-registry.js'
import type { InteractionStateManager } from './state.js'

export const FLOW_CONTEXT_KEY = '__lf_flow'

export interface FlowContextValue {
  nodes:               () => FlowNode[]
  edges:               () => FlowEdge[]
  getNode:             (id: string) => FlowNode | undefined
  getEdge:             (id: string) => FlowEdge | undefined
  getNodes:            () => FlowNode[]
  getEdges:            () => FlowEdge[]
  transform:           Signal<Transform>
  interactionState:    Signal<InteractionState>
  stateMgr:            InteractionStateManager
  handleRegistry:      HandleRegistry
  onNodesChange:       ((changes: NodeChange[]) => void) | undefined
  onEdgesChange:       ((changes: EdgeChange[]) => void) | undefined
  onConnect:           ((connection: Connection) => void) | undefined
  isValidConnection:   ((conn: Connection) => boolean) | undefined
  nodeTypes:           Record<string, (node: FlowNode) => Node>
  edgeTypes:           Record<string, (edge: FlowEdge, src: Point, tgt: Point, sp: HandlePosition, tp: HandlePosition) => string> | undefined
  connectionLineType:  'bezier' | 'step' | 'straight'
  registerNodeSize:    (nodeId: string, width: number, height: number) => void
  getNodeSize:         (nodeId: string) => { width: number; height: number } | undefined
  interactionStateManager: InteractionStateManager
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
