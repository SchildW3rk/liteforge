/**
 * RPC-Demo-Component.
 *
 * `use('server')` returns the typed RPC proxy — typing wired up by the
 * PluginRegistry augmentation in src/types.d.ts.
 */

import { defineComponent, signal } from 'liteforge'
import { toast } from '@liteforge/toast'

export const GreetingDemo = defineComponent({
  name: 'GreetingDemo',
  component({ use }) {
    const server = use('server')
    const name = signal('René')
    const lastGreeting = signal<string | null>(null)
    const pending = signal(false)

    async function handleGreet() {
      pending.set(true)
      try {
        const result = await server.greetings.hello({ name: name() })
        lastGreeting.set(result.greeting)
        toast.info(result.greeting)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'RPC failed'
        toast.info(`Error: ${msg}`)
      } finally {
        pending.set(false)
      }
    }

    return (
      <section>
        <h2>RPC Demo</h2>
        <p>Click the button — the browser calls <code>server.greetings.hello()</code> via typed RPC.</p>
        <div class="rpc-row">
          <input
            type="text"
            value={() => name()}
            oninput={(e: Event) => name.set((e.target as HTMLInputElement).value)}
          />
          <button
            onclick={handleGreet}
            disabled={() => pending()}
          >
            {() => (pending() ? 'Calling…' : 'Say Hello (RPC)')}
          </button>
        </div>
        <p class="rpc-last">{() => lastGreeting() ?? 'No call yet.'}</p>
      </section>
    )
  },
})
