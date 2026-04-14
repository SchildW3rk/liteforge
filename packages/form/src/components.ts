/**
 * @liteforge/form — Field-bound Input Components
 *
 * `Input` and `Textarea` are thin wrappers around native elements that accept
 * a `field` prop of `FieldResult<string>` and automatically wire up:
 *   - `value`   ← field.value() (reactive)
 *   - `oninput` → field.set(e.target.value)
 *   - `onblur`  → field.touch()
 *
 * All other attributes (type, placeholder, class, id, disabled, …) are forwarded
 * directly to the underlying element.
 *
 * @example
 * ```tsx
 * const name = form.field('name')
 *
 * <Input field={name} placeholder="Full name" class="my-input" />
 * <Show when={() => !!name.error()}>{() => <span>{() => name.error()}</span>}</Show>
 * ```
 */

import { effect } from '@liteforge/core'
import type { FieldResult } from './types.js'

// ─── Shared attribute types ───────────────────────────────────────────────────

/**
 * HTML attributes common to both `<input>` and `<textarea>`.
 * Intentionally narrow — only what makes sense for text-like form fields.
 * The `field` binding covers value/oninput/onblur, so those are excluded.
 */
interface SharedFieldProps {
  /** CSS class string */
  class?: string
  /** DOM id */
  id?: string
  /** Placeholder text */
  placeholder?: string
  /** Disabled state */
  disabled?: boolean
  /** Read-only state */
  readonly?: boolean
  /** Tab index */
  tabindex?: number
  /** Autocomplete hint */
  autocomplete?: string
  /** Name attribute */
  name?: string
  /** aria-label */
  'aria-label'?: string
  /** aria-describedby */
  'aria-describedby'?: string
  /** aria-invalid — auto-set to "true" when field.error() is truthy */
  'aria-invalid'?: boolean
  /** ref callback — called with the element after creation */
  ref?: (el: HTMLInputElement | HTMLTextAreaElement) => void
}

// ─── Input ────────────────────────────────────────────────────────────────────

export interface InputProps extends SharedFieldProps {
  /** The FieldResult to bind — drives value, oninput, onblur */
  field: FieldResult<string>
  /**
   * Input type (default: 'text').
   * Exclude types that need their own component (checkbox, radio, file, range, …).
   */
  type?: 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number' | 'date' | 'time'
}

/**
 * A reactive `<input>` element bound to a form field.
 *
 * ```tsx
 * <Input field={form.field('email')} type="email" placeholder="name@example.com" />
 * ```
 */
export function Input(props: InputProps): HTMLInputElement {
  const el = document.createElement('input')

  // Static attributes set once
  el.type = props.type ?? 'text'
  if (props.id)           el.id = props.id
  if (props.class)        el.className = props.class
  if (props.placeholder)  el.placeholder = props.placeholder
  if (props.name)         el.name = props.name
  if (props.autocomplete) el.autocomplete = props.autocomplete as AutoFill
  if (props.tabindex !== undefined) el.tabIndex = props.tabindex
  if (props.disabled)     el.disabled = true
  if (props.readonly)     el.readOnly = true
  if (props['aria-label'])       el.setAttribute('aria-label', props['aria-label'])
  if (props['aria-describedby']) el.setAttribute('aria-describedby', props['aria-describedby'])

  // Reactive value sync: field.value() → el.value
  effect(() => {
    const v = props.field.value()
    // Only update when not focused to avoid cursor-jump while user is typing
    if (document.activeElement !== el) {
      el.value = v ?? ''
    }
  })

  // Reactive aria-invalid
  effect(() => {
    const hasError = !!props.field.error()
    if (hasError) {
      el.setAttribute('aria-invalid', 'true')
    } else {
      el.removeAttribute('aria-invalid')
    }
  })

  // Event handlers
  el.addEventListener('input', () => {
    props.field.set(el.value)
  })

  el.addEventListener('blur', () => {
    props.field.touch()
  })

  if (props.ref) props.ref(el)

  return el
}

// ─── Textarea ─────────────────────────────────────────────────────────────────

export interface TextareaProps extends SharedFieldProps {
  /** The FieldResult to bind — drives value, oninput, onblur */
  field: FieldResult<string>
  /** Visible text rows */
  rows?: number
  /** Visible text columns */
  cols?: number
}

/**
 * A reactive `<textarea>` element bound to a form field.
 *
 * ```tsx
 * <Textarea field={form.field('bio')} rows={4} placeholder="Tell us about yourself" />
 * ```
 */
export function Textarea(props: TextareaProps): HTMLTextAreaElement {
  const el = document.createElement('textarea')

  // Static attributes set once
  if (props.id)           el.id = props.id
  if (props.class)        el.className = props.class
  if (props.placeholder)  el.placeholder = props.placeholder
  if (props.name)         el.name = props.name
  if (props.autocomplete) el.autocomplete = props.autocomplete as AutoFill
  if (props.tabindex !== undefined) el.tabIndex = props.tabindex
  if (props.disabled)     el.disabled = true
  if (props.readonly)     el.readOnly = true
  if (props.rows !== undefined) el.rows = props.rows
  if (props.cols !== undefined) el.cols = props.cols
  if (props['aria-label'])       el.setAttribute('aria-label', props['aria-label'])
  if (props['aria-describedby']) el.setAttribute('aria-describedby', props['aria-describedby'])

  // Reactive value sync: field.value() → el.value
  effect(() => {
    const v = props.field.value()
    if (document.activeElement !== el) {
      el.value = v ?? ''
    }
  })

  // Reactive aria-invalid
  effect(() => {
    const hasError = !!props.field.error()
    if (hasError) {
      el.setAttribute('aria-invalid', 'true')
    } else {
      el.removeAttribute('aria-invalid')
    }
  })

  // Event handlers
  el.addEventListener('input', () => {
    props.field.set(el.value)
  })

  el.addEventListener('blur', () => {
    props.field.touch()
  })

  if (props.ref) props.ref(el)

  return el
}
