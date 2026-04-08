---
title: "Edges"
category: "flow"
tags: ["edges", "EdgeLayer", "bezier", "step", "straight", "path", "EdgeComponentFn", "animated", "markerEnd", "label", "reconnect", "edge-reconnect"]
related: ["createFlow", "FlowCanvas", "Handle"]
---

# Edges

> Custom edge renderers, path generators, animated edges, arrow markers, edge labels, and endpoint reconnect.

## Installation

```bash
npm install @liteforge/flow
```

## Quick Start

```ts
import { createFlow, applyEdgeChanges } from '@liteforge/flow'
import { signal } from '@liteforge/core'

const edges = signal([
  {
    id: 'e1',
    source: 'a', sourceHandle: 'out',
    target: 'b', targetHandle: 'in',
    animated: true,
    label: 'data flow',
    markerEnd: 'arrowclosed',
  },
])
```

## API Reference

### `FlowEdge<T>`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique edge ID |
| `source` | `string` | Source node ID |
| `sourceHandle` | `string` | Source handle ID |
| `target` | `string` | Target node ID |
| `targetHandle` | `string` | Target handle ID |
| `type` | `string?` | Edge type key (matches `edgeTypes` in `createFlow`) |
| `data` | `T?` | Custom edge data |
| `selected` | `boolean?` | Selection state |
| `label` | `string?` | Text label rendered at the midpoint of the edge |
| `animated` | `boolean?` | Flowing dash animation, source → target direction. GPU-composited via `stroke-dashoffset` keyframe. |
| `markerEnd` | `'arrow' \| 'arrowclosed' \| 'none'?` | Arrowhead at the target end. Uses `currentColor` — inherits edge stroke color automatically. |

---

### Animated edges

Set `animated: true` on any `FlowEdge` — no custom renderer needed. The canvas adds the CSS class `lf-edge--animated` which runs a `stroke-dashoffset` keyframe animation in the source → target direction on the GPU.

```ts
edges.set([
  {
    id: 'e1',
    source: 'a', sourceHandle: 'out',
    target: 'b', targetHandle: 'in',
    animated: true,
  },
])
```

Toggle animation reactively:

```ts
edges.update(es =>
  es.map(e => e.id === 'e1' ? { ...e, animated: isRunning() } : e)
)
```

---

### Arrow markers

```ts
// Open chevron arrowhead
{ id: 'e1', ..., markerEnd: 'arrow' }

// Filled triangle arrowhead
{ id: 'e2', ..., markerEnd: 'arrowclosed' }

// No arrowhead (default)
{ id: 'e3', ..., markerEnd: 'none' }
```

Both marker styles use `currentColor` — they automatically inherit the edge's stroke color, including dark/light mode and the selection-state color change. No configuration needed.

---

### Edge labels

Set `label: string` on any edge to render a text label at the midpoint:

```ts
{ id: 'e1', source: 'a', sourceHandle: 'out', target: 'b', targetHandle: 'in', label: '200ms' }
```

The label renders inside a rounded background rect that adapts its width to the text length. Label position tracks the edge midpoint automatically as nodes move.

---

### Edge reconnect

Every edge has invisible endpoint dots at its source and target. On hover, the dots become visible. Dragging an endpoint lets the user reconnect that end of the edge to a different handle.

**Behavior:**
- Drag the **target dot** → moves the target end; source remains fixed
- Drag the **source dot** → moves the source end; target remains fixed
- Drop on a compatible handle → fires `onEdgesChange` `'remove'` + `onConnect` for the new connection
- Drop on empty space → cancels, edge is unchanged
- Connection validation (`isValidConnection`) is checked before the reconnect is committed

This requires no configuration — reconnect is always enabled.

---

### `EdgeComponentFn<T>`

For full control, register a custom edge renderer in `createFlow({ edgeTypes })`:

```ts
type EdgeComponentFn<T = unknown> = (
  edge: FlowEdge<T>,
  source: Point,
  target: Point,
  sourcePosition: HandlePosition,
  targetPosition: HandlePosition,
) => string
```

Returns an SVG string (inner content of the edges `<svg>` layer).

---

### Path generators

#### `getBezierPath(source, target)` → `string`

| Param | Type | Description |
|-------|------|-------------|
| `source` | `Point` | Source point `{ x, y }` in canvas units |
| `target` | `Point` | Target point `{ x, y }` in canvas units |

Returns a cubic bezier SVG path `d` string.

#### `getStepPath(source, target)` → `string`

Right-angle (step) path.

#### `getStraightPath(source, target)` → `string`

Direct straight line.

#### Midpoint helpers

| Function | Description |
|----------|-------------|
| `getBezierMidpoint(src, tgt)` | Returns `Point` at the midpoint of the bezier curve |
| `getStepMidpoint(src, tgt)` | Returns `Point` at the midpoint of the step path |
| `getStraightMidpoint(src, tgt)` | Returns `Point` at the midpoint of the straight line |

---

### Geometry utilities

| Function | Signature | Description |
|----------|-----------|-------------|
| `rectsOverlap` | `(a: Rect, b: Rect) => boolean` | AABB overlap test |
| `rectFromPoints` | `(points: Point[]) => Rect` | Bounding rect from point array |

---

## Examples

### Animated edge with closed arrowhead

```ts
{
  id: 'e1',
  source: 'n1', sourceHandle: 'out',
  target: 'n2', targetHandle: 'in',
  animated: true,
  markerEnd: 'arrowclosed',
  label: 'request',
}
```

### Custom edge renderer with step path

```ts
function StepEdge(edge, source, target) {
  const d = getStepPath(source, target)
  return `<path d="${d}" stroke="#999" stroke-width="1.5" fill="none" />`
}

const flow = createFlow({
  nodeTypes: { ... },
  edgeTypes: { step: StepEdge },
})
```

### Conditionally animated edges

```ts
const isLive = signal(false)

// Toggle all edges' animation state:
effect(() => {
  edges.update(es => es.map(e => ({ ...e, animated: isLive() })))
})
```

### Full custom edge with label

```ts
function LabelledEdge(edge, source, target) {
  const d    = getBezierPath(source, target)
  const mid  = getBezierMidpoint(source, target)
  return `
    <path d="${d}" stroke="currentColor" stroke-width="2" fill="none" />
    <text x="${mid.x}" y="${mid.y}" text-anchor="middle"
          dominant-baseline="middle" font-size="11" fill="currentColor">
      ${edge.label ?? ''}
    </text>
  `
}
```

## Notes

- The default edge type is bezier. To change the default connection line style, pass `connectionLineType` to `createFlow()`.
- `markerEnd` uses `currentColor` — the arrowhead automatically follows the edge stroke color and selection-state color.
- Edge reconnect is always enabled. Use `isValidConnection` in `createFlow()` to restrict which reconnections are allowed.
- Custom edge renderers return SVG strings, not DOM nodes. Avoid inline event listeners in SVG strings — use the `onEdgesChange` callback pattern instead.
