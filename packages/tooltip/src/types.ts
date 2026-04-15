export type TooltipPosition = 'top' | 'right' | 'bottom' | 'left' | 'auto'

/**
 * Inline style overrides for tooltip parts.
 * Note: `arrow` cannot be applied directly because the arrow is a CSS `::before`
 * pseudo-element. Store it as `data-arrow-style` on the tooltip element and
 * target it with `[data-arrow-style] + ::before` in your own CSS if needed.
 */
export interface TooltipStyles {
  /** Inline style string applied to the tooltip element. */
  tooltip?: string
  /**
   * Stored as `data-arrow-style` attribute on the tooltip element.
   * Cannot be applied directly since the arrow uses a `::before` pseudo-element.
   */
  arrow?: string
}

export interface TooltipOptions {
  content: string | Node
  position?: TooltipPosition
  delay?: number
  offset?: number
  disabled?: boolean
  showWhen?: () => boolean
  /** Whether focus/blur events trigger the tooltip (default: true) */
  triggerOnFocus?: boolean
  /** Inline style overrides for the tooltip element (and arrow data attribute). */
  styles?: TooltipStyles
  /** Extra CSS class(es) added to the tooltip element. */
  class?: string
  /** Shorthand: sets `border-radius` inline on the tooltip (overrides the CSS variable). */
  borderRadius?: string
  /**
   * How the tooltip is dismissed. Default: `'auto'` (hides on pointerleave/blur).
   * - `'auto'`   — hide on pointerleave + blur (and on click)
   * - `'click'`  — hide on click of target only (not on pointerleave/blur)
   * - `'manual'` — only the returned cleanup fn hides the tooltip
   */
  dismissOn?: 'auto' | 'click' | 'manual'
}

export type TooltipInput = string | TooltipOptions
