---
title: "Performance"
category: flow
tags:
  - performance
  - culling
  - batching
  - 500-nodes
  - optimization
related:
  - FlowCanvas
  - Edges
---

# Performance

`@liteforge/flow` includes two automatic performance optimisations that activate without any configuration. This page explains what they do, why they matter, and what you can do on top of them for very large graphs.

---

## Edge Batching

### The problem

Before batching, each edge maintained **three separate reactive effects** to compute its geometry (path string, marker positions, label position). Every pan or zoom event caused all three effects for every edge to re-run synchronously:

- 50 edges → 150 effect executions per frame
- 400 edges → 1200 effect executions per frame
- 1000 edges → 3000 effect executions per frame

At 60 fps, 1200 effect executions per frame translates to ~72 000 per second for a moderately sized graph.

### The solution

A single batched effect subscribes to `transform()` once. When the viewport changes it runs a sequential loop over all edge bundles, recomputing geometry for every edge in one pass.

| Edges | Effects before batching | Effects after batching |
|-------|------------------------|------------------------|
| 50    | 150                    | 1                      |
| 400   | 1200                   | 1                      |
| 1000  | 3000                   | 1                      |

### User-facing impact

None — this is an internal implementation detail. Edge rendering, labels, markers, and `onEdgesChange` all behave identically. The change is transparent.

---

## Viewport Culling

### The problem

When zoomed out to see a large graph, the browser must lay out, paint, and composite every node — even nodes that are 3000 px off-screen. For graphs with hundreds of nodes this causes unnecessary layout recalculations.

### The solution

The `NodeWrapper` component checks each node's bounding box against the current visible viewport on every pan/zoom. Nodes that are entirely outside the viewport are hidden via `display: none`.

### Rules

- **Culled nodes stay in the DOM.** Their element is hidden, not removed. The Handle Registry, MiniMap, and `fitView` all read from the full node list — they are unaffected by culling.
- **Selected nodes are never culled.** A selected-but-offscreen node remains visible so the user can see which nodes are in the selection set.
- **Actively dragged nodes are never culled.** A node being dragged can move rapidly and should never flicker.
- **100 px margin.** A node is only culled when its bounding box extends more than 100 px outside the visible edge of the canvas. This prevents visible pop-in at the edges during fast panning.

### User-facing impact

None for normal use. The only observable difference is that `node.element` (the DOM reference, if you access it imperatively) may have `display: none` set when the node is off-screen.

---

## Tips for Large Graphs (500+ Nodes)

### Use `snapToGrid` to reduce update frequency

When a node is dragged freely, `onNodesChange` fires on every pointer-move event — potentially 60 times per second per dragged node. With `snapToGrid: true`, changes are only emitted when the node snaps to a new grid cell, dramatically reducing the update frequency.

```ts
FlowCanvas({
  flow,
  snapToGrid: true,
  gridSize: 15,
  ...
})
```

### Batch programmatic node additions

If you are adding many nodes at once (e.g. loading a saved graph), apply them in a single `applyNodeChanges` call rather than one at a time. This triggers one signal update and one re-render instead of N.

```ts
import { applyNodeChanges } from '@liteforge/flow'
import { batch } from '@liteforge/core'

// Good: one update
setNodes(prev => applyNodeChanges(prev, newNodes.map(n => ({ type: 'add', item: n }))))

// Avoid: N updates
newNodes.forEach(n =>
  setNodes(prev => applyNodeChanges(prev, [{ type: 'add', item: n }]))
)
```

If you need to update both nodes and edges together, wrap in `batch()` from `@liteforge/core`:

```ts
import { batch } from '@liteforge/core'

batch(() => {
  setNodes(prev => applyNodeChanges(prev, nodeChanges))
  setEdges(prev => applyEdgeChanges(prev, edgeChanges))
})
```

### Run auto-layout before mounting

`createAutoLayout` computes positions synchronously. For graphs with more than 500 nodes, computing layout while the canvas is visible causes a noticeable layout jump. Compute positions before setting the initial `nodes` signal:

```ts
import { createAutoLayout } from '@liteforge/flow'

const layout = createAutoLayout({ direction: 'LR' })
const { nodes: laidOutNodes } = layout.run({ nodes: rawNodes, edges: rawEdges })

// Mount with already-positioned nodes — no jump
const [nodes, setNodes] = signal(laidOutNodes)
```

### Avoid large `data` objects

The `data` field on each node is passed as-is to your node renderer. It is not diffed or serialised internally. Storing large objects (e.g. raw file buffers, deeply nested trees) in `data` inflates the memory footprint of the node list signal. Store large data by reference (a Map keyed by node id) and look it up in the renderer.

### `width` and `height` on nodes

When `node.width` and `node.height` are provided, the library skips DOM measurement for bounding-box calculations (culling, `fitView`, `getIntersectingNodes`). For graphs where all nodes share a standard size, providing these fields avoids a layout-read cycle on mount.

```ts
const nodes = rawData.map(item => ({
  id: item.id,
  type: 'default',
  position: item.pos,
  width: 160,
  height: 44,
  data: item,
}))
```
