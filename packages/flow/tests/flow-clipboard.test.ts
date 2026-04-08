import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { signal } from '@liteforge/core'
import type { FlowNode, FlowEdge } from '../src/types.js'
import { createFlowClipboard } from '../src/helpers/flow-clipboard.js'

// ---- Helpers ----

function makeNode(id: string, x = 0, y = 0, selected = false): FlowNode {
  return { id, type: 'default', position: { x, y }, data: {}, selected }
}

function makeEdge(id: string, source: string, target: string): FlowEdge {
  return { id, source, sourceHandle: 'out', target, targetHandle: 'in' }
}

function makeClipboard(
  initialNodes: FlowNode[] = [],
  initialEdges: FlowEdge[] = [],
  opts = {},
) {
  const nodes = signal<FlowNode[]>(initialNodes)
  const edges = signal<FlowEdge[]>(initialEdges)
  const clipboard = createFlowClipboard(nodes, edges, opts)
  return { nodes, edges, clipboard }
}

// ---- hasContent ----

describe('createFlowClipboard — hasContent', () => {
  it('is false before any copy', () => {
    const { clipboard } = makeClipboard([makeNode('n1', 0, 0, true)])
    expect(clipboard.hasContent).toBe(false)
  })

  it('is false after copy with no selected nodes', () => {
    const { clipboard } = makeClipboard([makeNode('n1')])  // not selected
    clipboard.copy()
    expect(clipboard.hasContent).toBe(false)
  })

  it('is true after copying selected node', () => {
    const { clipboard } = makeClipboard([makeNode('n1', 0, 0, true)])
    clipboard.copy()
    expect(clipboard.hasContent).toBe(true)
  })
})

// ---- copy() ----

describe('createFlowClipboard — copy()', () => {
  it('copy() is a no-op when no nodes are selected', () => {
    const { nodes, clipboard } = makeClipboard([makeNode('n1'), makeNode('n2')])
    clipboard.copy()
    // nodes unchanged
    expect(nodes()).toHaveLength(2)
    expect(clipboard.hasContent).toBe(false)
  })

  it('copies only selected nodes', () => {
    const { clipboard } = makeClipboard([
      makeNode('n1', 0, 0, true),
      makeNode('n2', 100, 0, false),
    ])
    clipboard.copy()
    expect(clipboard.hasContent).toBe(true)
    // paste to verify only n1 was snapshotted
    const pastedIds = clipboard.paste()
    expect(pastedIds).toHaveLength(1)
  })

  it('copies multiple selected nodes', () => {
    const { clipboard } = makeClipboard([
      makeNode('n1', 0, 0, true),
      makeNode('n2', 100, 0, true),
      makeNode('n3', 200, 0, false),
    ])
    clipboard.copy()
    const pastedIds = clipboard.paste()
    expect(pastedIds).toHaveLength(2)
  })

  it('copies edges between selected nodes', () => {
    const { edges, clipboard } = makeClipboard(
      [makeNode('n1', 0, 0, true), makeNode('n2', 100, 0, true)],
      [makeEdge('e1', 'n1', 'n2')],
    )
    clipboard.copy()
    clipboard.paste()
    // Original edge + pasted edge
    expect(edges()).toHaveLength(2)
  })

  it('does NOT copy edges where only one endpoint is selected', () => {
    const { edges, clipboard } = makeClipboard(
      [makeNode('n1', 0, 0, true), makeNode('n2', 100, 0, false)],
      [makeEdge('e1', 'n1', 'n2')],
    )
    clipboard.copy()
    clipboard.paste()
    // Original edge only — partial-selection edge not copied
    expect(edges()).toHaveLength(1)
  })

  it('does NOT copy edges where neither endpoint is selected', () => {
    const { edges, clipboard } = makeClipboard(
      [makeNode('n1', 0, 0, true), makeNode('n2', 100, 0, false), makeNode('n3', 200, 0, false)],
      [makeEdge('e1', 'n2', 'n3')],
    )
    clipboard.copy()
    clipboard.paste()
    expect(edges()).toHaveLength(1)
  })
})

// ---- paste() — node results ----

describe('createFlowClipboard — paste() nodes', () => {
  it('paste() returns [] when clipboard is empty', () => {
    const { clipboard } = makeClipboard([makeNode('n1')])
    expect(clipboard.paste()).toEqual([])
  })

  it('pasted nodes have new unique IDs', () => {
    const { nodes, clipboard } = makeClipboard([makeNode('n1', 0, 0, true)])
    clipboard.copy()
    const pastedIds = clipboard.paste()
    const allIds = nodes().map(n => n.id)
    // original + pasted = 2 nodes, all IDs unique
    expect(allIds).toHaveLength(2)
    expect(new Set(allIds).size).toBe(2)
    // pasted node ID is not the original ID
    expect(pastedIds[0]).not.toBe('n1')
    // original is still present
    expect(allIds).toContain('n1')
  })

  it('pasted nodes get default +20/+20 offset', () => {
    const { nodes, clipboard } = makeClipboard([makeNode('n1', 100, 50, true)])
    clipboard.copy()
    clipboard.paste()
    const pasted = nodes().find(n => n.id !== 'n1')!
    expect(pasted.position.x).toBe(120)
    expect(pasted.position.y).toBe(70)
  })

  it('paste offset is configurable', () => {
    const { nodes, clipboard } = makeClipboard(
      [makeNode('n1', 100, 50, true)],
      [],
      { pasteOffset: { x: 40, y: 60 } },
    )
    clipboard.copy()
    clipboard.paste()
    const pasted = nodes().find(n => n.id !== 'n1')!
    expect(pasted.position.x).toBe(140)
    expect(pasted.position.y).toBe(110)
  })

  it('pasted nodes are selected', () => {
    const { nodes, clipboard } = makeClipboard([makeNode('n1', 0, 0, true)])
    clipboard.copy()
    clipboard.paste()
    const pasted = nodes().find(n => n.id !== 'n1')!
    expect(pasted.selected).toBe(true)
  })

  it('original nodes become deselected after paste', () => {
    const { nodes, clipboard } = makeClipboard([makeNode('n1', 0, 0, true)])
    clipboard.copy()
    clipboard.paste()
    const original = nodes().find(n => n.id === 'n1')!
    expect(original.selected).toBe(false)
  })

  it('paste() returns array of pasted node IDs', () => {
    const { clipboard } = makeClipboard([
      makeNode('n1', 0, 0, true),
      makeNode('n2', 100, 0, true),
    ])
    clipboard.copy()
    const ids = clipboard.paste()
    expect(ids).toHaveLength(2)
    expect(typeof ids[0]).toBe('string')
    expect(typeof ids[1]).toBe('string')
  })

  it('total node count grows by selected count after paste', () => {
    const { nodes, clipboard } = makeClipboard([
      makeNode('n1', 0, 0, true),
      makeNode('n2', 100, 0, true),
      makeNode('n3', 200, 0, false),
    ])
    clipboard.copy()
    clipboard.paste()
    expect(nodes()).toHaveLength(5)  // 3 original + 2 pasted
  })

  it('paste can be called multiple times — each call gets fresh IDs', () => {
    const { nodes, clipboard } = makeClipboard([makeNode('n1', 0, 0, true)])
    clipboard.copy()
    clipboard.paste()
    clipboard.paste()
    // 1 original + 2 pastes = 3
    expect(nodes()).toHaveLength(3)
    const allIds = nodes().map(n => n.id)
    expect(new Set(allIds).size).toBe(3)
  })
})

// ---- paste() — edge results ----

describe('createFlowClipboard — paste() edges', () => {
  it('pasted edges have new unique IDs', () => {
    const { edges, clipboard } = makeClipboard(
      [makeNode('n1', 0, 0, true), makeNode('n2', 100, 0, true)],
      [makeEdge('e1', 'n1', 'n2')],
    )
    clipboard.copy()
    clipboard.paste()
    const edgeIds = edges().map(e => e.id)
    expect(edgeIds).toHaveLength(2)
    expect(new Set(edgeIds).size).toBe(2)
  })

  it('pasted edge connects pasted node IDs (not original IDs)', () => {
    const { nodes, edges, clipboard } = makeClipboard(
      [makeNode('n1', 0, 0, true), makeNode('n2', 100, 0, true)],
      [makeEdge('e1', 'n1', 'n2')],
    )
    clipboard.copy()
    const pastedNodeIds = clipboard.paste()
    const pastedEdge = edges().find(e => e.id !== 'e1')!
    expect(pastedNodeIds).toContain(pastedEdge.source)
    expect(pastedNodeIds).toContain(pastedEdge.target)
    // Must NOT reference original node IDs
    expect(pastedEdge.source).not.toBe('n1')
    expect(pastedEdge.target).not.toBe('n2')
    // Verify corresponding pasted nodes exist
    const pastedNodeMap = new Map(nodes().filter(n => pastedNodeIds.includes(n.id)).map(n => [n.id, n]))
    expect(pastedNodeMap.has(pastedEdge.source)).toBe(true)
    expect(pastedNodeMap.has(pastedEdge.target)).toBe(true)
  })

  it('no edges added when clipboard has no edges', () => {
    const { edges, clipboard } = makeClipboard(
      [makeNode('n1', 0, 0, true), makeNode('n2', 100, 0, false)],
      [makeEdge('e1', 'n1', 'n2')],
    )
    clipboard.copy()  // e1 not copied — n2 not selected
    clipboard.paste()
    expect(edges()).toHaveLength(1)  // original only
  })
})

// ---- Custom ID generator ----

describe('createFlowClipboard — generateId option', () => {
  it('uses custom ID generator for pasted nodes', () => {
    let counter = 0
    const { nodes, clipboard } = makeClipboard(
      [makeNode('n1', 0, 0, true)],
      [],
      { generateId: (id) => `custom-${id}-${++counter}` },
    )
    clipboard.copy()
    clipboard.paste()
    const pasted = nodes().find(n => n.id !== 'n1')!
    expect(pasted.id).toBe('custom-n1-1')
  })

  it('uses custom ID generator for pasted edges', () => {
    let counter = 0
    const { edges, clipboard } = makeClipboard(
      [makeNode('n1', 0, 0, true), makeNode('n2', 100, 0, true)],
      [makeEdge('e1', 'n1', 'n2')],
      { generateId: (id) => `custom-${id}-${++counter}` },
    )
    clipboard.copy()
    clipboard.paste()
    const pastedEdge = edges().find(e => e.id !== 'e1')!
    expect(pastedEdge.id).toMatch(/^custom-e1-/)
  })
})

// ---- attachKeyboard ----
// Note: vi.spyOn can't intercept clipboard.copy/paste because attachKeyboard
// captures the original closure reference, not the property. All keyboard tests
// verify behaviour via observable side-effects (node count, hasContent, etc.)

describe('createFlowClipboard — attachKeyboard', () => {
  let cleanup: (() => void) | undefined

  afterEach(() => {
    cleanup?.()
    cleanup = undefined
  })

  function fireKey(key: string, ctrlKey = true, metaKey = false) {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key, ctrlKey, metaKey, bubbles: true,
    }))
  }

  it('Ctrl+C populates clipboard (hasContent becomes true)', () => {
    const { clipboard } = makeClipboard([makeNode('n1', 0, 0, true)])
    cleanup = clipboard.attachKeyboard()
    expect(clipboard.hasContent).toBe(false)
    fireKey('c')
    expect(clipboard.hasContent).toBe(true)
  })

  it('Ctrl+V pastes nodes into signal', () => {
    const { nodes, clipboard } = makeClipboard([makeNode('n1', 0, 0, true)])
    cleanup = clipboard.attachKeyboard()
    fireKey('c')
    fireKey('v')
    expect(nodes()).toHaveLength(2)
  })

  it('Ctrl+C then Ctrl+V — full round trip', () => {
    const { nodes, clipboard } = makeClipboard([
      makeNode('n1', 0, 0, true),
      makeNode('n2', 100, 0, true),
    ])
    cleanup = clipboard.attachKeyboard()
    fireKey('c')
    fireKey('v')
    expect(nodes()).toHaveLength(4)  // 2 original + 2 pasted
  })

  it('Meta+C works (macOS Cmd+C)', () => {
    const { clipboard } = makeClipboard([makeNode('n1', 0, 0, true)])
    cleanup = clipboard.attachKeyboard()
    fireKey('c', false, true)  // metaKey only
    expect(clipboard.hasContent).toBe(true)
  })

  it('ignores keys without Ctrl/Meta modifier', () => {
    const { clipboard } = makeClipboard([makeNode('n1', 0, 0, true)])
    cleanup = clipboard.attachKeyboard()
    fireKey('c', false, false)  // no modifier
    expect(clipboard.hasContent).toBe(false)
  })

  it('Ctrl+V is no-op when clipboard is empty', () => {
    const { nodes, clipboard } = makeClipboard([makeNode('n1', 0, 0, false)])
    cleanup = clipboard.attachKeyboard()
    fireKey('v')  // nothing copied yet
    expect(nodes()).toHaveLength(1)
  })

  it('cleanup removes listeners — subsequent Ctrl+C does nothing', () => {
    const { clipboard } = makeClipboard([makeNode('n1', 0, 0, true)])
    const detach = clipboard.attachKeyboard()
    detach()
    cleanup = undefined
    fireKey('c')
    expect(clipboard.hasContent).toBe(false)
  })

  it('can attach to custom EventTarget', () => {
    const { clipboard } = makeClipboard([makeNode('n1', 0, 0, true)])
    const target = new EventTarget()
    cleanup = clipboard.attachKeyboard(target)
    target.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'c', ctrlKey: true, bubbles: true,
    }))
    expect(clipboard.hasContent).toBe(true)
  })

  it('document listener does not fire when attached to custom target', () => {
    const { clipboard } = makeClipboard([makeNode('n1', 0, 0, true)])
    const target = new EventTarget()
    cleanup = clipboard.attachKeyboard(target)
    // Fire on document — should NOT trigger clipboard since we attached to target
    fireKey('c')
    expect(clipboard.hasContent).toBe(false)
  })
})
