# @liteforge/flow Changelog

All notable changes to this package are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [0.3.0] — 2026-04-08

### Added

#### Touch and pointer input
- **Touch support** — pan and pinch-to-zoom now work via the Pointer Events API (`interactions/pan-zoom.ts`). `touch-action: none` is set on the canvas root automatically so the browser does not scroll the page while the user is interacting with the flow.

#### Node model
- **Node Groups / Parent–Child** — `parentId?: string` on `FlowNode`. Children are rendered inside the parent's DOM element, have `position` relative to the parent's top-left, move with the parent during drag, and are cascade-removed when the parent is deleted via `applyNodeChanges`. Parent node wrappers receive the `lf-node-group` CSS class.
- **`NodeChange: 'add'`** — Nodes can now be added through the standard change pipeline via `applyNodeChanges`.
- **`NodeChange: 'resize'`** — Resize changes flow through `applyNodeChanges` alongside position and selection changes.
- **`FlowNode.width` / `FlowNode.height`** — Optional explicit dimensions. When provided, the library skips DOM measurement for bounding-box calculations.

#### Node UI components
- **`NodeToolbar`** — `createNodeToolbar(nodeId, ctx, options)` creates a floating toolbar anchored to a node. Options: `position?: 'top' | 'bottom' | 'left' | 'right'` (default `'top'`), `align?: 'start' | 'center' | 'end'` (default `'center'`), `offset?: number` (default `8`). The toolbar repositions automatically when the node moves or the viewport changes.
- **`createNodeResizer`** — Adds 8-direction resize handles to a node. Emits `'resize'` node changes. Enforces a minimum node size (`MIN_SIZE = 20px`).

#### Imperative viewport API (on `FlowHandle`)
- **`getViewport()`** — Returns current `{ x, y, zoom }`. Returns `{ 0, 0, 1 }` before canvas mounts.
- **`setViewport(viewport, opts?)`** — Jump to an exact position and zoom level. Pass `{ duration }` to animate. Clamps to `minZoom`/`maxZoom`.
- **`zoomTo(zoom, opts?)`** — Set zoom level, keeping viewport center fixed.
- **`zoomIn(opts?)`** — `zoomTo(current × 1.2)`.
- **`zoomOut(opts?)`** — `zoomTo(current ÷ 1.2)`.
- **`fitBounds(bounds, opts?)`** — Fit an arbitrary `Rect` into the viewport with optional padding and animation.

#### Imperative graph queries (on `FlowHandle`)
- **`getNode(id)`** — Returns `FlowNode | undefined`.
- **`getEdge(id)`** — Returns `FlowEdge | undefined`.
- **`getIntersectingNodes(node)`** — Returns nodes whose bounding box overlaps with the given node.
- **`isNodeIntersecting(node, area)`** — Returns `true` if a node's bounding box overlaps an arbitrary `Rect`.

#### Keyboard accessibility
- **WCAG 2.1 AA keyboard support** — Roving tabindex on node wrappers. `role="application"` on canvas root; `role="button"`, `aria-label`, `aria-selected` on node wrappers.
- `Tab` / `Shift+Tab` navigate between nodes (no wrap at edges).
- `Enter` selects the focused node, deselects all others.
- `Escape` deselects all and returns focus to the canvas root.
- `Arrow keys` move the focused node 10 px; `Shift+Arrow` moves 50 px.
- `Delete` / `Backspace` remove all selected nodes and edges.
- All keyboard shortcuts are suppressed when an `<input>` or `<textarea>` inside a node is focused.

#### Connection validation
- **Built-in self-connection guard** — Connections where `source === target` are always blocked, before `isValidConnection` runs. This guard cannot be bypassed.
- **`isNoSelfConnection`** — Exported helper validator. Returns `false` when `source === target`.
- **`isNoDuplicateEdge(getEdges)`** — Factory returning a validator that blocks edges sharing the same `(source, sourceHandle, target, targetHandle)` tuple.
- **`combineValidators(...validators)`** — AND-composes validators with short-circuit evaluation.

#### Composables
- **`createViewportPersistence(storageKey, flow, options?)`** — Persists viewport position and zoom to `localStorage`. Returns `savedViewport` (pass as `defaultViewport`), `save()`, `clear()`, and `onViewportChange` (wire to `FlowCanvasProps`). Debounced auto-save (default 300 ms). Fully SSR-safe — all localStorage access is guarded behind `typeof window !== 'undefined'`.

#### Performance
- **Edge Batching** — Edge geometry is now computed in a single batched effect subscribed once to `transform()`, replacing N × 3 individual effects. For a 400-edge graph this reduces effect executions from 1200 to 1 per viewport change.
- **Viewport Culling** — Nodes whose bounding box is entirely outside the visible viewport (with a 100 px margin) are hidden via `display: none`. They remain in the DOM — MiniMap, fitView, and the Handle Registry are unaffected. Selected and actively dragged nodes are never culled.

#### Mouse events on `FlowCanvasProps`
- **`onViewportChange?: (viewport: Viewport) => void`** — Fires on every pan and zoom.
- **`onNodeMouseEnter?: (node: FlowNode) => void`**
- **`onNodeMouseLeave?: (node: FlowNode) => void`**
- **`onEdgeMouseEnter?: (edge: FlowEdge) => void`**
- **`onEdgeMouseLeave?: (edge: FlowEdge) => void`**

### Changed (non-breaking)

- `FlowHandle` gains `setViewport()`, `zoomTo()`, `zoomIn()`, `zoomOut()`, `fitBounds()`, `getNode()`, `getEdge()`, `getIntersectingNodes()`, `isNodeIntersecting()`.
- `FlowCanvasProps` gains `onViewportChange?`, `onNodeMouseEnter?`, `onNodeMouseLeave?`, `onEdgeMouseEnter?`, `onEdgeMouseLeave?`.
- `FlowNode` gains `parentId?: string`, `width?: number`, `height?: number`.
- Ghost edge turns red (`.lf-ghost-edge--invalid` CSS class) when `isValidConnection` returns `false`.

### Migration Guide

There are no breaking changes in 0.3.0. All new fields and props are optional and have sensible defaults.

**Self-connection guard:** The new built-in guard permanently blocks connections where `source === target`. If your application intentionally allowed self-loops in 0.2.0, those connections will now be silently rejected. This is by design — self-loops have no valid use case in a directed flow graph. If your domain is a genuine exception, please open an issue.

**Edge batching:** The internal edge rendering model changed. If you were relying on undocumented internal APIs such as `EdgeBundle` or individual edge effects, those are no longer part of the public surface. The public `FlowEdge` type and `onEdgesChange` API are unchanged.

---

## [0.2.0] — Initial feature-complete release

Core graph model, pan/zoom, node drag, multi-node group drag, marquee selection, edge connection, edge reconnect (drag endpoint), undo/redo (`createFlowHistory`), copy/paste (`createFlowClipboard`), auto-layout (`createAutoLayout`, Sugiyama-inspired, 4 directions), context menu (node, edge, pane), MiniMap, Controls panel, `fitView`, snap-to-grid, animated edges, edge labels, arrow markers (open + filled), custom node types, custom edge types.
