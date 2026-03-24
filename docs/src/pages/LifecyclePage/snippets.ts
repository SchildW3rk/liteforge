// No imports — pure string constants

// Use variable to prevent vite-plugin HMR transform from injecting __hmrId into demo strings
const _cc = 'createComponent';

export const FULL_CODE = `import { ${_cc}, onCleanup } from 'liteforge';

export const MyWidget = ${_cc}({
  name: 'MyWidget',

  // 1. setup() — runs once, before any DOM is built
  //    Return signals, queries, tables, etc.
  setup({ props }) {
    const count = signal(0);
    const doubled = computed(() => count() * 2);
    return { count, doubled };
  },

  // 2. load() — optional async data fetch
  //    Component stays on placeholder until this resolves
  async load({ props }) {
    const data = await fetch(\`/api/items/\${props.id}\`).then(r => r.json());
    return { data };
  },

  placeholder: () => <div class="skeleton" />,

  // 3. component() — build and return DOM / JSX
  component({ setup, data }) {
    const { count } = setup;

    // onCleanup runs before each effect re-run AND when component is destroyed
    effect(() => {
      const handler = () => count.update(n => n + 1);
      window.addEventListener('keydown', handler);
      onCleanup(() => window.removeEventListener('keydown', handler));
    });

    return <button onclick={() => count.update(n => n + 1)}>{() => count()}</button>;
  },

  // 4. mounted() — DOM is attached, el is the root element
  mounted({ el }) {
    el.classList.add('fade-in');
    el.querySelector('button')?.focus();
  },

  // 5. destroyed() — component removed from DOM
  destroyed() {
    console.log('cleaned up');
  },
});`;

export const ONCLEANUP_CODE = `import { effect, onCleanup } from 'liteforge';

// onCleanup() registers a function that runs:
//   1. Before each effect re-run (if signal deps changed)
//   2. When the component is destroyed

effect(() => {
  const id = setInterval(() => tick(), 1000);
  onCleanup(() => clearInterval(id));  // always cleaned up
});

// Also useful outside effects — called on component destroy:
component() {
  const socket = new WebSocket('/ws');
  onCleanup(() => socket.close());
  return <div />;
}`;

export const TOOLTIP_CLEANUP_CODE = `// Real-world pattern: tooltip ref-callback + onCleanup
import { onCleanup } from 'liteforge';
import { tooltip } from '@liteforge/tooltip';

component({ props }) {
  return (
    <button ref={(el) => {
      const cleanup = tooltip(el, {
        content:  props.hint,
        position: 'right',
        delay:    150,
      });
      onCleanup(cleanup);
    }}>
      {props.label}
    </button>
  );
}`;

export const DIFF_CODE = `// onCleanup  — effect-scoped, runs on every re-run + unmount
// destroyed() — component-scoped hook, runs only once on unmount

effect(() => {
  const sub = store.subscribe(handler);
  onCleanup(() => sub.unsubscribe());  // ← re-run safe
});

// destroyed() { analytics.trackPageLeave(); }  ← once only`;
