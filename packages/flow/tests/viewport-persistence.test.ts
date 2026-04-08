/**
 * Tests for createViewportPersistence + onViewportChange wiring in FlowCanvas.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { signal } from '@liteforge/core'
import { createViewportPersistence } from '../src/helpers/viewport-persistence.js'
import type { FlowHandle, Viewport } from '../src/types.js'

// ---- localStorage mock ----

function makeLocalStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem:    (k) => store.get(k) ?? null,
    setItem:    (k, v) => { store.set(k, v) },
    removeItem: (k) => { store.delete(k) },
    clear:      () => store.clear(),
    key:        (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size },
  } as Storage
}

// ---- FlowHandle stub ----

function makeFlowHandle(initial: Viewport = { x: 0, y: 0, zoom: 1 }): FlowHandle {
  const viewport = { ...initial }
  return {
    options: Object.freeze({ nodeTypes: {} }),
    getViewport: () => ({ ...viewport }),
    setViewport: vi.fn((v: Viewport) => { viewport.x = v.x; viewport.y = v.y; viewport.zoom = v.zoom }),
    zoomTo:   vi.fn(),
    zoomIn:   vi.fn(),
    zoomOut:  vi.fn(),
    fitBounds: vi.fn(),
    getNode:  () => undefined,
    getEdge:  () => undefined,
    getIntersectingNodes: () => [],
    isNodeIntersecting: () => false,
    _register: vi.fn(),
  } as unknown as FlowHandle
}

// ---- Tests ----

describe('createViewportPersistence', () => {
  let ls: Storage
  const KEY = 'test-viewport'

  beforeEach(() => {
    ls = makeLocalStorage()
    // Inject our mock localStorage into globalThis for the module under test
    Object.defineProperty(globalThis, 'localStorage', {
      value: ls,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ---- savedViewport ----

  it('savedViewport is undefined when storage is empty', () => {
    const flow   = makeFlowHandle()
    const result = createViewportPersistence(KEY, flow)
    expect(result.savedViewport).toBeUndefined()
  })

  it('savedViewport loads a previously stored transform', () => {
    ls.setItem(KEY, JSON.stringify({ x: 100, y: -50, scale: 1.5 }))
    const flow   = makeFlowHandle()
    const result = createViewportPersistence(KEY, flow)
    expect(result.savedViewport).toEqual({ x: 100, y: -50, scale: 1.5 })
  })

  it('savedViewport is undefined when stored JSON is malformed', () => {
    ls.setItem(KEY, 'not-json{{{')
    const onError = vi.fn()
    const flow    = makeFlowHandle()
    createViewportPersistence(KEY, flow, { onError })
    expect(onError).toHaveBeenCalledOnce()
  })

  it('savedViewport is undefined when stored object is missing fields', () => {
    ls.setItem(KEY, JSON.stringify({ x: 10 })) // missing y and scale
    const flow   = makeFlowHandle()
    const result = createViewportPersistence(KEY, flow)
    expect(result.savedViewport).toBeUndefined()
  })

  it('savedViewport is undefined when stored value is not an object', () => {
    ls.setItem(KEY, JSON.stringify(42))
    const flow   = makeFlowHandle()
    const result = createViewportPersistence(KEY, flow)
    expect(result.savedViewport).toBeUndefined()
  })

  // ---- save() ----

  it('save() writes current viewport to localStorage', () => {
    const flow   = makeFlowHandle({ x: 20, y: 30, zoom: 2 })
    const result = createViewportPersistence(KEY, flow)
    result.save()
    const stored = JSON.parse(ls.getItem(KEY) ?? 'null')
    expect(stored).toEqual({ x: 20, y: 30, scale: 2 })
  })

  it('save() maps zoom → scale on write', () => {
    const flow   = makeFlowHandle({ x: 0, y: 0, zoom: 0.75 })
    const result = createViewportPersistence(KEY, flow)
    result.save()
    const stored = JSON.parse(ls.getItem(KEY) ?? 'null')
    expect(stored.scale).toBe(0.75)
    expect(stored).not.toHaveProperty('zoom')
  })

  // ---- clear() ----

  it('clear() removes the key from localStorage', () => {
    ls.setItem(KEY, JSON.stringify({ x: 0, y: 0, scale: 1 }))
    const flow   = makeFlowHandle()
    const result = createViewportPersistence(KEY, flow)
    result.clear()
    expect(ls.getItem(KEY)).toBeNull()
  })

  it('clear() resets savedViewport to undefined', () => {
    ls.setItem(KEY, JSON.stringify({ x: 10, y: 20, scale: 1.2 }))
    const flow   = makeFlowHandle()
    const result = createViewportPersistence(KEY, flow)
    expect(result.savedViewport).toBeDefined()
    result.clear()
    expect(result.savedViewport).toBeUndefined()
  })

  // ---- onViewportChange debounce ----

  it('onViewportChange does not save immediately', () => {
    vi.useFakeTimers()
    const flow   = makeFlowHandle({ x: 5, y: 5, zoom: 1 })
    const result = createViewportPersistence(KEY, flow)

    result.onViewportChange({ x: 5, y: 5, zoom: 1 })

    // Nothing written yet
    expect(ls.getItem(KEY)).toBeNull()
  })

  it('onViewportChange saves after debounce delay (default 300ms)', () => {
    vi.useFakeTimers()
    const flow   = makeFlowHandle({ x: 5, y: 5, zoom: 1.5 })
    const result = createViewportPersistence(KEY, flow)

    result.onViewportChange({ x: 5, y: 5, zoom: 1.5 })
    vi.advanceTimersByTime(300)

    const stored = JSON.parse(ls.getItem(KEY) ?? 'null')
    expect(stored).toEqual({ x: 5, y: 5, scale: 1.5 })
  })

  it('onViewportChange resets debounce timer on rapid calls', () => {
    vi.useFakeTimers()
    const flow   = makeFlowHandle({ x: 99, y: 99, zoom: 2 })
    const result = createViewportPersistence(KEY, flow)

    result.onViewportChange({ x: 1, y: 1, zoom: 1 })
    vi.advanceTimersByTime(200)
    result.onViewportChange({ x: 2, y: 2, zoom: 1 })
    vi.advanceTimersByTime(200)
    result.onViewportChange({ x: 3, y: 3, zoom: 1 })

    // Nothing saved yet
    expect(ls.getItem(KEY)).toBeNull()

    vi.advanceTimersByTime(300)

    // Saved after the final 300ms quiet period — uses flow.getViewport() which returns {99,99,2}
    const stored = JSON.parse(ls.getItem(KEY) ?? 'null')
    expect(stored).toBeDefined()
  })

  it('respects custom debounce option', () => {
    vi.useFakeTimers()
    const flow   = makeFlowHandle({ x: 0, y: 0, zoom: 1 })
    const result = createViewportPersistence(KEY, flow, { debounce: 1000 })

    result.onViewportChange({ x: 0, y: 0, zoom: 1 })
    vi.advanceTimersByTime(500)
    expect(ls.getItem(KEY)).toBeNull()

    vi.advanceTimersByTime(600)
    expect(ls.getItem(KEY)).not.toBeNull()
  })

  // ---- SSR safety ----

  it('is a no-op when localStorage is unavailable (SSR)', () => {
    // Temporarily remove localStorage from globalThis
    const original = (globalThis as Record<string, unknown>).localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    try {
      const flow   = makeFlowHandle()
      const result = createViewportPersistence(KEY, flow)

      expect(result.savedViewport).toBeUndefined()
      expect(() => result.save()).not.toThrow()
      expect(() => result.clear()).not.toThrow()
      expect(() => result.onViewportChange({ x: 0, y: 0, zoom: 1 })).not.toThrow()
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: original,
        writable: true,
        configurable: true,
      })
    }
  })

  // ---- onError callback ----

  it('calls onError when localStorage.setItem throws', () => {
    const brokenLs = {
      ...makeLocalStorage(),
      setItem: () => { throw new DOMException('QuotaExceededError') },
    }
    Object.defineProperty(globalThis, 'localStorage', {
      value: brokenLs,
      writable: true,
      configurable: true,
    })

    const onError = vi.fn()
    const flow    = makeFlowHandle()
    const result  = createViewportPersistence(KEY, flow, { onError })
    result.save()

    expect(onError).toHaveBeenCalledOnce()
  })

  // ---- multiple keys ----

  it('different storageKeys are independent', () => {
    ls.setItem('key-a', JSON.stringify({ x: 1, y: 2, scale: 1 }))
    ls.setItem('key-b', JSON.stringify({ x: 3, y: 4, scale: 2 }))

    const flow = makeFlowHandle()
    const a = createViewportPersistence('key-a', flow)
    const b = createViewportPersistence('key-b', flow)

    expect(a.savedViewport).toEqual({ x: 1, y: 2, scale: 1 })
    expect(b.savedViewport).toEqual({ x: 3, y: 4, scale: 2 })

    a.clear()
    expect(ls.getItem('key-a')).toBeNull()
    expect(ls.getItem('key-b')).not.toBeNull()
  })
})

// ---- onViewportChange wiring in FlowCanvas ----

describe('FlowCanvas onViewportChange wiring', () => {
  it('calls onViewportChange when transform changes', async () => {
    const { FlowCanvas } = await import('../src/components/FlowCanvas.js')
    const { createFlow }  = await import('../src/flow.js')
    const { signal: sig } = await import('@liteforge/core')

    const flow     = createFlow({ nodeTypes: {} })
    const nodes    = sig<any[]>([])
    const edges    = sig<any[]>([])
    const cb       = vi.fn()

    FlowCanvas({
      flow,
      nodes,
      edges,
      onViewportChange: cb,
    })

    // Initial call on effect run (transform starts at {0,0,1})
    expect(cb).toHaveBeenCalledWith({ x: 0, y: 0, zoom: 1 })
  })

  it('does not require onViewportChange (remains optional)', async () => {
    const { FlowCanvas } = await import('../src/components/FlowCanvas.js')
    const { createFlow }  = await import('../src/flow.js')
    const { signal: sig } = await import('@liteforge/core')

    const flow  = createFlow({ nodeTypes: {} })
    const nodes = sig<any[]>([])
    const edges = sig<any[]>([])

    // Must not throw when onViewportChange is absent
    expect(() => FlowCanvas({ flow, nodes, edges })).not.toThrow()
  })
})

// ---- setViewport on FlowHandle ----

describe('FlowHandle.setViewport', () => {
  it('setViewport jumps to the given position and zoom', async () => {
    const { FlowCanvas } = await import('../src/components/FlowCanvas.js')
    const { createFlow }  = await import('../src/flow.js')
    const { signal: sig } = await import('@liteforge/core')

    const flow  = createFlow({ nodeTypes: {} })
    FlowCanvas({ flow, nodes: sig([]), edges: sig([]) })

    flow.setViewport({ x: 100, y: 200, zoom: 1.5 })

    const vp = flow.getViewport()
    expect(vp.x).toBe(100)
    expect(vp.y).toBe(200)
    expect(vp.zoom).toBe(1.5)
  })

  it('setViewport clamps zoom to minZoom / maxZoom', async () => {
    const { FlowCanvas } = await import('../src/components/FlowCanvas.js')
    const { createFlow }  = await import('../src/flow.js')
    const { signal: sig } = await import('@liteforge/core')

    const flow = createFlow({ nodeTypes: {} })
    FlowCanvas({ flow, nodes: sig([]), edges: sig([]), minZoom: 0.5, maxZoom: 2 })

    flow.setViewport({ x: 0, y: 0, zoom: 10 })
    expect(flow.getViewport().zoom).toBe(2)

    flow.setViewport({ x: 0, y: 0, zoom: 0.01 })
    expect(flow.getViewport().zoom).toBe(0.5)
  })
})
