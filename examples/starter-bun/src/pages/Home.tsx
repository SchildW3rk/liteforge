import { defineComponent, signal } from 'liteforge'
import { createForm } from '@liteforge/form'
import { toast } from '@liteforge/toast'
import { Link } from '@liteforge/router'
import { z } from 'zod';

const nameSchema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
});

export const HomePage = defineComponent({
  component() {
    const count = signal(0)

    const form = createForm({
      schema: nameSchema,
      initial: { name: '' },
      onSubmit(values) {
        console.log('[FORM] onSubmit values:', values)  // ← neu
        toast.info(`Hello, ${values.name}!`)
        form.reset()
      },
    })

    return (
      <div class="page">
        <h1>LiteForge + Bun</h1>

        <section>
          <h2>Counter</h2>
          <p>Count: {() => count()}</p>
          <button onclick={() => count.update(n => n + 1)}>+1</button>
        </section>

        <section>
          <h2>Form</h2>
          <form onsubmit={(e: Event) => {
            console.log('[FORM] submit triggered')
            e.preventDefault()
            form.submit()
          }}>
            <input
              type="text"
              placeholder="Your name"
              value={() => form.field('name').value()}
              oninput={(e: Event) => form.field('name').set((e.target as HTMLInputElement).value)}
            />
            <button type="submit">Say Hello</button>
          </form>
        </section>

        <nav>
          <Link href="/about">About →</Link>
        </nav>
      </div>
    )
  },
})
