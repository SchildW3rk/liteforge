import { signal } from '@liteforge/core'
import type { Signal } from '@liteforge/core'
import type {
  InteractionState,
  IdleState,
  Point,
  HandleType,
} from './types.js'

export interface InteractionStateManager {
  readonly state: Signal<InteractionState>
  toIdle(): void
  toDragging(nodeId: string, pointerId: number, startCanvasPoint: Point, startPosition: Point, draggedNodes?: ReadonlySet<string>): void
  toConnecting(sourceNodeId: string, sourceHandleId: string, sourceHandleType: HandleType, sourcePoint: Point): void
  toSelecting(startCanvasPoint: Point, pointerId: number): void
  toReconnecting(edgeId: string, movingEnd: 'source' | 'target', fixedPoint: Point, startPoint: Point): void
  toDraggingWaypoint(edgeId: string, waypointIndex: number, originalPos: Point): void
}

const IDLE: IdleState = { type: 'idle' }

export function createInteractionState(): InteractionStateManager {
  const state = signal<InteractionState>(IDLE)

  return {
    get state() { return state },

    toIdle() {
      state.set(IDLE)
    },

    toDragging(nodeId, pointerId, startCanvasPoint, startPosition, draggedNodes) {
      state.set({
        type: 'dragging',
        nodeId,
        draggedNodes: draggedNodes ?? new Set([nodeId]),
        pointerId,
        startCanvasPoint,
        startPosition,
        localOffset: signal<Point>({ x: 0, y: 0 }),
      })
    },

    toConnecting(sourceNodeId, sourceHandleId, sourceHandleType, sourcePoint) {
      state.set({
        type: 'connecting',
        sourceNodeId,
        sourceHandleId,
        sourceHandleType,
        sourcePoint,
        currentPoint: signal<Point>({ ...sourcePoint }),
      })
    },

    toSelecting(startCanvasPoint, pointerId) {
      state.set({
        type: 'selecting',
        startCanvasPoint,
        pointerId,
        currentCanvasPoint: signal<Point>({ ...startCanvasPoint }),
      })
    },

    toReconnecting(edgeId, movingEnd, fixedPoint, startPoint) {
      state.set({
        type: 'reconnecting',
        edgeId,
        movingEnd,
        fixedPoint,
        currentPoint: signal<Point>({ ...startPoint }),
      })
    },

    toDraggingWaypoint(edgeId, waypointIndex, originalPos) {
      state.set({
        type:          'draggingWaypoint',
        edgeId,
        waypointIndex,
        originalPos,
        localOffset:   signal<Point>({ x: 0, y: 0 }),
      })
    },
  }
}
