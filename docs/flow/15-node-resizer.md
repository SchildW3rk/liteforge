---
title: "createNodeResizer"
category: "flow"
tags: ["resize", "createNodeResizer", "NodeResizer", "drag-handle", "width", "height", "NodeChange"]
related: ["FlowCanvas", "createFlow", "Handle"]
---

# createNodeResizer

> Add 8-direction resize handles to a node. Emits `'resize'` node changes and enforces a minimum size.

## Quick Start

```ts
import { createNodeResizer, getFlowContext } from '@liteforge/flow'

function ResizableNode(node: FlowNode<{ label: string }>) {
  const ctx     = getFlowContext()
  const resizer = createNodeResizer(node.id, ctx)

  const el = document.createElement('div')
  el.className = 'my-node'
  el.textContent = node.data.label
  el.appendChild(resizer.el)   // the resize handle overlay

  return el
}
```

## API Reference

### `createNodeResizer(nodeId, ctx, options?)` → `NodeResizerHandle`

| Parameter | Type | Description |
|-----------|------|-------------|
| `nodeId` | `string` | The ID of the node this resizer belongs to |
| `ctx` | `FlowContextValue` | The flow context from `getFlowContext()` |
| `options` | `NodeResizerOptions?` | Optional config |

**`NodeResizerOptions`:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `minWidth` | `number` | `20` | Minimum width in canvas units — resize is clamped here |
| `minHeight` | `number` | `20` | Minimum height in canvas units — resize is clamped here |

**`NodeResizerHandle`:**

| Property | Type | Description |
|----------|------|-------------|
| `el` | `HTMLElement` | The resizer overlay element. Append it inside your node renderer. |
| `dispose()` | `() => void` | Remove event listeners and the element from the DOM. |

---

## How it works

`createNodeResizer` appends 8 invisible drag handles (corners + edge midpoints) inside your node wrapper. When the user drags one:

1. The node's **CSS dimensions** update live during the drag for visual feedback
2. On pointer release, `onNodesChange` is called with `{ type: 'resize', id, width, height }`
3. `applyNodeChanges` stores the new `width`/`height` on the node object
4. `FlowCanvas` applies the explicit dimensions as inline styles on the node wrapper

Width and height are clamped to `minWidth`/`minHeight` so the node never collapses to zero.

### `NodeChange: 'resize'`

```ts
{ type: 'resize'; id: string; width: number; height: number }
```

Pass through `applyNodeChanges` like any other change:

```ts
onNodesChange={(changes) => nodes.set(applyNodeChanges(nodes(), changes))}
```

---

## CSS

The resizer adds `.lf-node-resizer` and `.lf-resize-handle` elements. Eight handles map to directional cursor variants:

```
nw ─── n ─── ne
│             │
w             e
│             │
sw ─── s ─── se
```

Each handle has an appropriate `cursor` style (`nw-resize`, `n-resize`, etc.) set automatically.

---

## Examples

### Resizable node with minimum size

```ts
function ResizableNode(node: FlowNode) {
  const ctx     = getFlowContext()
  const resizer = createNodeResizer(node.id, ctx, {
    minWidth:  80,
    minHeight: 40,
  })

  const wrapper = document.createElement('div')
  wrapper.className = 'node'
  wrapper.appendChild(resizer.el)
  return wrapper
}
```

### Reading the current node size

After resizing, `node.width` and `node.height` are populated (set by `applyNodeChanges`). Use them to size internal content:

```ts
function ResizableNode(node: FlowNode<{ label: string }>) {
  const ctx     = getFlowContext()
  const resizer = createNodeResizer(node.id, ctx)

  const wrapper = document.createElement('div')
  wrapper.style.cssText = `width:${node.width ?? 160}px;height:${node.height ?? 60}px`
  wrapper.appendChild(resizer.el)
  return wrapper
}
```

### Combined with NodeToolbar

```ts
function ResizableNode(node: FlowNode) {
  const ctx     = getFlowContext()
  const resizer = createNodeResizer(node.id, ctx)
  const toolbar = createNodeToolbar(node.id, ctx)

  toolbar.addButton({ label: 'Delete', onClick: () => {
    ctx.onNodesChange?.([{ type: 'remove', id: node.id }])
  }})

  const el = document.createElement('div')
  el.className = 'node'
  el.appendChild(resizer.el)
  return el
}
```

---

## Notes

- `createNodeResizer` must be called inside a node renderer (inside `FlowCanvas` context).
- The resizer element is absolutely positioned and fills the node wrapper — it does not affect layout of node content. Place it as the last child so content is not obscured.
- `node.width` and `node.height` on `FlowNode` carry the last resize result. When set, `FlowCanvas` applies them as inline styles. When `undefined`, the node sizes to its content naturally.
- Resize handles use `setPointerCapture` so the drag continues even if the pointer leaves the node bounds.
