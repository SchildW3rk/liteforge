---
title: "createViewportPersistence"
category: flow
tags:
  - viewport
  - persistence
  - localStorage
  - createViewportPersistence
  - SSR
related:
  - FlowCanvas
  - createFlow
---

# createViewportPersistence

`createViewportPersistence` is a composable that keeps the flow viewport in sync with `localStorage`. On page reload the user returns to exactly where they left off.

---

## Import

```ts
import { createViewportPersistence } from '@liteforge/flow'
```

---

## API

```ts
function createViewportPersistence(
  storageKey: string,
  flow: FlowHandle,
  options?: ViewportPersistenceOptions,
): ViewportPersistence
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `storageKey` | `string` | The `localStorage` key under which the viewport is stored. Use a unique key per flow if you have multiple canvases. |
| `flow` | `FlowHandle` | The handle returned by `createFlow()`. |
| `options` | `ViewportPersistenceOptions?` | Optional configuration (see below). |

### Options

```ts
interface ViewportPersistenceOptions {
  /**
   * Debounce delay in milliseconds for auto-save via `onViewportChange`.
   * Default: 300
   */
  debounce?: number

  /**
   * Called when a read or write operation throws (e.g. storage quota exceeded,
   * or localStorage is blocked by a privacy setting).
   * Default: silent — errors are swallowed.
   */
  onError?: (err: unknown) => void
}
```

### Return value

```ts
interface ViewportPersistence {
  /**
   * The viewport loaded from localStorage during initialisation.
   * Pass this as `defaultViewport` on FlowCanvas.
   * `undefined` when no saved viewport exists or when running on the server.
   */
  savedViewport: Transform | undefined

  /**
   * Write the current viewport to localStorage immediately.
   * Safe to call at any time — no-op before canvas mounts.
   */
  save(): void

  /**
   * Remove the saved viewport from localStorage.
   */
  clear(): void

  /**
   * Wire this to the `onViewportChange` prop on FlowCanvas.
   * It debounces writes so rapid pan/zoom events do not saturate storage.
   */
  onViewportChange(viewport: Viewport): void
}
```

---

## SSR Safety

`createViewportPersistence` never accesses `localStorage` during server-side rendering:

- `savedViewport` is always `undefined` on the server.
- `save()`, `clear()`, and `onViewportChange()` are all no-ops on the server.
- The guard is a `typeof window !== 'undefined'` check — no try/catch required on your side.

---

## Full Wiring Example

```ts
import { createFlow, FlowCanvas, createViewportPersistence, applyNodeChanges, applyEdgeChanges } from '@liteforge/flow'
import { signal } from '@liteforge/core'

const [nodes, setNodes] = signal([...])
const [edges, setEdges] = signal([...])

const flow = createFlow({ nodeTypes })

const persist = createViewportPersistence('my-flow-vp', flow, {
  debounce: 500,
  onError: (err) => console.warn('Viewport storage error:', err),
})

const canvas = FlowCanvas({
  flow,
  nodes: () => nodes(),
  edges: () => edges(),
  // Restore the saved position; if undefined FlowCanvas uses its own default
  defaultViewport: persist.savedViewport,
  // Auto-save on every viewport change (debounced)
  onViewportChange: persist.onViewportChange,
  onNodesChange: (changes) => setNodes(applyNodeChanges(nodes(), changes)),
  onEdgesChange: (changes) => setEdges(applyEdgeChanges(edges(), changes)),
})
```

---

## Manual Save / Clear

You can also save or clear the viewport on demand — for example as part of a "Save session" button or a "Reset layout" action.

```ts
// Save immediately (e.g. before navigation away)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    persist.save()
  }
})

// Clear when the user resets the flow to defaults
function onResetLayout() {
  persist.clear()
  flow.setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 300 })
}
```

---

## Multiple Canvases

Use a distinct `storageKey` for each canvas on the page. The key should be stable across page loads — do not derive it from a randomly generated id.

```ts
const persistLeft  = createViewportPersistence('pipeline-editor-left',  flowLeft)
const persistRight = createViewportPersistence('pipeline-editor-right', flowRight)
```

---

## Notes

- The `Transform` type is an alias for `Viewport` (`{ x, y, zoom }`). The field is named `savedViewport` to make its purpose clear at the call site.
- `onViewportChange` is called by `FlowCanvas` on every pan and zoom event, even rapid ones during trackpad gestures. The built-in debounce (default 300 ms) prevents unnecessary writes without losing the final position.
- If `localStorage` throws (quota exceeded, private-browsing restrictions, etc.) the `onError` callback receives the error. The flow continues to work normally — persistence simply stops.
