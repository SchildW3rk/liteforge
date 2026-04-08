---
title: "Node Groups (Parent–Child)"
category: flow
tags:
  - parentId
  - groups
  - parent
  - child
  - nested
  - lf-node-group
related:
  - FlowCanvas
  - createFlow
  - Edges
---

# Node Groups (Parent–Child)

`FlowNode` accepts an optional `parentId` field. When set, the node becomes a child of the named parent and the two are linked in both rendering and interaction.

## How it works

**Rendering** — Child nodes are rendered inside the parent node's DOM element, not at the canvas root. This means a child's z-index stacking and overflow clipping are scoped to its parent.

**Coordinates** — A child's `position` is relative to the parent's top-left corner (`{ x: 0, y: 0 }` places the child at the parent's origin).

**Dragging** — Dragging a parent moves all of its children with it. Their relative positions are preserved. Dragging a child moves only the child within the parent (the parent does not move).

**CSS class** — The parent's node wrapper receives the `lf-node-group` CSS class. Use this to style group containers separately from leaf nodes.

**Cascade removal** — When a parent node is removed via `applyNodeChanges`, all direct children and all deeper descendants are removed in the same change batch. You do not need to track or manually remove children.

---

## Defining a Parent and Child Node

```ts
import { signal } from '@liteforge/core'
import { createFlow, FlowCanvas, applyNodeChanges } from '@liteforge/flow'

const [nodes, setNodes] = signal([
  // Parent — rendered as a group container
  {
    id: 'group-1',
    type: 'group',
    position: { x: 100, y: 100 },
    data: { label: 'Processing Stage' },
  },
  // Child — position is relative to group-1's top-left
  {
    id: 'node-a',
    type: 'default',
    parentId: 'group-1',
    position: { x: 20, y: 40 },
    data: { label: 'Step A' },
  },
  {
    id: 'node-b',
    type: 'default',
    parentId: 'group-1',
    position: { x: 160, y: 40 },
    data: { label: 'Step B' },
  },
])
```

---

## Custom Group Node Renderer

Register a `'group'` node type that renders a visible container with a label. Children will appear inside it automatically.

```ts
import { createFlow, FlowCanvas } from '@liteforge/flow'

const nodeTypes = {
  group: ({ data }) => {
    const el = document.createElement('div')
    el.className = 'my-group-node'
    el.innerHTML = `<span class="my-group-label">${data.label ?? 'Group'}</span>`
    return el
  },
  default: ({ data }) => {
    const el = document.createElement('div')
    el.className = 'my-default-node'
    el.textContent = data.label ?? ''
    return el
  },
}

const flow = createFlow({ nodeTypes })
```

```css
/* Give the group a visible background and enough space for its children */
.lf-node-group .my-group-node {
  min-width: 280px;
  min-height: 120px;
  background: rgba(99, 102, 241, 0.08);
  border: 1.5px dashed #6366f1;
  border-radius: 8px;
  padding: 8px 12px;
}

.my-group-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #6366f1;
  display: block;
  margin-bottom: 6px;
}
```

---

## Accessing Children from a Node Renderer

If your node renderer needs to know which nodes it contains (for example, to show a child count badge), call `getFlowContext().getChildren(nodeId)` inside the renderer.

```ts
import { getFlowContext } from '@liteforge/flow'
import { effect } from '@liteforge/core'

const nodeTypes = {
  group: ({ node }) => {
    const ctx = getFlowContext()
    const el = document.createElement('div')
    el.className = 'my-group-node'

    const badge = document.createElement('span')
    badge.className = 'child-count'
    el.appendChild(badge)

    // Reactively update the badge when children change
    effect(() => {
      const children = ctx.getChildren(node.id)
      badge.textContent = `${children.length} node${children.length !== 1 ? 's' : ''}`
    })

    return el
  },
}
```

`getFlowContext().getChildren(id)` returns a reactive array — the `effect` above re-runs whenever nodes are added, removed, or re-parented.

---

## Cascade Removal Example

Removing the parent also removes all descendants in one `applyNodeChanges` call:

```ts
import { applyNodeChanges } from '@liteforge/flow'

function removeGroup(groupId: string) {
  setNodes(prev =>
    applyNodeChanges(prev, [{ type: 'remove', id: groupId }])
  )
  // node-a and node-b are gone too — no extra steps needed
}
```

---

## Notes

- A child can itself be a parent — nesting is not limited to two levels. Deep trees work, but keep hierarchy shallow for performance when dragging large groups.
- `parentId` must reference a node that exists in the `nodes` array at the same time. A dangling `parentId` pointing to a non-existent node is a no-op — the child renders at the canvas root as if it had no parent.
- Edges between nodes in different groups, or between a group node and a leaf node, work normally. Edge coordinates are always in canvas space regardless of nesting depth.
