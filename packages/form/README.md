# @liteforge/form

Signals-based form management with Zod validation for LiteForge.

## Installation

```bash
npm install @liteforge/form @liteforge/core zod
```

Peer dependencies: `@liteforge/core >= 0.1.0`, `zod >= 3.0.0`

## Overview

`@liteforge/form` provides reactive form management with Zod schema validation. All form state is signal-based for automatic reactivity.

## Basic Usage

```tsx
import { createForm } from '@liteforge/form'
import { z } from 'zod'

const form = createForm({
  schema: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address')
  }),
  
  initial: {
    name: '',
    email: ''
  },
  
  onSubmit: async (values) => {
    await api.createUser(values)
  }
})
```

## API

### createForm

Creates a reactive form instance.

```ts
import { createForm } from '@liteforge/form'
import { z } from 'zod'

const form = createForm({
  // Zod schema for validation
  schema: z.object({
    name: z.string().min(1),
    email: z.string().email()
  }),
  
  // Initial values
  initial: {
    name: '',
    email: ''
  },
  
  // Submit handler (receives typed values)
  onSubmit: async (values) => {
    await saveUser(values)
  },
  
  // When to validate
  validateOn: 'blur',      // 'change' | 'blur' | 'submit'
  revalidateOn: 'change',  // After first error, revalidate on...
})
```

### Field Access

```ts
// Get a field
const nameField = form.field('name')

// Field state (all signals)
nameField.value()      // Current value
nameField.error()      // Validation error message or undefined
nameField.touched()    // Has field been blurred?
nameField.dirty()      // Value different from initial?

// Field actions
nameField.set('Alice')              // Set value
nameField.touch()                   // Mark as touched
nameField.reset()                   // Reset to initial value
nameField.setError('Custom error')  // Set error manually
nameField.clearError()              // Clear error
```

### Nested Fields

Access nested objects with dot notation:

```ts
const form = createForm({
  schema: z.object({
    address: z.object({
      street: z.string().min(1),
      city: z.string().min(1),
      zip: z.string().regex(/^\d{5}$/)
    })
  }),
  initial: {
    address: { street: '', city: '', zip: '' }
  },
  onSubmit: async (values) => { ... }
})

// Access nested fields
form.field('address.street').value()
form.field('address.city').set('Berlin')
form.field('address.zip').error()
```

### Array Fields

For dynamic lists of items:

```ts
const form = createForm({
  schema: z.object({
    items: z.array(z.object({
      description: z.string().min(1),
      quantity: z.number().min(1),
      price: z.number().min(0)
    })).min(1, 'At least one item required')
  }),
  initial: { items: [] },
  onSubmit: async (values) => { ... }
})

const items = form.array('items')

// Array state
items.fields()  // Signal: ArrayItemField[]

// Array actions
items.append({ description: '', quantity: 1, price: 0 })
items.remove(index)
items.move(fromIndex, toIndex)
items.swap(indexA, indexB)

// Access item fields
items.fields()[0].field('description').value()
items.fields()[0].field('quantity').set(5)
```

### Form State

```ts
// Form-level state (all signals)
form.values()        // Complete form values
form.errors()        // All errors { 'name': 'Required', ... }
form.isValid()       // All fields valid?
form.isDirty()       // Any field changed?
form.isSubmitting()  // Submit in progress?
form.submitCount()   // Number of submit attempts

// Form actions
form.submit()        // Validate and call onSubmit
form.reset()         // Reset all fields to initial
form.setValues({})   // Partial update
form.validate()      // Manual validation
form.clearErrors()   // Clear all errors
```

## Usage in Components

```tsx
import { createComponent } from '@liteforge/runtime'
import { Show } from '@liteforge/runtime'
import { createForm } from '@liteforge/form'
import { z } from 'zod'

const ContactForm = createComponent({
  component: () => {
    const form = createForm({
      schema: z.object({
        name: z.string().min(2),
        email: z.string().email(),
        message: z.string().min(10)
      }),
      initial: { name: '', email: '', message: '' },
      onSubmit: async (values) => {
        await api.sendMessage(values)
        form.reset()
      }
    })
    
    return (
      <form onsubmit={(e) => { e.preventDefault(); form.submit() }}>
        <div>
          <label>Name</label>
          <input
            type="text"
            value={() => form.field('name').value()}
            oninput={(e) => form.field('name').set(e.target.value)}
            onblur={() => form.field('name').touch()}
          />
          <Show when={() => form.field('name').error()}>
            <span class="error">{() => form.field('name').error()}</span>
          </Show>
        </div>
        
        <div>
          <label>Email</label>
          <input
            type="email"
            value={() => form.field('email').value()}
            oninput={(e) => form.field('email').set(e.target.value)}
            onblur={() => form.field('email').touch()}
          />
          <Show when={() => form.field('email').error()}>
            <span class="error">{() => form.field('email').error()}</span>
          </Show>
        </div>
        
        <div>
          <label>Message</label>
          <textarea
            value={() => form.field('message').value()}
            oninput={(e) => form.field('message').set(e.target.value)}
            onblur={() => form.field('message').touch()}
          />
          <Show when={() => form.field('message').error()}>
            <span class="error">{() => form.field('message').error()}</span>
          </Show>
        </div>
        
        <button type="submit" disabled={() => form.isSubmitting()}>
          {() => form.isSubmitting() ? 'Sending...' : 'Send'}
        </button>
      </form>
    )
  }
})
```

## Types

```ts
import type {
  FormOptions,
  FormResult,
  FieldResult,
  ArrayFieldResult,
  ArrayItemField,
  ValidateOn,
  RevalidateOn,
  FieldPaths,
  PathValue
} from '@liteforge/form'
```

## License

MIT
