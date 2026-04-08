import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { clearContext } from '@liteforge/runtime'
import { createContextMenu } from '../src/components/ContextMenu.js'
import type { FlowContextValue } from '../src/context.js'
import type { FlowNode, FlowEdge, NodeContextMenuItem, EdgeContextMenuItem, PaneContextMenuItem } from '../src/types.js'

// Minimal FlowContextValue stub sufficient for ContextMenu
function makeCtx(overrides: Partial<FlowContextValue> = {}): FlowContextValue {
  return {
    nodeContextMenu: undefined,
    edgeContextMenu: undefined,
    paneContextMenu: undefined,
    ...overrides,
  } as unknown as FlowContextValue
}

function makeNode(id = 'n1'): FlowNode {
  return { id, type: 'default', position: { x: 0, y: 0 }, data: {} }
}

function makeEdge(id = 'e1'): FlowEdge {
  return { id, source: 'n1', sourceHandle: 'out', target: 'n2', targetHandle: 'in' }
}

const tick = () => new Promise<void>(resolve => setTimeout(resolve, 0))

describe('createContextMenu', () => {
  let root: HTMLDivElement
  let ctx: FlowContextValue

  beforeEach(() => {
    root = document.createElement('div')
    root.style.width = '800px'
    root.style.height = '600px'
    document.body.appendChild(root)
    ctx = makeCtx()
    clearContext()
  })

  afterEach(() => {
    root.remove()
    clearContext()
  })

  it('creates a .lf-context-menu element in the root', () => {
    const handle = createContextMenu(ctx, root)
    const menu = root.querySelector('.lf-context-menu')
    expect(menu).not.toBeNull()
    handle.dispose()
  })

  it('menu starts hidden', () => {
    const handle = createContextMenu(ctx, root)
    const menu = root.querySelector('.lf-context-menu') as HTMLElement
    expect(menu.style.display).toBe('none')
    handle.dispose()
  })

  it('showForNode with empty nodeContextMenu keeps menu hidden', () => {
    ctx = makeCtx({ nodeContextMenu: [] })
    const handle = createContextMenu(ctx, root)
    const menu = root.querySelector('.lf-context-menu') as HTMLElement
    handle.showForNode(makeNode(), 100, 100)
    expect(menu.style.display).toBe('none')
    handle.dispose()
  })

  it('showForNode renders correct number of items', () => {
    const items: NodeContextMenuItem[] = [
      { label: 'Delete Node', action: vi.fn() },
      { label: 'Duplicate Node', action: vi.fn() },
    ]
    ctx = makeCtx({ nodeContextMenu: items })
    const handle = createContextMenu(ctx, root)
    const menu = root.querySelector('.lf-context-menu') as HTMLElement

    handle.showForNode(makeNode(), 100, 100)

    const buttons = menu.querySelectorAll('.lf-context-menu-item')
    expect(buttons.length).toBe(2)
    handle.dispose()
  })

  it('item button text matches label', () => {
    const items: NodeContextMenuItem[] = [
      { label: 'Delete Node', action: vi.fn() },
      { label: 'Duplicate Node', action: vi.fn() },
    ]
    ctx = makeCtx({ nodeContextMenu: items })
    const handle = createContextMenu(ctx, root)
    const menu = root.querySelector('.lf-context-menu') as HTMLElement

    handle.showForNode(makeNode(), 100, 100)

    const buttons = menu.querySelectorAll('.lf-context-menu-item')
    expect(buttons[0].textContent).toBe('Delete Node')
    expect(buttons[1].textContent).toBe('Duplicate Node')
    handle.dispose()
  })

  it('clicking an item calls the action callback with the node', () => {
    const actionFn = vi.fn()
    const node = makeNode()
    const items: NodeContextMenuItem[] = [{ label: 'Delete Node', action: actionFn }]
    ctx = makeCtx({ nodeContextMenu: items })
    const handle = createContextMenu(ctx, root)
    const menu = root.querySelector('.lf-context-menu') as HTMLElement

    handle.showForNode(node, 100, 100)
    const btn = menu.querySelector('.lf-context-menu-item') as HTMLButtonElement
    btn.click()

    expect(actionFn).toHaveBeenCalledOnce()
    expect(actionFn).toHaveBeenCalledWith(node)
    handle.dispose()
  })

  it('clicking an item hides the menu', () => {
    const items: NodeContextMenuItem[] = [{ label: 'Delete Node', action: vi.fn() }]
    ctx = makeCtx({ nodeContextMenu: items })
    const handle = createContextMenu(ctx, root)
    const menu = root.querySelector('.lf-context-menu') as HTMLElement

    handle.showForNode(makeNode(), 100, 100)
    expect(menu.style.display).toBe('')

    const btn = menu.querySelector('.lf-context-menu-item') as HTMLButtonElement
    btn.click()
    expect(menu.style.display).toBe('none')
    handle.dispose()
  })

  it('clicking outside hides the menu', () => {
    const items: NodeContextMenuItem[] = [{ label: 'Delete Node', action: vi.fn() }]
    ctx = makeCtx({ nodeContextMenu: items })
    const handle = createContextMenu(ctx, root)
    const menu = root.querySelector('.lf-context-menu') as HTMLElement

    handle.showForNode(makeNode(), 100, 100)
    expect(menu.style.display).toBe('')

    // Click outside
    const outside = document.createElement('div')
    document.body.appendChild(outside)
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(menu.style.display).toBe('none')
    outside.remove()
    handle.dispose()
  })

  it('Escape key hides the menu', () => {
    const items: NodeContextMenuItem[] = [{ label: 'Delete Node', action: vi.fn() }]
    ctx = makeCtx({ nodeContextMenu: items })
    const handle = createContextMenu(ctx, root)
    const menu = root.querySelector('.lf-context-menu') as HTMLElement

    handle.showForNode(makeNode(), 100, 100)
    expect(menu.style.display).toBe('')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(menu.style.display).toBe('none')
    handle.dispose()
  })

  it('disabled item has the correct CSS class and aria-disabled', () => {
    const items: NodeContextMenuItem[] = [
      { label: 'Locked Action', action: vi.fn(), disabled: true },
    ]
    ctx = makeCtx({ nodeContextMenu: items })
    const handle = createContextMenu(ctx, root)
    const menu = root.querySelector('.lf-context-menu') as HTMLElement

    handle.showForNode(makeNode(), 100, 100)
    const btn = menu.querySelector('.lf-context-menu-item') as HTMLButtonElement
    expect(btn.classList.contains('lf-context-menu-item--disabled')).toBe(true)
    expect(btn.getAttribute('aria-disabled')).toBe('true')
    handle.dispose()
  })

  it('disabled item does not call action when clicked', () => {
    const actionFn = vi.fn()
    const items: NodeContextMenuItem[] = [
      { label: 'Locked Action', action: actionFn, disabled: true },
    ]
    ctx = makeCtx({ nodeContextMenu: items })
    const handle = createContextMenu(ctx, root)
    const menu = root.querySelector('.lf-context-menu') as HTMLElement

    handle.showForNode(makeNode(), 100, 100)
    const btn = menu.querySelector('.lf-context-menu-item') as HTMLButtonElement
    btn.click()
    expect(actionFn).not.toHaveBeenCalled()
    handle.dispose()
  })

  it('showForEdge renders items with the edge passed to action', () => {
    const actionFn = vi.fn()
    const edge = makeEdge()
    const items: EdgeContextMenuItem[] = [{ label: 'Delete Edge', action: actionFn }]
    ctx = makeCtx({ edgeContextMenu: items })
    const handle = createContextMenu(ctx, root)
    const menu = root.querySelector('.lf-context-menu') as HTMLElement

    handle.showForEdge(edge, 200, 200)
    expect(menu.style.display).toBe('')
    expect(menu.querySelectorAll('.lf-context-menu-item').length).toBe(1)

    const btn = menu.querySelector('.lf-context-menu-item') as HTMLButtonElement
    btn.click()
    expect(actionFn).toHaveBeenCalledWith(edge)
    handle.dispose()
  })

  it('showForPane passes canvas-space position to action', () => {
    const actionFn = vi.fn()
    const canvasPos = { x: 42, y: 77 }
    const items: PaneContextMenuItem[] = [{ label: 'Add Node', action: actionFn }]
    ctx = makeCtx({ paneContextMenu: items })
    const handle = createContextMenu(ctx, root)
    const menu = root.querySelector('.lf-context-menu') as HTMLElement

    handle.showForPane(canvasPos, 300, 300)
    expect(menu.style.display).toBe('')

    const btn = menu.querySelector('.lf-context-menu-item') as HTMLButtonElement
    btn.click()
    expect(actionFn).toHaveBeenCalledWith(canvasPos)
    handle.dispose()
  })

  it('dispose() removes the menu element from DOM', () => {
    const handle = createContextMenu(ctx, root)
    expect(root.querySelector('.lf-context-menu')).not.toBeNull()
    handle.dispose()
    expect(root.querySelector('.lf-context-menu')).toBeNull()
  })

  it('hide() called explicitly sets display:none and clears items', () => {
    const items: NodeContextMenuItem[] = [{ label: 'Delete Node', action: vi.fn() }]
    ctx = makeCtx({ nodeContextMenu: items })
    const handle = createContextMenu(ctx, root)
    const menu = root.querySelector('.lf-context-menu') as HTMLElement

    handle.showForNode(makeNode(), 100, 100)
    expect(menu.querySelectorAll('.lf-context-menu-item').length).toBe(1)

    handle.hide()
    expect(menu.style.display).toBe('none')
    expect(menu.querySelectorAll('.lf-context-menu-item').length).toBe(0)
    handle.dispose()
  })
})
