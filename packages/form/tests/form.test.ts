/**
 * createForm Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import { effect } from '@liteforge/core';
import { createForm } from '../src/form.js';

describe('createForm', () => {
  describe('basic functionality', () => {
    it('creates a form with initial values', () => {
      const form = createForm({
        schema: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
        initial: { name: 'John', email: 'john@test.com' },
        onSubmit: vi.fn(),
      });

      expect(form.values()).toEqual({ name: 'John', email: 'john@test.com' });
      expect(form.field('name').value()).toBe('John');
      expect(form.field('email').value()).toBe('john@test.com');
    });

    it('returns all form signals', () => {
      const form = createForm({
        schema: z.object({ name: z.string() }),
        initial: { name: '' },
        onSubmit: vi.fn(),
      });

      expect(typeof form.values).toBe('function');
      expect(typeof form.errors).toBe('function');
      expect(typeof form.isValid).toBe('function');
      expect(typeof form.isDirty).toBe('function');
      expect(typeof form.isSubmitting).toBe('function');
      expect(typeof form.submitCount).toBe('function');
    });

    it('returns all field signals', () => {
      const form = createForm({
        schema: z.object({ name: z.string() }),
        initial: { name: '' },
        onSubmit: vi.fn(),
      });

      const field = form.field('name');
      expect(typeof field.value).toBe('function');
      expect(typeof field.error).toBe('function');
      expect(typeof field.touched).toBe('function');
      expect(typeof field.dirty).toBe('function');
      expect(typeof field.set).toBe('function');
      expect(typeof field.reset).toBe('function');
      expect(typeof field.validate).toBe('function');
      expect(typeof field.touch).toBe('function');
    });
  });

  describe('field operations', () => {
    it('sets field value', () => {
      const form = createForm({
        schema: z.object({ name: z.string() }),
        initial: { name: '' },
        onSubmit: vi.fn(),
      });

      form.field('name').set('Alice');
      expect(form.field('name').value()).toBe('Alice');
      expect(form.values().name).toBe('Alice');
    });

    it('tracks dirty state', () => {
      const form = createForm({
        schema: z.object({ name: z.string() }),
        initial: { name: 'Initial' },
        onSubmit: vi.fn(),
      });

      expect(form.field('name').dirty()).toBe(false);
      expect(form.isDirty()).toBe(false);

      form.field('name').set('Changed');
      expect(form.field('name').dirty()).toBe(true);
      expect(form.isDirty()).toBe(true);

      form.field('name').set('Initial');
      expect(form.field('name').dirty()).toBe(false);
      expect(form.isDirty()).toBe(false);
    });

    it('tracks touched state', () => {
      const form = createForm({
        schema: z.object({ name: z.string() }),
        initial: { name: '' },
        onSubmit: vi.fn(),
      });

      expect(form.field('name').touched()).toBe(false);

      form.field('name').touch();
      expect(form.field('name').touched()).toBe(true);
    });

    it('resets field to initial value', () => {
      const form = createForm({
        schema: z.object({ name: z.string() }),
        initial: { name: 'Initial' },
        onSubmit: vi.fn(),
      });

      form.field('name').set('Changed');
      form.field('name').touch();
      expect(form.field('name').value()).toBe('Changed');
      expect(form.field('name').touched()).toBe(true);

      form.field('name').reset();
      expect(form.field('name').value()).toBe('Initial');
      expect(form.field('name').touched()).toBe(false);
    });
  });

  describe('nested fields', () => {
    it('accesses nested fields with dot notation', () => {
      const form = createForm({
        schema: z.object({
          address: z.object({
            street: z.string(),
            city: z.string(),
          }),
        }),
        initial: {
          address: { street: '123 Main St', city: 'NYC' },
        },
        onSubmit: vi.fn(),
      });

      expect(form.field('address.street').value()).toBe('123 Main St');
      expect(form.field('address.city').value()).toBe('NYC');
    });

    it('sets nested field values', () => {
      const form = createForm({
        schema: z.object({
          address: z.object({
            street: z.string(),
            city: z.string(),
          }),
        }),
        initial: {
          address: { street: '', city: '' },
        },
        onSubmit: vi.fn(),
      });

      form.field('address.street').set('456 Oak Ave');
      expect(form.field('address.street').value()).toBe('456 Oak Ave');
      expect(form.values().address.street).toBe('456 Oak Ave');
    });

    it('tracks dirty state for nested fields', () => {
      const form = createForm({
        schema: z.object({
          address: z.object({
            street: z.string(),
          }),
        }),
        initial: {
          address: { street: 'Initial' },
        },
        onSubmit: vi.fn(),
      });

      expect(form.field('address.street').dirty()).toBe(false);

      form.field('address.street').set('Changed');
      expect(form.field('address.street').dirty()).toBe(true);
    });
  });

  describe('validation - blur mode (default)', () => {
    it('validates on touch (blur)', () => {
      const form = createForm({
        schema: z.object({
          email: z.string().email('Invalid email'),
        }),
        initial: { email: 'invalid' },
        onSubmit: vi.fn(),
        validateOn: 'blur',
      });

      expect(form.field('email').error()).toBeUndefined();

      form.field('email').touch();
      expect(form.field('email').error()).toBe('Invalid email');
    });

    it('revalidates on change after error', () => {
      const form = createForm({
        schema: z.object({
          email: z.string().email('Invalid email'),
        }),
        initial: { email: '' },
        onSubmit: vi.fn(),
        validateOn: 'blur',
        revalidateOn: 'change',
      });

      // Touch to trigger validation
      form.field('email').touch();
      expect(form.field('email').error()).toBe('Invalid email');

      // Now changes should revalidate
      form.field('email').set('valid@email.com');
      expect(form.field('email').error()).toBeUndefined();
    });

    it('does not validate on change before first error', () => {
      const form = createForm({
        schema: z.object({
          email: z.string().email('Invalid email'),
        }),
        initial: { email: '' },
        onSubmit: vi.fn(),
        validateOn: 'blur',
      });

      form.field('email').set('still-invalid');
      expect(form.field('email').error()).toBeUndefined(); // No error yet
    });
  });

  describe('validation - change mode', () => {
    it('validates on every change', () => {
      const form = createForm({
        schema: z.object({
          name: z.string().min(3, 'Min 3 chars'),
        }),
        initial: { name: '' },
        onSubmit: vi.fn(),
        validateOn: 'change',
      });

      form.field('name').set('AB');
      expect(form.field('name').error()).toBe('Min 3 chars');

      form.field('name').set('ABC');
      expect(form.field('name').error()).toBeUndefined();
    });
  });

  describe('validation - submit mode', () => {
    it('only validates on submit', async () => {
      const onSubmit = vi.fn();
      const form = createForm({
        schema: z.object({
          name: z.string().min(3, 'Min 3 chars'),
        }),
        initial: { name: '' },
        onSubmit,
        validateOn: 'submit',
      });

      form.field('name').set('AB');
      expect(form.field('name').error()).toBeUndefined();

      form.field('name').touch();
      expect(form.field('name').error()).toBeUndefined();

      await form.submit();
      expect(form.field('name').error()).toBe('Min 3 chars');
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('form-level validation', () => {
    it('isValid reflects validation state', () => {
      const form = createForm({
        schema: z.object({
          name: z.string().min(1),
          email: z.string().email(),
        }),
        initial: { name: '', email: '' },
        onSubmit: vi.fn(),
      });

      expect(form.isValid()).toBe(true); // No errors set yet

      form.validate();
      expect(form.isValid()).toBe(false);

      form.field('name').set('John');
      form.field('email').set('john@test.com');
      form.validate();
      expect(form.isValid()).toBe(true);
    });

    it('errors() returns all field errors', () => {
      const form = createForm({
        schema: z.object({
          name: z.string().min(1, 'Name required'),
          email: z.string().email('Invalid email'),
        }),
        initial: { name: '', email: 'invalid' },
        onSubmit: vi.fn(),
      });

      form.validate();
      const errors = form.errors();

      expect(errors['name']).toBe('Name required');
      expect(errors['email']).toBe('Invalid email');
    });
  });

  describe('submit', () => {
    it('validates all fields before submit', async () => {
      const onSubmit = vi.fn();
      const form = createForm({
        schema: z.object({
          name: z.string().min(1, 'Required'),
        }),
        initial: { name: '' },
        onSubmit,
      });

      await form.submit();
      expect(onSubmit).not.toHaveBeenCalled();
      expect(form.field('name').error()).toBe('Required');
    });

    it('calls onSubmit with valid values', async () => {
      const onSubmit = vi.fn();
      const form = createForm({
        schema: z.object({
          name: z.string().min(1),
          age: z.number(),
        }),
        initial: { name: 'John', age: 30 },
        onSubmit,
      });

      await form.submit();
      expect(onSubmit).toHaveBeenCalledWith({ name: 'John', age: 30 });
    });

    it('sets isSubmitting during submit', async () => {
      let resolveSubmit: () => void;
      const submitPromise = new Promise<void>(resolve => {
        resolveSubmit = resolve;
      });

      const form = createForm({
        schema: z.object({ name: z.string() }),
        initial: { name: 'Test' },
        onSubmit: async () => {
          await submitPromise;
        },
      });

      const promise = form.submit();
      expect(form.isSubmitting()).toBe(true);

      resolveSubmit!();
      await promise;
      expect(form.isSubmitting()).toBe(false);
    });

    it('increments submitCount', async () => {
      const form = createForm({
        schema: z.object({ name: z.string() }),
        initial: { name: 'Test' },
        onSubmit: vi.fn(),
      });

      expect(form.submitCount()).toBe(0);
      await form.submit();
      expect(form.submitCount()).toBe(1);
      await form.submit();
      expect(form.submitCount()).toBe(2);
    });

    it('increments submitCount even on validation failure', async () => {
      const form = createForm({
        schema: z.object({ name: z.string().min(1) }),
        initial: { name: '' },
        onSubmit: vi.fn(),
      });

      await form.submit();
      expect(form.submitCount()).toBe(1);
    });
  });

  describe('reset', () => {
    it('resets all values to initial', () => {
      const form = createForm({
        schema: z.object({
          name: z.string(),
          email: z.string(),
        }),
        initial: { name: 'Initial', email: 'initial@test.com' },
        onSubmit: vi.fn(),
      });

      form.field('name').set('Changed');
      form.field('email').set('changed@test.com');

      form.reset();

      expect(form.values()).toEqual({ name: 'Initial', email: 'initial@test.com' });
    });

    it('clears all errors', () => {
      const form = createForm({
        schema: z.object({
          name: z.string().min(1, 'Required'),
        }),
        initial: { name: '' },
        onSubmit: vi.fn(),
      });

      form.validate();
      expect(form.field('name').error()).toBe('Required');

      form.reset();
      expect(form.field('name').error()).toBeUndefined();
      expect(form.errors()).toEqual({});
    });

    it('clears touched state', () => {
      const form = createForm({
        schema: z.object({ name: z.string() }),
        initial: { name: '' },
        onSubmit: vi.fn(),
      });

      form.field('name').touch();
      expect(form.field('name').touched()).toBe(true);

      form.reset();
      expect(form.field('name').touched()).toBe(false);
    });
  });

  describe('setValues', () => {
    it('sets multiple values at once', () => {
      const form = createForm({
        schema: z.object({
          name: z.string(),
          email: z.string(),
        }),
        initial: { name: '', email: '' },
        onSubmit: vi.fn(),
      });

      form.setValues({ name: 'John', email: 'john@test.com' });

      expect(form.field('name').value()).toBe('John');
      expect(form.field('email').value()).toBe('john@test.com');
    });

    it('supports partial updates', () => {
      const form = createForm({
        schema: z.object({
          name: z.string(),
          email: z.string(),
        }),
        initial: { name: 'Initial', email: 'initial@test.com' },
        onSubmit: vi.fn(),
      });

      form.setValues({ name: 'Updated' });

      expect(form.field('name').value()).toBe('Updated');
      expect(form.field('email').value()).toBe('initial@test.com');
    });

    it('deep merges nested objects', () => {
      const form = createForm({
        schema: z.object({
          address: z.object({
            street: z.string(),
            city: z.string(),
          }),
        }),
        initial: {
          address: { street: 'Main St', city: 'NYC' },
        },
        onSubmit: vi.fn(),
      });

      form.setValues({ address: { street: 'Oak Ave' } } as Partial<{ address: { street: string; city: string } }>);

      expect(form.field('address.street').value()).toBe('Oak Ave');
      expect(form.field('address.city').value()).toBe('NYC');
    });
  });

  describe('array fields', () => {
    it('returns array field result', () => {
      const form = createForm({
        schema: z.object({
          items: z.array(z.object({
            name: z.string(),
          })),
        }),
        initial: {
          items: [{ name: 'Item 1' }],
        },
        onSubmit: vi.fn(),
      });

      const items = form.array('items');

      expect(typeof items.fields).toBe('function');
      expect(typeof items.append).toBe('function');
      expect(typeof items.remove).toBe('function');
      expect(typeof items.move).toBe('function');
    });

    it('fields() returns array item accessors', () => {
      const form = createForm({
        schema: z.object({
          items: z.array(z.object({
            name: z.string(),
            price: z.number(),
          })),
        }),
        initial: {
          items: [
            { name: 'Item 1', price: 10 },
            { name: 'Item 2', price: 20 },
          ],
        },
        onSubmit: vi.fn(),
      });

      const items = form.array('items');
      const fields = items.fields();

      expect(fields.length).toBe(2);
      expect(fields[0]?.field('name').value()).toBe('Item 1');
      expect(fields[0]?.field('price').value()).toBe(10);
      expect(fields[1]?.field('name').value()).toBe('Item 2');
    });

    it('append() adds item to array', () => {
      const form = createForm({
        schema: z.object({
          items: z.array(z.object({ name: z.string() })),
        }),
        initial: {
          items: [{ name: 'First' }],
        },
        onSubmit: vi.fn(),
      });

      const items = form.array('items');
      items.append({ name: 'Second' });

      expect(items.length()).toBe(2);
      expect(items.fields()[1]?.field('name').value()).toBe('Second');
    });

    it('prepend() adds item to beginning', () => {
      const form = createForm({
        schema: z.object({
          items: z.array(z.object({ name: z.string() })),
        }),
        initial: {
          items: [{ name: 'First' }],
        },
        onSubmit: vi.fn(),
      });

      const items = form.array('items');
      items.prepend({ name: 'Zero' });

      expect(items.length()).toBe(2);
      expect(items.fields()[0]?.field('name').value()).toBe('Zero');
    });

    it('remove() removes item at index', () => {
      const form = createForm({
        schema: z.object({
          items: z.array(z.object({ name: z.string() })),
        }),
        initial: {
          items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
        },
        onSubmit: vi.fn(),
      });

      const items = form.array('items');
      items.remove(1);

      expect(items.length()).toBe(2);
      expect(items.fields()[0]?.field('name').value()).toBe('A');
      expect(items.fields()[1]?.field('name').value()).toBe('C');
    });

    it('move() reorders items', () => {
      const form = createForm({
        schema: z.object({
          items: z.array(z.object({ name: z.string() })),
        }),
        initial: {
          items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
        },
        onSubmit: vi.fn(),
      });

      const items = form.array('items');
      items.move(0, 2);

      expect(items.fields()[0]?.field('name').value()).toBe('B');
      expect(items.fields()[1]?.field('name').value()).toBe('C');
      expect(items.fields()[2]?.field('name').value()).toBe('A');
    });

    it('swap() swaps two items', () => {
      const form = createForm({
        schema: z.object({
          items: z.array(z.object({ name: z.string() })),
        }),
        initial: {
          items: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
        },
        onSubmit: vi.fn(),
      });

      const items = form.array('items');
      items.swap(0, 2);

      expect(items.fields()[0]?.field('name').value()).toBe('C');
      expect(items.fields()[2]?.field('name').value()).toBe('A');
    });

    it('validates array items', () => {
      const form = createForm({
        schema: z.object({
          items: z.array(z.object({
            name: z.string().min(1, 'Name required'),
          })),
        }),
        initial: {
          items: [{ name: '' }],
        },
        onSubmit: vi.fn(),
      });

      form.validate();
      expect(form.errors()['items.0.name']).toBe('Name required');
    });

    it('validates array length', () => {
      const form = createForm({
        schema: z.object({
          items: z.array(z.object({ name: z.string() })).min(1, 'At least one item'),
        }),
        initial: {
          items: [],
        },
        onSubmit: vi.fn(),
      });

      form.validate();
      expect(form.errors()['items']).toBe('At least one item');
    });
  });

  describe('Zod schema types', () => {
    it('handles string validation', () => {
      const form = createForm({
        schema: z.object({
          name: z.string().min(2, 'Min 2').max(10, 'Max 10'),
        }),
        initial: { name: '' },
        onSubmit: vi.fn(),
      });

      form.field('name').set('A');
      form.validate();
      expect(form.field('name').error()).toBe('Min 2');

      form.field('name').set('ABCDEFGHIJK');
      form.validate();
      expect(form.field('name').error()).toBe('Max 10');

      form.field('name').set('ABCD');
      form.validate();
      expect(form.field('name').error()).toBeUndefined();
    });

    it('handles number validation', () => {
      const form = createForm({
        schema: z.object({
          age: z.number().min(18, 'Must be 18+'),
        }),
        initial: { age: 0 },
        onSubmit: vi.fn(),
      });

      form.field('age').set(15);
      form.validate();
      expect(form.field('age').error()).toBe('Must be 18+');

      form.field('age').set(21);
      form.validate();
      expect(form.field('age').error()).toBeUndefined();
    });

    it('handles boolean validation', () => {
      const form = createForm({
        schema: z.object({
          agreed: z.boolean().refine(v => v === true, 'Must agree'),
        }),
        initial: { agreed: false },
        onSubmit: vi.fn(),
      });

      form.validate();
      expect(form.field('agreed').error()).toBe('Must agree');

      form.field('agreed').set(true);
      form.validate();
      expect(form.field('agreed').error()).toBeUndefined();
    });

    it('handles enum validation', () => {
      const form = createForm({
        schema: z.object({
          role: z.enum(['admin', 'user', 'guest']),
        }),
        initial: { role: 'user' as const },
        onSubmit: vi.fn(),
      });

      expect(form.field('role').value()).toBe('user');
      form.validate();
      expect(form.isValid()).toBe(true);
    });

    it('handles optional fields', () => {
      const form = createForm({
        schema: z.object({
          name: z.string().min(1),
          nickname: z.string().optional(),
        }),
        initial: { name: 'John', nickname: undefined },
        onSubmit: vi.fn(),
      });

      form.validate();
      expect(form.isValid()).toBe(true);
      expect(form.field('nickname').value()).toBeUndefined();
    });
  });

  describe('reactivity', () => {
    it('triggers effects on value change', () => {
      const form = createForm({
        schema: z.object({ name: z.string() }),
        initial: { name: '' },
        onSubmit: vi.fn(),
      });

      const values: string[] = [];
      const stop = effect(() => {
        values.push(form.field('name').value() as string);
      });

      form.field('name').set('A');
      form.field('name').set('B');

      expect(values).toContain('');
      expect(values).toContain('A');
      expect(values).toContain('B');

      stop();
    });

    it('triggers effects on error change', () => {
      const form = createForm({
        schema: z.object({
          name: z.string().min(1, 'Required'),
        }),
        initial: { name: '' },
        onSubmit: vi.fn(),
      });

      const errors: (string | undefined)[] = [];
      const stop = effect(() => {
        errors.push(form.field('name').error());
      });

      form.validate();
      form.field('name').set('Valid');
      form.validate();

      expect(errors).toContain(undefined);
      expect(errors).toContain('Required');

      stop();
    });
  });

  describe('edge cases', () => {
    it('handles empty strings correctly', () => {
      const form = createForm({
        schema: z.object({
          name: z.string().min(1, 'Required'),
        }),
        initial: { name: '' },
        onSubmit: vi.fn(),
      });

      form.validate();
      expect(form.field('name').error()).toBe('Required');
    });

    it('handles undefined optionals', () => {
      const form = createForm({
        schema: z.object({
          name: z.string(),
          age: z.number().optional(),
        }),
        initial: { name: 'Test', age: undefined },
        onSubmit: vi.fn(),
      });

      expect(form.field('age').value()).toBeUndefined();
      form.validate();
      expect(form.isValid()).toBe(true);
    });

    it('handles concurrent submits', async () => {
      let submitCount = 0;
      const form = createForm({
        schema: z.object({ name: z.string() }),
        initial: { name: 'Test' },
        onSubmit: async () => {
          submitCount++;
          await new Promise(r => setTimeout(r, 10));
        },
      });

      const p1 = form.submit();
      const p2 = form.submit();

      await Promise.all([p1, p2]);
      expect(submitCount).toBe(2);
    });

    it('clearErrors() removes all errors', () => {
      const form = createForm({
        schema: z.object({
          name: z.string().min(1, 'Required'),
          email: z.string().email('Invalid'),
        }),
        initial: { name: '', email: '' },
        onSubmit: vi.fn(),
      });

      form.validate();
      expect(Object.values(form.errors()).filter(Boolean).length).toBe(2);

      form.clearErrors();
      expect(form.errors()).toEqual({});
    });
  });
});
