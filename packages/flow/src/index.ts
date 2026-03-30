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

// Context (for use inside nodeType renderers)
export { getFlowContext } from './context.js'

// Canvas component
export { FlowCanvas } from './components/FlowCanvas.js'

// Node sub-components
export { createHandle } from './components/Handle.js'
export type { HandleHandle } from './components/Handle.js'

// Geometry utilities
export { screenToCanvas, canvasToScreen } from './geometry/coords.js'
export { getBezierPath, getStepPath, getStraightPath } from './geometry/paths.js'
export { rectsOverlap, rectFromPoints } from './geometry/aabb.js'

// Pure change helpers
export { applyNodeChanges, applyEdgeChanges } from './helpers/apply-changes.js'

// Edge layer
export { createEdgeLayer } from './components/EdgeLayer.js'
export type { EdgeLayerHandle } from './components/EdgeLayer.js'

// Phase 6 components
export { createControls } from './components/Controls.js'
export { createMiniMap } from './components/MiniMap.js'
export { computeFitView } from './helpers/fit-view.js'
export type { FitViewOptions } from './helpers/fit-view.js'
