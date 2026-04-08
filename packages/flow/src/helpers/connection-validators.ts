import type { Connection, FlowEdge } from '../types.js'

/**
 * Built-in connection validator: blocks any connection where source === target.
 *
 * Used as the built-in self-connection guard inside connect.ts and reconnect.ts.
 * Also exported so users can compose it in a custom isValidConnection callback.
 *
 * @example
 * const flow = createFlow({
 *   nodeTypes,
 *   isValidConnection: (conn) => isNoSelfConnection(conn) && myCustomCheck(conn),
 * })
 */
export function isNoSelfConnection(conn: Connection): boolean {
  return conn.source !== conn.target
}

/**
 * Connection validator factory: returns a validator that blocks duplicate edges.
 *
 * A duplicate is defined as an existing edge with the same source + sourceHandle
 * + target + targetHandle tuple (direction-sensitive).
 *
 * Typical usage: pass the live `edges` getter so the check always sees the
 * current graph state.
 *
 * @example
 * const noDupe = isNoDuplicateEdge(() => edges())
 * const flow = createFlow({
 *   nodeTypes,
 *   isValidConnection: (conn) => isNoSelfConnection(conn) && noDupe(conn),
 * })
 */
export function isNoDuplicateEdge(
  getEdges: () => FlowEdge[],
): (conn: Connection) => boolean {
  return (conn: Connection) => {
    return !getEdges().some(
      e =>
        e.source       === conn.source       &&
        e.sourceHandle === conn.sourceHandle &&
        e.target       === conn.target       &&
        e.targetHandle === conn.targetHandle,
    )
  }
}

/**
 * Combines multiple connection validators with AND logic.
 * Returns true only when every validator returns true.
 *
 * @example
 * const noDupe = isNoDuplicateEdge(() => edges())
 * const flow = createFlow({
 *   nodeTypes,
 *   isValidConnection: combineValidators(isNoSelfConnection, noDupe),
 * })
 */
export function combineValidators(
  ...validators: Array<(conn: Connection) => boolean>
): (conn: Connection) => boolean {
  return (conn: Connection) => validators.every(v => v(conn))
}
