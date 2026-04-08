/**
 * Tests for connection validation helpers and built-in self-connection prevention.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  isNoSelfConnection,
  isNoDuplicateEdge,
  combineValidators,
} from '../src/helpers/connection-validators.js'
import type { FlowEdge } from '../src/types.js'

// ---- isNoSelfConnection ----

describe('isNoSelfConnection', () => {
  it('returns false when source === target', () => {
    expect(isNoSelfConnection({
      source: 'n1', sourceHandle: 'out',
      target: 'n1', targetHandle: 'in',
    })).toBe(false)
  })

  it('returns true when source !== target', () => {
    expect(isNoSelfConnection({
      source: 'n1', sourceHandle: 'out',
      target: 'n2', targetHandle: 'in',
    })).toBe(true)
  })

  it('compares by node id, not handle id', () => {
    // Different handles, same node → self-connection
    expect(isNoSelfConnection({
      source: 'n1', sourceHandle: 'out-a',
      target: 'n1', targetHandle: 'in-b',
    })).toBe(false)
  })
})

// ---- isNoDuplicateEdge ----

describe('isNoDuplicateEdge', () => {
  const makeEdge = (id: string, src: string, srcH: string, tgt: string, tgtH: string): FlowEdge => ({
    id, source: src, sourceHandle: srcH, target: tgt, targetHandle: tgtH,
  })

  it('returns true when no matching edge exists', () => {
    const edges = [makeEdge('e1', 'n1', 'out', 'n2', 'in')]
    const check = isNoDuplicateEdge(() => edges)
    expect(check({ source: 'n2', sourceHandle: 'out', target: 'n3', targetHandle: 'in' })).toBe(true)
  })

  it('returns false when an identical edge already exists', () => {
    const edges = [makeEdge('e1', 'n1', 'out', 'n2', 'in')]
    const check = isNoDuplicateEdge(() => edges)
    expect(check({ source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' })).toBe(false)
  })

  it('treats direction as significant (n1→n2 ≠ n2→n1)', () => {
    const edges = [makeEdge('e1', 'n1', 'out', 'n2', 'in')]
    const check = isNoDuplicateEdge(() => edges)
    // Reversed direction is a different edge
    expect(check({ source: 'n2', sourceHandle: 'in', target: 'n1', targetHandle: 'out' })).toBe(true)
  })

  it('treats handle id as significant', () => {
    const edges = [makeEdge('e1', 'n1', 'out-a', 'n2', 'in')]
    const check = isNoDuplicateEdge(() => edges)
    // Different source handle → not a duplicate
    expect(check({ source: 'n1', sourceHandle: 'out-b', target: 'n2', targetHandle: 'in' })).toBe(true)
  })

  it('reads edges lazily (reflects current graph state)', () => {
    const edges: FlowEdge[] = []
    const check = isNoDuplicateEdge(() => edges)

    const conn = { source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' }
    expect(check(conn)).toBe(true)

    edges.push(makeEdge('e1', 'n1', 'out', 'n2', 'in'))
    expect(check(conn)).toBe(false)
  })

  it('returns true when graph is empty', () => {
    const check = isNoDuplicateEdge(() => [])
    expect(check({ source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' })).toBe(true)
  })
})

// ---- combineValidators ----

describe('combineValidators', () => {
  const alwaysTrue  = () => true
  const alwaysFalse = () => false

  it('returns true when all validators pass', () => {
    const check = combineValidators(alwaysTrue, alwaysTrue)
    expect(check({ source: 'n1', sourceHandle: 'o', target: 'n2', targetHandle: 'i' })).toBe(true)
  })

  it('returns false when any validator fails', () => {
    const check = combineValidators(alwaysTrue, alwaysFalse)
    expect(check({ source: 'n1', sourceHandle: 'o', target: 'n2', targetHandle: 'i' })).toBe(false)
  })

  it('short-circuits on first false', () => {
    const second = vi.fn().mockReturnValue(true)
    const check = combineValidators(alwaysFalse, second)
    check({ source: 'n1', sourceHandle: 'o', target: 'n2', targetHandle: 'i' })
    expect(second).not.toHaveBeenCalled()
  })

  it('works with zero validators (vacuously true)', () => {
    const check = combineValidators()
    expect(check({ source: 'n1', sourceHandle: 'o', target: 'n2', targetHandle: 'i' })).toBe(true)
  })

  it('composes isNoSelfConnection + isNoDuplicateEdge correctly', () => {
    const edges: FlowEdge[] = [
      { id: 'e1', source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' },
    ]
    const check = combineValidators(
      isNoSelfConnection,
      isNoDuplicateEdge(() => edges),
    )

    // Self-connection → false
    expect(check({ source: 'n1', sourceHandle: 'out', target: 'n1', targetHandle: 'in' })).toBe(false)
    // Duplicate → false
    expect(check({ source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' })).toBe(false)
    // Valid → true
    expect(check({ source: 'n2', sourceHandle: 'out', target: 'n3', targetHandle: 'in' })).toBe(true)
  })
})

// ---- Guard logic unit tests (without DOM event wiring) ----
// happy-dom lacks document.elementsFromPoint, so we can't drive setupConnect /
// setupReconnect end-to-end. Instead we unit-test the guard predicate directly.

describe('built-in guard: self-connection is always blocked', () => {
  it('isNoSelfConnection blocks same-node connection regardless of handles', () => {
    const cases = [
      { source: 'n1', sourceHandle: 'out', target: 'n1', targetHandle: 'in' },
      { source: 'abc', sourceHandle: 'h1', target: 'abc', targetHandle: 'h2' },
    ]
    for (const conn of cases) {
      expect(isNoSelfConnection(conn)).toBe(false)
    }
  })

  it('isNoSelfConnection allows cross-node connections', () => {
    expect(isNoSelfConnection({
      source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in',
    })).toBe(true)
  })

  it('guard is applied before isValidConnection callback', () => {
    // Simulate the connect.ts guard logic inline:
    const isValidConnection = vi.fn().mockReturnValue(true)
    const onConnect = vi.fn()

    const tryConnect = (conn: { source: string; sourceHandle: string; target: string; targetHandle: string }) => {
      const builtInValid = isNoSelfConnection(conn)
      const userValid    = !isValidConnection || isValidConnection(conn)
      if (builtInValid && userValid) onConnect(conn)
    }

    // Self-connection: built-in blocks before user callback is reached
    tryConnect({ source: 'n1', sourceHandle: 'out', target: 'n1', targetHandle: 'in' })
    expect(onConnect).not.toHaveBeenCalled()
    // isValidConnection should still be called (we don't short-circuit it in this model)
    // — the guard is a separate step, not conditional invocation

    // Cross-node: both pass
    tryConnect({ source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' })
    expect(onConnect).toHaveBeenCalledOnce()
  })

  it('user isValidConnection returning false still blocks cross-node connections', () => {
    const isValidConnection = vi.fn().mockReturnValue(false)
    const onConnect = vi.fn()

    const tryConnect = (conn: { source: string; sourceHandle: string; target: string; targetHandle: string }) => {
      const builtInValid = isNoSelfConnection(conn)
      const userValid    = !isValidConnection || isValidConnection(conn)
      if (builtInValid && userValid) onConnect(conn)
    }

    tryConnect({ source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' })
    expect(onConnect).not.toHaveBeenCalled()
    expect(isValidConnection).toHaveBeenCalledOnce()
  })
})
