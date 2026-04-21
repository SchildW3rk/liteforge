/**
 * Tests for the createGlobalSingleton helper (internal).
 *
 * The primary motivation is bundle-duplication resilience — vitest loads the
 * module once, so we can't directly simulate two `context.ts` instances.
 * We exercise the helper's contract (init called once, same reference on
 * subsequent calls, symbol-keyed namespacing) which is what makes the
 * context duplication survive.
 */

import { describe, it, expect, vi } from 'vitest'
import { createGlobalSingleton } from '../src/_singleton.js'

describe('createGlobalSingleton', () => {
  it('returns the same reference on repeated calls with the same key', () => {
    const key = `test-same-ref-${Math.random()}`
    const init = vi.fn(() => ({ value: 42 }))

    const first = createGlobalSingleton(key, init)
    const second = createGlobalSingleton(key, init)

    expect(first).toBe(second)
    expect(init).toHaveBeenCalledTimes(1)
  })

  it('mutations to the returned value are visible across calls', () => {
    const key = `test-mutations-${Math.random()}`
    const arr = createGlobalSingleton<number[]>(key, () => [])

    arr.push(1, 2, 3)
    const sameArr = createGlobalSingleton<number[]>(key, () => [])

    expect(sameArr).toBe(arr)
    expect(sameArr).toEqual([1, 2, 3])
  })

  it('different keys produce independent singletons', () => {
    const keyA = `test-indep-a-${Math.random()}`
    const keyB = `test-indep-b-${Math.random()}`

    const a = createGlobalSingleton(keyA, () => ({ tag: 'A' }))
    const b = createGlobalSingleton(keyB, () => ({ tag: 'B' }))

    expect(a).not.toBe(b)
    expect(a.tag).toBe('A')
    expect(b.tag).toBe('B')
  })

  it('namespaces keys under Symbol.for("@liteforge/runtime.<key>")', () => {
    const key = `test-ns-${Math.random()}`
    const value = createGlobalSingleton(key, () => ({ marker: 'ns-test' }))

    const expectedSymbol = Symbol.for(`@liteforge/runtime.${key}`)
    const stored = (globalThis as unknown as Record<symbol, unknown>)[expectedSymbol]

    expect(stored).toBe(value)
  })

  it('simulates dual-instance import scenario for contextStack', () => {
    // Two separate module instances would each call createGlobalSingleton;
    // both receive the same underlying array.
    const key = `test-dual-${Math.random()}`

    // Instance A (simulated)
    const stackA = createGlobalSingleton<number[]>(key, () => [])
    // Instance B (simulated) — different init callback, should be ignored
    const initB = vi.fn(() => [999])
    const stackB = createGlobalSingleton<number[]>(key, initB)

    expect(stackB).toBe(stackA)
    expect(initB).not.toHaveBeenCalled()

    // Push via A, visible from B
    stackA.push(1)
    expect(stackB).toEqual([1])
  })
})
