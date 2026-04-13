import { getFlowContext } from '../context.js'
import { createHandle } from '../components/Handle.js'
import type { FlowNode, NodeComponentFn, HandlePosition } from '../types.js'

// =============================================================================
// defineNode — DX sugar for declaring node types declaratively
//
// Returns a NodeComponentFn that can be plugged directly into the nodeTypes
// map — no new concepts, fully tree-shakeable, raw functions still supported.
//
// Example:
//   const myNode = defineNode({
//     type:    'my-node',
//     icon:    '🔧',
//     color:   '#6366f1',
//     inputs:  [{ id: 'in' }],
//     outputs: [{ id: 'out' }],
//     fields: {
//       url: { type: 'text', label: 'URL', placeholder: 'https://…' },
//     },
//   })
//
//   createFlow({ nodeTypes: { 'my-node': myNode } })
// =============================================================================

// ---- Field Descriptors -------------------------------------------------------

export type FieldType = 'text' | 'select' | 'textarea' | 'number'

export interface FieldDescriptor {
  type:         FieldType
  label?:       string
  placeholder?: string
  /** Only for type === 'select'. */
  options?:     string[]
}

// ---- Handle Descriptors ------------------------------------------------------

export interface HandleDescriptor {
  id:        string
  label?:    string
  position?: HandlePosition  // default: inputs='left', outputs='right'
  /**
   * Vertical offset along the node edge as a fraction of the node height.
   * `0.0` = top, `0.5` = center (default), `1.0` = bottom.
   * Only meaningful for left/right positioned handles.
   * Overrides the default `top: 50%` CSS.
   */
  offsetPercent?: number
}

// ---- defineNode Options -------------------------------------------------------

/**
 * TFields is a string union of field keys, inferred from the `fields` record.
 * TData is the expected shape of node.data — validated via TypeScript at the
 * call-site when you pass it as a generic: defineNode<MyData>({ … }).
 */
export interface DefineNodeOptions<TData = unknown> {
  /** Node type identifier — must match the key in nodeTypes. */
  type:      string
  /** Emoji or short string rendered in the node header. */
  icon?:     string
  /**
   * Accent color for the node header background and badge.
   * Can be a static CSS color string, or a function receiving node.data
   * and returning a CSS color string (for data-driven colors).
   * @default '#6366f1'
   */
  color?:    string | ((data: TData) => string)

  /** Target handles — default position: 'left'. */
  inputs?:   HandleDescriptor[]
  /** Source handles — default position: 'right'. */
  outputs?:  HandleDescriptor[]

  /**
   * Declarative field descriptors keyed by the field name in node.data.
   * Each key is rendered as a row: label + value.
   * Omit to use a custom `render` instead.
   */
  fields?:   { [K in keyof TData]?: FieldDescriptor }

  /**
   * Optional custom renderer that replaces the default field layout.
   * Receives the full FlowNode and must return a DOM Node.
   * When provided, `fields` is ignored for rendering (handles are still created).
   */
  render?:   (node: FlowNode<TData>) => Node
}

/**
 * A NodeComponentFn returned by defineNode() carries its options as metadata
 * so that helpers like createNodePropertiesPanel() can introspect field config
 * without re-declaring it.
 *
 * @internal — access via `getDefineNodeOpts(fn)`
 */
export const DEFINE_NODE_OPTS_KEY = '__lfDefineNodeOpts'

export type NodeComponentFnWithMeta<TData = unknown> = NodeComponentFn<TData> & {
  readonly [DEFINE_NODE_OPTS_KEY]: DefineNodeOptions<TData>
}

/** Extract defineNode options from a NodeComponentFn, or undefined if not a defineNode result. */
export function getDefineNodeOpts<TData = unknown>(
  fn: NodeComponentFn<TData>,
): DefineNodeOptions<TData> | undefined {
  return (fn as NodeComponentFnWithMeta<TData>)[DEFINE_NODE_OPTS_KEY]
}

// ---- CSS injection (once per page) ------------------------------------------

let injected = false

function injectStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true

  const style = document.createElement('style')
  style.dataset['lfDefineNode'] = '1'
  style.textContent = `
.lf-dn {
  min-width: 160px;
  border-radius: 8px;
  border: 1.5px solid var(--color-border, #e2e8f0);
  background: var(--color-bg-secondary, #fff);
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  font-size: 0.78rem;
  user-select: none;
  overflow: hidden;
}
.lf-dn-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: color-mix(in srgb, var(--lf-dn-color, #6366f1) 12%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--lf-dn-color, #6366f1) 25%, transparent);
}
.lf-dn-icon  { font-size: 0.85rem; line-height: 1; flex-shrink: 0; }
.lf-dn-label {
  font-weight: 600;
  color: var(--color-text, #1e293b);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lf-dn-badge {
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  color: var(--lf-dn-color, #6366f1);
  background: color-mix(in srgb, var(--lf-dn-color, #6366f1) 12%, transparent);
  padding: 1px 5px;
  border-radius: 4px;
  flex-shrink: 0;
  text-transform: uppercase;
}
.lf-dn-body {
  padding: 6px 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.lf-dn-field {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 0.71rem;
}
.lf-dn-field-label {
  color: var(--color-text-muted, #94a3b8);
  flex-shrink: 0;
  font-weight: 500;
  min-width: 40px;
}
.lf-dn-field-value {
  color: var(--color-text-secondary, #475569);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono, monospace);
  font-size: 0.69rem;
}
.lf-node-selected .lf-dn {
  border-color: var(--lf-dn-color, #6366f1);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--lf-dn-color, #6366f1) 22%, transparent);
}
.lf-dn-handle-label {
  position: absolute;
  font-size: 0.5rem;
  font-weight: 700;
  pointer-events: none;
  right: -14px;
  top: 50%;
  transform: translateY(-50%);
  line-height: 1;
  color: var(--lf-dn-color, #6366f1);
}
`
  document.head.appendChild(style)
}

/** @internal reset for tests */
export function _resetDefineNodeStyles(): void {
  injected = false
  if (typeof document !== 'undefined') {
    document.querySelectorAll('style[data-lf-define-node]').forEach(el => el.remove())
  }
}

// ---- Core factory -----------------------------------------------------------

/**
 * Define a reusable node type declaratively.
 *
 * Returns a `NodeComponentFn` that can be passed directly to `nodeTypes`:
 *
 * ```ts
 * const httpNode = defineNode({
 *   type:    'http',
 *   icon:    '🌐',
 *   color:   '#3b82f6',
 *   inputs:  [{ id: 'in' }],
 *   outputs: [{ id: 'out' }],
 *   fields: {
 *     method: { type: 'select', label: 'Method', options: ['GET','POST'] },
 *     url:    { type: 'text',   label: 'URL' },
 *   },
 * })
 *
 * createFlow({ nodeTypes: { http: httpNode } })
 * ```
 */
export function defineNode<TData = unknown>(
  opts: DefineNodeOptions<TData>,
): NodeComponentFnWithMeta<TData> {
  injectStyles()

  const nodeComponentFn = function nodeComponentFn(node: FlowNode<TData>): Node {
    const ctx = getFlowContext()

    // ---- Root element ----
    const root = document.createElement('div')
    root.className = 'lf-dn'
    const resolvedColor = typeof opts.color === 'function'
      ? opts.color(node.data)
      : (opts.color ?? '#6366f1')
    root.style.setProperty('--lf-dn-color', resolvedColor)

    // ---- Header ----
    const header = document.createElement('div')
    header.className = 'lf-dn-header'

    if (opts.icon) {
      const iconEl = document.createElement('span')
      iconEl.className = 'lf-dn-icon'
      iconEl.textContent = opts.icon
      header.appendChild(iconEl)
    }

    const labelEl = document.createElement('span')
    labelEl.className = 'lf-dn-label'
    const data = node.data as Record<string, unknown>
    labelEl.textContent = typeof data?.['label'] === 'string'
      ? data['label']
      : opts.type

    const badgeEl = document.createElement('span')
    badgeEl.className = 'lf-dn-badge'
    badgeEl.textContent = opts.type.toUpperCase()

    header.appendChild(labelEl)
    header.appendChild(badgeEl)
    root.appendChild(header)

    // ---- Body: custom render or declarative fields ----
    if (opts.render) {
      const custom = opts.render(node)
      root.appendChild(custom)
    } else if (opts.fields) {
      const body = document.createElement('div')
      body.className = 'lf-dn-body'

      for (const key of Object.keys(opts.fields) as Array<keyof TData>) {
        const fd = opts.fields[key]
        if (!fd) continue

        const val = data[key as string]
        const displayVal = val != null ? String(val) : '—'

        const row = document.createElement('div')
        row.className = 'lf-dn-field'

        const lbl = document.createElement('span')
        lbl.className = 'lf-dn-field-label'
        lbl.textContent = fd.label ?? String(key)

        const valEl = document.createElement('span')
        valEl.className = 'lf-dn-field-value'
        valEl.textContent = displayVal

        row.appendChild(lbl)
        row.appendChild(valEl)
        body.appendChild(row)
      }

      root.appendChild(body)
    }

    // ---- Handles ----
    // We need the lf-node-wrapper (root's parentElement) for handle measurement.
    // It's set by NodeWrapper.ts after this function returns — use a getter.
    const getWrapper = (): HTMLElement =>
      (root.parentElement as HTMLElement | null) ?? root

    if (opts.inputs) {
      for (const h of opts.inputs) {
        const pos = h.position ?? 'left'
        const { el } = createHandle(node.id, h.id, 'target', pos, ctx, getWrapper())
        if (h.offsetPercent !== undefined) el.style.top = `${h.offsetPercent * 100}%`
        if (h.label) {
          const lbl = document.createElement('span')
          lbl.className = 'lf-dn-handle-label'
          lbl.textContent = h.label
          el.appendChild(lbl)
        }
        root.appendChild(el)
      }
    }

    if (opts.outputs) {
      for (const h of opts.outputs) {
        const pos = h.position ?? 'right'
        const { el } = createHandle(node.id, h.id, 'source', pos, ctx, getWrapper())
        if (h.offsetPercent !== undefined) el.style.top = `${h.offsetPercent * 100}%`
        if (h.label) {
          const lbl = document.createElement('span')
          lbl.className = 'lf-dn-handle-label'
          lbl.textContent = h.label
          el.appendChild(lbl)
        }
        root.appendChild(el)
      }
    }

    return root
  }

  // Attach opts as metadata so createNodePropertiesPanel can introspect fields
  ;(nodeComponentFn as unknown as Record<string, unknown>)[DEFINE_NODE_OPTS_KEY] = opts

  return nodeComponentFn as unknown as NodeComponentFnWithMeta<TData>
}
