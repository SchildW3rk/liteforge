import type { Signal } from '@liteforge/core'

export interface Point     { x: number; y: number }
export interface Rect      { x: number; y: number; width: number; height: number }
export interface Transform { x: number; y: number; scale: number }

export interface FlowNode<T = unknown> {
  id: string
  type: string
  position: Point
  data: T
  selected?: boolean
  dragging?: boolean
}

export interface FlowEdge<T = unknown> {
  id: string
  source: string
  sourceHandle: string
  target: string
  targetHandle: string
  type?: string
  data?: T
  selected?: boolean
}

export interface Connection {
  source: string
  sourceHandle: string
  target: string
  targetHandle: string
}

export type NodeChange =
  | { type: 'position'; id: string; position: Point }
  | { type: 'select';   id: string; selected: boolean }
  | { type: 'remove';   id: string }

export type EdgeChange =
  | { type: 'select'; id: string; selected: boolean }
  | { type: 'remove'; id: string }

export type HandlePosition = 'top' | 'right' | 'bottom' | 'left'
export type HandleType     = 'source' | 'target'

export type NodeComponentFn<T = unknown> = (node: FlowNode<T>) => Node
export type EdgeComponentFn<T = unknown> = (
  edge: FlowEdge<T>,
  source: Point,
  target: Point,
  sourcePosition: HandlePosition,
  targetPosition: HandlePosition,
) => string

export interface FlowOptions {
  nodeTypes:           Record<string, NodeComponentFn>
  edgeTypes?:          Record<string, EdgeComponentFn>
  connectionLineType?: 'bezier' | 'step' | 'straight'
  isValidConnection?:  (conn: Connection) => boolean
  unstyled?:           boolean
}

export interface FlowHandle {
  readonly options: Readonly<FlowOptions>
}

export interface FlowCanvasProps {
  flow:             FlowHandle
  nodes:            () => FlowNode[]
  edges:            () => FlowEdge[]
  onNodesChange?:   (changes: NodeChange[]) => void
  onEdgesChange?:   (changes: EdgeChange[]) => void
  onConnect?:       (connection: Connection) => void
  minZoom?:         number
  maxZoom?:         number
  defaultViewport?: Transform
}

// Interaction State Machine
export interface IdleState      { type: 'idle' }
export interface DraggingState  {
  type: 'dragging'
  nodeId: string
  /** All node IDs moving together (always includes nodeId). Size > 1 = group drag. */
  draggedNodes: ReadonlySet<string>
  pointerId: number
  startCanvasPoint: Point
  startPosition: Point
  localOffset: Signal<Point>
}
export interface ConnectingState {
  type: 'connecting'
  sourceNodeId:     string
  sourceHandleId:   string
  sourceHandleType: HandleType
  sourcePoint:      Point
  currentPoint:     Signal<Point>
}
export interface SelectingState {
  type: 'selecting'
  startCanvasPoint:    Point
  currentCanvasPoint:  Signal<Point>
  pointerId:           number
}

export type InteractionState =
  | IdleState
  | DraggingState
  | ConnectingState
  | SelectingState
