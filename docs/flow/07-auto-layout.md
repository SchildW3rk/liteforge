---
title: "createAutoLayout"
category: "flow"
tags: ["layout", "auto-layout", "createAutoLayout", "dagre", "graph", "direction"]
related: ["FlowCanvas", "createFlow", "createFlowHistory"]
---

# createAutoLayout

> Automatic graph layout. Positions nodes using a Sugiyama-inspired layered algorithm — no external dependencies.

## Quick Start

```ts
import { createAutoLayout, FlowCanvas, createFlow } from '@liteforge/flow'

const autoLayout = createAutoLayout({ direction: 'LR' })

// Apply layout once after initial render:
const changes = autoLayout.layout(nodes(), edges())
onNodesChange(changes)
```

## API Reference

### `createAutoLayout(options?)` → `AutoLayoutResult`

**`AutoLayoutOptions`:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `direction` | `'LR' \| 'TB' \| 'RL' \| 'BT'` | `'LR'` | Layout direction. LR = left→right, TB = top→bottom |
| `nodeWidth` | `number` | `160` | Default node width when actual size is unknown |
| `nodeHeight` | `number` | `60` | Default node height when actual size is unknown |
| `nodeSpacing` | `number` | `40` | Gap between nodes in the same rank (secondary axis) |
| `rankSpacing` | `number` | `80` | Gap between ranks (primary axis) |
| `getNodeSize` | `(node: FlowNode) => { width, height }` | — | Custom size resolver per node, overrides `nodeWidth`/`nodeHeight` |

**`AutoLayoutResult`:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `layout` | `(nodes, edges) => NodeChange[]` | Compute positions and return `NodeChange[]` ready for `onNodesChange` |
| `computePositions` | `(nodes, edges) => Map<string, Point>` | Compute positions without producing change objects |

### `LayoutDirection`

```ts
type LayoutDirection = 'LR' | 'TB' | 'RL' | 'BT'
```

| Value | Meaning |
|-------|---------|
| `'LR'` | Left → Right (default) |
| `'TB'` | Top → Bottom |
| `'RL'` | Right → Left |
| `'BT'` | Bottom → Top |

## Examples

### Apply layout on a button click

```ts
const autoLayout = createAutoLayout({ direction: 'TB', rankSpacing: 100 })

layoutBtn.addEventListener('click', () => {
  const changes = autoLayout.layout(nodes(), edges())
  nodes.set(applyNodeChanges(nodes(), changes))
})
```

### Custom node sizes

```ts
const autoLayout = createAutoLayout({
  direction: 'LR',
  getNodeSize: (node) => {
    // Use measured DOM size if available, otherwise fall back to defaults
    return nodeSizes.get(node.id) ?? { width: 160, height: 60 }
  },
})
```

### Inspect positions before committing

```ts
const positions = autoLayout.computePositions(nodes(), edges())

for (const [nodeId, point] of positions) {
  console.log(nodeId, '->', point)
}
```

### Combined with fitView

```ts
const autoLayout = createAutoLayout({ direction: 'LR' })

function applyAndFit() {
  const changes = autoLayout.layout(nodes(), edges())
  nodes.set(applyNodeChanges(nodes(), changes))
  // fitView via computeFitView after layout settles:
  requestAnimationFrame(() => {
    const t = computeFitView(nodes(), container.offsetWidth, container.offsetHeight)
    transform.set(t)
  })
}
```

## Algorithm

`createAutoLayout` uses a Sugiyama-inspired layered approach:

1. Build adjacency list from edges
2. Topological sort via Kahn's algorithm (cycles fall back gracefully)
3. Assign ranks (layers) by longest path from each source node
4. Order nodes within each rank by first-appearance index
5. Compute `(x, y)` from `rank × (nodeSize + rankSpacing)` and `indexInRank × (nodeSize + nodeSpacing)`

## Notes

- `layout()` returns `NodeChange[]` with `type: 'position'` for every node. Pass directly to `onNodesChange` or `applyNodeChanges`.
- Layout is computed synchronously — for large graphs (>500 nodes), consider calling it off the main thread or debouncing.
- `createAutoLayout` does not read from the DOM. Pass `getNodeSize` if you have measured node sizes.
