import { describe, it, expect, vi, afterEach } from 'vitest'
import { signal } from '@liteforge/core'
import type { FlowNode, FlowEdge } from '../src/types.js'
import { createFlowHistory } from '../src/helpers/flow-history.js'

// ---- Helpers ----

function makeNode(id: string, x = 0, y = 0): FlowNode {
  return { id, type: 'default', position: { x, y }, data: null }
}

function makeEdge(id: string, source: string, target: string): FlowEdge {
  return { id, source, sourceHandle: 'out', target, targetHandle: 'in' }
}

// ---- Tests ----

describe('createFlowHistory', () => {
  it('returns onNodesChange, onEdgesChange, onConnect, undo, redo, canUndo, canRedo', () => {
    const nodes = signal<FlowNode[]>([])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    expect(typeof h.onNodesChange).toBe('function')
    expect(typeof h.onEdgesChange).toBe('function')
    expect(typeof h.onConnect).toBe('function')
    expect(typeof h.undo).toBe('function')
    expect(typeof h.redo).toBe('function')
    expect(typeof h.canUndo).toBe('function')  // Signal is callable
    expect(typeof h.canRedo).toBe('function')
  })

  it('canUndo/canRedo start as false', () => {
    const nodes = signal<FlowNode[]>([])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    expect(h.canUndo()).toBe(false)
    expect(h.canRedo()).toBe(false)
  })

  // ---- Node changes ----

  it('onNodesChange applies position change', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1', 0, 0)])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    h.onNodesChange([{ type: 'position', id: 'n1', position: { x: 100, y: 50 } }])

    expect(nodes().find(n => n.id === 'n1')?.position).toEqual({ x: 100, y: 50 })
  })

  it('structural node change (position) enables canUndo', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1')])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    h.onNodesChange([{ type: 'position', id: 'n1', position: { x: 50, y: 50 } }])

    expect(h.canUndo()).toBe(true)
  })

  it('selection change does NOT push to undo stack', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1')])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    h.onNodesChange([{ type: 'select', id: 'n1', selected: true }])

    expect(h.canUndo()).toBe(false)
  })

  it('node remove change enables canUndo', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1'), makeNode('n2')])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    h.onNodesChange([{ type: 'remove', id: 'n1' }])

    expect(h.canUndo()).toBe(true)
    expect(nodes().length).toBe(1)
  })

  // ---- Edge changes ----

  it('onEdgesChange applies edge remove', () => {
    const nodes = signal<FlowNode[]>([])
    const edges = signal<FlowEdge[]>([makeEdge('e1', 'n1', 'n2')])
    const h = createFlowHistory(nodes, edges)

    h.onEdgesChange([{ type: 'remove', id: 'e1' }])

    expect(edges().length).toBe(0)
    expect(h.canUndo()).toBe(true)
  })

  it('edge selection does NOT push to undo stack', () => {
    const nodes = signal<FlowNode[]>([])
    const edges = signal<FlowEdge[]>([makeEdge('e1', 'n1', 'n2')])
    const h = createFlowHistory(nodes, edges)

    h.onEdgesChange([{ type: 'select', id: 'e1', selected: true }])

    expect(h.canUndo()).toBe(false)
  })

  // ---- onConnect ----

  it('onConnect adds an edge', () => {
    const nodes = signal<FlowNode[]>([])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    h.onConnect({ source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' })

    expect(edges().length).toBe(1)
    expect(edges()[0]?.source).toBe('n1')
    expect(edges()[0]?.target).toBe('n2')
  })

  it('onConnect enables canUndo', () => {
    const nodes = signal<FlowNode[]>([])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    h.onConnect({ source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' })

    expect(h.canUndo()).toBe(true)
  })

  // ---- undo ----

  it('undo reverts a node position change', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1', 0, 0)])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    h.onNodesChange([{ type: 'position', id: 'n1', position: { x: 200, y: 300 } }])
    expect(nodes()[0]?.position).toEqual({ x: 200, y: 300 })

    h.undo()
    expect(nodes()[0]?.position).toEqual({ x: 0, y: 0 })
  })

  it('undo restores a deleted node', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1'), makeNode('n2')])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    h.onNodesChange([{ type: 'remove', id: 'n1' }])
    expect(nodes().length).toBe(1)

    h.undo()
    expect(nodes().length).toBe(2)
    expect(nodes().find(n => n.id === 'n1')).toBeDefined()
  })

  it('undo restores a deleted edge', () => {
    const nodes = signal<FlowNode[]>([])
    const edges = signal<FlowEdge[]>([makeEdge('e1', 'n1', 'n2')])
    const h = createFlowHistory(nodes, edges)

    h.onEdgesChange([{ type: 'remove', id: 'e1' }])
    expect(edges().length).toBe(0)

    h.undo()
    expect(edges().length).toBe(1)
  })

  it('undo after onConnect removes the added edge', () => {
    const nodes = signal<FlowNode[]>([])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    h.onConnect({ source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' })
    expect(edges().length).toBe(1)

    h.undo()
    expect(edges().length).toBe(0)
  })

  it('undo on empty stack is a no-op', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1')])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    expect(() => h.undo()).not.toThrow()
    expect(nodes().length).toBe(1)
  })

  it('undo disables canUndo when stack is exhausted', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1', 0, 0)])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    h.onNodesChange([{ type: 'position', id: 'n1', position: { x: 10, y: 10 } }])
    expect(h.canUndo()).toBe(true)

    h.undo()
    expect(h.canUndo()).toBe(false)
  })

  // ---- redo ----

  it('redo re-applies an undone change', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1', 0, 0)])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    h.onNodesChange([{ type: 'position', id: 'n1', position: { x: 99, y: 77 } }])
    h.undo()
    expect(nodes()[0]?.position).toEqual({ x: 0, y: 0 })

    h.redo()
    expect(nodes()[0]?.position).toEqual({ x: 99, y: 77 })
  })

  it('redo on empty stack is a no-op', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1')])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    expect(() => h.redo()).not.toThrow()
  })

  it('new mutation clears the redo stack', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1', 0, 0)])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    h.onNodesChange([{ type: 'position', id: 'n1', position: { x: 50, y: 50 } }])
    h.undo()
    expect(h.canRedo()).toBe(true)

    // New mutation clears redo
    h.onNodesChange([{ type: 'position', id: 'n1', position: { x: 99, y: 99 } }])
    expect(h.canRedo()).toBe(false)
  })

  it('redo enables canRedo = false after full re-apply', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1', 0, 0)])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    h.onNodesChange([{ type: 'position', id: 'n1', position: { x: 50, y: 50 } }])
    h.undo()
    h.redo()
    expect(h.canRedo()).toBe(false)
  })

  // ---- multiple steps ----

  it('supports multiple undo steps in sequence', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1', 0, 0)])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    h.onNodesChange([{ type: 'position', id: 'n1', position: { x: 10, y: 0 } }])
    h.onNodesChange([{ type: 'position', id: 'n1', position: { x: 20, y: 0 } }])
    h.onNodesChange([{ type: 'position', id: 'n1', position: { x: 30, y: 0 } }])

    h.undo() // → x:20
    expect(nodes()[0]?.position.x).toBe(20)
    h.undo() // → x:10
    expect(nodes()[0]?.position.x).toBe(10)
    h.undo() // → x:0
    expect(nodes()[0]?.position.x).toBe(0)
    expect(h.canUndo()).toBe(false)
  })

  it('undo then redo then undo works correctly', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1', 0, 0)])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)

    h.onNodesChange([{ type: 'position', id: 'n1', position: { x: 50, y: 50 } }])
    h.undo()
    h.redo()
    h.undo()
    expect(nodes()[0]?.position).toEqual({ x: 0, y: 0 })
  })

  // ---- maxHistory cap ----

  it('respects maxHistory limit (does not grow unbounded)', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1', 0, 0)])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges, { maxHistory: 3 })

    // Push 5 entries
    for (let i = 1; i <= 5; i++) {
      h.onNodesChange([{ type: 'position', id: 'n1', position: { x: i * 10, y: 0 } }])
    }

    // Should only be able to undo 3 times
    h.undo(); h.undo(); h.undo()
    expect(h.canUndo()).toBe(false)
  })

  // ---- keyboard ----

  it('attachKeyboard returns a cleanup function', () => {
    const nodes = signal<FlowNode[]>([])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)
    const target = new EventTarget()

    const cleanup = h.attachKeyboard(target)
    expect(typeof cleanup).toBe('function')
    cleanup()
  })

  it('Ctrl+Z triggers undo', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1', 0, 0)])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)
    const target = new EventTarget()
    const cleanup = h.attachKeyboard(target)

    h.onNodesChange([{ type: 'position', id: 'n1', position: { x: 99, y: 0 } }])
    expect(nodes()[0]?.position.x).toBe(99)

    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
    expect(nodes()[0]?.position.x).toBe(0)

    cleanup()
  })

  it('Ctrl+Y triggers redo', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1', 0, 0)])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)
    const target = new EventTarget()
    const cleanup = h.attachKeyboard(target)

    h.onNodesChange([{ type: 'position', id: 'n1', position: { x: 55, y: 0 } }])
    h.undo()
    expect(nodes()[0]?.position.x).toBe(0)

    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true }))
    expect(nodes()[0]?.position.x).toBe(55)

    cleanup()
  })

  it('Ctrl+Shift+Z triggers redo', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1', 0, 0)])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)
    const target = new EventTarget()
    const cleanup = h.attachKeyboard(target)

    h.onNodesChange([{ type: 'position', id: 'n1', position: { x: 42, y: 0 } }])
    h.undo()

    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true }))
    expect(nodes()[0]?.position.x).toBe(42)

    cleanup()
  })

  it('keyboard cleanup removes listeners', () => {
    const nodes = signal<FlowNode[]>([makeNode('n1', 0, 0)])
    const edges = signal<FlowEdge[]>([])
    const h = createFlowHistory(nodes, edges)
    const target = new EventTarget()
    const cleanup = h.attachKeyboard(target)

    h.onNodesChange([{ type: 'position', id: 'n1', position: { x: 77, y: 0 } }])

    cleanup() // detach
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))

    // After cleanup, undo should NOT have fired
    expect(nodes()[0]?.position.x).toBe(77)
  })
})
