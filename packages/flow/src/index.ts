// Types
export type {
  Point, Rect, Transform,
  FlowNode, FlowEdge, Connection,
  NodeChange, EdgeChange,
  HandlePosition, HandleType,
  NodeComponentFn, EdgeComponentFn,
  FlowOptions, FlowHandle, FlowCanvasProps,
  InteractionState,
} from './types.js'

// Factory
export { createFlow } from './flow.js'

// Canvas component
export { FlowCanvas } from './components/FlowCanvas.js'

// Node sub-components
export { createHandle } from './components/Handle.js'
export type { HandleHandle } from './components/Handle.js'

// Geometry utilities
export { screenToCanvas, canvasToScreen } from './geometry/coords.js'

// Pure change helpers
export { applyNodeChanges, applyEdgeChanges } from './helpers/apply-changes.js'
