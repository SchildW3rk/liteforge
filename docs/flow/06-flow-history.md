---
title: "createFlowHistory"
category: "flow"
tags: ["history", "undo", "redo", "createFlowHistory", "keyboard"]
related: ["FlowCanvas", "createFlow"]
---

# createFlowHistory

> Undo/redo for your flow graph. A fully user-space composable — the framework stays stateless.

## Quick Start

```ts
import { createFlowHistory, FlowCanvas, createFlow } from '@liteforge/flow'
import { signal } from '@liteforge/core'

const nodes = signal<FlowNode[]>([...])
const edges = signal<FlowEdge[]>([...])

const history = createFlowHistory(nodes, edges)

// Wire keyboard shortcuts (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z):
history.attachKeyboard()

const canvas = FlowCanvas({
  flow,
  nodes: () => nodes(),
  edges: () => edges(),
  onNodesChange: history.onNodesChange,
  onEdgesChange: history.onEdgesChange,
  onConnect:     history.onConnect,
})
```

## API Reference

### `createFlowHistory(nodes, edges, options?)` → `FlowHistoryResult`

| Parameter | Type | Description |
|-----------|------|-------------|
| `nodes` | `Signal<FlowNode[]>` | Your node signal — history reads and writes it directly |
| `edges` | `Signal<FlowEdge[]>` | Your edge signal |
| `options` | `FlowHistoryOptions?` | Optional config |

**`FlowHistoryOptions`:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxHistory` | `number` | `100` | Maximum undo steps before oldest entries are dropped |

**`FlowHistoryResult`:**

| Property | Type | Description |
|----------|------|-------------|
| `onNodesChange` | `(changes: NodeChange[]) => void` | Pass to `FlowCanvas` in place of your own handler |
| `onEdgesChange` | `(changes: EdgeChange[]) => void` | Pass to `FlowCanvas` in place of your own handler |
| `onConnect` | `(connection: Connection) => void` | Pass to `FlowCanvas` in place of your own handler |
| `undo` | `() => void` | Revert to previous snapshot |
| `redo` | `() => void` | Re-apply previously undone snapshot |
| `canUndo` | `Signal<boolean>` | `true` when undo stack is non-empty |
| `canRedo` | `Signal<boolean>` | `true` when redo stack is non-empty |
| `attachKeyboard` | `(target?: EventTarget) => () => void` | Wire Ctrl+Z/Y to a target (default: `document`). Returns a cleanup function. |

## Examples

### Undo/Redo buttons

```ts
import { effect } from '@liteforge/core'

const undoBtn = document.createElement('button')
const redoBtn = document.createElement('button')

effect(() => { undoBtn.disabled = !history.canUndo() })
effect(() => { redoBtn.disabled = !history.canRedo() })

undoBtn.addEventListener('click', () => history.undo())
redoBtn.addEventListener('click', () => history.redo())
```

### Scoped keyboard shortcuts

By default `attachKeyboard()` listens on `document`. To scope shortcuts to the canvas only:

```ts
const canvas = FlowCanvas({ ... }) as HTMLElement

// Pass the root element — shortcuts only fire when the canvas is focused
const cleanup = history.attachKeyboard(canvas)

// Cleanup when unmounting:
cleanup()
```

### Limit history depth

```ts
const history = createFlowHistory(nodes, edges, { maxHistory: 20 })
```

## What gets tracked

Only **structural** changes push a new undo entry:

| Change type | Tracked? |
|-------------|----------|
| `'position'` | ✅ Node drag |
| `'remove'` | ✅ Delete node/edge |
| `'data'` | ✅ Node data update |
| `'select'` | ❌ Selection is UI state only |
| `onConnect` | ✅ New connection |

Selection changes are never pushed — they don't affect the graph structure and undo-ing a selection change would be unexpected.

## Notes

- `createFlowHistory` is a user-space helper. It applies changes to your signals and manages its own stacks — `FlowCanvas` itself has no awareness of history.
- Every new structural change clears the redo stack (standard undo/redo contract).
- When `maxHistory` is reached, the oldest entry is dropped (FIFO).
- `attachKeyboard` intercepts `Ctrl+Z`, `Ctrl+Y`, and `Ctrl+Shift+Z`. It does **not** interfere with text input fields — the guard checks `e.key` only when no modifier conflict exists.
