import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FlowNode, NodeChange, NodeComponentFn } from '../src/types.js'
import { defineNode, _resetDefineNodeStyles } from '../src/helpers/define-node.js'
import {
  createNodePropertiesPanel,
  _resetNodePropertiesPanelStyles,
} from '../src/helpers/node-properties-panel.js'

// ---- Helpers -----------------------------------------------------------------

function node(id: string, type: string, data: Record<string, unknown> = {}): FlowNode {
  return { id, type, position: { x: 0, y: 0 }, data }
}

function makeNodeTypes() {
  return {
    http: defineNode({
      type:    'http',
      icon:    '🌐',
      color:   '#3b82f6',
      inputs:  [{ id: 'in' }],
      outputs: [{ id: 'out' }],
      fields: {
        method: { type: 'select',   label: 'Method',      options: ['GET', 'POST', 'PUT'] },
        url:    { type: 'text',     label: 'URL',          placeholder: 'https://…' },
        body:   { type: 'textarea', label: 'Request Body', placeholder: '{}' },
        retries:{ type: 'number',   label: 'Retries' },
      },
    }),
    raw: (() => document.createElement('div')) as NodeComponentFn,
  }
}

beforeEach(() => {
  _resetDefineNodeStyles()
  _resetNodePropertiesPanelStyles()
})

// =============================================================================
// Basic rendering
// =============================================================================

describe('createNodePropertiesPanel — rendering', () => {
  it('returns a DOM Node', () => {
    const nodeTypes = makeNodeTypes()
    const panel = createNodePropertiesPanel(nodeTypes, {
      node:    node('n1', 'http', { label: 'Test', method: 'GET', url: 'example.com', retries: 3 }),
      onApply: vi.fn(),
      onClose: vi.fn(),
    })
    expect(panel).toBeInstanceOf(Node)
  })

  it('renders the default title "Edit Http"', () => {
    const nodeTypes = makeNodeTypes()
    const panel = createNodePropertiesPanel(nodeTypes, {
      node:    node('n1', 'http', { label: 'Test', method: 'GET', url: '' }),
      onApply: vi.fn(),
      onClose: vi.fn(),
    }) as HTMLElement
    expect(panel.querySelector('.lf-np-title')?.textContent).toBe('Edit Http')
  })

  it('respects custom title function', () => {
    const nodeTypes = makeNodeTypes()
    const panel = createNodePropertiesPanel(nodeTypes, {
      node:    node('n1', 'http', { label: 'Test', method: 'GET', url: '' }),
      onApply: vi.fn(),
      onClose: vi.fn(),
      title:   (n) => `Configure ${n.type.toUpperCase()}`,
    }) as HTMLElement
    expect(panel.querySelector('.lf-np-title')?.textContent).toBe('Configure HTTP')
  })

  it('renders a label input when node.data has label', () => {
    const nodeTypes = makeNodeTypes()
    const panel = createNodePropertiesPanel(nodeTypes, {
      node:    node('n1', 'http', { label: 'My Node', method: 'GET', url: '' }),
      onApply: vi.fn(),
      onClose: vi.fn(),
    }) as HTMLElement
    const inputs = panel.querySelectorAll('input')
    const labelInput = [...inputs].find(i => (i.previousElementSibling?.textContent ?? '') !== '' || i.parentElement?.querySelector('.lf-np-label')?.textContent?.toLowerCase() === 'label')
    expect(labelInput).toBeDefined()
  })

  it('renders inputs for all declared fields', () => {
    const nodeTypes = makeNodeTypes()
    const panel = createNodePropertiesPanel(nodeTypes, {
      node:    node('n1', 'http', { label: 'x', method: 'GET', url: '', retries: 0 }),
      onApply: vi.fn(),
      onClose: vi.fn(),
    }) as HTMLElement
    // method=select, url=text, retries=number → 3 controls + 1 label input
    const inputs  = panel.querySelectorAll('input')
    const selects = panel.querySelectorAll('select')
    expect(inputs.length).toBeGreaterThanOrEqual(2)  // label + url + retries
    expect(selects.length).toBe(1)                    // method
  })

  it('renders textarea for textarea fields', () => {
    const nodeTypes = makeNodeTypes()
    const panel = createNodePropertiesPanel(nodeTypes, {
      node:    node('n1', 'http', { label: 'x', method: 'GET', url: '', body: '{}' }),
      onApply: vi.fn(),
      onClose: vi.fn(),
    }) as HTMLElement
    expect(panel.querySelectorAll('textarea').length).toBe(1)
  })

  it('pre-fills inputs with node.data values', () => {
    const nodeTypes = makeNodeTypes()
    const panel = createNodePropertiesPanel(nodeTypes, {
      node:    node('n1', 'http', { label: 'API Call', method: 'POST', url: 'example.com' }),
      onApply: vi.fn(),
      onClose: vi.fn(),
    }) as HTMLElement
    const urlInput = [...panel.querySelectorAll<HTMLInputElement>('input')].find(
      i => i.value === 'example.com',
    )
    expect(urlInput).toBeDefined()
  })

  it('pre-selects the correct option in selects', () => {
    const nodeTypes = makeNodeTypes()
    const panel = createNodePropertiesPanel(nodeTypes, {
      node:    node('n1', 'http', { label: 'x', method: 'PUT', url: '' }),
      onApply: vi.fn(),
      onClose: vi.fn(),
    }) as HTMLElement
    const select = panel.querySelector<HTMLSelectElement>('select')!
    expect(select.value).toBe('PUT')
  })

  it('renders empty panel (label only) for raw NodeComponentFn without metadata', () => {
    const nodeTypes = makeNodeTypes()
    const panel = createNodePropertiesPanel(nodeTypes, {
      node:    node('n1', 'raw', { label: 'Raw' }),
      onApply: vi.fn(),
      onClose: vi.fn(),
    }) as HTMLElement
    // Only the label group should be present
    const groups = panel.querySelectorAll('.lf-np-group')
    expect(groups.length).toBe(1)
  })

  it('renders empty panel for unknown node type', () => {
    const panel = createNodePropertiesPanel({}, {
      node:    node('n1', 'unknown', {}),
      onApply: vi.fn(),
      onClose: vi.fn(),
    }) as HTMLElement
    expect(panel.querySelectorAll('.lf-np-group').length).toBe(0)
  })
})

// =============================================================================
// Interactions
// =============================================================================

describe('createNodePropertiesPanel — interactions', () => {
  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    const nodeTypes = makeNodeTypes()
    const panel = createNodePropertiesPanel(nodeTypes, {
      node:    node('n1', 'http', { label: 'x', method: 'GET', url: '' }),
      onApply: vi.fn(),
      onClose,
    }) as HTMLElement
    panel.querySelector<HTMLButtonElement>('.lf-np-close')!.click()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Cancel button is clicked', () => {
    const onClose = vi.fn()
    const nodeTypes = makeNodeTypes()
    const panel = createNodePropertiesPanel(nodeTypes, {
      node:    node('n1', 'http', { label: 'x', method: 'GET', url: '' }),
      onApply: vi.fn(),
      onClose,
    }) as HTMLElement
    const cancelBtn = [...panel.querySelectorAll<HTMLButtonElement>('button')].find(
      b => b.textContent === 'Cancel',
    )!
    cancelBtn.click()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onApply with NodeChange type=data on Apply', () => {
    const onApply = vi.fn()
    const onClose = vi.fn()
    const nodeTypes = makeNodeTypes()
    const panel = createNodePropertiesPanel(nodeTypes, {
      node:    node('n1', 'http', { label: 'Old', method: 'GET', url: 'example.com' }),
      onApply,
      onClose,
    }) as HTMLElement

    const applyBtn = [...panel.querySelectorAll<HTMLButtonElement>('button')].find(
      b => b.textContent === 'Apply',
    )!
    applyBtn.click()

    expect(onApply).toHaveBeenCalledOnce()
    const change = onApply.mock.calls[0][0] as NodeChange
    expect(change.type).toBe('data')
    expect((change as unknown as { id: string }).id).toBe('n1')
  })

  it('calls onClose after Apply', () => {
    const onClose = vi.fn()
    const nodeTypes = makeNodeTypes()
    const panel = createNodePropertiesPanel(nodeTypes, {
      node:    node('n1', 'http', { label: 'x', method: 'GET', url: '' }),
      onApply: vi.fn(),
      onClose,
    }) as HTMLElement
    const applyBtn = [...panel.querySelectorAll<HTMLButtonElement>('button')].find(
      b => b.textContent === 'Apply',
    )!
    applyBtn.click()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('coerces number fields to numbers on Apply', () => {
    const onApply = vi.fn()
    const nodeTypes = makeNodeTypes()
    const panel = createNodePropertiesPanel(nodeTypes, {
      node:    node('n1', 'http', { label: 'x', method: 'GET', url: '', retries: 3 }),
      onApply,
      onClose: vi.fn(),
    }) as HTMLElement

    // Update the retries input
    const retriesInput = [...panel.querySelectorAll<HTMLInputElement>('input')].find(
      i => i.type === 'number',
    )!
    retriesInput.value = '5'
    retriesInput.dispatchEvent(new Event('input'))

    panel.querySelector<HTMLButtonElement>('.lf-np-btn-primary')!.click()
    const change = onApply.mock.calls[0][0] as NodeChange & { data: Record<string, unknown> }
    expect(typeof (change as unknown as { data: Record<string, unknown> }).data['retries']).toBe('number')
    expect((change as unknown as { data: Record<string, unknown> }).data['retries']).toBe(5)
  })

  it('reflects draft changes in Apply payload', () => {
    const onApply = vi.fn()
    const nodeTypes = makeNodeTypes()
    const panel = createNodePropertiesPanel(nodeTypes, {
      node:    node('n1', 'http', { label: 'Old', method: 'GET', url: 'before.com' }),
      onApply,
      onClose: vi.fn(),
    }) as HTMLElement

    // Change url input
    const urlInput = [...panel.querySelectorAll<HTMLInputElement>('input')].find(
      i => i.value === 'before.com',
    )!
    urlInput.value = 'after.com'
    urlInput.dispatchEvent(new Event('input'))

    panel.querySelector<HTMLButtonElement>('.lf-np-btn-primary')!.click()
    const change = onApply.mock.calls[0][0] as NodeChange & { data: Record<string, unknown> }
    expect((change as unknown as { data: Record<string, unknown> }).data['url']).toBe('after.com')
  })
})

// =============================================================================
// CSS injection
// =============================================================================

describe('createNodePropertiesPanel — style injection', () => {
  it('injects a <style> element on first call', () => {
    const nodeTypes = makeNodeTypes()
    createNodePropertiesPanel(nodeTypes, {
      node:    node('n1', 'http', { label: 'x', method: 'GET', url: '' }),
      onApply: vi.fn(),
      onClose: vi.fn(),
    })
    expect(document.querySelectorAll('style[data-lf-np]').length).toBeGreaterThanOrEqual(1)
  })
})
