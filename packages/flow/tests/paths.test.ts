import { describe, it, expect } from 'vitest'
import { getBezierPath, getStepPath, getStraightPath, getWaypointPath, getWaypointMidpoint } from '../src/geometry/paths.js'

// ---- getStraightPath ----

describe('getStraightPath', () => {
  it('starts with M at source coordinates', () => {
    const d = getStraightPath({ x: 10, y: 20 }, { x: 100, y: 200 })
    expect(d).toMatch(/^M 10 20/)
  })

  it('ends with L at target coordinates', () => {
    const d = getStraightPath({ x: 10, y: 20 }, { x: 100, y: 200 })
    expect(d).toContain('L 100 200')
  })

  it('works with identical source and target', () => {
    const d = getStraightPath({ x: 50, y: 50 }, { x: 50, y: 50 })
    expect(d).toBe('M 50 50 L 50 50')
  })

  it('works with negative coordinates', () => {
    const d = getStraightPath({ x: -10, y: -20 }, { x: -100, y: -200 })
    expect(d).toContain('M -10 -20')
    expect(d).toContain('L -100 -200')
  })

  it('works with same x but different y (vertical flow)', () => {
    const d = getStraightPath({ x: 50, y: 0 }, { x: 50, y: 200 })
    expect(d).toBe('M 50 0 L 50 200')
  })
})

// ---- getStepPath ----

describe('getStepPath', () => {
  it('starts with M at source coordinates', () => {
    const d = getStepPath({ x: 0, y: 0 }, { x: 200, y: 100 })
    expect(d).toMatch(/^M 0 0/)
  })

  it('path has exactly 4 segments (M + 3 L)', () => {
    const d = getStepPath({ x: 0, y: 0 }, { x: 200, y: 100 })
    const mCount = (d.match(/M/g) ?? []).length
    const lCount = (d.match(/L/g) ?? []).length
    expect(mCount).toBe(1)
    expect(lCount).toBe(3)
  })

  it('midX = (source.x + target.x) / 2 appears in path', () => {
    const source = { x: 0, y: 0 }
    const target = { x: 200, y: 100 }
    const midX = (source.x + target.x) / 2
    const d = getStepPath(source, target)
    expect(d).toContain(`L ${midX} `)
  })

  it('ends with target coordinates', () => {
    const d = getStepPath({ x: 0, y: 0 }, { x: 300, y: 150 })
    expect(d).toMatch(/L 300 150$/)
  })

  it('works with negative coordinates', () => {
    const d = getStepPath({ x: -50, y: -50 }, { x: 50, y: 50 })
    expect(d).toContain('M -50 -50')
    expect(d).toContain('L 50 50')
  })

  it('works with same x but different y', () => {
    const d = getStepPath({ x: 100, y: 0 }, { x: 100, y: 200 })
    // midX = 100, same as source.x and target.x
    expect(d).toContain('L 100 0')
    expect(d).toContain('L 100 200')
  })
})

// ---- getBezierPath ----

describe('getBezierPath', () => {
  it('starts with M and contains C (cubic bezier command)', () => {
    const d = getBezierPath({ x: 0, y: 0 }, { x: 200, y: 100 })
    expect(d).toMatch(/^M /)
    expect(d).toContain(' C ')
  })

  it('control point cp1.x is greater than source.x for left-to-right flow', () => {
    const source = { x: 0, y: 100 }
    const target = { x: 200, y: 100 }
    const d = getBezierPath(source, target)
    // Parse cp1x from "M 0 100 C cp1x cp1y cp2x cp2y 200 100"
    const match = d.match(/C ([\d.]+)/)
    expect(match).not.toBeNull()
    const cp1x = parseFloat(match![1])
    expect(cp1x).toBeGreaterThan(source.x)
  })

  it('control point cp2.x is less than target.x for left-to-right flow', () => {
    const source = { x: 0, y: 100 }
    const target = { x: 200, y: 100 }
    const d = getBezierPath(source, target)
    // "M 0 100 C cp1x cp1y cp2x cp2y 200 100"
    const match = d.match(/C [\d.]+ [\d.]+ ([\d.]+)/)
    expect(match).not.toBeNull()
    const cp2x = parseFloat(match![1])
    expect(cp2x).toBeLessThan(target.x)
  })

  it('custom curvature produces different path than default', () => {
    const source = { x: 0, y: 100 }
    const target = { x: 200, y: 100 }
    const defaultD = getBezierPath(source, target)
    const customD = getBezierPath(source, target, 0.5)
    expect(defaultD).not.toBe(customD)
  })

  it('returns a string', () => {
    const d = getBezierPath({ x: 0, y: 0 }, { x: 100, y: 100 })
    expect(typeof d).toBe('string')
  })

  it('ends with target coordinates', () => {
    const d = getBezierPath({ x: 0, y: 50 }, { x: 300, y: 150 })
    expect(d).toMatch(/300 150$/)
  })

  it('minimum offset of 20px applied for very close points', () => {
    // Source and target are 1px apart horizontally — curvature*1 < 20, so offset = 20
    const source = { x: 0, y: 0 }
    const target = { x: 1, y: 0 }
    const d = getBezierPath(source, target)
    // cp1x = source.x + 20 = 20
    expect(d).toContain('C 20 ')
  })

  it('works with negative coordinates', () => {
    const d = getBezierPath({ x: -100, y: -50 }, { x: -10, y: 50 })
    expect(typeof d).toBe('string')
    expect(d).toMatch(/^M -100 -50/)
    expect(d).toMatch(/-10 50$/)
  })

  it('works with same x but different y (vertical flow, uses min offset)', () => {
    const source = { x: 50, y: 0 }
    const target = { x: 50, y: 200 }
    const d = getBezierPath(source, target)
    // offset = max(20, |50-50|*0.25) = 20
    expect(d).toContain('M 50 0')
    expect(d).toContain('50 200')
    // cp1x = 50 + 20 = 70, cp2x = 50 - 20 = 30
    expect(d).toContain('C 70 0 30 200')
  })
})

// ---- getWaypointPath ----

describe('getWaypointPath', () => {
  it('with no waypoints returns same result as getBezierPath', () => {
    const src = { x: 0, y: 0 }
    const tgt = { x: 200, y: 0 }
    expect(getWaypointPath(src, [], tgt)).toBe(getBezierPath(src, tgt))
  })

  it('starts with M at source coordinates', () => {
    const d = getWaypointPath({ x: 10, y: 20 }, [{ x: 100, y: 50 }], { x: 200, y: 20 })
    expect(d).toMatch(/^M 10 20/)
  })

  it('ends with target coordinates', () => {
    const d = getWaypointPath({ x: 0, y: 0 }, [{ x: 100, y: 50 }], { x: 300, y: 100 })
    expect(d).toMatch(/300 100$/)
  })

  it('contains C commands for each segment', () => {
    const d = getWaypointPath({ x: 0, y: 0 }, [{ x: 100, y: 50 }], { x: 200, y: 0 })
    // 1 waypoint → 2 segments → 2 C commands
    const cCount = (d.match(/ C /g) ?? []).length
    expect(cCount).toBe(2)
  })

  it('two waypoints produce 3 bezier segments', () => {
    const d = getWaypointPath({ x: 0, y: 0 }, [{ x: 50, y: 50 }, { x: 150, y: 50 }], { x: 200, y: 0 })
    const cCount = (d.match(/ C /g) ?? []).length
    expect(cCount).toBe(3)
  })

  it('waypoint coordinates appear in path', () => {
    const wp = { x: 100, y: 80 }
    const d = getWaypointPath({ x: 0, y: 0 }, [wp], { x: 200, y: 0 })
    expect(d).toContain(`${wp.x} ${wp.y}`)
  })

  it('returns a string', () => {
    const d = getWaypointPath({ x: 0, y: 0 }, [{ x: 50, y: 25 }], { x: 100, y: 0 })
    expect(typeof d).toBe('string')
  })
})

// ---- getWaypointMidpoint ----

describe('getWaypointMidpoint', () => {
  it('with no waypoints returns same result as getBezierMidpoint', () => {
    const src = { x: 0, y: 0 }
    const tgt = { x: 200, y: 0 }
    // getBezierMidpoint is not exported — compute expected inline
    // For getBezierPath(src, tgt): offset=max(20,200*0.25)=50
    // cp1=(50,0), cp2=(150,0), bezier at t=0.5
    const mid = getWaypointMidpoint(src, [], tgt)
    // t=0.5 → x = 0.125*0 + 3*0.25*50 + 3*0.25*150 + 0.125*200 = 0+37.5+112.5+25 = 175?
    // Actually: mt=0.5, mt^3*0 + 3*mt^2*t*50 + 3*mt*t^2*150 + t^3*200
    //         = 0 + 3*0.25*0.5*50 + 3*0.5*0.25*150 + 0.125*200
    //         = 18.75 + 56.25 + 25 = 100
    expect(mid.x).toBeCloseTo(100, 1)
    expect(mid.y).toBeCloseTo(0, 1)
  })

  it('with one waypoint returns midpoint between source and waypoint', () => {
    const src = { x: 0, y: 0 }
    const wp = { x: 100, y: 0 }
    const tgt = { x: 200, y: 0 }
    // all=[src, wp, tgt], length-1=2, mid=floor(1)=1 → a=wp, b=tgt
    const mid = getWaypointMidpoint(src, [wp], tgt)
    // midpoint of wp and tgt = (150, 0)
    expect(mid.x).toBe(150)
    expect(mid.y).toBe(0)
  })

  it('with two waypoints returns midpoint of the middle two points', () => {
    const src = { x: 0, y: 0 }
    const wp1 = { x: 50, y: 0 }
    const wp2 = { x: 150, y: 0 }
    const tgt = { x: 200, y: 0 }
    // all=[src, wp1, wp2, tgt], length-1=3, mid=floor(1.5)=1 → a=wp1, b=wp2
    const mid = getWaypointMidpoint(src, [wp1, wp2], tgt)
    expect(mid.x).toBe(100) // (50+150)/2
    expect(mid.y).toBe(0)
  })

  it('returns an object with x and y properties', () => {
    const mid = getWaypointMidpoint({ x: 0, y: 0 }, [{ x: 50, y: 25 }], { x: 100, y: 50 })
    expect(typeof mid.x).toBe('number')
    expect(typeof mid.y).toBe('number')
  })
})
