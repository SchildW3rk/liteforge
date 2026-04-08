---
title: "createNodeToolbar"
category: "flow"
tags: ["toolbar", "createNodeToolbar", "NodeToolbar", "floating", "position", "align", "selected"]
related: ["FlowCanvas", "createFlow", "createNodeResizer"]
---

# createNodeToolbar

> A floating toolbar anchored above, below, or beside a selected node. Repositions automatically as the node moves or the viewport changes.

## Quick Start

```ts
import { createNodeToolbar, getFlowContext } from '@liteforge/flow'

function MyNode(node: FlowNode) {
  const ctx     = getFlowContext()
  const toolbar = createNodeToolbar(node.id, ctx, {
    position: 'top',
    align: 'center',
  })

  toolbar.addButton({
    label: 'Delete',
    onClick: () => ctx.onNodesChange?.([{ type: 'remove', id: node.id }]),
    danger: true,
  })

  return document.createElement('div')  // your node content
}
```

## API Reference

### `createNodeToolbar(nodeId, ctx, options?)` → `NodeToolbarHandle`

| Parameter | Type | Description |
|-----------|------|-------------|
| `nodeId` | `string` | The ID of the node this toolbar belongs to |
| `ctx` | `FlowContextValue` | The flow context from `getFlowContext()` |
| `options` | `NodeToolbarOptions?` | Optional config |

**`NodeToolbarOptions`:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `position` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` | Which side of the node the toolbar appears on |
| `align` | `'start' \| 'center' \| 'end'` | `'center'` | Alignment along the perpendicular axis |
| `offset` | `number` | `8` | Gap between the toolbar and the node edge (canvas units) |

**`NodeToolbarHandle`:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `addButton(opts)` | `(ToolbarButtonOptions) => void` | Add a button to the toolbar |
| `addDivider()` | `() => void` | Add a visual separator between buttons |
| `dispose()` | `() => void` | Remove the toolbar from the DOM and clean up |

**`ToolbarButtonOptions`:**

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | Button label text |
| `onClick` | `() => void` | Click handler |
| `danger` | `boolean?` | Renders the button in red to indicate a destructive action |
| `disabled` | `boolean?` | Renders the button greyed-out and non-interactive |

---

## Positioning model

The toolbar is rendered **outside** the transform layer, in screen-pixel space. This means:

- It is always readable at any zoom level
- It does not scale or distort with the canvas
- It repositions correctly when the node moves, when the viewport pans, or when zoom changes

The toolbar is only visible when its node is **selected** (`node.selected === true`). It hides automatically when the node is deselected.

### Position and align

```
           align: start  center  end
                  ┌──────┬──────┬──────┐
position: top     │ Btn  │ Btn  │ Btn  │
                  └──────┴──────┴──────┘
                  ┌────────────────────┐
                  │                    │  ← node
                  └────────────────────┘

position: left    ┌──────┐
    align: center │ Btn  │ ← left of node, centered vertically
                  └──────┘
```

---

## Examples

### Delete + duplicate toolbar

```ts
function MyNode(node: FlowNode) {
  const ctx     = getFlowContext()
  const toolbar = createNodeToolbar(node.id, ctx, { position: 'top' })

  toolbar.addButton({
    label: 'Duplicate',
    onClick: () => {
      const copy: FlowNode = {
        ...node,
        id: `${node.id}-copy`,
        position: { x: node.position.x + 20, y: node.position.y + 20 },
      }
      ctx.onNodesChange?.([{ type: 'add', node: copy }])
    },
  })

  toolbar.addDivider()

  toolbar.addButton({
    label: 'Delete',
    danger: true,
    onClick: () => ctx.onNodesChange?.([{ type: 'remove', id: node.id }]),
  })

  const el = document.createElement('div')
  el.className = 'my-node'
  return el
}
```

### Bottom-aligned edit toolbar

```ts
const toolbar = createNodeToolbar(node.id, ctx, {
  position: 'bottom',
  align: 'start',
  offset: 4,
})

toolbar.addButton({ label: 'Edit', onClick: () => openEditModal(node) })
toolbar.addButton({ label: 'Copy', onClick: () => clipboard.copy() })
```

### Right-side toolbar with disabled state

```ts
const toolbar = createNodeToolbar(node.id, ctx, { position: 'right' })

toolbar.addButton({
  label: 'Connect all',
  disabled: !hasAvailableTargets(node),
  onClick: () => connectAllTargets(node),
})
```

---

## CSS

The toolbar uses `.lf-node-toolbar`, `.lf-toolbar-btn`, `.lf-toolbar-btn--danger`, and `.lf-toolbar-divider` classes. All are included in `@liteforge/flow/styles`.

Override for custom styling:

```css
.lf-node-toolbar {
  background: #1e1e1e;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 4px;
  gap: 4px;
}

.lf-toolbar-btn {
  font-size: 12px;
  padding: 3px 8px;
}
```

---

## Notes

- The toolbar is rendered in **screen space**, not canvas space. It does not participate in the SVG coordinate system.
- Visibility is tied to `node.selected`. The toolbar cannot be shown programmatically for an unselected node.
- `createNodeToolbar` must be called inside a node renderer (inside `FlowCanvas` context) so it can access the canvas root element for positioning.
- Multiple toolbars on the same node at different positions are supported.
