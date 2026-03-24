// No imports — pure string constants

export const SETUP_CODE = `import { createForm } from '@liteforge/form';
import { z } from 'zod';

const form = createForm({
  schema: z.object({
    email:    z.string().email(),
    password: z.string().min(8),
  }),
  initial: { email: '', password: '' },
  onSubmit: async (values) => {
    await api.login(values);
  },
  validateOn: 'blur',    // validate field when focus leaves
  revalidateOn: 'change', // re-validate on each keystroke after first error
});`;

export const FIELD_CODE = `const emailField = form.field('email');

emailField.value()    // current value (Signal)
emailField.error()    // validation error message | undefined
emailField.touched()  // was field blurred?
emailField.dirty()    // was field modified?

emailField.set('anna@example.com');  // programmatic update
emailField.blur();    // trigger validation

// In JSX:
<input
  value={() => emailField.value()}
  oninput={e => emailField.set(e.target.value)}
  onblur={() => emailField.blur()}
/>
{() => emailField.error()
  ? <p class="error">{emailField.error()}</p>
  : null}`;

export const ZOD_CODE = `const appointmentSchema = z.object({
  patientId:   z.number().positive(),
  doctorId:    z.number().positive(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  duration:    z.number().min(15).max(120),
  notes:       z.string().max(500).optional(),
});

const form = createForm({
  schema: appointmentSchema,
  initial: { patientId: 0, doctorId: 0, date: '', duration: 30, notes: '' },
  onSubmit: async (values) => {
    await appointments.create(values);
  },
});`;

export const ARRAY_CODE = `const form = createForm({
  schema: z.object({
    medications: z.array(z.object({
      name:  z.string().min(1),
      dosage: z.string().min(1),
    })),
  }),
  initial: { medications: [] },
  onSubmit: async (values) => { ... },
});

const meds = form.array('medications');

meds.append({ name: '', dosage: '' });
meds.prepend({ name: '', dosage: '' });
meds.remove(0);
meds.fields()   // Signal<ArrayItemField[]>
meds.length()   // number
meds.error()    // string | undefined

// Each item has .field('name'), .field('dosage')
meds.fields()[0]?.field('name').value()`;

export const FORM_STATE_CODE = `form.isSubmitting()   // loading state during onSubmit
form.isValid()        // no validation errors
form.isDirty()        // any field modified from initial value
form.errors()         // Record<fieldName, errorMessage>
form.submit()         // trigger validation + onSubmit
form.reset()          // reset to initial values`;

export const LIVE_CODE = `const form = createForm({
  schema: z.object({
    email:    z.string().email(),
    password: z.string().min(8),
  }),
  initial: { email: '', password: '' },
  onSubmit: async (values) => api.login(values),
  validateOn: 'blur',
});

const email = form.field('email');

<input
  oninput={e => email.set(e.target.value)}
  onblur={() => email.blur()}
/>
{() => email.error() ? <p>{email.error()}</p> : null}
<button onclick={() => form.submit()}>
  {() => form.isSubmitting() ? 'Loading…' : 'Log in'}
</button>`;

export const ARRAY_LIVE_CODE = `const form = createForm({
  schema: z.object({
    items: z.array(z.object({
      description: z.string().min(1),
      qty:         z.coerce.number().min(1),
      price:       z.coerce.number().min(0),
    })),
  }),
  initial: { items: [{ description: '', qty: 1, price: 0 }] },
  onSubmit: async (values) => console.log(values),
});

const items = form.array('items');
const total = computed(() =>
  items.fields().reduce((sum, item) => sum + Number(item.field('qty').value()) * Number(item.field('price').value()), 0)
);

// Render each row:
{() => items.fields().map((item, i) => (
  <div>
    <input oninput={e => item.field('description').set(e.target.value)} />
    <button onclick={() => items.remove(i)}>×</button>
  </div>
))}
<button onclick={() => items.append({ description: '', qty: 1, price: 0 })}>+ Add line</button>
Total: {() => total().toFixed(2)}`;
