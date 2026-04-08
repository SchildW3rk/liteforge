---
title: "FlowCanvas"
category: "flow"
tags: ["FlowCanvas", "canvas", "pan", "zoom", "minimap", "controls", "fitView", "snapToGrid", "contextMenu", "interactionState"]
related: ["createFlow", "Handle", "Edges"]
---

# FlowCanvas

> The main canvas component that renders nodes, edges, handles, and manages pan/zoom interactions.

## Installation

```bash
npm install @liteforge/flow
```

## Quick Start

```tsx
import { FlowCanvas, createFlow, applyNodeChanges, applyEdgeChanges } from '@liteforge/flow'
import { signal } from '@liteforge/core'

const flow = createFlow({ nodeTypes: { default: MyNode } })
const nodes = signal<FlowNode[]>([...])
const edges = signal<FlowEdge[]>([...])

<FlowCanvas
  flow={flow}
  nodes={() => nodes()}
  edges={() => edges()}
  onNodesChange={(changes) => nodes.set(applyNodeChanges(nodes(), changes))}
  onEdgesChange={(changes) => edges.set(applyEdgeChanges(edges(), changes))}
  onConnect={(conn) => edges.update(es => [...es, { id: `e${Date.now()}`, ...conn }])}
  minZoom={0.1}
  maxZoom={4}
  defaultViewport={{ x: 0, y: 0, scale: 1 }}
/>
```

## API Reference

### `FlowCanvas(props: FlowCanvasProps)` → `Node`

**Props (`FlowCanvasProps`):**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `flow` | `FlowHandle` | required | Flow instance from `createFlow()` |
| `nodes` | `() => FlowNode[]` | required | Reactive node array |
| `edges` | `() => FlowEdge[]` | required | Reactive edge array |
| `onNodesChange` | `(changes: NodeChange[]) => void` | — | Called when nodes are dragged, selected, or removed |
| `onEdgesChange` | `(changes: EdgeChange[]) => void` | — | Called when edges are selected or removed |
| `onConnect` | `(connection: Connection) => void` | — | Called when a new connection is drawn |
| `minZoom` | `number` | `0.1` | Minimum zoom scale |
| `maxZoom` | `number` | `4` | Maximum zoom scale |
| `defaultViewport` | `Transform` | `{ x: 0, y: 0, scale: 1 }` | Initial viewport position and scale |
| `fitView` | `boolean` | `false` | Fit all nodes into view once after mount. Runs via `requestAnimationFrame` so the canvas has a real layout before computing. Takes precedence over `defaultViewport`. |
| `fitViewOptions` | `FitViewOptions` | — | Options forwarded to `computeFitView` when `fitView` is `true` |
| `snapToGrid` | `[number, number]` | — | Snap node positions to a grid during drag. Tuple `[x, y]` — cell size in canvas units. Example: `[20, 20]` |
| `showGrid` | `boolean` | `true` | Show the dot-grid background. Set to `false` to disable entirely |
| `nodeContextMenu` | `NodeContextMenuItem[]` | — | Items shown when the user right-clicks a node |
| `edgeContextMenu` | `EdgeContextMenuItem[]` | — | Items shown when the user right-clicks an edge |
| `paneContextMenu` | `PaneContextMenuItem[]` | — | Items shown when the user right-clicks the canvas background |
| `onNodeMouseEnter` | `(node: FlowNode) => void` | — | Called when the pointer enters a node wrapper |
| `onNodeMouseLeave` | `(node: FlowNode) => void` | — | Called when the pointer leaves a node wrapper |
| `onEdgeMouseEnter` | `(edge: FlowEdge) => void` | — | Called when the pointer enters an edge path |
| `onEdgeMouseLeave` | `(edge: FlowEdge) => void` | — | Called when the pointer leaves an edge path |
| `onViewportChange` | `(viewport: Viewport) => void` | — | Called on every pan / zoom. Fired on every update — debounce in user-space if needed. Used by `createViewportPersistence`. |

### `NodeChange`

```ts
type NodeChange =
  | { type: 'position'; id: string; position: Point }
  | { type: 'select';   id: string; selected: boolean }
  | { type: 'remove';   id: string }
  | { type: 'data';     id: string; data: unknown }
```

The `'data'` variant lets you update a node's `data` field via the standard change pipeline:

```ts
// Update a node's data from within a node renderer or external handler
onNodesChange([{ type: 'data', id: node.id, data: { ...node.data, label: 'New label' } }])
```

Pass it through `applyNodeChanges` like any other change type — the helper merges it into the node's `data` field.

### `EdgeChange`

```ts
type EdgeChange =
  | { type: 'select'; id: string; selected: boolean }
  | { type: 'remove'; id: string }
```

### `Connection`

```ts
interface Connection {
  source: string
  sourceHandle: string
  target: string
  targetHandle: string
}
```

### `Transform`

```ts
interface Transform { x: number; y: number; scale: number }
```

### `createControls()` → `ControlsHandle`

Renders zoom in/out/fit controls. Place inside `FlowCanvas`.

### `createMiniMap()` → `MiniMapHandle`

Renders a minimap overview. Place inside or alongside `FlowCanvas`.

### `computeFitView(nodes, viewportWidth, viewportHeight, options?)` → `Transform`

Calculate a `Transform` that fits all nodes in view. Returns `{ x: 0, y: 0, scale: 1 }` when `nodes` is empty.

```ts
import { computeFitView } from '@liteforge/flow'

const t = computeFitView(nodes(), container.offsetWidth, container.offsetHeight, { padding: 40 })
transform.set(t)
```

**`FitViewOptions`:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `padding` | `number` | `40` | Pixel padding around the bounding box of all nodes |
| `minScale` | `number` | `0.1` | Minimum allowed zoom after fit |
| `maxScale` | `number` | `1.5` | Maximum allowed zoom after fit |

### `InteractionState`

The canvas exposes its current interaction as a discriminated union. Access it via `getFlowContext()` inside a node renderer, or export it for custom overlays.

```ts
type InteractionState =
  | { type: 'idle' }
  | {
      type: 'dragging'
      nodeId:           string
      draggedNodes:     ReadonlySet<string>  // all nodes moving together
      pointerId:        number
      startCanvasPoint: Point
      startPosition:    Point
      localOffset:      Signal<Point>        // live drag offset
    }
  | {
      type: 'connecting'
      sourceNodeId:     string
      sourceHandleId:   string
      sourceHandleType: HandleType
      sourcePoint:      Point
      currentPoint:     Signal<Point>        // live cursor while drawing
    }
  | {
      type: 'selecting'
      startCanvasPoint:   Point
      currentCanvasPoint: Signal<Point>      // live cursor during marquee
      pointerId:          number
    }
```

You typically only need `InteractionState` when building custom overlays that react to drag or connection progress. For most use cases the canvas manages state internally.

### Coordinate utilities

| Function | Signature | Description |
|----------|-----------|-------------|
| `screenToCanvas` | `(point, transform) => Point` | Convert screen coordinates to canvas space |
| `canvasToScreen` | `(point, transform) => Point` | Convert canvas coordinates to screen space |

## Examples

### With controls and minimap

```ts
import { FlowCanvas, createControls, createMiniMap, createFlow } from '@liteforge/flow'

const flow = createFlow({ nodeTypes: { ... } })
const canvas = FlowCanvas({ flow, nodes: () => nodes(), edges: () => edges(), ... })
const controls = createControls(ctx, transform, canvas as HTMLElement, fitView)
const minimap  = createMiniMap(ctx, transform, canvas as HTMLElement)
```

### Fit view on mount

```ts
const canvas = FlowCanvas({
  flow,
  nodes: () => nodes(),
  edges: () => edges(),
  fitView: true,
  fitViewOptions: { padding: 40, maxScale: 1.2 },
})
```

### Snap to grid

```ts
const canvas = FlowCanvas({
  flow,
  nodes: () => nodes(),
  edges: () => edges(),
  snapToGrid: [20, 20],   // 20px × 20px grid
})
```

### Update node data via `onNodesChange`

```ts
// From inside a node renderer — update only the data field:
function MyNode(node: FlowNode<{ label: string }>) {
  const ctx = getFlowContext()
  const input = document.createElement('input')
  input.value = node.data.label
  input.addEventListener('change', (e) => {
    ctx.onNodesChange?.([{
      type: 'data',
      id: node.id,
      data: { ...node.data, label: (e.target as HTMLInputElement).value },
    }])
  })
  return input
}
```

## Touch and Pointer Input

Touch support is automatic — no configuration needed.

| Gesture | Behavior |
|---------|----------|
| Single finger drag on canvas | Pan |
| Two-finger pinch | Zoom in / out, anchor between fingers |
| Single finger drag on node | Node drag (same as mouse) |
| Tap on node | Select |

`touch-action: none` is set on the canvas root so the browser does not interfere with pointer events. All interaction logic uses the Pointer Events API — mouse, touch, and stylus are handled by the same code paths.

Minimum zoom and maximum zoom limits (`minZoom` / `maxZoom` on `createFlow`) apply to pinch just as they do to wheel zoom.

---

## Notes

- `FlowCanvas` is the only required rendering component. Controls and minimap are optional overlays.
- Nodes are rendered using the `nodeTypes` renderers passed to `createFlow()`. Each renderer is called once — reactivity inside uses signals and effects.
- The canvas intercepts pointer events for drag, pan, zoom, and connection drawing. Do not stop propagation in node renderers unless absolutely necessary.
- `fitView` uses `requestAnimationFrame` to defer computation until the canvas element has a real layout in the DOM (`offsetWidth`/`offsetHeight` are `0` before insertion).
