---
title: "Keyboard Accessibility"
category: flow
tags:
  - keyboard
  - accessibility
  - ARIA
  - tabindex
  - roving-tabindex
  - WCAG
related:
  - FlowCanvas
  - createFlow
---

# Keyboard Accessibility

`@liteforge/flow` ships with built-in keyboard accessibility conforming to WCAG 2.1 AA. The implementation follows the [ARIA Authoring Practices Guide composite widget pattern](https://www.w3.org/WAI/ARIA/apg/patterns/). No configuration is required — all behaviour is active by default.

---

## ARIA Attributes

The library manages ARIA attributes automatically. You do not need to set any of these yourself.

### Canvas root element

```html
<div
  role="application"
  aria-label="Flow canvas"
  tabindex="0"
>
```

The `application` role tells screen readers that keyboard input is handled by the widget, not the browser. Arrow keys and other shortcuts will not be intercepted by the browser's own scroll behaviour when the canvas has focus.

### Node wrappers

```html
<div
  role="button"
  tabindex="-1"               <!-- managed by roving tabindex -->
  aria-label="<type> <id>"   <!-- or node.data.label when present -->
  aria-selected="false"       <!-- true when the node is selected -->
>
```

`aria-label` is derived in order:
1. `node.data.label` (if it is a non-empty string)
2. `"<node.type> <node.id>"` (e.g. `"process node-42"`)

---

## Roving Tabindex

Only one node holds `tabindex="0"` at any time — the currently focused node. All other nodes are `tabindex="-1"`. This prevents Tab from cycling through every node in the graph (which would be unusable for large graphs).

- The initially focused node is the first node in the `nodes()` array.
- Focus follows selection: selecting a node via `Enter` or a click transfers the roving tabindex to it.
- After `Escape` (deselect all), the roving tabindex returns to the canvas root.

---

## Keyboard Interactions

| Key | Action |
|-----|--------|
| `Tab` | Move focus to the **next** node (by array order). Does not wrap at the end — Tab out of the last node leaves the canvas entirely. |
| `Shift+Tab` | Move focus to the **previous** node. Does not wrap at the start. |
| `Enter` | Select the focused node; deselect all others. |
| `Escape` | Deselect all nodes and edges; return focus to the canvas root element. |
| `Arrow keys` | Move the focused node **10 px** in the arrow direction. Fires `onNodesChange` with a `'position'` change. |
| `Shift+Arrow` | Move the focused node **50 px** in the arrow direction. |
| `Delete` | Remove all currently selected nodes and edges. Fires `onNodesChange` / `onEdgesChange` with `'remove'` changes. |
| `Backspace` | Same as `Delete`. |

---

## Input Focus Guard

Arrow keys, `Delete`, `Backspace`, and `Enter` are ignored when the browser's focus is inside an `<input>`, `<textarea>`, or any element with `contenteditable="true"` that lives inside a node. This prevents keyboard shortcuts from interfering with text editing in custom node renderers.

```ts
// The guard checks:
const active = document.activeElement
const insideInput =
  active instanceof HTMLInputElement ||
  active instanceof HTMLTextAreaElement ||
  (active instanceof HTMLElement && active.isContentEditable)

if (insideInput) return   // let the browser handle the key
```

---

## Snap-to-Grid and Arrow Keys

When `snapToGrid` is enabled on `FlowCanvas`, Arrow key movements snap to the nearest grid point rather than moving an exact 10/50 px. The snap size comes from the `gridSize` prop (default `15`).

```ts
FlowCanvas({
  flow,
  nodes: () => nodes(),
  edges: () => edges(),
  snapToGrid: true,
  gridSize: 20,     // Arrow keys will snap to 20px grid
  onNodesChange: (changes) => setNodes(applyNodeChanges(nodes(), changes)),
})
```

---

## Custom `aria-label`

If the default label derived from `node.data.label` or `"<type> <id>"` does not meet your accessibility requirements, provide a string or a function on the `data.ariaLabel` field:

```ts
const nodes = [
  {
    id: 'step-1',
    type: 'process',
    position: { x: 0, y: 0 },
    data: {
      label: 'Validate Input',
      ariaLabel: 'Step 1 of 5: Validate user input data',
    },
  },
]
```

When `data.ariaLabel` is present it takes priority over `data.label` and the type+id fallback.

---

## Focus Management After Deletion

When selected nodes are deleted with `Delete` / `Backspace`, the focus moves to the canvas root element rather than disappearing to the browser's `<body>`. This prevents focus loss, which is a WCAG 2.4.3 failure.

---

## Screen Reader Announcements

Live region announcements are emitted for key state changes via a visually hidden `role="status"` element injected into the canvas:

| Event | Announcement |
|-------|-------------|
| Node selected | `"<label> selected"` |
| Multiple nodes selected | `"3 nodes selected"` |
| Node moved | `"<label> moved to x: 120, y: 80"` |
| Nodes deleted | `"2 nodes removed"` |
| All deselected | `"Selection cleared"` |

These announcements use `aria-live="polite"` so they do not interrupt ongoing speech.
