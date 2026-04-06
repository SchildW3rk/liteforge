---
"@liteforge/flow": minor
---

New package: `@liteforge/flow` — signals-based node editor

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
