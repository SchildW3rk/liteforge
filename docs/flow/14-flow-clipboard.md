---
title: "createFlowClipboard"
category: "flow"
tags: ["clipboard", "copy", "paste", "createFlowClipboard", "Ctrl+C", "Ctrl+V", "duplicate"]
related: ["FlowCanvas", "createFlow", "createFlowHistory"]
---

# createFlowClipboard

> Copy and paste nodes (and the edges between them) with fresh IDs and a configurable position offset. Keyboard shortcuts included.

## Quick Start

```ts
import { createFlowClipboard, FlowCanvas, createFlow } from '@liteforge/flow'
import { signal } from '@liteforge/core'

const nodes = signal<FlowNode[]>([...])
const edges = signal<FlowEdge[]>([...])

const clipboard = createFlowClipboard(nodes, edges)

// Wire Ctrl+C / Ctrl+V globally:
clipboard.attachKeyboard()

// Or wire to toolbar buttons:
copyBtn.addEventListener('click', () => clipboard.copy())
pasteBtn.addEventListener('click', () => clipboard.paste())
```

## API Reference

### `createFlowClipboard(nodes, edges, options?)` → `FlowClipboardResult`

| Parameter | Type | Description |
|-----------|------|-------------|
| `nodes` | `Signal<FlowNode[]>` | Your node signal — clipboard reads and writes it directly |
| `edges` | `Signal<FlowEdge[]>` | Your edge signal |
| `options` | `FlowClipboardOptions?` | Optional config |

**`FlowClipboardOptions`:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pasteOffset` | `{ x: number, y: number }` | `{ x: 20, y: 20 }` | Position offset applied to pasted nodes so copies don't land on top of originals |
| `generateId` | `(originalId: string) => string` | `(id) => \`${id}-copy-${Date.now()}\`` | Custom ID generator for pasted nodes and edges. Must return a unique string. |

**`FlowClipboardResult`:**

| Property | Type | Description |
|----------|------|-------------|
| `copy()` | `() => void` | Copy all currently-selected nodes (and edges between them) to the internal clipboard. No-op when nothing is selected. |
| `paste()` | `() => string[]` | Paste clipboard contents with fresh IDs and offset positions. Returns the IDs of the pasted nodes, or `[]` if clipboard is empty. |
| `hasContent` | `boolean` | `true` when the clipboard holds at least one node. |
| `attachKeyboard` | `(target?: EventTarget) => () => void` | Wire Ctrl+C / Ctrl+V to a target (default: `document`). Returns a cleanup function. |

---

## Paste behavior

When `paste()` is called:

1. Each copied node gets a **fresh ID** via `generateId`
2. Positions are shifted by `pasteOffset`
3. **Edges between copied nodes** are also pasted with remapped source/target IDs — edges to nodes outside the selection are dropped
4. All existing nodes are **deselected**; pasted nodes come in **selected** (so the user can see what was just pasted)

---

## Examples

### Basic copy/paste

```ts
const clipboard = createFlowClipboard(nodes, edges)
clipboard.attachKeyboard()  // Ctrl+C / Ctrl+V
```

### Custom paste offset and ID generator

```ts
const clipboard = createFlowClipboard(nodes, edges, {
  pasteOffset: { x: 40, y: 40 },
  generateId: (id) => `${id}-${crypto.randomUUID()}`,
})
```

### Duplicate button (copy + immediate paste)

```ts
const clipboard = createFlowClipboard(nodes, edges)

duplicateBtn.addEventListener('click', () => {
  clipboard.copy()
  clipboard.paste()
})
```

### Scoped keyboard shortcuts

```ts
const canvas = FlowCanvas({ ... }) as HTMLElement
const cleanup = clipboard.attachKeyboard(canvas)

// Cleanup when unmounting:
cleanup()
```

### Checking clipboard state before rendering paste button

```ts
import { effect } from '@liteforge/core'

const clipboard = createFlowClipboard(nodes, edges)

// In happy-dom: hasContent is a plain getter — wire manually if reactive UI is needed
pasteBtn.addEventListener('click', () => {
  if (clipboard.hasContent) clipboard.paste()
})
```

---

## Notes

- `createFlowClipboard` is a user-space helper. `FlowCanvas` has no awareness of the clipboard — it reads and writes your signals directly.
- Only edges where **both** source and target are in the copied selection are included in the paste. Edges to nodes outside the selection are silently dropped.
- The clipboard is **in-memory only** — it does not write to the system clipboard (`navigator.clipboard`). Paste does not work across page reloads.
- `attachKeyboard` intercepts `Ctrl+C` and `Ctrl+V`. It does not fire when an `<input>` or `<textarea>` is focused.
