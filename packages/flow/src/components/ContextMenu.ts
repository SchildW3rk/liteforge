import type { FlowContextValue } from '../context.js'
import type { FlowNode, FlowEdge, Point } from '../types.js'

export interface ContextMenuHandle {
  showForNode:  (node: FlowNode, screenX: number, screenY: number) => void
  showForEdge:  (edge: FlowEdge, screenX: number, screenY: number) => void
  showForPane:  (canvasPos: Point, screenX: number, screenY: number) => void
  hide:         () => void
  dispose:      () => void
}

interface InternalItem {
  label:    string
  disabled: boolean | undefined
  onSelect: () => void
}

export function createContextMenu(
  ctx: FlowContextValue,
  root: HTMLElement,
): ContextMenuHandle {
  const el = document.createElement('div')
  el.className = 'lf-context-menu'
  el.style.display = 'none'
  el.setAttribute('role', 'menu')
  root.appendChild(el)

  function show(items: InternalItem[], screenX: number, screenY: number) {
    el.innerHTML = ''

    for (const item of items) {
      const btn = document.createElement('button')
      btn.className = 'lf-context-menu-item'
      if (item.disabled) {
        btn.className += ' lf-context-menu-item--disabled'
        btn.setAttribute('aria-disabled', 'true')
      }
      btn.textContent = item.label
      btn.type = 'button'
      btn.addEventListener('click', (e: MouseEvent) => {
        e.stopPropagation()
        if (!item.disabled) item.onSelect()
        hide()
      })
      el.appendChild(btn)
    }

    el.style.display = ''

    // Position relative to root element
    const rootRect = root.getBoundingClientRect()
    let x = screenX - rootRect.left
    let y = screenY - rootRect.top

    el.style.left = `${x}px`
    el.style.top  = `${y}px`

    // Adjust to keep within root bounds after layout
    requestAnimationFrame(() => {
      const menuW = el.offsetWidth
      const menuH = el.offsetHeight
      if (x + menuW > rootRect.width)  x = rootRect.width  - menuW - 4
      if (y + menuH > rootRect.height) y = rootRect.height - menuH - 4
      el.style.left = `${Math.max(0, x)}px`
      el.style.top  = `${Math.max(0, y)}px`
    })
  }

  function hide(): void {
    el.style.display = 'none'
    el.innerHTML = ''
  }

  // Close when clicking outside the menu
  const onOutsideClick = (e: MouseEvent) => {
    if (!el.contains(e.target as Node)) hide()
  }
  document.addEventListener('click', onOutsideClick, true)

  // Close on Escape
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') hide()
  }
  document.addEventListener('keydown', onKeyDown)

  function showForNode(node: FlowNode, screenX: number, screenY: number): void {
    const userItems = ctx.nodeContextMenu ?? []
    if (userItems.length === 0) return
    const items: InternalItem[] = userItems.map(item => ({
      label:    item.label,
      disabled: item.disabled,
      onSelect: () => item.action(node),
    }))
    show(items, screenX, screenY)
  }

  function showForEdge(edge: FlowEdge, screenX: number, screenY: number): void {
    const userItems = ctx.edgeContextMenu ?? []
    if (userItems.length === 0) return
    const items: InternalItem[] = userItems.map(item => ({
      label:    item.label,
      disabled: item.disabled,
      onSelect: () => item.action(edge),
    }))
    show(items, screenX, screenY)
  }

  function showForPane(canvasPos: Point, screenX: number, screenY: number): void {
    const userItems = ctx.paneContextMenu ?? []
    if (userItems.length === 0) return
    const items: InternalItem[] = userItems.map(item => ({
      label:    item.label,
      disabled: item.disabled,
      onSelect: () => item.action(canvasPos),
    }))
    show(items, screenX, screenY)
  }

  function dispose(): void {
    document.removeEventListener('click', onOutsideClick, true)
    document.removeEventListener('keydown', onKeyDown)
    el.remove()
  }

  return { showForNode, showForEdge, showForPane, hide, dispose }
}
