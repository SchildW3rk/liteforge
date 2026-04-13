# @liteforge/flow

## 0.5.0

### Minor Changes

- Add edge waypoints, edge color, and DraggingWaypointState

  - **Edge waypoints**: Bendable connections via `waypoints?: Point[]` on `FlowEdge`. Includes `getWaypointPath` / `getWaypointMidpoint` helpers and draggable circle handles that update the path live at 60fps via `DraggingWaypointState.localOffset` signal — `onEdgesChange` only fires on `pointerup`.
  - **Edge color**: `color?: string` on `FlowEdge` applied to the SVG path stroke and hit area.
  - **`node-properties-panel.ts`**: New helper for rendering node property panels.

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.6.7

## 0.4.0

### Minor Changes

- v0.3.0 — full-featured node editor release

  **New composables**

  - `createFlowClipboard` — copy/paste nodes and edges with fresh IDs and configurable offset
  - `createAutoLayout` — Sugiyama-inspired layered layout, 4 directions (LR/RL/TB/BT)
  - `createViewportPersistence` — localStorage-backed viewport persistence, SSR-safe, debounced
  - `createFlowHistory` — undo/redo with `maxHistory`, `canUndo`/`canRedo` signals, Ctrl+Z/Y
  - `createContextMenu` — node, edge, and pane context menus with Escape/click-outside dismiss
  - `createNodeResizer` — 8-direction resize handles with `setPointerCapture`, emits resize changes
  - `createNodeToolbar` — floating toolbar in screen space, 4 positions × 3 alignments

  **New interactions**

  - Edge reconnect — drag source or target endpoint to a new handle
  - Marquee selection — rubber-band select with AABB hit test, Shift-additive
  - Keyboard accessibility (WCAG 2.1 AA) — roving tabindex, `role="button"`, `aria-selected`, Tab/Arrow/Enter/Escape/Delete
  - Touch / pinch-to-zoom — automatic via Pointer Events API, no configuration needed
  - Multi-node group drag — drag a selection as a unit

  **New edge features**

  - Animated edges — `animated: true`, GPU-composited `stroke-dashoffset` keyframe
  - Arrow markers — `markerEnd: 'arrow' | 'arrowclosed'`, uses `currentColor`
  - Edge labels — `label: string`, renders at midpoint with background rect

  **Connection validation**

  - Built-in self-loop guard (cannot be bypassed)
  - `isNoSelfConnection`, `isNoDuplicateEdge`, `combineValidators` helpers

  **Performance**

  - Edge batching: N×3 reactive effects → 1 batched effect (1200→1 for 400 edges)
  - Viewport culling: nodes outside viewport hidden with `display:none`, selected/dragged nodes never culled

  **Other**

  - `setViewport` with optional duration animation on `FlowHandle`
  - `onViewportChange` callback prop on `FlowCanvas`
  - `snapToGrid` prop
  - `parentId` / node groups with cascade removal and group drag
  - Node + edge mouse enter/leave events
  - Grid background (`backgroundVariant: 'dots' | 'lines'`)

  580 tests passing across 30 test files.

## 0.2.0

### Minor Changes

- 9ec3ace: New package: `@liteforge/flow` — signals-based node editor

  Fully controlled graph API (nodes/edges as props, onChange callbacks).
  No internal state copying — mirrors the React controlled-input pattern.

  **Features:**

  - `FlowCanvas` with pan (space+drag, middle-button) and zoom (wheel with mouse-anchor)
  - Node drag with 60fps visual feedback via per-state `localOffset` Signal; `onNodesChange` fired only on pointerup
  - `Handle` component with `queueMicrotask` measurement, initiates connecting interaction
  - `GhostEdge` — bezier preview path while dragging a new connection
  - `EdgeLayer` — two-level effect pattern (outer: membership, inner: path updates per edge)
  - Path algorithms: `getBezierPath`, `getStepPath`, `getStraightPath`
  - Selection: click-select, shift-multi-select, marquee (rubber-band), Delete/Backspace to remove
  - `MiniMap` overlay with viewport indicator
  - `Controls` with zoom-in/out and fitView buttons
  - `applyNodeChanges` / `applyEdgeChanges` pure helpers
  - `computeFitView` utility
  - 151 tests
