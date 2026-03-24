import { createComponent, Show } from 'liteforge';
import { createForm } from '@liteforge/form';
import { z } from 'zod';
import { Button } from '../../components/Button.js';
import { inputClass } from '../../components/Input.js';

export const LoginFormExample = createComponent({
  name: 'LoginFormExample',
  component() {
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
  },
});
