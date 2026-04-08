import type { Viewport, FlowHandle, Transform } from '../types.js'

export interface ViewportPersistenceOptions {
  /**
   * Milliseconds to wait after the last viewport change before writing to
   * storage. Prevents writing on every pixel of a pan gesture.
   * @default 300
   */
  debounce?: number
  /**
   * Called when a storage read/write error occurs (e.g. private browsing with
   * full quota). Default: silent.
   */
  onError?: (err: unknown) => void
}

export interface ViewportPersistenceResult {
  /**
   * The viewport loaded from storage, or `undefined` when nothing was stored
   * yet. Pass as `defaultViewport` to `FlowCanvas`:
   *
   * ```ts
   * const persistence = createViewportPersistence('my-flow', flow)
   * FlowCanvas({ flow, nodes, edges, defaultViewport: persistence.savedViewport })
   * ```
   */
  readonly savedViewport: Transform | undefined
  /**
   * Manually write the current viewport to storage.
   * Called automatically by `onViewportChange` — use this for one-off saves.
   */
  save: () => void
  /**
   * Remove the stored viewport from storage and reset `savedViewport`.
   */
  clear: () => void
  /**
   * The `onViewportChange` handler to wire into `FlowCanvasProps`.
   * Calls `save()` after the configured debounce delay.
   *
   * ```ts
   * FlowCanvas({ flow, nodes, edges, onViewportChange: persistence.onViewportChange })
   * ```
   */
  onViewportChange: (viewport: Viewport) => void
}

/**
 * createViewportPersistence — persist and restore the flow viewport across
 * page loads using `localStorage`.
 *
 * Fully opt-in: the framework itself stays stateless. Wire the returned
 * `onViewportChange` into `FlowCanvasProps` and pass `savedViewport` as
 * `defaultViewport`.
 *
 * SSR-safe: localStorage access is guarded behind `typeof localStorage`.
 * On server-side renders the composable is a no-op and `savedViewport` is
 * always `undefined`.
 *
 * @param storageKey  - localStorage key (e.g. `'my-flow-viewport'`)
 * @param flow        - the FlowHandle returned by `createFlow()`
 * @param options     - optional debounce + error handler
 *
 * @example
 * ```ts
 * const flow    = createFlow({ nodeTypes })
 * const persist = createViewportPersistence('flow-viewport', flow)
 *
 * FlowCanvas({
 *   flow,
 *   nodes,
 *   edges,
 *   defaultViewport:   persist.savedViewport,  // restore on load
 *   onViewportChange:  persist.onViewportChange, // auto-save on pan/zoom
 * })
 * ```
 */
export function createViewportPersistence(
  storageKey: string,
  flow: FlowHandle,
  options: ViewportPersistenceOptions = {},
): ViewportPersistenceResult {
  const debounceMs = options.debounce ?? 300
  const onError    = options.onError  ?? (() => { /* silent */ })

  // ---- SSR guard ----
  const hasStorage = typeof localStorage !== 'undefined'

  // ---- Load saved viewport ----
  let savedViewport: Transform | undefined

  if (hasStorage) {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw !== null) {
        const parsed = JSON.parse(raw) as unknown
        if (
          parsed !== null &&
          typeof parsed === 'object' &&
          typeof (parsed as Record<string, unknown>).x     === 'number' &&
          typeof (parsed as Record<string, unknown>).y     === 'number' &&
          typeof (parsed as Record<string, unknown>).scale === 'number'
        ) {
          savedViewport = parsed as Transform
        }
      }
    } catch (err) {
      onError(err)
    }
  }

  // ---- Save helpers ----
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  const save = (): void => {
    if (!hasStorage) return
    try {
      const { x, y, zoom } = flow.getViewport()
      localStorage.setItem(storageKey, JSON.stringify({ x, y, scale: zoom }))
    } catch (err) {
      onError(err)
    }
  }

  const clear = (): void => {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer)
      debounceTimer = undefined
    }
    if (!hasStorage) return
    try {
      localStorage.removeItem(storageKey)
    } catch (err) {
      onError(err)
    }
    savedViewport = undefined
  }

  const onViewportChange = (_viewport: Viewport): void => {
    if (!hasStorage) return
    if (debounceTimer !== undefined) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(save, debounceMs)
  }

  return {
    get savedViewport() { return savedViewport },
    save,
    clear,
    onViewportChange,
  }
}
