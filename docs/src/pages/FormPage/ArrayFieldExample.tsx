import { createComponent, computed } from 'liteforge';
import { createForm } from '@liteforge/form';
import { z } from 'zod';
import { Button } from '../../components/Button.js';
import { inputClass } from '../../components/Input.js';

export const ArrayFieldExample = createComponent({
  name: 'ArrayFieldExample',
  component() {
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
  },
});
