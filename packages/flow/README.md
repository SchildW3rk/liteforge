# @liteforge/flow

[![npm version](https://img.shields.io/npm/v/@liteforge/flow)](https://www.npmjs.com/package/@liteforge/flow)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![tests passing](https://img.shields.io/badge/tests-passing-brightgreen)](https://github.com/SchildW3rk/liteforge)

A fully-featured node editor for the [LiteForge](https://github.com/SchildW3rk/liteforge) framework. Signals-based reactivity, zero Virtual DOM, zero external runtime dependencies.

---

## What it is

`@liteforge/flow` is a node-graph library for building visual editors, pipeline builders, workflow designers, and any other application that represents relationships as connected nodes. It is the LiteForge equivalent of ReactFlow — same concepts, same fully-controlled model, but built on LiteForge signals instead of React state. The result is fine-grained DOM updates: only the parts of the graph that actually changed are touched on each interaction.

The library is fully controlled: you own the `nodes` and `edges` arrays. The canvas tells you what the user wants to change via `onNodesChange` / `onEdgesChange`, and you decide whether to accept it. This makes undo/redo, validation, and server sync straightforward.

---

## Features

**Graph model**
- ✓ Fully-controlled graph model — you own the state
- ✓ Signals-based reactivity — zero Virtual DOM, fine-grained DOM updates
- ✓ Custom node types (plain DOM renderers, no framework lock-in)
- ✓ Custom edge types (bezier, step, straight, or your own path function)
- ✓ Node groups / parent–child nesting (`parentId`)
- ✓ Zero external runtime dependencies

**Interaction**
- ✓ Pan & zoom — mouse wheel, trackpad, touch pinch, middle-mouse drag
- ✓ Node drag with optional snap-to-grid
- ✓ Multi-node group drag (drag selection as a unit)
- ✓ Marquee selection (drag canvas to select a region)
- ✓ Keyboard shortcuts — Delete / Backspace to remove selected elements
- ✓ Keyboard accessibility — WCAG 2.1 AA, roving tabindex, ARIA roles
- ✓ Edge reconnect — drag either endpoint to a new handle

**Edges**
- ✓ Animated edges (CSS stroke-dashoffset, GPU-composited)
- ✓ Edge labels
- ✓ Arrow markers (open and filled)
- ✓ Connection validation — built-in self-loop guard + composable helpers
- ✓ Ghost edge preview turns red when connection is invalid

**UI components**
- ✓ MiniMap
- ✓ Controls (zoom in / zoom out / fit view)
- ✓ Node resize handles (`createNodeResizer`, 8 directions)
- ✓ Node toolbar (`createNodeToolbar`, floating, 4 positions × 3 alignments)
- ✓ Context menus — node, edge, and pane (`createContextMenu`)

**Imperative API**
- ✓ `fitView` + `fitBounds`
- ✓ `zoomTo`, `zoomIn`, `zoomOut`, `setViewport`, `getViewport`
- ✓ `getNode`, `getEdge`, `getIntersectingNodes`, `isNodeIntersecting`
- ✓ Mouse events — `onNodeMouseEnter/Leave`, `onEdgeMouseEnter/Leave`, `onViewportChange`

**Composables**
- ✓ Undo/redo — `createFlowHistory`
- ✓ Copy/paste — `createFlowClipboard`
- ✓ Auto-layout — `createAutoLayout` (Sugiyama-inspired, 4 directions)
- ✓ Viewport persistence — `createViewportPersistence` (localStorage, SSR-safe)

**Quality**
- ✓ TypeScript-first, strict mode, no `any` in public APIs
- ✓ SSR-safe — all browser API access is guarded
- ✓ Performance-optimized: batched edge effects, viewport culling (details below)

---

## Quick Start

```ts
import { createFlow, FlowCanvas, applyNodeChanges, applyEdgeChanges } from '@liteforge/flow'
import { signal } from '@liteforge/core'
import '@liteforge/flow/styles'

// --- Node renderer ---
function DefaultNode(node) {
  const el = document.createElement('div')
  el.className = 'my-node'
  el.textContent = node.data.label
  return el
}

// --- State (you own it) ---
const nodes = signal([
  { id: '1', type: 'default', position: { x: 100, y: 100 }, data: { label: 'Input' } },
  { id: '2', type: 'default', position: { x: 350, y: 100 }, data: { label: 'Process' } },
  { id: '3', type: 'default', position: { x: 600, y: 100 }, data: { label: 'Output' } },
])
const edges = signal([
  { id: 'e1-2', source: '1', sourceHandle: 'out', target: '2', targetHandle: 'in' },
  { id: 'e2-3', source: '2', sourceHandle: 'out', target: '3', targetHandle: 'in' },
])

// --- Flow handle ---
const flow = createFlow({ nodeTypes: { default: DefaultNode } })

// --- Mount ---
const canvas = FlowCanvas({
  flow,
  nodes: () => nodes(),
  edges: () => edges(),
  fitView: true,
  onNodesChange: (changes) => nodes.set(applyNodeChanges(nodes(), changes)),
  onEdgesChange: (changes) => edges.set(applyEdgeChanges(edges(), changes)),
  onConnect:     (conn)    => edges.update(es => [...es, { id: `e${Date.now()}`, ...conn }]),
  onNodeMouseEnter: (node) => console.log('hover:', node.id),
})

document.getElementById('app')!.appendChild(canvas)
```

---

## Composables

### `createFlowHistory` — Undo / Redo

```ts
import { createFlowHistory } from '@liteforge/flow'

const history = createFlowHistory(nodes, edges, { maxHistory: 50 })
history.attachKeyboard()  // Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z

// Wire to FlowCanvas instead of your own handlers:
FlowCanvas({ flow, nodes: () => nodes(), edges: () => edges(),
  onNodesChange: history.onNodesChange,
  onEdgesChange: history.onEdgesChange,
  onConnect:     history.onConnect,
})

history.undo()      // restore previous state
history.redo()      // reapply undone state
history.canUndo()   // Signal<boolean>
history.canRedo()   // Signal<boolean>
```

### `createFlowClipboard` — Copy / Paste

```ts
import { createFlowClipboard } from '@liteforge/flow'

const clipboard = createFlowClipboard(nodes, edges, { pasteOffset: { x: 20, y: 20 } })
clipboard.attachKeyboard()  // Ctrl+C / Ctrl+V

clipboard.copy()            // copies selected nodes + edges between them
clipboard.paste()           // pastes with fresh IDs and offset positions
clipboard.hasContent        // boolean — true when clipboard is non-empty
```

Edges whose source and target are both in the selection are copied too. Edges to nodes outside the selection are dropped.

### `createAutoLayout` — Automatic Layout

```ts
import { createAutoLayout, applyNodeChanges } from '@liteforge/flow'

const autoLayout = createAutoLayout({
  direction: 'LR',      // 'LR' | 'RL' | 'TB' | 'BT'
  rankSpacing: 80,
  nodeSpacing: 40,
})

const changes = autoLayout.layout(nodes(), edges())
nodes.set(applyNodeChanges(nodes(), changes))
```

`createAutoLayout` computes synchronously using a Sugiyama-inspired layered layout. Call it before mounting for large graphs to avoid a visible position jump.

### `createViewportPersistence` — Viewport Persistence

```ts
import { createViewportPersistence } from '@liteforge/flow'

const persist = createViewportPersistence('my-flow', flow, { debounce: 500 })

FlowCanvas({
  flow,
  nodes: () => nodes(),
  edges: () => edges(),
  defaultViewport: persist.savedViewport,     // restores last position on reload
  onViewportChange: persist.onViewportChange, // auto-saves on pan/zoom (debounced)
  ...
})

// Manual control
persist.save()   // write immediately
persist.clear()  // remove from storage
```

SSR-safe: `savedViewport` is `undefined` on the server and all methods are no-ops.

---

## Connection Validation

```ts
import { combineValidators, isNoSelfConnection, isNoDuplicateEdge } from '@liteforge/flow'

const flow = createFlow({
  nodeTypes,
  isValidConnection: combineValidators(
    isNoSelfConnection,
    isNoDuplicateEdge(() => edges()),
    (conn) => conn.sourceHandle !== conn.targetHandle, // custom rule
  ),
})
```

Self-connections (`source === target`) are always blocked regardless of `isValidConnection`. This guard runs first and cannot be bypassed.

---

## Performance

### Edge Batching

Before 0.3.0, each edge maintained three reactive subscriptions on the viewport transform signal. A graph with 400 edges fired 1200 effect executions per pan event. Since 0.3.0, a single batched effect handles all edges in one loop:

| Edges | Effects before | Effects after |
|-------|---------------|---------------|
| 50    | 150           | 1             |
| 400   | 1200          | 1             |
| 1000  | 3000          | 1             |

No configuration required. The change is transparent to all public APIs.

### Viewport Culling

Nodes whose bounding box is entirely outside the visible viewport (plus a 100 px margin) are hidden with `display: none`. They remain in the DOM — the MiniMap, `fitView`, and `getIntersectingNodes` all read the full node list. Selected nodes and actively dragged nodes are never culled.

No configuration required.

---

## Accessibility

`@liteforge/flow` implements the [ARIA APG composite widget pattern](https://www.w3.org/WAI/ARIA/apg/patterns/) for WCAG 2.1 AA conformance:

- Canvas root: `role="application"`, `aria-label="Flow canvas"`
- Node wrappers: `role="button"`, `aria-label` (from `node.data.label`), `aria-selected`
- Roving tabindex — `Tab` / `Shift+Tab` navigate between nodes
- `Arrow keys` move focused node 10 px (50 px with `Shift`)
- `Enter` selects; `Escape` deselects all; `Delete` / `Backspace` remove selection
- Input focus guard — shortcuts are suppressed when focus is inside a text field

---

## Installation

```sh
pnpm add @liteforge/flow @liteforge/core
```

Import the default styles once in your app entry point:

```ts
import '@liteforge/flow/css'
```

Or use the `unstyled: true` option on `FlowCanvas` and bring your own CSS.

---

## Docs

Full documentation: **[liteforge.dev/flow](https://liteforge.dev/flow)**

- [01 — Create Flow](https://liteforge.dev/flow/create-flow)
- [02 — Flow Canvas](https://liteforge.dev/flow/flow-canvas)
- [03 — Nodes](https://liteforge.dev/flow/nodes)
- [04 — Edges](https://liteforge.dev/flow/edges)
- [05 — Context Menu](https://liteforge.dev/flow/context-menu)
- [06 — Flow History](https://liteforge.dev/flow/flow-history)
- [07 — Auto Layout](https://liteforge.dev/flow/auto-layout)
- [08 — Imperative API](https://liteforge.dev/flow/imperative-api)
- [09 — Node Groups](https://liteforge.dev/flow/node-groups)
- [10 — Connection Validation](https://liteforge.dev/flow/connection-validation)
- [11 — Viewport Persistence](https://liteforge.dev/flow/viewport-persistence)
- [12 — Keyboard Accessibility](https://liteforge.dev/flow/keyboard-accessibility)
- [13 — Performance](https://liteforge.dev/flow/performance)
- [14 — Flow Clipboard](https://liteforge.dev/flow/flow-clipboard)
- [15 — Node Resizer](https://liteforge.dev/flow/node-resizer)
- [16 — Node Toolbar](https://liteforge.dev/flow/node-toolbar)

---

## License

MIT © [SchildW3rk (René)](https://github.com/SchildW3rk), Salzburg, Austria
