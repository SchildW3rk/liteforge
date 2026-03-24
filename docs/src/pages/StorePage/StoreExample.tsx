import { createComponent, signal } from 'liteforge';
import { defineStore } from '@liteforge/store';
import { Button } from '../../components/Button.js';
import { Badge } from '../../components/Badge.js';

type HistoryEntry = { action: string; value: number };

export const StoreExample = createComponent({
  name: 'StoreExample',
  component() {
    const counter = defineStore('docs-counter', {
      state: { count: 0 },
      getters: (state) => ({
        isNegative: () => state.count() < 0,
        isZero:     () => state.count() === 0,
      }),
      actions: (state) => ({
        increment() { state.count.update(n => n + 1); },
        decrement() { state.count.update(n => n - 1); },
        reset()     { state.count.set(0); },
      }),
    });

    const history = signal<HistoryEntry[]>([]);

    function dispatch(action: string) {
      if (action === 'increment') counter.increment();
      else if (action === 'decrement') counter.decrement();
      else counter.reset();
      history.update(h => [{ action, value: counter.count() }, ...h].slice(0, 5));
    }

    return (
      <div class="space-y-4 max-w-sm">
        {/* Counter display */}
        <div class="flex items-center gap-3">
          <span class="text-4xl font-bold text-[var(--content-primary)] tabular-nums" style="min-width:3rem;text-align:center">
            {() => String(counter.count())}
          </span>
          {() => counter.isNegative() ? <Badge variant="red">negative</Badge>     : null}
          {() => counter.isZero()     ? <Badge variant="neutral">zero</Badge>     : null}
        </div>

        {/* Buttons */}
        <div class="flex gap-2">
          <Button variant="neutral" onclick={() => dispatch('decrement')}>−</Button>
          <Button variant="primary" onclick={() => dispatch('increment')}>+</Button>
          <Button variant="neutral" onclick={() => dispatch('reset')}>Reset</Button>
        </div>

        {/* History */}
        {() => history().length > 0
          ? (
            <div class="space-y-1">
              <p class="text-xs text-[var(--content-muted)] uppercase tracking-widest">Recent actions</p>
              {() => history().map((entry, i) => (
                <div class={`flex items-center justify-between text-xs px-2 py-1 rounded ${i === 0 ? 'bg-[var(--surface-overlay)] text-[var(--content-primary)]' : 'text-[var(--content-muted)]'}`}>
                  <span class="font-mono">{entry.action}</span>
                  <span>→ {entry.value}</span>
                </div>
              ))}
            </div>
          )
          : null}
      </div>
    );
  },
});
