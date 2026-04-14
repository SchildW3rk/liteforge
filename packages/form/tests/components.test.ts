/**
 * @liteforge/form — Input / Textarea component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { createForm } from '../src/form.js';
import { Input, Textarea } from '../src/components.js';

// ─── Schema / helpers ─────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Required'),
  bio: z.string(),
})

function makeForm(initial = { name: '', bio: '' }) {
  return createForm({
    schema,
    initial,
    onSubmit: vi.fn(),
  })
}

// ─── Input ────────────────────────────────────────────────────────────────────

describe('Input', () => {
  it('creates an <input> element', () => {
    const form = makeForm()
    const el = Input({ field: form.field('name') })
    expect(el.tagName).toBe('INPUT')
  })

  it('defaults to type="text"', () => {
    const form = makeForm()
    const el = Input({ field: form.field('name') })
    expect(el.type).toBe('text')
  })

  it('respects the type prop', () => {
    const form = makeForm()
    const el = Input({ field: form.field('name'), type: 'email' })
    expect(el.type).toBe('email')
  })

  it('sets static attributes', () => {
    const form = makeForm()
    const el = Input({
      field: form.field('name'),
      id: 'name-input',
      class: 'my-class',
      placeholder: 'Enter name',
      name: 'name',
      autocomplete: 'name',
    })
    expect(el.id).toBe('name-input')
    expect(el.className).toBe('my-class')
    expect(el.placeholder).toBe('Enter name')
    expect(el.name).toBe('name')
    expect(el.autocomplete).toBe('name')
  })

  it('reflects the initial field value', () => {
    const form = makeForm({ name: 'René', bio: '' })
    const el = Input({ field: form.field('name') })
    expect(el.value).toBe('René')
  })

  it('updates el.value when field.set() is called', () => {
    const form = makeForm()
    const el = Input({ field: form.field('name') })
    document.body.appendChild(el)

    form.field('name').set('Alice')
    // effect is synchronous in @liteforge/core
    expect(el.value).toBe('Alice')

    el.remove()
  })

  it('calls field.set() on input event', () => {
    const form = makeForm()
    const field = form.field('name')
    const setSpy = vi.spyOn(field, 'set')
    const el = Input({ field })

    el.value = 'Bob'
    el.dispatchEvent(new Event('input'))
    expect(setSpy).toHaveBeenCalledWith('Bob')
  })

  it('calls field.touch() on blur event', () => {
    const form = makeForm()
    const field = form.field('name')
    const touchSpy = vi.spyOn(field, 'touch')
    const el = Input({ field })

    el.dispatchEvent(new Event('blur'))
    expect(touchSpy).toHaveBeenCalledTimes(1)
  })

  it('sets aria-invalid when there is an error', async () => {
    const form = makeForm()
    const field = form.field('name')
    const el = Input({ field })

    // No error yet
    expect(el.getAttribute('aria-invalid')).toBeNull()

    // Trigger validation to set an error
    field.set('')
    field.touch()
    field.validate()

    expect(el.getAttribute('aria-invalid')).toBe('true')
  })

  it('removes aria-invalid when error clears', () => {
    const form = makeForm()
    const field = form.field('name')
    const el = Input({ field })

    field.touch()
    field.validate()
    expect(el.getAttribute('aria-invalid')).toBe('true')

    field.set('Alice')
    field.validate()
    expect(el.getAttribute('aria-invalid')).toBeNull()
  })

  it('calls ref with the element', () => {
    const form = makeForm()
    const ref = vi.fn()
    const el = Input({ field: form.field('name'), ref })
    expect(ref).toHaveBeenCalledWith(el)
  })

  it('sets disabled', () => {
    const form = makeForm()
    const el = Input({ field: form.field('name'), disabled: true })
    expect(el.disabled).toBe(true)
  })

  it('sets readonly', () => {
    const form = makeForm()
    const el = Input({ field: form.field('name'), readonly: true })
    expect(el.readOnly).toBe(true)
  })
})

// ─── Textarea ─────────────────────────────────────────────────────────────────

describe('Textarea', () => {
  it('creates a <textarea> element', () => {
    const form = makeForm()
    const el = Textarea({ field: form.field('bio') })
    expect(el.tagName).toBe('TEXTAREA')
  })

  it('sets static attributes', () => {
    const form = makeForm()
    const el = Textarea({
      field: form.field('bio'),
      id: 'bio-area',
      class: 'ta',
      placeholder: 'Bio…',
      rows: 4,
      cols: 40,
    })
    expect(el.id).toBe('bio-area')
    expect(el.className).toBe('ta')
    expect(el.placeholder).toBe('Bio…')
    expect(Number(el.rows)).toBe(4)
    expect(Number(el.cols)).toBe(40)
  })

  it('reflects the initial field value', () => {
    const form = makeForm({ name: '', bio: 'Hello world' })
    const el = Textarea({ field: form.field('bio') })
    expect(el.value).toBe('Hello world')
  })

  it('updates el.value when field.set() is called', () => {
    const form = makeForm()
    const el = Textarea({ field: form.field('bio') })
    document.body.appendChild(el)

    form.field('bio').set('New bio')
    expect(el.value).toBe('New bio')

    el.remove()
  })

  it('calls field.set() on input event', () => {
    const form = makeForm()
    const field = form.field('bio')
    const setSpy = vi.spyOn(field, 'set')
    const el = Textarea({ field })

    el.value = 'typed text'
    el.dispatchEvent(new Event('input'))
    expect(setSpy).toHaveBeenCalledWith('typed text')
  })

  it('calls field.touch() on blur event', () => {
    const form = makeForm()
    const field = form.field('bio')
    const touchSpy = vi.spyOn(field, 'touch')
    const el = Textarea({ field })

    el.dispatchEvent(new Event('blur'))
    expect(touchSpy).toHaveBeenCalledTimes(1)
  })

  it('calls ref with the element', () => {
    const form = makeForm()
    const ref = vi.fn()
    const el = Textarea({ field: form.field('bio'), ref })
    expect(ref).toHaveBeenCalledWith(el)
  })
})
