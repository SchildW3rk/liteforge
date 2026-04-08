import type { Signal } from '@liteforge/core'

export interface FitViewOptions {
  padding?:  number
  minScale?: number
  maxScale?: number
}

export interface Point     { x: number; y: number }
export interface Rect      { x: number; y: number; width: number; height: number }
export interface Transform { x: number; y: number; scale: number }

export interface FlowNode<T = unknown> {
  id: string
  type: string
  /**
   * Position in canvas units.
   * - For root nodes (no parentId): absolute canvas position.
   * - For child nodes (parentId set): position relative to the parent node's top-left corner.
   */
  position: Point
  data: T
  selected?: boolean
  dragging?: boolean
  /** Explicit width in canvas units. When set, the NodeWrapper applies it as inline style. */
  width?: number
  /** Explicit height in canvas units. When set, the NodeWrapper applies it as inline style. */
  height?: number
  /**
   * ID of the parent node. When set, this node is a child of the referenced parent.
   * - The node is rendered inside the parent's DOM element.
   * - `position` is relative to the parent's top-left.
   * - Dragging the parent moves all direct and indirect children along with it.
   */
  parentId?: string
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
  /** Optional text label rendered at the midpoint of the edge. */
  label?: string
  /**
   * When true, the edge renders a flowing dash animation in the direction
   * source → target. Implemented via CSS class `lf-edge--animated` using
   * a `stroke-dashoffset` keyframe — runs on the compositor thread (GPU).
   */
  animated?: boolean
  /**
   * Arrowhead at the target end of the edge.
   * - `'arrow'`       — open arrowhead (chevron, inherits stroke color)
   * - `'arrowclosed'` — filled arrowhead (solid triangle, inherits stroke color)
   * - `'none'`        — no arrowhead (default)
   *
   * Markers use `currentColor` so they automatically follow the edge stroke
   * color in both dark and light mode, including the selected-state color.
   */
  markerEnd?: 'arrow' | 'arrowclosed' | 'none'
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
  | { type: 'data';     id: string; data: unknown }
  | { type: 'resize';   id: string; width: number; height: number }
  | { type: 'add';      node: FlowNode }

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

/** Options accepted by viewport animation methods. */
export interface ViewportAnimationOptions {
  /**
   * Duration of the animated transition in milliseconds.
   * When 0 or omitted, the change is applied immediately (no animation).
   * @default 0
   */
  duration?: number
}

/** Current viewport state returned by getViewport(). */
export interface Viewport {
  x:     number
  y:     number
  zoom:  number
}

export interface FlowHandle {
  readonly options: Readonly<FlowOptions>

  // ---- Viewport ----
  /** Return the current viewport (pan + zoom). */
  getViewport(): Viewport
  /**
   * Jump directly to an exact viewport position and zoom level.
   * Unlike zoomTo/fitBounds this sets all three values (x, y, zoom) at once.
   * Pass `duration` to animate the transition.
   */
  setViewport(viewport: Viewport, options?: ViewportAnimationOptions): void
  /**
   * Animate (or jump) to a specific zoom level, keeping the viewport center fixed.
   */
  zoomTo(zoom: number, options?: ViewportAnimationOptions): void
  /** Zoom in by a fixed step (×1.2), keeping the viewport center fixed. */
  zoomIn(options?: ViewportAnimationOptions): void
  /** Zoom out by a fixed step (÷1.2), keeping the viewport center fixed. */
  zoomOut(options?: ViewportAnimationOptions): void
  /**
   * Fit a bounding box (in canvas space) into the viewport.
   * Equivalent to fitView but for an arbitrary rect rather than all nodes.
   */
  fitBounds(bounds: Rect, options?: ViewportAnimationOptions & { padding?: number }): void

  // ---- Graph queries ----
  /** Return the node with the given id, or undefined. */
  getNode(id: string): FlowNode | undefined
  /** Return the edge with the given id, or undefined. */
  getEdge(id: string): FlowEdge | undefined
  /**
   * Return all nodes whose bounding box overlaps with `node`'s bounding box.
   * The node itself is excluded from the result.
   */
  getIntersectingNodes(node: FlowNode): FlowNode[]
  /**
   * Return true if `node`'s bounding box intersects with `area`
   * (all values in canvas units).
   */
  isNodeIntersecting(node: FlowNode, area: Rect): boolean

  /**
   * @internal — called by FlowCanvas to wire up live state.
   * Not part of the public API.
   */
  _register(internals: FlowInternals): void
}

/** @internal */
export interface FlowInternals {
  getTransform:  () => Transform
  setTransform:  (t: Transform) => void
  getRootSize:   () => { width: number; height: number }
  getNodes:      () => FlowNode[]
  getEdges:      () => FlowEdge[]
  getNodeSize:   (id: string) => { width: number; height: number } | undefined
  minZoom:       number
  maxZoom:       number
}

// ---- Context Menu Types ----

export interface ContextMenuItemBase {
  label:     string
  disabled?: boolean
}

export interface NodeContextMenuItem extends ContextMenuItemBase {
  action: (node: FlowNode) => void
}

export interface EdgeContextMenuItem extends ContextMenuItemBase {
  action: (edge: FlowEdge) => void
}

export interface PaneContextMenuItem extends ContextMenuItemBase {
  /** Receives the canvas-space position where the user right-clicked. */
  action: (position: Point) => void
}

export interface FlowCanvasProps {
  flow:             FlowHandle
  nodes:            () => FlowNode[]
  edges:            () => FlowEdge[]
  onNodesChange?:   (changes: NodeChange[]) => void
  onEdgesChange?:   (changes: EdgeChange[]) => void
  onConnect?:       (connection: Connection) => void
  onNodeMouseEnter?: (node: FlowNode) => void
  onNodeMouseLeave?: (node: FlowNode) => void
  onEdgeMouseEnter?: (edge: FlowEdge) => void
  onEdgeMouseLeave?: (edge: FlowEdge) => void
  minZoom?:         number
  maxZoom?:         number
  defaultViewport?: Transform
  /**
   * Snap node positions to a grid during drag.
   * Tuple [x, y] — cell size in canvas units.
   * @example snapToGrid={[20, 20]}
   */
  snapToGrid?:      [number, number]
  /**
   * Show the dot-grid background. Defaults to true.
   * Set to false to disable the grid entirely.
   */
  showGrid?:        boolean
  /**
   * Fit all nodes into the viewport once after the canvas is mounted.
   * Takes precedence over `defaultViewport` when true.
   * Uses `requestAnimationFrame` so the root element has a real layout
   * before computing the transform.
   */
  fitView?:         boolean
  /**
   * Options forwarded to `computeFitView` when `fitView` is true.
   */
  fitViewOptions?:  FitViewOptions
  /** Context menu items shown when the user right-clicks a node. */
  nodeContextMenu?: NodeContextMenuItem[]
  /** Context menu items shown when the user right-clicks an edge. */
  edgeContextMenu?: EdgeContextMenuItem[]
  /** Context menu items shown when the user right-clicks the canvas background. */
  paneContextMenu?: PaneContextMenuItem[]
  /**
   * Called whenever the viewport changes (pan, zoom, or programmatic transform).
   * Fired on every update — debounce in user-space if needed.
   * Intended for viewport persistence composables.
   */
  onViewportChange?: (viewport: Viewport) => void
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

/**
 * The user grabbed one endpoint of an existing edge and is dragging it to a
 * new handle. Structurally similar to ConnectingState but carries the edge
 * being modified and which end ('source' | 'target') is moving.
 */
export interface ReconnectingState {
  type:            'reconnecting'
  edgeId:          string
  /** Which end the user grabbed. */
  movingEnd:       'source' | 'target'
  /**
   * The fixed endpoint (the end that is NOT moving).
   * Stays constant throughout the drag.
   */
  fixedPoint:      Point
  /** Live cursor position — drives the ghost edge. */
  currentPoint:    Signal<Point>
}

export type InteractionState =
  | IdleState
  | DraggingState
  | ConnectingState
  | SelectingState
  | ReconnectingState
