import type { FlowContextValue } from '../context.js'

/**
 * setupKeyboard — Delete / Backspace + Accessibility keyboard handling.
 *
 * Responsibilities:
 *  1. Delete/Backspace — remove selected nodes and edges
 *  2. Roving tabindex — Tab/Shift-Tab moves focus between node wrappers
 *  3. Arrow keys — move the focused node by ARROW_STEP canvas units
 *  4. Enter — select the focused node
 *  5. Escape — deselect all + return focus to the canvas root
 *
 * Why root element instead of document:
 *  - Scope isolation: only fires when the canvas is focused. Two FlowCanvas
 *    instances on the same page cannot interfere with each other.
 *  - No input/textarea guard needed: focus on the canvas root means the user
 *    is not typing in a text field. Document listeners need an explicit
 *    tagName guard; root-focus makes it structurally impossible to misfire.
 *
 * Roving tabindex pattern (WCAG 2.1 AA composite widget):
 *  - The canvas root has tabindex="-1" (focusable via pointer but not Tab).
 *  - Exactly one node wrapper has tabindex="0"; all others have tabindex="-1".
 *  - Tab/Shift-Tab advance the "active" index and call .focus() on the next el.
 *  - When focus leaves the canvas entirely, the tabindex="0" seat is preserved
 *    so Tab into the canvas lands back on the last focused node.
 *
 * Conflict with Undo/Redo (Ctrl+Z / Ctrl+Y in flow-history.ts):
 *  - Different key combinations — no conflict.
 *  - Ctrl+Delete / Meta+Delete: modifier combos are ignored here.
 */

const ARROW_STEP = 10 // canvas units per arrow key press

export function setupKeyboard(ctx: FlowContextValue, root: HTMLElement): () => void {
  // Make root focusable so keydown events land here (not document)
  if (!root.hasAttribute('tabindex')) {
    root.setAttribute('tabindex', '-1')
  }
  // Remove default focus outline — the canvas has its own selection feedback
  root.style.outline = 'none'

  // ---- Roving tabindex helpers ----

  /** Returns all node wrappers in DOM order. */
  function getNodeEls(): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>('.lf-node-wrapper'))
  }

  /** Returns the index of the wrapper that currently has tabindex="0". */
  function getActiveIndex(els: HTMLElement[]): number {
    const idx = els.findIndex(el => el.getAttribute('tabindex') === '0')
    return idx >= 0 ? idx : 0
  }

  /**
   * Move the tabindex="0" seat to `nextIdx`, focus it, and ensure all others
   * have tabindex="-1".
   */
  function moveFocus(els: HTMLElement[], nextIdx: number): void {
    const clamped = Math.max(0, Math.min(els.length - 1, nextIdx))
    els.forEach((el, i) => el.setAttribute('tabindex', i === clamped ? '0' : '-1'))
    els[clamped]?.focus()
  }

  // ---- Initialize roving tabindex on the first node ----
  // Deferred so nodes are in the DOM before we query them.
  queueMicrotask(() => {
    const els = getNodeEls()
    if (els.length === 0) return
    // Only set if no node already has tabindex=0
    const hasActive = els.some(el => el.getAttribute('tabindex') === '0')
    if (!hasActive) {
      els[0]!.setAttribute('tabindex', '0')
    }
  })

  // ---- Main keydown handler ----
  const handleKeyDown = (e: KeyboardEvent) => {
    // Guard: ignore events from input / textarea / contenteditable inside nodes
    const target = e.target as HTMLElement
    const tag = target.tagName.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || target.isContentEditable) return

    const els = getNodeEls()

    // ---- Tab / Shift-Tab: roving tabindex ----
    if (e.key === 'Tab') {
      if (els.length === 0) return
      e.preventDefault()
      const current = getActiveIndex(els)
      const next = e.shiftKey ? current - 1 : current + 1
      if (next < 0 || next >= els.length) return // let focus leave canvas at edges
      moveFocus(els, next)
      return
    }

    // ---- Escape: deselect all + return focus to root ----
    if (e.key === 'Escape') {
      const allNodes = ctx.getNodes()
      const allEdges = ctx.getEdges()
      if (allNodes.some(n => n.selected)) {
        ctx.onNodesChange?.(allNodes.map(n => ({ type: 'select' as const, id: n.id, selected: false })))
      }
      if (allEdges.some(ed => ed.selected)) {
        ctx.onEdgesChange?.(allEdges.map(ed => ({ type: 'select' as const, id: ed.id, selected: false })))
      }
      root.focus()
      return
    }

    // ---- Enter: select focused node ----
    if (e.key === 'Enter') {
      const active = els[getActiveIndex(els)]
      if (!active) return
      const focusedId = active.getAttribute('data-node-id')
      if (!focusedId) return
      e.preventDefault()
      const allNodes = ctx.getNodes()
      ctx.onNodesChange?.(allNodes.map(n => ({
        type: 'select' as const,
        id: n.id,
        selected: n.id === focusedId,
      })))
      return
    }

    // ---- Arrow keys: move focused node ----
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // Ignore modifier combos except Shift (Shift+Arrow = larger step)
      if (e.ctrlKey || e.metaKey || e.altKey) return

      const active = els[getActiveIndex(els)]
      if (!active) return
      const focusedId = active.getAttribute('data-node-id')
      if (!focusedId) return
      const focusedNode = ctx.getNode(focusedId)
      if (!focusedNode) return

      e.preventDefault()

      const step = e.shiftKey ? ARROW_STEP * 5 : ARROW_STEP
      let dx = 0
      let dy = 0
      if (e.key === 'ArrowLeft')  dx = -step
      if (e.key === 'ArrowRight') dx =  step
      if (e.key === 'ArrowUp')    dy = -step
      if (e.key === 'ArrowDown')  dy =  step

      ctx.onNodesChange?.([{
        type: 'position',
        id: focusedId,
        position: {
          x: focusedNode.position.x + dx,
          y: focusedNode.position.y + dy,
        },
      }])
      return
    }

    // ---- Delete / Backspace: remove selected nodes + edges ----
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key !== 'Delete' && e.key !== 'Backspace') return

    const nodesToRemove = ctx.getNodes().filter(n => n.selected)
    const edgesToRemove = ctx.getEdges().filter(ed => ed.selected)

    if (nodesToRemove.length > 0) {
      ctx.onNodesChange?.(nodesToRemove.map(n => ({ type: 'remove' as const, id: n.id })))
    }
    if (edgesToRemove.length > 0) {
      ctx.onEdgesChange?.(edgesToRemove.map(ed => ({ type: 'remove' as const, id: ed.id })))
    }
  }

  root.addEventListener('keydown', handleKeyDown)
  return () => root.removeEventListener('keydown', handleKeyDown)
}

/**
 * Called by NodeWrapper after it appends its element to the DOM.
 * Ensures the new node participates in the roving tabindex scheme:
 *  - If it's the first node, give it tabindex="0"
 *  - Otherwise give it tabindex="-1"
 */
export function initNodeTabIndex(
  el: HTMLElement,
  root: HTMLElement,
): void {
  const existing = root.querySelectorAll<HTMLElement>('.lf-node-wrapper[tabindex="0"]')
  el.setAttribute('tabindex', existing.length === 0 ? '0' : '-1')
}
