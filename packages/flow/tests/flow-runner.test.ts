import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FlowNode, FlowEdge } from '../src/types.js'
import { createFlowRunner, createFlowRunnerSignals } from '../src/helpers/flow-runner.js'
import type { FlowRunnerState } from '../src/helpers/flow-runner.js'

// ---- Fixtures ----------------------------------------------------------------

function node(id: string, type: string): FlowNode {
  return { id, type, position: { x: 0, y: 0 }, data: {} }
}

function edge(id: string, source: string, target: string, sourceHandle = 'out', targetHandle = 'in'): FlowEdge {
  return { id, source, sourceHandle, target, targetHandle }
}

// ---- Helpers -----------------------------------------------------------------

/** Collect all onFlush calls */
function makeFlushCollector() {
  const snapshots: FlowRunnerState[] = []
  const onFlush = (s: FlowRunnerState) => {
    snapshots.push({
      nodeStates:  new Map(s.nodeStates),
      nodeOutputs: new Map(s.nodeOutputs),
      nodeErrors:  new Map(s.nodeErrors),
      log:         [...s.log],
    })
  }
  return { snapshots, onFlush }
}

// =============================================================================
// Basic traversal
// =============================================================================

describe('createFlowRunner — basic traversal', () => {
  it('runs a single node and marks it success', async () => {
    const execute = vi.fn().mockResolvedValue({ output: 42 })
    const { onFlush, snapshots } = makeFlushCollector()
    const runner = createFlowRunner({
      executors: { trigger: execute },
      onFlush,
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const n = node('n1', 'trigger')
    const result = await runner.run(n, [n], [])
    expect(execute).toHaveBeenCalledOnce()
    expect(result.nodeStates.get('n1')).toBe('success')
    expect(result.nodeOutputs.get('n1')).toBe(42)
    expect(snapshots.length).toBeGreaterThanOrEqual(2) // pending + running, then success
  })

  it('follows a linear chain A→B→C', async () => {
    const order: string[] = []
    const runner = createFlowRunner({
      executors: {
        a: ({ payload }) => { order.push('a'); return { output: (payload as number ?? 0) + 1 } },
        b: ({ payload }) => { order.push('b'); return { output: (payload as number) + 10 } },
        c: ({ payload }) => { order.push('c'); return { output: (payload as number) + 100 } },
      },
      onFlush: () => {},
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const [na, nb, nc] = [node('a', 'a'), node('b', 'b'), node('c', 'c')]
    const edges = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')]
    const result = await runner.run(na, [na, nb, nc], edges)
    expect(order).toEqual(['a', 'b', 'c'])
    expect(result.nodeOutputs.get('c')).toBe(111) // 1 + 10 + 100
  })

  it('passes payload from predecessor to successor', async () => {
    const received: unknown[] = []
    const runner = createFlowRunner({
      executors: {
        src:  () => ({ output: { value: 99 } }),
        sink: ({ payload }) => { received.push(payload); return { output: null } },
      },
      onFlush: () => {},
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const [ns, nd] = [node('src', 'src'), node('sink', 'sink')]
    await runner.run(ns, [ns, nd], [edge('e1', 'src', 'sink')])
    expect(received[0]).toEqual({ value: 99 })
  })

  it('unknown node type passes payload through', async () => {
    const runner = createFlowRunner({
      executors: {},
      onFlush: () => {},
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const n = node('n1', 'unknown')
    const result = await runner.run(n, [n], [])
    expect(result.nodeStates.get('n1')).toBe('success')
    expect(result.nodeOutputs.get('n1')).toBeNull() // payload was null (start)
  })

  it('does not visit the same node twice (cycle guard)', async () => {
    const execute = vi.fn().mockReturnValue({ output: 1 })
    const runner = createFlowRunner({
      executors: { x: execute },
      onFlush: () => {},
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const [na, nb] = [node('a', 'x'), node('b', 'x')]
    // a→b + b→a (cycle)
    const edges = [edge('e1', 'a', 'b'), edge('e2', 'b', 'a')]
    await runner.run(na, [na, nb], edges)
    expect(execute).toHaveBeenCalledTimes(2) // each visited once
  })
})

// =============================================================================
// Error handling
// =============================================================================

describe('createFlowRunner — error handling', () => {
  it('marks a node as error on throw', async () => {
    const runner = createFlowRunner({
      executors: { fail: () => { throw new Error('boom') } },
      onFlush: () => {},
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const n = node('n1', 'fail')
    const result = await runner.run(n, [n], [])
    expect(result.nodeStates.get('n1')).toBe('error')
    expect(result.nodeErrors.get('n1')).toBe('boom')
    expect(result.log.some(l => l.includes('boom'))).toBe(true)
  })

  it('stops traversal after an error — downstream not executed', async () => {
    const downstream = vi.fn().mockReturnValue({ output: null })
    const runner = createFlowRunner({
      executors: {
        src:  () => { throw new Error('fail') },
        sink: downstream,
      },
      onFlush: () => {},
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const [ns, nd] = [node('src', 'src'), node('sink', 'sink')]
    await runner.run(ns, [ns, nd], [edge('e1', 'src', 'sink')])
    expect(downstream).not.toHaveBeenCalled()
  })

  it('uses string representation for non-Error throws', async () => {
    const runner = createFlowRunner({
      executors: { x: () => { throw 'oops' } },
      onFlush: () => {},
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const n = node('n1', 'x')
    const result = await runner.run(n, [n], [])
    expect(result.nodeErrors.get('n1')).toBe('oops')
  })
})

// =============================================================================
// Branch / skipHandles
// =============================================================================

describe('createFlowRunner — branching', () => {
  it('follows outHandle to the correct branch', async () => {
    const visited: string[] = []
    const runner = createFlowRunner({
      executors: {
        cond:  () => ({ output: {}, outHandle: 'true' }),
        true:  () => { visited.push('true');  return { output: 1 } },
        false: () => { visited.push('false'); return { output: 0 } },
      },
      onFlush: () => {},
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const [nc, nt, nf] = [node('c', 'cond'), node('t', 'true'), node('f', 'false')]
    const edges = [
      edge('e1', 'c', 't', 'true',  'in'),
      edge('e2', 'c', 'f', 'false', 'in'),
    ]
    await runner.run(nc, [nc, nt, nf], edges)
    expect(visited).toEqual(['true'])
  })

  it('marks skipHandles downstream as skipped', async () => {
    const runner = createFlowRunner({
      executors: {
        cond: () => ({ output: {}, outHandle: 'true', skipHandles: ['false'] }),
        true:  () => ({ output: 1 }),
        false: () => ({ output: 0 }),
      },
      onFlush: () => {},
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const [nc, nt, nf] = [node('c', 'cond'), node('t', 'true'), node('f', 'false')]
    const edges = [
      edge('e1', 'c', 't', 'true',  'in'),
      edge('e2', 'c', 'f', 'false', 'in'),
    ]
    const result = await runner.run(nc, [nc, nt, nf], edges)
    expect(result.nodeStates.get('f')).toBe('skipped')
    expect(result.nodeStates.get('t')).toBe('success')
  })

  it('default outHandle is "out" when not specified', async () => {
    const visited: string[] = []
    const runner = createFlowRunner({
      executors: {
        src:  () => ({ output: 1 }),
        sink: () => { visited.push('sink'); return { output: 2 } },
      },
      onFlush: () => {},
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const [ns, nd] = [node('src', 'src'), node('sink', 'sink')]
    await runner.run(ns, [ns, nd], [edge('e1', 'src', 'sink', 'out', 'in')])
    expect(visited).toEqual(['sink'])
  })
})

// =============================================================================
// ExecuteContext
// =============================================================================

describe('createFlowRunner — ExecuteContext', () => {
  it('provides data, payload, and log to executor', async () => {
    interface MyData { value: number }
    let capturedCtx: { data: unknown; payload: unknown; logMsgs: string[] } | undefined

    const runner = createFlowRunner({
      executors: {
        x: (ctx) => {
          capturedCtx = { data: ctx.data, payload: ctx.payload, logMsgs: [] }
          ctx.log('hello')
          ctx.log('world')
          capturedCtx.logMsgs = ['hello', 'world']
          return { output: null }
        },
      },
      onFlush: () => {},
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const n: FlowNode<MyData> = { id: 'n1', type: 'x', position: { x: 0, y: 0 }, data: { value: 7 } }
    await runner.run(n, [n], [])
    expect(capturedCtx?.data).toEqual({ value: 7 })
    expect(capturedCtx?.payload).toBeNull()
    expect(capturedCtx?.logMsgs).toEqual(['hello', 'world'])
  })

  it('log messages appear in result.log', async () => {
    const runner = createFlowRunner({
      executors: { x: ({ log }) => { log('step 1'); log('step 2'); return { output: null } } },
      onFlush: () => {},
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const n = node('n1', 'x')
    const result = await runner.run(n, [n], [])
    expect(result.log).toContain('step 1')
    expect(result.log).toContain('step 2')
  })
})

// =============================================================================
// Result normalization
// =============================================================================

describe('createFlowRunner — result normalization', () => {
  it('plain value return is treated as output', async () => {
    const runner = createFlowRunner({
      executors: { x: () => 'hello' },
      onFlush: () => {},
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const n = node('n1', 'x')
    const result = await runner.run(n, [n], [])
    expect(result.nodeOutputs.get('n1')).toBe('hello')
  })

  it('{ output } object is unwrapped — stores the inner value', async () => {
    const runner = createFlowRunner({
      executors: { x: () => ({ output: { status: 200 } }) },
      onFlush: () => {},
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const n = node('n1', 'x')
    const result = await runner.run(n, [n], [])
    expect(result.nodeOutputs.get('n1')).toEqual({ status: 200 })
  })

  it('async executors are awaited', async () => {
    const runner = createFlowRunner({
      executors: {
        x: async () => {
          await new Promise(r => setTimeout(r, 1))
          return { output: 'async-result' }
        },
      },
      onFlush: () => {},
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const n = node('n1', 'x')
    const result = await runner.run(n, [n], [])
    expect(result.nodeOutputs.get('n1')).toBe('async-result')
  })
})

// =============================================================================
// onFlush
// =============================================================================

describe('createFlowRunner — onFlush', () => {
  it('calls onFlush with pending state at start', async () => {
    const { onFlush, snapshots } = makeFlushCollector()
    const runner = createFlowRunner({
      executors: { x: () => ({ output: null }) },
      onFlush,
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const [na, nb] = [node('a', 'x'), node('b', 'x')]
    await runner.run(na, [na, nb], [edge('e1', 'a', 'b')])
    // First snapshot: both pending
    expect(snapshots[0].nodeStates.get('a')).toBe('pending')
    expect(snapshots[0].nodeStates.get('b')).toBe('pending')
  })

  it('calls onFlush with running then success for a node', async () => {
    const { onFlush, snapshots } = makeFlushCollector()
    const runner = createFlowRunner({
      executors: { x: () => ({ output: null }) },
      onFlush,
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const n = node('n1', 'x')
    await runner.run(n, [n], [])
    const statuses = snapshots.map(s => s.nodeStates.get('n1'))
    expect(statuses).toContain('running')
    expect(statuses).toContain('success')
  })

  it('returns a snapshot with the same content as the final result', async () => {
    const { onFlush, snapshots } = makeFlushCollector()
    const runner = createFlowRunner({
      executors: { x: () => ({ output: 'done' }) },
      onFlush,
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const n = node('n1', 'x')
    const result = await runner.run(n, [n], [])
    const last = snapshots[snapshots.length - 1]
    expect(last.nodeStates.get('n1')).toBe(result.nodeStates.get('n1'))
  })
})

// =============================================================================
// onEdgeStatusChange
// =============================================================================

describe('createFlowRunner — onEdgeStatusChange', () => {
  it('calls onEdgeStatusChange(edgeId, true) when source is running', async () => {
    const calls: [string, boolean][] = []
    const runner = createFlowRunner({
      executors: { x: () => ({ output: null }) },
      onFlush: () => {},
      onEdgeStatusChange: (id, active) => calls.push([id, active]),
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const [na, nb] = [node('a', 'x'), node('b', 'x')]
    const e = edge('e1', 'a', 'b')
    await runner.run(na, [na, nb], [e])
    // At some point during run, e1 should have been active (source 'a' was running/success)
    expect(calls.some(([id, active]) => id === 'e1' && active === true)).toBe(true)
  })

  it('calls onEdgeStatusChange(edgeId, false) when source is pending', async () => {
    const calls: [string, boolean][] = []
    const runner = createFlowRunner({
      executors: { x: () => ({ output: null }) },
      onFlush: () => {},
      onEdgeStatusChange: (id, active) => calls.push([id, active]),
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const [na, nb] = [node('a', 'x'), node('b', 'x')]
    const e = edge('e1', 'a', 'b')
    await runner.run(na, [na, nb], [e])
    // Initial flush (all pending) → e1 should be inactive
    expect(calls.some(([id, active]) => id === 'e1' && active === false)).toBe(true)
  })

  it('is not called when onEdgeStatusChange is omitted', async () => {
    // Should not throw when option is absent
    const runner = createFlowRunner({
      executors: { x: () => ({ output: null }) },
      onFlush: () => {},
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const n = node('n1', 'x')
    await expect(runner.run(n, [n], [])).resolves.toBeDefined()
  })
})

// =============================================================================
// createFlowRunnerSignals
// =============================================================================

describe('createFlowRunnerSignals', () => {
  it('returns signals with empty initial state', () => {
    const rs = createFlowRunnerSignals()
    expect(rs.states()).toEqual(new Map())
    expect(rs.outputs()).toEqual(new Map())
    expect(rs.errors()).toEqual(new Map())
    expect(rs.log()).toEqual([])
  })

  it('onFlush updates all signals', async () => {
    const rs = createFlowRunnerSignals()
    const runner = createFlowRunner({
      executors: { x: ({ log }) => { log('hello'); return { output: 42 } } },
      onFlush: rs.onFlush,
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const n = node('n1', 'x')
    await runner.run(n, [n], [])
    expect(rs.states().get('n1')).toBe('success')
    expect(rs.outputs().get('n1')).toBe(42)
    expect(rs.log()).toContain('hello')
  })

  it('reset() clears all signals', async () => {
    const rs = createFlowRunnerSignals()
    const runner = createFlowRunner({
      executors: { x: () => ({ output: 1 }) },
      onFlush: rs.onFlush,
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const n = node('n1', 'x')
    await runner.run(n, [n], [])
    expect(rs.states().size).toBeGreaterThan(0)
    rs.reset()
    expect(rs.states()).toEqual(new Map())
    expect(rs.outputs()).toEqual(new Map())
    expect(rs.errors()).toEqual(new Map())
    expect(rs.log()).toEqual([])
  })

  it('spread into createFlowRunner options works', async () => {
    const rs = createFlowRunnerSignals()
    const runner = createFlowRunner({
      executors: { x: () => ({ output: 'spread' }) },
      ...rs,
      delay: { beforeNode: 0, afterNode: 0 },
    })
    const n = node('n1', 'x')
    await runner.run(n, [n], [])
    expect(rs.outputs().get('n1')).toBe('spread')
  })

  it('onEdgeStatusChange is undefined when no flow provided', () => {
    const rs = createFlowRunnerSignals()
    expect(rs.onEdgeStatusChange).toBeUndefined()
  })

  it('onEdgeStatusChange calls flow.setEdgeActive when flow provided', async () => {
    const setEdgeActive = vi.fn()
    const mockFlow = { setEdgeActive } as unknown as import('../src/types.js').FlowHandle
    const rs = createFlowRunnerSignals(mockFlow)
    expect(rs.onEdgeStatusChange).toBeDefined()
    rs.onEdgeStatusChange!('e1', true)
    expect(setEdgeActive).toHaveBeenCalledWith('e1', true)
  })
})
