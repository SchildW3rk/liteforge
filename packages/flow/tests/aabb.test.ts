import { describe, it, expect } from 'vitest'
import { rectsOverlap, rectFromPoints } from '../src/geometry/aabb.js'
import type { Rect } from '../src/types.js'

describe('rectsOverlap', () => {
  it('returns true for clearly overlapping rects', () => {
    const a: Rect = { x: 0, y: 0, width: 100, height: 100 }
    const b: Rect = { x: 50, y: 50, width: 100, height: 100 }
    expect(rectsOverlap(a, b)).toBe(true)
  })

  it('returns false for clearly separated rects (no overlap)', () => {
    const a: Rect = { x: 0, y: 0, width: 50, height: 50 }
    const b: Rect = { x: 200, y: 200, width: 50, height: 50 }
    expect(rectsOverlap(a, b)).toBe(false)
  })

  it('returns true for rects touching at edge (inclusive)', () => {
    // a ends at x=100, b starts at x=100 — touching on vertical edge
    const a: Rect = { x: 0, y: 0, width: 100, height: 100 }
    const b: Rect = { x: 100, y: 0, width: 100, height: 100 }
    expect(rectsOverlap(a, b)).toBe(true)
  })

  it('returns true when one rect is entirely inside the other', () => {
    const a: Rect = { x: 0, y: 0, width: 200, height: 200 }
    const b: Rect = { x: 50, y: 50, width: 50, height: 50 }
    expect(rectsOverlap(a, b)).toBe(true)
  })

  it('returns false when rects are separated on the x axis', () => {
    const a: Rect = { x: 0, y: 0, width: 40, height: 100 }
    const b: Rect = { x: 50, y: 0, width: 40, height: 100 }
    expect(rectsOverlap(a, b)).toBe(false)
  })

  it('returns false when rects are separated on the y axis', () => {
    const a: Rect = { x: 0, y: 0, width: 100, height: 40 }
    const b: Rect = { x: 0, y: 50, width: 100, height: 40 }
    expect(rectsOverlap(a, b)).toBe(false)
  })

  it('returns true for identical rects', () => {
    const a: Rect = { x: 10, y: 20, width: 80, height: 60 }
    const b: Rect = { x: 10, y: 20, width: 80, height: 60 }
    expect(rectsOverlap(a, b)).toBe(true)
  })

  it('returns true for rects touching at a corner (inclusive)', () => {
    // a right+bottom corner touches b top-left corner
    const a: Rect = { x: 0, y: 0, width: 50, height: 50 }
    const b: Rect = { x: 50, y: 50, width: 50, height: 50 }
    expect(rectsOverlap(a, b)).toBe(true)
  })

  it('returns false when rect a is fully to the left of rect b', () => {
    const a: Rect = { x: 0, y: 0, width: 30, height: 30 }
    const b: Rect = { x: 40, y: 10, width: 30, height: 30 }
    expect(rectsOverlap(a, b)).toBe(false)
  })

  it('returns false when rect a is fully above rect b', () => {
    const a: Rect = { x: 0, y: 0, width: 50, height: 20 }
    const b: Rect = { x: 0, y: 25, width: 50, height: 20 }
    expect(rectsOverlap(a, b)).toBe(false)
  })
})

describe('rectFromPoints', () => {
  it('handles normal order (top-left first)', () => {
    const rect = rectFromPoints({ x: 10, y: 20 }, { x: 60, y: 80 })
    expect(rect).toEqual({ x: 10, y: 20, width: 50, height: 60 })
  })

  it('handles reversed order (bottom-right first) and normalizes', () => {
    const rect = rectFromPoints({ x: 60, y: 80 }, { x: 10, y: 20 })
    expect(rect).toEqual({ x: 10, y: 20, width: 50, height: 60 })
  })

  it('handles same point → zero-size rect at that point', () => {
    const rect = rectFromPoints({ x: 42, y: 17 }, { x: 42, y: 17 })
    expect(rect).toEqual({ x: 42, y: 17, width: 0, height: 0 })
  })

  it('width and height are always non-negative', () => {
    const rect = rectFromPoints({ x: 100, y: 200 }, { x: 50, y: 80 })
    expect(rect.width).toBeGreaterThanOrEqual(0)
    expect(rect.height).toBeGreaterThanOrEqual(0)
  })

  it('produces correct rect when start is to the right of end on x axis only', () => {
    const rect = rectFromPoints({ x: 100, y: 50 }, { x: 30, y: 50 })
    expect(rect).toEqual({ x: 30, y: 50, width: 70, height: 0 })
  })
})
