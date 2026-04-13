import type { Point } from '../types.js'

/**
 * Cubic bezier path between two points.
 * Control points extend horizontally from source/target.
 * curvature: 0–1, default 0.25 (minimum offset clamped to 20px).
 */
export function getBezierPath(source: Point, target: Point, curvature = 0.25): string {
  const offset = Math.max(20, Math.abs(target.x - source.x) * curvature)
  const cp1x = source.x + offset
  const cp1y = source.y
  const cp2x = target.x - offset
  const cp2y = target.y
  return `M ${source.x} ${source.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${target.x} ${target.y}`
}

/**
 * Orthogonal step path: horizontal to midpoint, vertical, horizontal to target.
 */
export function getStepPath(source: Point, target: Point): string {
  const midX = (source.x + target.x) / 2
  return `M ${source.x} ${source.y} L ${midX} ${source.y} L ${midX} ${target.y} L ${target.x} ${target.y}`
}

/**
 * Straight line from source to target.
 */
export function getStraightPath(source: Point, target: Point): string {
  return `M ${source.x} ${source.y} L ${target.x} ${target.y}`
}

/**
 * Build a path that routes through intermediate waypoints.
 * Each segment between consecutive points is a cubic bezier.
 * Returns the same format as getBezierPath for a direct connection when
 * waypoints is empty or undefined.
 */
export function getWaypointPath(source: Point, waypoints: Point[], target: Point): string {
  if (!waypoints.length) return getBezierPath(source, target)
  const all = [source, ...waypoints, target]
  let d = `M ${all[0].x} ${all[0].y}`
  for (let i = 0; i < all.length - 1; i++) {
    const a = all[i]!
    const b = all[i + 1]!
    const offset = Math.max(20, Math.abs(b.x - a.x) * 0.25)
    d += ` C ${a.x + offset} ${a.y} ${b.x - offset} ${b.y} ${b.x} ${b.y}`
  }
  return d
}

/**
 * Return the midpoint of a waypoint path for label placement.
 * Uses the midpoint of the middle segment (or the single segment midpoint).
 */
export function getWaypointMidpoint(source: Point, waypoints: Point[], target: Point): Point {
  if (!waypoints.length) return getBezierMidpoint(source, target)
  const all = [source, ...waypoints, target]
  const mid = Math.floor((all.length - 1) / 2)
  const a = all[mid]!
  const b = all[mid + 1]!
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

// ---- Midpoint helpers (for label placement) ----

/**
 * Returns the point at t=0.5 on the cubic bezier defined by the same
 * control points as getBezierPath.
 */
export function getBezierMidpoint(source: Point, target: Point, curvature = 0.25): Point {
  const offset = Math.max(20, Math.abs(target.x - source.x) * curvature)
  const cp1x = source.x + offset
  const cp1y = source.y
  const cp2x = target.x - offset
  const cp2y = target.y
  // De Casteljau at t=0.5
  const t = 0.5
  const mt = 1 - t
  return {
    x: mt * mt * mt * source.x + 3 * mt * mt * t * cp1x + 3 * mt * t * t * cp2x + t * t * t * target.x,
    y: mt * mt * mt * source.y + 3 * mt * mt * t * cp1y + 3 * mt * t * t * cp2y + t * t * t * target.y,
  }
}

/**
 * Midpoint of the step path (the corner of the orthogonal jog).
 */
export function getStepMidpoint(source: Point, target: Point): Point {
  return {
    x: (source.x + target.x) / 2,
    y: (source.y + target.y) / 2,
  }
}

/**
 * Midpoint of the straight line.
 */
export function getStraightMidpoint(source: Point, target: Point): Point {
  return {
    x: (source.x + target.x) / 2,
    y: (source.y + target.y) / 2,
  }
}
