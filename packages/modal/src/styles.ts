import type { ModalStyles } from './types.js';
import stylesUrl from '../css/styles.css?url';

/**
 * Maps ModalStyles keys to their CSS variable names.
 * Applied as inline styles on the overlay element so each modal instance
 * can override the global :root variables without affecting other modals.
 */
export const STYLE_TOKEN_MAP: ReadonlyArray<readonly [keyof ModalStyles, string]> = [
  ['bg',           '--lf-modal-bg'],
  ['headerBg',     '--lf-modal-header-bg'],
  ['headerColor',  '--lf-modal-header-color'],
  ['bodyColor',    '--lf-modal-body-color'],
  ['closeColor',   '--lf-modal-close-color'],
  ['backdrop',     '--lf-modal-backdrop'],
  ['shadow',       '--lf-modal-shadow'],
  ['borderRadius', '--lf-modal-border-radius'],
] as const

let stylesInjected = false

export function injectDefaultStyles(): void {
  if (stylesInjected) return
  if (typeof document === 'undefined') return // SSR safety
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = stylesUrl
  link.setAttribute('data-lf-modal', '')
  document.head.appendChild(link)
  stylesInjected = true
}

export function resetStylesInjection(): void {
  stylesInjected = false
  document.querySelector('link[data-lf-modal]')?.remove()
}
