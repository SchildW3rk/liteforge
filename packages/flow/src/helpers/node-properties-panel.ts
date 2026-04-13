import type { FlowNode, NodeChange, NodeComponentFn } from '../types.js'
import { getDefineNodeOpts } from './define-node.js'
import type { FieldDescriptor } from './define-node.js'

// =============================================================================
// createNodePropertiesPanel — generic properties editor for defineNode nodes
//
// Reads the `fields` config attached to the NodeComponentFn by defineNode()
// and renders a form with label + per-field inputs. Draft management is
// internal; committing fires onApply with a NodeChange type:'data'.
//
// For raw NodeComponentFns (not created via defineNode) or nodes with no
// declared fields, an empty panel with just a label field is rendered.
//
// Usage:
//   createNodePropertiesPanel(nodeTypes, {
//     node, onApply, onClose,
//     title: (n) => `Edit ${n.type}`,
//   })
// =============================================================================

export interface NodePropertiesPanelOptions {
  node:      FlowNode
  onApply:   (change: NodeChange) => void
  onClose:   () => void
  /**
   * Panel header title. Defaults to `Edit <Type>` (capitalised node.type).
   */
  title?:    (node: FlowNode) => string
}

// ---- CSS injection -----------------------------------------------------------

let injected = false

function injectStyles(): void {
  if (injected || typeof document === 'undefined') return
  injected = true

  const style = document.createElement('style')
  style.dataset['lfNp'] = '1'
  style.textContent = `
.lf-np {
  width: 300px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-surface, #fff);
  overflow: hidden;
}
.lf-np-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  flex-shrink: 0;
}
.lf-np-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text, #1e293b);
}
.lf-np-close {
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary, #64748b);
  font-size: 0.8rem;
  padding: 2px 6px;
  border-radius: var(--radius-sm, 4px);
  line-height: 1;
  transition: background 0.15s, color 0.15s;
}
.lf-np-close:hover {
  background: var(--color-hover, rgba(0,0,0,0.05));
  color: var(--color-text, #1e293b);
}
.lf-np-form {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.lf-np-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.lf-np-label {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--color-text-secondary, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.lf-np-input,
.lf-np-select,
.lf-np-textarea {
  background: var(--color-background, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-sm, 4px);
  color: var(--color-text, #1e293b);
  font-size: 0.82rem;
  padding: 6px 10px;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
  width: 100%;
  box-sizing: border-box;
}
.lf-np-input:focus,
.lf-np-select:focus,
.lf-np-textarea:focus {
  outline: none;
  border-color: var(--color-primary, #6366f1);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary, #6366f1) 20%, transparent);
}
.lf-np-textarea {
  resize: vertical;
  min-height: 72px;
  font-family: var(--font-mono, 'JetBrains Mono', 'Fira Code', 'Courier New', monospace);
  font-size: 0.78rem;
}
.lf-np-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border, #e2e8f0);
  justify-content: flex-end;
  flex-shrink: 0;
}
.lf-np-btn {
  padding: 6px 14px;
  border-radius: var(--radius-sm, 4px);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s;
  font-family: inherit;
}
.lf-np-btn-primary {
  background: var(--color-primary, #6366f1);
  color: #fff;
}
.lf-np-btn-primary:hover { filter: brightness(1.1); }
.lf-np-btn-secondary {
  background: transparent;
  border-color: var(--color-border, #e2e8f0);
  color: var(--color-text-secondary, #64748b);
}
.lf-np-btn-secondary:hover {
  background: var(--color-hover, rgba(0,0,0,0.05));
}
`
  document.head.appendChild(style)
}

/** @internal reset for tests */
export function _resetNodePropertiesPanelStyles(): void {
  injected = false
  if (typeof document !== 'undefined') {
    document.querySelectorAll('style[data-lf-np]').forEach(el => el.remove())
  }
}

// ---- DOM helpers ------------------------------------------------------------

function el(tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag)
  e.className = cls
  return e
}

function buildGroup(labelText: string, inputEl: HTMLElement): HTMLElement {
  const group = el('div', 'lf-np-group')
  const lbl   = el('label', 'lf-np-label') as HTMLLabelElement
  lbl.textContent = labelText
  group.appendChild(lbl)
  group.appendChild(inputEl)
  return group
}

function buildTextField(
  key:         string,
  fd:          Pick<FieldDescriptor, 'label' | 'placeholder' | 'type'>,
  draft:       Record<string, string | number>,
): HTMLElement {
  const input = el('input', 'lf-np-input') as HTMLInputElement
  input.type        = fd.type === 'number' ? 'number' : 'text'
  input.value       = String(draft[key] ?? '')
  input.placeholder = fd.placeholder ?? ''
  input.addEventListener('input', () => { draft[key] = input.value })
  return buildGroup(fd.label ?? key, input)
}

function buildTextareaField(
  key:   string,
  fd:    Pick<FieldDescriptor, 'label' | 'placeholder'>,
  draft: Record<string, string | number>,
): HTMLElement {
  const ta = el('textarea', 'lf-np-textarea') as HTMLTextAreaElement
  ta.rows        = 4
  ta.placeholder = fd.placeholder ?? ''
  ta.value       = String(draft[key] ?? '')
  ta.addEventListener('input', () => { draft[key] = ta.value })
  return buildGroup(fd.label ?? key, ta)
}

function buildSelectField(
  key:     string,
  fd:      Pick<FieldDescriptor, 'label' | 'options'>,
  draft:   Record<string, string | number>,
): HTMLElement {
  const select = el('select', 'lf-np-select') as HTMLSelectElement
  for (const opt of fd.options ?? []) {
    const o = document.createElement('option')
    o.value    = opt
    o.textContent = opt
    select.appendChild(o)
  }
  select.value = String(draft[key] ?? '')
  select.addEventListener('change', () => { draft[key] = select.value })
  return buildGroup(fd.label ?? key, select)
}

// ---- Public API -------------------------------------------------------------

/**
 * Build a properties panel for a node.
 *
 * Reads field definitions from the NodeComponentFn metadata attached by
 * `defineNode()`. For raw NodeComponentFns without metadata, renders an
 * empty panel with only the `label` field.
 *
 * ```ts
 * createNodePropertiesPanel(nodeTypes, {
 *   node,
 *   onApply: (change) => history.onNodesChange([change]),
 *   onClose: () => selectedNodeId.set(null),
 * })
 * ```
 */
export function createNodePropertiesPanel(
  nodeTypes: Record<string, NodeComponentFn>,
  opts:      NodePropertiesPanelOptions,
): Node {
  injectStyles()

  const { node, onApply, onClose } = opts
  const draft: Record<string, string | number> = {
    ...(node.data as Record<string, string | number>),
  }

  // ---- Header ----
  const panel  = el('div', 'lf-np')
  const header = el('div', 'lf-np-header')
  const title  = el('span', 'lf-np-title')
  const closeBtn = el('button', 'lf-np-close') as HTMLButtonElement
  closeBtn.type        = 'button'
  closeBtn.textContent = '✕'
  closeBtn.addEventListener('click', onClose)
  const defaultTitle = node.type.charAt(0).toUpperCase() + node.type.slice(1)
  title.textContent = opts.title ? opts.title(node) : `Edit ${defaultTitle}`
  header.appendChild(title)
  header.appendChild(closeBtn)
  panel.appendChild(header)

  // ---- Form ----
  const form = el('div', 'lf-np-form')

  // Always render label field first (if data has a label property)
  if ('label' in (node.data as object)) {
    form.appendChild(buildTextField('label', { label: 'Label', type: 'text' }, draft))
  }

  // Read fields from defineNode metadata
  const nodeFn    = nodeTypes[node.type]
  const dnOpts    = nodeFn ? getDefineNodeOpts(nodeFn) : undefined
  const fields    = dnOpts?.fields as Record<string, FieldDescriptor> | undefined

  if (fields) {
    for (const key of Object.keys(fields)) {
      if (key === 'label') continue // already rendered above
      const fd = fields[key]
      if (!fd) continue
      if (fd.type === 'select') {
        form.appendChild(buildSelectField(key, fd, draft))
      } else if (fd.type === 'textarea') {
        form.appendChild(buildTextareaField(key, fd, draft))
      } else {
        form.appendChild(buildTextField(key, fd, draft))
      }
    }
  }

  panel.appendChild(form)

  // ---- Footer ----
  const footer    = el('div', 'lf-np-footer')
  const cancelBtn = el('button', 'lf-np-btn lf-np-btn-secondary') as HTMLButtonElement
  cancelBtn.type        = 'button'
  cancelBtn.textContent = 'Cancel'
  cancelBtn.addEventListener('click', onClose)

  const applyBtn = el('button', 'lf-np-btn lf-np-btn-primary') as HTMLButtonElement
  applyBtn.type        = 'button'
  applyBtn.textContent = 'Apply'
  applyBtn.addEventListener('click', () => {
    const data: Record<string, string | number> = { ...draft }
    // Coerce number-typed fields back to numbers
    if (fields) {
      for (const key of Object.keys(fields)) {
        const fd = fields[key]
        if (fd?.type === 'number' && typeof data[key] === 'string') {
          data[key] = parseFloat(data[key] as string) || 0
        }
      }
    }
    onApply({ type: 'data', id: node.id, data } as NodeChange)
    onClose()
  })

  footer.appendChild(cancelBtn)
  footer.appendChild(applyBtn)
  panel.appendChild(footer)

  return panel
}
