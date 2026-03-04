import { createComponent, Show } from 'liteforge';
import { createForm } from 'liteforge/form';
import { computed } from 'liteforge';
import { z } from 'zod';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import { Button } from '../components/Button.js';
import { inputClass } from '../components/Input.js';
import type { ApiRow } from '../components/ApiTable.js';

// ─── Live example: Login form (JSX) ──────────────────────────────────────────

function LoginFormExample(): Node {
  const form = createForm({
    schema: z.object({
      email:    z.string().email('Please enter a valid email'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
    }),
    initial: { email: '', password: '' },
    onSubmit: async (values) => {
      await new Promise(r => setTimeout(r, 600));
      console.log('[Form] submitted', values);
    },
    validateOn: 'blur',
    revalidateOn: 'change',
  });

  const email    = form.field('email');
  const password = form.field('password');

  function FieldRow(f: ReturnType<typeof form.field>, type: string, label: string): Node {
    return (
      <div class="space-y-1">
        <label class="block text-xs text-[var(--content-secondary)]">{label}</label>
        <input
          type={type}
          placeholder={label}
          class={() => inputClass({ error: f.error() !== undefined })}
          oninput={(e: Event) => f.set((e.target as HTMLInputElement).value)}
          onblur={() => f.blur()}
        />
        {Show({
          when: () => f.error() !== undefined,
          children: () => <p class="text-xs text-red-400">{() => f.error()}</p>,
        })}
      </div>
    );
  }

  return (
    <div class="space-y-3 max-w-sm">
      {FieldRow(email,    'email',    'Email')}
      {FieldRow(password, 'password', 'Password')}
      <Button variant="primary" class="w-full" onclick={() => form.submit()}>
        {() => form.isSubmitting() ? 'Logging in…' : 'Log in'}
      </Button>
    </div>
  );
}

// ─── Live example: Array fields ───────────────────────────────────────────────

function ArrayFieldExample(): Node {
  const form = createForm({
    schema: z.object({
      items: z.array(z.object({
        description: z.string().min(1, 'Required'),
        qty:         z.coerce.number().min(1, 'Min 1'),
        price:       z.coerce.number().min(0, 'Min 0'),
      })),
    }),
    initial: { items: [{ description: '', qty: 1, price: 0 }] },
    onSubmit: async (values) => {
      console.log('[Invoice] submitted', values);
    },
    validateOn: 'blur',
    revalidateOn: 'change',
  });

  const items = form.array('items');

  const total = computed(() =>
    items.fields().reduce((sum: number, item) => {
      const qty   = Number(item.field('qty').value())   || 0;
      const price = Number(item.field('price').value()) || 0;
      return sum + qty * price;
    }, 0)
  );

  return (
    <div class="space-y-3 max-w-lg">
      <div class="grid grid-cols-[1fr_4rem_6rem_2rem] gap-2 text-xs text-[var(--content-muted)] px-1">
        <span>Description</span>
        <span>Qty</span>
        <span>Price (€)</span>
        <span />
      </div>

      {() => items.fields().map((item, i: number) => (
        <div class="grid grid-cols-[1fr_4rem_6rem_2rem] gap-2 items-start">
          <div>
            <input
              class={() => inputClass({ size: 'sm', error: !!item.field('description').error() })}
              placeholder="Description"
              oninput={(e: Event) => item.field('description').set((e.target as HTMLInputElement).value)}
              onblur={() => item.field('description').touch()}
            />
          </div>
          <div>
            <input
              type="number"
              class={inputClass({ size: 'sm' })}
              value={() => String(item.field('qty').value())}
              oninput={(e: Event) => item.field('qty').set((e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <input
              type="number"
              step="0.01"
              class={inputClass({ size: 'sm' })}
              value={() => String(item.field('price').value())}
              oninput={(e: Event) => item.field('price').set((e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <Button variant="danger" size="sm" class="mt-0.5 w-6 h-7" onclick={() => items.remove(i)}>×</Button>
          </div>
        </div>
      ))}

      <div class="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onclick={() => items.append({ description: '', qty: 1, price: 0 })}>+ Add line</Button>
        <span class="text-sm text-[var(--content-primary)] font-medium">
          Total: <span class="text-indigo-300">{() => `€${total().toFixed(2)}`}</span>
        </span>
      </div>

      <Button variant="primary" class="w-full" onclick={() => form.submit()}>Submit invoice</Button>
    </div>
  );
}

// ─── Code strings ─────────────────────────────────────────────────────────────

const SETUP_CODE = `import { createForm } from 'liteforge/form';
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

const FIELD_CODE = `const emailField = form.field('email');

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

const ZOD_CODE = `const appointmentSchema = z.object({
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

const ARRAY_CODE = `const form = createForm({
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
meds.remove(0);
meds.items()  // ArrayItemField[]

// Each item has .field('name'), .field('dosage')
meds.items()[0]?.field('name').value()`;

const FORM_STATE_CODE = `form.isSubmitting()   // loading state during onSubmit
form.isValid()        // no validation errors
form.isDirty()        // any field modified from initial value
form.errors()         // Record<fieldName, errorMessage>
form.submit()         // trigger validation + onSubmit
form.reset()          // reset to initial values`;

const LIVE_CODE = `const form = createForm({
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

const ARRAY_LIVE_CODE = `const form = createForm({
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
  items.items().reduce((sum, item) => sum + Number(item.field('qty').value()) * Number(item.field('price').value()), 0)
);

// Render each row:
{() => items.items().map((item, i) => (
  <div>
    <input oninput={e => item.field('description').set(e.target.value)} />
    <button onclick={() => items.remove(i)}>×</button>
  </div>
))}
<button onclick={() => items.append({ description: '', qty: 1, price: 0 })}>+ Add line</button>
Total: {() => total().toFixed(2)}`;

// ─── API rows ─────────────────────────────────────────────────────────────────

const FORM_API: ApiRow[] = [
  { name: 'schema', type: 'ZodSchema', description: 'Zod schema for validation — defines the shape and rules' },
  { name: 'initial', type: 'T', description: 'Initial values for all fields' },
  { name: 'onSubmit', type: '(values: T) => Promise<void>', description: 'Called when form is submitted and validation passes' },
  { name: 'validateOn', type: "'blur' | 'change' | 'submit'", default: "'submit'", description: 'When to run validation for the first time' },
  { name: 'revalidateOn', type: "'blur' | 'change'", default: "'change'", description: 'When to re-run validation after first error' },
];

const ARRAY_API: ApiRow[] = [
  { name: 'items()', type: 'ArrayItemField[]', description: 'Reactive array of item field instances — re-renders when rows are added/removed' },
  { name: 'append(value)', type: '(value: T) => void', description: 'Add a new row at the end with the given initial value' },
  { name: 'remove(index)', type: '(index: number) => void', description: 'Remove the row at the given index' },
  { name: 'item.field(name)', type: 'FieldInstance', description: 'Access a field on a specific array item — has .value(), .error(), .set(), .blur()' },
];

export const FormPage = createComponent({
  name: 'FormPage',
  component() {
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/form</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">Form Management</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            Signal-based form state with Zod validation. Field-level error tracking,
            array fields, submission state — all as reactive signals.
          </p>
          <CodeBlock code={`pnpm add @liteforge/form zod`} language="bash" />
          <CodeBlock code={`import { createForm } from 'liteforge/form';\nimport { z } from 'zod';`} language="typescript" />
        </div>

        <DocSection
          title="createForm()"
          id="create-form"
          description="Define schema, initial values, and submission handler. Returns a form instance with reactive field signals."
        >
          <div>
            <CodeBlock code={SETUP_CODE} language="typescript" />
            <ApiTable rows={FORM_API} />
          </div>
        </DocSection>

        <DocSection
          title="Field binding"
          id="fields"
          description="form.field(name) returns reactive signals for value, error, touched, and dirty state."
        >
          <CodeBlock code={FIELD_CODE} language="tsx" />
        </DocSection>

        <DocSection
          title="Zod schema validation"
          id="validation"
          description="Use the full Zod API for validation rules. Error messages are reactive — update automatically as the user types."
        >
          <CodeBlock code={ZOD_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Array fields"
          id="arrays"
          description="Dynamic lists (medications, addresses, contacts) with append/remove and per-item field access."
        >
          <div>
            <CodeBlock code={ARRAY_CODE} language="typescript" />
            <ApiTable rows={ARRAY_API} />
          </div>
        </DocSection>

        <DocSection
          title="Form state signals"
          id="state"
        >
          <CodeBlock code={FORM_STATE_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Live example — Login form"
          id="live"
        >
          <LiveExample
            title="Login form with Zod validation"
            description="Blur a field to trigger validation"
            component={LoginFormExample}
            code={LIVE_CODE}
          />
        </DocSection>

        <DocSection
          title="Live example — Array fields"
          id="live-array"
          description="Dynamic invoice line items with reactive total."
        >
          <LiveExample
            title="Invoice form with array fields"
            description="Add/remove rows, total updates reactively"
            component={ArrayFieldExample}
            code={ARRAY_LIVE_CODE}
          />
        </DocSection>
      </div>
    );
  },
});
