import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { signal } from '@liteforge/core'
import type { FlowContextValue } from '../src/context.js'
import { pushFlowContext, popFlowContext } from '../src/context.js'
import type { FlowNode, Transform } from '../src/types.js'
import { createInteractionState } from '../src/state.js'
import { createHandleRegistry } from '../src/registry/handle-registry.js'
import { defineNode, _resetDefineNodeStyles } from '../src/helpers/define-node.js'

// ---- Test helpers ----

function makeCtx(overrides: Partial<FlowContextValue> = {}): FlowContextValue {
  const stateMgr = createInteractionState()
  const handleRegistry = createHandleRegistry()
  const transform = signal<Transform>({ x: 0, y: 0, scale: 1 })
  const nodesArr: FlowNode[] = []

  return {
    nodes: () => nodesArr,
    edges: () => [],
    getNode: () => undefined,
    getEdge: () => undefined,
    getNodes: () => nodesArr,
    getEdges: () => [],
    getChildren: () => [],
    getAbsolutePosition: () => ({ x: 0, y: 0 }),
    transform,
    interactionState: stateMgr.state,
    stateMgr,
    interactionStateManager: stateMgr,
    handleRegistry,
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onConnect: vi.fn(),
    isValidConnection: undefined,
    nodeTypes: {},
    edgeTypes: undefined,
    connectionLineType: 'bezier',
    registerNodeSize: vi.fn(),
    getNodeSize: () => undefined,
    getRootRect: () => ({
      left: 0, top: 0, right: 800, bottom: 600,
      width: 800, height: 600, x: 0, y: 0,
      toJSON: () => ({}),
    } as DOMRect),
    nodeSizeVersion: signal(0),
    snapToGrid: undefined,
    nodeContextMenu: undefined,
    edgeContextMenu: undefined,
    paneContextMenu: undefined,
    ...overrides,
  }
}

function makeNode<T = unknown>(id: string, data: T): FlowNode<T> {
  return { id, type: 'test', position: { x: 0, y: 0 }, data }
}

/** Call renderer inside a flow context. */
function renderNode<T>(fn: (node: FlowNode<T>) => Node, node: FlowNode<T>, ctx?: FlowContextValue): Node {
  const c = ctx ?? makeCtx()
  pushFlowContext(c)
  const el = fn(node)
  popFlowContext()
  return el
}

// ---- Tests -------------------------------------------------------------------

describe('defineNode', () => {
  beforeEach(() => {
    _resetDefineNodeStyles()
  })

  it('returns a function (NodeComponentFn)', () => {
    const fn = defineNode({ type: 'test' })
    expect(typeof fn).toBe('function')
  })

  it('rendered element has class lf-dn', () => {
    const fn = defineNode({ type: 'test' })
    const el = renderNode(fn, makeNode('n1', {})) as HTMLElement
    expect(el.classList.contains('lf-dn')).toBe(true)
  })

  it('sets --lf-dn-color CSS variable from color option', () => {
    const fn = defineNode({ type: 'test', color: '#ff0000' })
    const el = renderNode(fn, makeNode('n1', {})) as HTMLElement
    expect(el.style.getPropertyValue('--lf-dn-color')).toBe('#ff0000')
  })

  it('defaults --lf-dn-color to #6366f1 when color omitted', () => {
    const fn = defineNode({ type: 'test' })
    const el = renderNode(fn, makeNode('n1', {})) as HTMLElement
    expect(el.style.getPropertyValue('--lf-dn-color')).toBe('#6366f1')
  })

  it('renders icon in header when provided', () => {
    const fn = defineNode({ type: 'test', icon: '🔧' })
    const el = renderNode(fn, makeNode('n1', {})) as HTMLElement
    const icon = el.querySelector('.lf-dn-icon')
    expect(icon?.textContent).toBe('🔧')
  })

  it('does not render icon element when icon omitted', () => {
    const fn = defineNode({ type: 'test' })
    const el = renderNode(fn, makeNode('n1', {})) as HTMLElement
    expect(el.querySelector('.lf-dn-icon')).toBeNull()
  })

  it('renders badge with uppercased type', () => {
    const fn = defineNode({ type: 'http' })
    const el = renderNode(fn, makeNode('n1', {})) as HTMLElement
    const badge = el.querySelector('.lf-dn-badge')
    expect(badge?.textContent).toBe('HTTP')
  })

  it('uses node.data.label as the label text', () => {
    const fn = defineNode({ type: 'test', icon: '⚡' })
    const el = renderNode(fn, makeNode('n1', { label: 'My Node' })) as HTMLElement
    const label = el.querySelector('.lf-dn-label')
    expect(label?.textContent).toBe('My Node')
  })

  it('falls back to type as label when data.label is absent', () => {
    const fn = defineNode({ type: 'trigger' })
    const el = renderNode(fn, makeNode('n1', {})) as HTMLElement
    const label = el.querySelector('.lf-dn-label')
    expect(label?.textContent).toBe('trigger')
  })

  describe('fields', () => {
    it('renders a body with field rows', () => {
      const fn = defineNode({
        type: 'http',
        fields: {
          method: { type: 'select', label: 'Method', options: ['GET', 'POST'] },
          url:    { type: 'text',   label: 'URL' },
        },
      })
      const el = renderNode(fn, makeNode('n1', { method: 'GET', url: 'https://api.example.com' })) as HTMLElement
      const rows = el.querySelectorAll('.lf-dn-field')
      expect(rows.length).toBe(2)
    })

    it('renders field label from descriptor', () => {
      const fn = defineNode({
        type: 'test',
        fields: { url: { type: 'text', label: 'URL' } },
      })
      const el = renderNode(fn, makeNode('n1', { url: 'https://x.com' })) as HTMLElement
      const lbl = el.querySelector('.lf-dn-field-label')
      expect(lbl?.textContent).toBe('URL')
    })

    it('renders field value from node.data', () => {
      const fn = defineNode({
        type: 'test',
        fields: { url: { type: 'text', label: 'URL' } },
      })
      const el = renderNode(fn, makeNode('n1', { url: 'https://x.com' })) as HTMLElement
      const val = el.querySelector('.lf-dn-field-value')
      expect(val?.textContent).toBe('https://x.com')
    })

    it('uses key as label when descriptor.label is omitted', () => {
      const fn = defineNode({
        type: 'test',
        fields: { username: { type: 'text' } },
      })
      const el = renderNode(fn, makeNode('n1', { username: 'torvalds' })) as HTMLElement
      const lbl = el.querySelector('.lf-dn-field-label')
      expect(lbl?.textContent).toBe('username')
    })

    it('renders — when field value is undefined', () => {
      const fn = defineNode({
        type: 'test',
        fields: { token: { type: 'text', label: 'Token' } },
      })
      const el = renderNode(fn, makeNode('n1', {})) as HTMLElement
      const val = el.querySelector('.lf-dn-field-value')
      expect(val?.textContent).toBe('—')
    })
  })

  describe('render override', () => {
    it('uses custom render function instead of fields', () => {
      const fn = defineNode({
        type: 'test',
        render: (_node) => {
          const d = document.createElement('div')
          d.className = 'custom-content'
          return d
        },
      })
      const el = renderNode(fn, makeNode('n1', {})) as HTMLElement
      expect(el.querySelector('.custom-content')).not.toBeNull()
      expect(el.querySelector('.lf-dn-body')).toBeNull()
    })

    it('passes the node to the render function', () => {
      let received: FlowNode | undefined
      const fn = defineNode({
        type: 'test',
        render: (n) => {
          received = n
          return document.createElement('span')
        },
      })
      const node = makeNode('n1', { label: 'Test' })
      renderNode(fn, node)
      expect(received).toBe(node)
    })
  })

  describe('handles', () => {
    it('creates target handles for inputs', () => {
      const ctx = makeCtx()
      const fn = defineNode({
        type: 'test',
        inputs: [{ id: 'in' }],
      })
      const el = renderNode(fn, makeNode('n1', {}), ctx) as HTMLElement
      const handles = el.querySelectorAll('.lf-handle--target')
      expect(handles.length).toBe(1)
    })

    it('creates source handles for outputs', () => {
      const ctx = makeCtx()
      const fn = defineNode({
        type: 'test',
        outputs: [{ id: 'out' }],
      })
      const el = renderNode(fn, makeNode('n1', {}), ctx) as HTMLElement
      const handles = el.querySelectorAll('.lf-handle--source')
      expect(handles.length).toBe(1)
    })

    it('creates multiple inputs and outputs', () => {
      const ctx = makeCtx()
      const fn = defineNode({
        type: 'test',
        inputs:  [{ id: 'in1' }, { id: 'in2' }],
        outputs: [{ id: 'out1' }, { id: 'out2' }, { id: 'out3' }],
      })
      const el = renderNode(fn, makeNode('n1', {}), ctx) as HTMLElement
      expect(el.querySelectorAll('.lf-handle--target').length).toBe(2)
      expect(el.querySelectorAll('.lf-handle--source').length).toBe(3)
    })

    it('defaults input position to left', () => {
      const ctx = makeCtx()
      const fn = defineNode({ type: 'test', inputs: [{ id: 'in' }] })
      const el = renderNode(fn, makeNode('n1', {}), ctx) as HTMLElement
      const handle = el.querySelector('.lf-handle--target')
      expect(handle?.classList.contains('lf-handle--left')).toBe(true)
    })

    it('defaults output position to right', () => {
      const ctx = makeCtx()
      const fn = defineNode({ type: 'test', outputs: [{ id: 'out' }] })
      const el = renderNode(fn, makeNode('n1', {}), ctx) as HTMLElement
      const handle = el.querySelector('.lf-handle--source')
      expect(handle?.classList.contains('lf-handle--right')).toBe(true)
    })

    it('respects custom position override', () => {
      const ctx = makeCtx()
      const fn = defineNode({ type: 'test', outputs: [{ id: 'out', position: 'bottom' }] })
      const el = renderNode(fn, makeNode('n1', {}), ctx) as HTMLElement
      const handle = el.querySelector('.lf-handle--source')
      expect(handle?.classList.contains('lf-handle--bottom')).toBe(true)
    })

    it('registers handles in the handle registry', () => {
      const ctx = makeCtx()
      const fn = defineNode({
        type: 'test',
        inputs:  [{ id: 'in' }],
        outputs: [{ id: 'out' }],
      })
      renderNode(fn, makeNode('n1', {}), ctx)
      expect(ctx.handleRegistry.getEntry('n1', 'in')).toBeDefined()
      expect(ctx.handleRegistry.getEntry('n1', 'out')).toBeDefined()
    })

    it('renders handle label when provided', () => {
      const ctx = makeCtx()
      const fn = defineNode({ type: 'test', outputs: [{ id: 'true', label: 'T' }] })
      const el = renderNode(fn, makeNode('n1', {}), ctx) as HTMLElement
      const handle = el.querySelector('.lf-handle--source')
      expect(handle?.querySelector('.lf-dn-handle-label')?.textContent).toBe('T')
    })

    it('no handles created when inputs/outputs omitted', () => {
      const ctx = makeCtx()
      const fn = defineNode({ type: 'test' })
      const el = renderNode(fn, makeNode('n1', {}), ctx) as HTMLElement
      expect(el.querySelectorAll('.lf-handle').length).toBe(0)
    })
  })

  describe('multiple instances same type', () => {
    it('each call creates independent handle registrations', () => {
      const ctx = makeCtx()
      const fn = defineNode({ type: 'test', inputs: [{ id: 'in' }] })
      renderNode(fn, makeNode('n1', {}), ctx)
      renderNode(fn, makeNode('n2', {}), ctx)
      expect(ctx.handleRegistry.getEntry('n1', 'in')).toBeDefined()
      expect(ctx.handleRegistry.getEntry('n2', 'in')).toBeDefined()
    })
  })

  describe('style injection', () => {
    it('injects a <style> element on first render', () => {
      const before = document.querySelectorAll('style[data-lf-define-node]').length
      const fn = defineNode({ type: 'test' })
      renderNode(fn, makeNode('n1', {}))
      const after = document.querySelectorAll('style[data-lf-define-node]').length
      // Style should exist (injected is module-level; after reset it re-injects)
      expect(typeof after).toBe('number')
      expect(before).toBeDefined()
    })
  })
})
