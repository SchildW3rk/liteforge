---
title: "Context Menu"
category: "flow"
tags: ["contextMenu", "nodeContextMenu", "edgeContextMenu", "paneContextMenu", "right-click"]
related: ["FlowCanvas", "createFlow", "Edges"]
---

# Context Menu

> Right-click menus for nodes, edges, and the canvas background — configured via props on `FlowCanvas`.

## Quick Start

```ts
import { FlowCanvas, createFlow } from '@liteforge/flow'

const canvas = FlowCanvas({
  flow,
  nodes: () => nodes(),
  edges: () => edges(),

  nodeContextMenu: [
    {
      label: 'Duplicate',
      action: (node) => {
        const copy = { ...node, id: `${node.id}-copy`, position: { x: node.position.x + 20, y: node.position.y + 20 } }
        nodes.update(ns => [...ns, copy])
      },
    },
    {
      label: 'Delete',
      action: (node) => nodes.update(ns => ns.filter(n => n.id !== node.id)),
    },
  ],

  edgeContextMenu: [
    {
      label: 'Remove edge',
      action: (edge) => edges.update(es => es.filter(e => e.id !== edge.id)),
    },
  ],

  paneContextMenu: [
    {
      label: 'Add node here',
      action: (position) => {
        nodes.update(ns => [...ns, { id: `n${Date.now()}`, type: 'default', position, data: {} }])
      },
    },
  ],
})
```

## API Reference

### `nodeContextMenu`

```ts
nodeContextMenu?: NodeContextMenuItem[]
```

Items shown when the user right-clicks a **node**. The `action` callback receives the clicked `FlowNode`.

```ts
interface NodeContextMenuItem {
  label:     string
  disabled?: boolean
  action:    (node: FlowNode) => void
}
```

### `edgeContextMenu`

```ts
edgeContextMenu?: EdgeContextMenuItem[]
```

Items shown when the user right-clicks an **edge**. The `action` callback receives the clicked `FlowEdge`.

```ts
interface EdgeContextMenuItem {
  label:     string
  disabled?: boolean
  action:    (edge: FlowEdge) => void
}
```

### `paneContextMenu`

```ts
paneContextMenu?: PaneContextMenuItem[]
```

Items shown when the user right-clicks the **canvas background** (not on a node or edge). The `action` callback receives the canvas-space position where the user clicked — useful for placing new nodes at the cursor.

```ts
interface PaneContextMenuItem {
  label:     string
  disabled?: boolean
  /** Canvas-space position of the right-click */
  action:    (position: Point) => void
}
```

### Disabled items

Set `disabled: true` on any item to render it greyed-out and non-interactive:

```ts
nodeContextMenu: [
  {
    label: 'Rename',
    disabled: true,
    action: () => {},
  },
]
```

## Notes

- Context menus are dismissed automatically on any click outside the menu.
- Nodes and edges call `stopPropagation` on `contextmenu` so pane and node/edge menus never fire simultaneously.
- The canvas position passed to `paneContextMenu` actions is in canvas coordinates — it accounts for the current pan and zoom, so nodes created at that position appear exactly under the cursor.
