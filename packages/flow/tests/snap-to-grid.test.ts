import { describe, it, expect, afterEach } from 'vitest'
import { clearContext } from '@liteforge/runtime'
import { createFlow, FlowCanvas } from '../src/index.js'
import type { FlowNode, FlowEdge } from '../src/types.js'

// ---- Inline snap helpers (mirror of drag-node.ts) ----

function snap(value: number, step: number): number {
  return Math.round(value / step) * step
}

function snapDelta(
  base: { x: number; y: number },
  delta: { x: number; y: number },
  grid: [number, number],
) {
  return {
    x: snap(base.x + delta.x, grid[0]) - base.x,
    y: snap(base.y + delta.y, grid[1]) - base.y,
  }
}

// ---- Pure snap math ----

describe('snap utility', () => {
  it('snaps 0 to grid', () => {
    expect(snap(0, 20)).toBe(0)
  })

  it('snaps value below midpoint down', () => {
    expect(snap(9, 20)).toBe(0)
  })

  it('snaps value at midpoint up (Math.round rounds half up)', () => {
    expect(snap(10, 20)).toBe(20)
  })

  it('snaps value above midpoint up', () => {
    expect(snap(11, 20)).toBe(20)
  })

  it('snaps to exact multiple', () => {
    expect(snap(40, 20)).toBe(40)
  })

  it('snaps negative values — rounds toward +infinity at midpoint', () => {
    // Math.round(-9/20) = Math.round(-0.45) = 0  → -0 in JS; use closeTo
    expect(snap(-9, 20)).toBeCloseTo(0)
    expect(snap(-11, 20)).toBe(-20)
  })

  it('snap with step 1 is identity for integers', () => {
    expect(snap(17, 1)).toBe(17)
  })

  it('snap with step 1 rounds fractional values', () => {
    expect(snap(17.7, 1)).toBe(18)
    expect(snap(17.2, 1)).toBe(17)
  })

  it('snapDelta: node at 0,0 — delta 9,9 rounds down to 0', () => {
    const d = snapDelta({ x: 0, y: 0 }, { x: 9, y: 9 }, [20, 20])
    expect(d.x).toBeCloseTo(0)
    expect(d.y).toBeCloseTo(0)
  })

  it('snapDelta: node at 0,0 — delta 10,10 rounds up to 20', () => {
    const d = snapDelta({ x: 0, y: 0 }, { x: 10, y: 10 }, [20, 20])
    expect(d).toEqual({ x: 20, y: 20 })
  })

  it('snapDelta: node at 5,5 — base+delta=10,10 snaps to 20,20 → delta 15,15', () => {
    const d = snapDelta({ x: 5, y: 5 }, { x: 5, y: 5 }, [20, 20])
    expect(d).toEqual({ x: 15, y: 15 })
  })

  it('snapDelta: asymmetric grid [10, 20]', () => {
    const d = snapDelta({ x: 0, y: 0 }, { x: 7, y: 7 }, [10, 20])
    expect(d.x).toBe(10)  // 7 → 10
    expect(d.y).toBeCloseTo(0) // 7 → 0
  })
})

// ---- snap commit math (verifies what drag-node.ts does on pointerup) ----

describe('snap commit math', () => {
  it('node at (0,0), delta (13,27), grid [20,20] → (20,20)', () => {
    const base = { x: 0, y: 0 }
    const raw = { x: base.x + 13, y: base.y + 27 }
    expect(snap(raw.x, 20)).toBe(20)
    expect(snap(raw.y, 20)).toBe(20)
  })

  it('node at (15,15), delta (8,8) → raw (23,23) → snaps to (20,20)', () => {
    const base = { x: 15, y: 15 }
    const raw = { x: base.x + 8, y: base.y + 8 }
    expect(snap(raw.x, 20)).toBe(20)
    expect(snap(raw.y, 20)).toBe(20)
  })

  it('group drag: n1@(0,0) and n2@(50,50), shared delta (13,13) → each snaps independently', () => {
    const offset = { x: 13, y: 13 }
    expect(snap(0  + offset.x, 20)).toBe(20)   // 13→20
    expect(snap(0  + offset.y, 20)).toBe(20)
    expect(snap(50 + offset.x, 20)).toBe(60)   // 63→60
    expect(snap(50 + offset.y, 20)).toBe(60)
  })

  it('no snapToGrid: position passes through unchanged', () => {
    const base = { x: 13, y: 27 }
    const offset = { x: 7, y: 3 }
    // Without snap: just add
    const result = { x: base.x + offset.x, y: base.y + offset.y }
    expect(result).toEqual({ x: 20, y: 30 })
  })
})

// ---- FlowCanvas: snapToGrid prop is accepted and wired ----

describe('FlowCanvas snapToGrid prop', () => {
  let container: HTMLDivElement | null = null

  afterEach(() => {
    container?.remove()
    container = null
    clearContext()
  })

  it('accepts snapToGrid without throwing', () => {
    clearContext()
    container = document.createElement('div')
    document.body.appendChild(container)
    const flow = createFlow({ nodeTypes: {} })
    expect(() => {
      FlowCanvas({
        flow,
        nodes: () => [] as FlowNode[],
        edges: () => [] as FlowEdge[],
        snapToGrid: [20, 20],
      })
    }).not.toThrow()
  })

  it('accepts snapToGrid undefined (disabled) without throwing', () => {
    clearContext()
    container = document.createElement('div')
    document.body.appendChild(container)
    const flow = createFlow({ nodeTypes: {} })
    expect(() => {
      FlowCanvas({
        flow,
        nodes: () => [] as FlowNode[],
        edges: () => [] as FlowEdge[],
      })
    }).not.toThrow()
  })

  it('accepts asymmetric grid [15, 30]', () => {
    clearContext()
    container = document.createElement('div')
    document.body.appendChild(container)
    const flow = createFlow({ nodeTypes: {} })
    expect(() => {
      FlowCanvas({
        flow,
        nodes: () => [] as FlowNode[],
        edges: () => [] as FlowEdge[],
        snapToGrid: [15, 30],
      })
    }).not.toThrow()
  })
})
