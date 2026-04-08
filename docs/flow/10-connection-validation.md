---
title: "Connection Validation"
category: flow
tags:
  - isValidConnection
  - isNoSelfConnection
  - isNoDuplicateEdge
  - combineValidators
  - validation
related:
  - createFlow
  - FlowCanvas
  - Edges
---

# Connection Validation

`@liteforge/flow` lets you control which connections are allowed before they are committed to the edge list. Validation happens at drag-end, before `onConnect` fires.

---

## Built-in Guard: Self-Connections

Regardless of any `isValidConnection` prop, the library always blocks connections where the source and target handle belong to the same node (`connection.source === connection.target`). This guard runs first and cannot be bypassed by `isValidConnection`.

> **If you need self-connections:** This is intentional — self-loops have no valid use case in a directed flow graph. If your domain is an exception, file an issue.

---

## `isValidConnection`

Pass a synchronous predicate to `FlowCanvas` to add your own rules. It receives the pending connection and must return `true` to allow it.

```ts
interface Connection {
  source: string
  sourceHandle: string | null
  target: string
  targetHandle: string | null
}

type ConnectionValidator = (connection: Connection) => boolean
```

```ts
FlowCanvas({
  flow,
  nodes: () => nodes(),
  edges: () => edges(),
  isValidConnection: (conn) => {
    // Only allow connections from 'output' handles to 'input' handles
    return conn.sourceHandle === 'output' && conn.targetHandle === 'input'
  },
  onConnect: (conn) => setEdges(prev => addEdge(prev, conn)),
})
```

---

## Helper: `isNoSelfConnection`

A ready-made validator that mirrors the built-in guard. Useful when composing validators — having it explicit makes the rule set self-documenting.

```ts
import { isNoSelfConnection } from '@liteforge/flow'

isNoSelfConnection({ source: 'a', target: 'b' })  // true  — allowed
isNoSelfConnection({ source: 'a', target: 'a' })  // false — blocked
```

---

## Helper: `isNoDuplicateEdge`

A factory that returns a validator blocking connections that would create a duplicate edge. Two edges are considered duplicates when they share the same `(source, sourceHandle, target, targetHandle)` tuple.

```ts
import { isNoDuplicateEdge } from '@liteforge/flow'

// Pass a getter so the validator always reads the latest edge list
const noDuplicates = isNoDuplicateEdge(() => edges())
```

---

## Helper: `combineValidators`

AND-composes multiple validators with short-circuit evaluation. The first validator that returns `false` stops the chain.

```ts
import { combineValidators } from '@liteforge/flow'

type ConnectionValidator = (conn: Connection) => boolean

function combineValidators(...validators: ConnectionValidator[]): ConnectionValidator
```

---

## Full Composition Pattern

```ts
import { createFlow, FlowCanvas, isNoSelfConnection, isNoDuplicateEdge, combineValidators, addEdge, applyEdgeChanges } from '@liteforge/flow'
import { signal } from '@liteforge/core'

const [edges, setEdges] = signal([...])

function myTypeCheck(conn: Connection): boolean {
  // Example: source handles named 'number-out' may only connect to 'number-in'
  if (conn.sourceHandle?.endsWith('-out') && conn.targetHandle?.endsWith('-in')) {
    const outType = conn.sourceHandle.replace('-out', '')
    const inType  = conn.targetHandle.replace('-in', '')
    return outType === inType
  }
  return true
}

const flow = createFlow({
  nodeTypes,
  isValidConnection: combineValidators(
    isNoSelfConnection,
    isNoDuplicateEdge(() => edges()),
    myTypeCheck,
  ),
})
```

```ts
FlowCanvas({
  flow,
  nodes: () => nodes(),
  edges: () => edges(),
  onConnect: (conn) => setEdges(prev => addEdge(prev, conn)),
  onEdgesChange: (changes) => setEdges(prev => applyEdgeChanges(prev, changes)),
})
```

---

## Visual Feedback

When a connection attempt is blocked by `isValidConnection`, the ghost edge (drag preview) turns red. No additional configuration is needed — the library tracks the validation result during the drag and applies the `lf-ghost-edge--invalid` CSS class automatically.

You can override the color:

```css
.lf-ghost-edge--invalid {
  stroke: #f97316;  /* your brand's "error" color */
}
```

---

## Order of Guards

1. Built-in self-connection guard (`source === target`) — always runs first
2. `isValidConnection` (your predicate, or `combineValidators` result) — runs second
3. `onConnect` — only called when both guards pass
