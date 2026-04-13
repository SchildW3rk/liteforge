// Types
export type {
  Point, Rect, Transform,
  FlowNode, FlowEdge, Connection,
  NodeChange, EdgeChange,
  HandlePosition, HandleType,
  NodeComponentFn, EdgeComponentFn,
  FlowOptions, FlowHandle, FlowCanvasProps,
  Viewport, ViewportAnimationOptions,
  InteractionState,
  ReconnectingState,
  ContextMenuItemBase,
  NodeContextMenuItem,
  EdgeContextMenuItem,
  PaneContextMenuItem,
} from './types.js'

// Context menu
export { createContextMenu } from './components/ContextMenu.js'
export type { ContextMenuHandle } from './components/ContextMenu.js'

// Factory
export { createFlow } from './flow.js'

// Context (for use inside nodeType renderers)
export { getFlowContext } from './context.js'

// Canvas component
export { FlowCanvas } from './components/FlowCanvas.js'

// Node sub-components
export { createHandle } from './components/Handle.js'
export type { HandleHandle } from './components/Handle.js'
export { createNodeResizer } from './components/NodeResizer.js'
export type { NodeResizerOptions } from './components/NodeResizer.js'
export { createNodeToolbar } from './components/NodeToolbar.js'
export type { NodeToolbarHandle, NodeToolbarOptions, ToolbarPosition, ToolbarAlign } from './components/NodeToolbar.js'

// Geometry utilities
export { screenToCanvas, canvasToScreen } from './geometry/coords.js'
export { getBezierPath, getStepPath, getStraightPath, getWaypointPath, getWaypointMidpoint } from './geometry/paths.js'
export { rectsOverlap, rectFromPoints } from './geometry/aabb.js'

// defineNode — DX helper for declarative node type definitions
export { defineNode, getDefineNodeOpts } from './helpers/define-node.js'
export type {
  DefineNodeOptions, FieldDescriptor, FieldType, HandleDescriptor,
  NodeComponentFnWithMeta,
} from './helpers/define-node.js'

// createNodePropertiesPanel — generic properties editor for defineNode nodes
export { createNodePropertiesPanel } from './helpers/node-properties-panel.js'
export type { NodePropertiesPanelOptions } from './helpers/node-properties-panel.js'

// Context menu helpers — factory functions returning item arrays
export {
  createNodeContextMenu,
  createEdgeContextMenu,
  createPaneContextMenu,
} from './helpers/context-menu-helpers.js'

// Node status HOF — reactive execution-state classes + output tooltip
export { withNodeStatus } from './helpers/node-status.js'
export type { NodeExecStatus, WithNodeStatusOptions } from './helpers/node-status.js'
export type {
  CreateNodeContextMenuOptions,
  NodeDeleteOptions,
  NodeDuplicateOptions,
  CreateEdgeContextMenuOptions,
  EdgeDeleteOptions,
  EdgeEditLabelOptions,
  CreatePaneContextMenuOptions,
  PaneNodeItem,
} from './helpers/context-menu-helpers.js'

// Flow runner — generic graph-traversal execution engine
export { createFlowRunner, createFlowRunnerSignals } from './helpers/flow-runner.js'
export type {
  FlowRunnerState,
  ExecuteContext,
  ExecuteResult,
  ExecuteFn,
  FlowRunnerOptions,
  FlowRunnerHandle,
  FlushCallback,
  FlowRunnerSignals,
} from './helpers/flow-runner.js'

// Pure change helpers
export { applyNodeChanges, applyEdgeChanges } from './helpers/apply-changes.js'
export { isNoSelfConnection, isNoDuplicateEdge, combineValidators } from './helpers/connection-validators.js'
export { collectDragGroup } from './interactions/drag-node.js'
export { createFlowHistory } from './helpers/flow-history.js'
export type { FlowHistorySnapshot, FlowHistoryOptions, FlowHistoryResult } from './helpers/flow-history.js'
export { createFlowClipboard } from './helpers/flow-clipboard.js'
export type { FlowClipboardOptions, FlowClipboardResult } from './helpers/flow-clipboard.js'
export { createViewportPersistence } from './helpers/viewport-persistence.js'
export type { ViewportPersistenceOptions, ViewportPersistenceResult } from './helpers/viewport-persistence.js'
export { createAutoLayout } from './helpers/auto-layout.js'
export type { AutoLayoutOptions, AutoLayoutResult, LayoutDirection } from './helpers/auto-layout.js'

// Edge layer
export { createEdgeLayer } from './components/EdgeLayer.js'
export type { EdgeLayerHandle } from './components/EdgeLayer.js'

// Phase 6 components
export { createControls } from './components/Controls.js'
export { createMiniMap } from './components/MiniMap.js'
export { computeFitView } from './helpers/fit-view.js'
export type { FitViewOptions } from './helpers/fit-view.js'
