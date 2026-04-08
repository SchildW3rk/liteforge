---
title: "Imperative API (FlowHandle)"
category: flow
tags:
  - FlowHandle
  - viewport
  - zoomTo
  - zoomIn
  - zoomOut
  - fitBounds
  - getViewport
  - setViewport
  - getNode
  - getEdge
  - getIntersectingNodes
  - isNodeIntersecting
related:
  - createFlow
  - FlowCanvas
---

# Imperative API (FlowHandle)

`createFlow()` returns a `FlowHandle` alongside the graph state signals. The handle exposes imperative methods for viewport control and graph queries. All methods become available after `FlowCanvas` mounts (internally, `FlowCanvas` calls `_register` during its `mounted` lifecycle hook). Before that point every viewport method is a safe no-op that returns a sensible default.

## Types

```ts
interface Viewport {
  x: number
  y: number
  zoom: number
}

interface ViewportAnimationOptions {
  duration?: number   // milliseconds — 0 or omitted means instant
}

interface Rect {
  x: number
  y: number
  width: number
  height: number
}
```

---

## Viewport Methods

### `getViewport()`

```ts
getViewport(): Viewport
```

Returns the current viewport as `{ x, y, zoom }`. Returns `{ x: 0, y: 0, zoom: 1 }` if called before the canvas has mounted.

```ts
const vp = flow.getViewport()
console.log(`Zoom level: ${vp.zoom}`)
```

---

### `setViewport(viewport, opts?)`

```ts
setViewport(viewport: Viewport, opts?: ViewportAnimationOptions): void
```

Jump to an exact position and zoom level. Clamps `zoom` to the `minZoom`/`maxZoom` range set on `FlowCanvas`.

Pass `{ duration }` to animate the transition (CSS `transition` under the hood).

```ts
// Restore a saved viewport instantly
flow.setViewport({ x: -120, y: -80, zoom: 0.8 })

// Animate to a specific position over 400 ms
flow.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 400 })
```

---

### `zoomTo(zoom, opts?)`

```ts
zoomTo(zoom: number, opts?: ViewportAnimationOptions): void
```

Set the zoom level while keeping the current viewport center fixed. Clamps to `minZoom`/`maxZoom`.

```ts
// Jump to 50% zoom
flow.zoomTo(0.5)

// Animate to full zoom in 300 ms
flow.zoomTo(1, { duration: 300 })
```

---

### `zoomIn(opts?)`

```ts
zoomIn(opts?: ViewportAnimationOptions): void
```

Multiply current zoom by 1.2, keeping the viewport center fixed.

```ts
document.getElementById('zoom-in-btn')!.onclick = () => {
  flow.zoomIn({ duration: 200 })
}
```

---

### `zoomOut(opts?)`

```ts
zoomOut(opts?: ViewportAnimationOptions): void
```

Divide current zoom by 1.2, keeping the viewport center fixed.

---

### `fitBounds(bounds, opts?)`

```ts
fitBounds(
  bounds: Rect,
  opts?: { padding?: number; duration?: number }
): void
```

Scale and translate the viewport so that `bounds` fills the canvas, with an optional `padding` (default `0.1`, i.e. 10% on each side). Use this when you want to focus on a subset of nodes rather than the entire graph.

```ts
// Compute the bounding box of the nodes you care about, then fit to it
const selectedNodes = nodes().filter(n => n.selected)

const minX = Math.min(...selectedNodes.map(n => n.position.x))
const minY = Math.min(...selectedNodes.map(n => n.position.y))
const maxX = Math.max(...selectedNodes.map(n => n.position.x + (n.width ?? 150)))
const maxY = Math.max(...selectedNodes.map(n => n.position.y + (n.height ?? 40)))

flow.fitBounds(
  { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
  { padding: 0.15, duration: 350 },
)
```

---

## Graph Query Methods

### `getNode(id)`

```ts
getNode(id: string): FlowNode | undefined
```

Returns the node with the given id, or `undefined` if no such node exists. Reads directly from the reactive `nodes()` signal — always returns the latest state.

```ts
const node = flow.getNode('process-1')
if (node) {
  console.log(node.position)
}
```

---

### `getEdge(id)`

```ts
getEdge(id: string): FlowEdge | undefined
```

Returns the edge with the given id, or `undefined` if not found.

```ts
const edge = flow.getEdge('e1-2')
```

---

### `getIntersectingNodes(node)`

```ts
getIntersectingNodes(node: FlowNode): FlowNode[]
```

Returns all nodes whose axis-aligned bounding box overlaps with `node`'s bounding box. The `node` argument itself is excluded from the result.

Bounding boxes are computed from `node.position` plus `node.width` / `node.height` (defaulting to the measured DOM size when those fields are absent).

```ts
// Collision detection — highlight overlapping nodes
effect(() => {
  const dragged = nodes().find(n => n.dragging)
  if (!dragged) return

  const hits = flow.getIntersectingNodes(dragged)
  hits.forEach(n => console.log(`Overlapping with: ${n.id}`))
})
```

---

### `isNodeIntersecting(node, area)`

```ts
isNodeIntersecting(node: FlowNode, area: Rect): boolean
```

Returns `true` if `node`'s bounding box overlaps `area`. Useful for custom drag-to-container logic or drop-zone detection.

```ts
const dropZone: Rect = { x: 400, y: 200, width: 200, height: 150 }

const dropped = flow.isNodeIntersecting(draggedNode, dropZone)
if (dropped) {
  console.log('Node dropped into zone')
}
```

---

## Putting It Together

```ts
import { createFlow, FlowCanvas } from '@liteforge/flow'
import { signal } from '@liteforge/core'

const [nodes, setNodes] = signal([...])
const [edges, setEdges] = signal([...])

const flow = createFlow({ nodeTypes })

// --- Restore last session ---
const saved = JSON.parse(localStorage.getItem('viewport') ?? 'null')

// --- Toolbar buttons ---
function onZoomIn()  { flow.zoomIn({ duration: 200 }) }
function onZoomOut() { flow.zoomOut({ duration: 200 }) }
function onReset()   { flow.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 }) }
function onSave()    { localStorage.setItem('viewport', JSON.stringify(flow.getViewport())) }

const canvas = FlowCanvas({
  flow,
  nodes: () => nodes(),
  edges: () => edges(),
  defaultViewport: saved ?? undefined,
  onNodesChange: changes => setNodes(applyNodeChanges(nodes(), changes)),
  onEdgesChange: changes => setEdges(applyEdgeChanges(edges(), changes)),
})
```
