import { createComponent } from 'liteforge';
import { signal } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import type { ApiRow } from '../components/ApiTable.js';
import { t } from '../i18n.js';

// ─── Live example ──────────────────────────────────────────────────────────────

function ToastExample(): Node {
  // Dynamic import to avoid toast provider being required in docs bootstrap
  const wrap = document.createElement('div');
  wrap.className = 'space-y-3';

  const row = document.createElement('div');
  row.className = 'flex flex-wrap gap-2';

  const makeBtn = (label: string, fn: () => void, variant: string) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = `px-3 py-1.5 text-sm rounded font-medium transition-opacity hover:opacity-80 ${variant}`;
    btn.addEventListener('click', fn);
    return btn;
  };

  const note = document.createElement('p');
  note.className = 'text-xs text-[var(--content-muted)]';
  note.textContent = 'Toast provider must be mounted via toastPlugin() in main.tsx to see toasts.';

  const lastResult = signal('');
  const status = document.createElement('div');

  import('liteforge/toast').then(({ toast }) => {
    row.appendChild(makeBtn('toast.success()', () => {
      toast.success('Saved successfully!');
      lastResult.set('toast.success() fired');
    }, 'bg-emerald-600 text-white'));

    row.appendChild(makeBtn('toast.error()', () => {
      toast.error('Something went wrong.');
      lastResult.set('toast.error() fired');
    }, 'bg-red-600 text-white'));

    row.appendChild(makeBtn('toast.warning()', () => {
      toast.warning('Check your input.');
      lastResult.set('toast.warning() fired');
    }, 'bg-amber-500 text-white'));

    row.appendChild(makeBtn('toast.info()', () => {
      toast.info('New version available.');
      lastResult.set('toast.info() fired');
    }, 'bg-indigo-600 text-white'));

    row.appendChild(makeBtn('toast.promise()', () => {
      const p = new Promise<string>(res => setTimeout(() => res('Done!'), 1500));
      toast.promise(p, { loading: 'Saving…', success: (v: unknown) => String(v), error: 'Failed' });
      lastResult.set('toast.promise() fired');
    }, 'bg-[var(--surface-overlay)] border border-[var(--line-default)] text-[var(--content-primary)]'));

    import('@liteforge/core').then(({ effect }) => {
      effect(() => {
        status.textContent = lastResult() || '';
        status.className = lastResult()
          ? 'px-3 py-2 rounded bg-[var(--surface-overlay)] border border-[var(--line-default)] text-sm font-mono text-emerald-400'
          : '';
      });
    });
  });

  wrap.appendChild(row);
  wrap.appendChild(note);
  wrap.appendChild(status);
  return wrap;
}

// ─── Code strings ──────────────────────────────────────────────────────────────

const SETUP_CODE = `// main.tsx
import { toastPlugin } from 'liteforge/toast';

await createApp({ root: App, target: '#app' })
  .use(toastPlugin({ position: 'bottom-right' }))
  .mount();`;

const BASIC_CODE = `import { toast } from 'liteforge/toast';

toast.success('Saved!');
toast.error('Something went wrong.');
toast.warning('Double-check your input.');
toast.info('New version available.');

// All accept an options object as the second argument
toast.success('Saved!', { duration: 3000, closable: true });`;

const PROMISE_CODE = `import { toast } from 'liteforge/toast';

const p = fetch('/api/save', { method: 'POST', body: JSON.stringify(data) });

toast.promise(p, {
  loading: 'Saving changes…',
  success: () => 'Changes saved!',
  error:   (err) => \`Error: \${err.message}\`,
});`;

const POSITIONS_CODE = `// Available positions:
// 'top-left' | 'top-center' | 'top-right'
// 'bottom-left' | 'bottom-center' | 'bottom-right'

.use(toastPlugin({ position: 'top-right', maxToasts: 5 }))`;

const CSS_CODE = `:root {
  --lf-toast-bg:      #1e1e2e;
  --lf-toast-color:   #cdd6f4;
  --lf-toast-radius:  8px;
  --lf-toast-shadow:  0 8px 24px rgba(0,0,0,.4);
  --lf-toast-z:       9999;
  --lf-toast-width:   360px;
  --lf-toast-offset:  20px;
  --lf-toast-gap:     10px;
}`;

// ─── API rows ──────────────────────────────────────────────────────────────────

const PLUGIN_API: ApiRow[] = [
  { name: 'position', type: 'ToastPosition', default: "'bottom-right'", description: 'Where toasts appear on screen' },
  { name: 'maxToasts', type: 'number', default: '5', description: 'Maximum number of visible toasts' },
  { name: 'duration', type: 'number', default: '4000', description: 'Default auto-dismiss delay in ms' },
  { name: 'unstyled', type: 'boolean', default: 'false', description: 'Skip default CSS injection' },
];

const TOAST_API: ApiRow[] = [
  { name: 'toast.success(message, opts?)', type: 'string', description: 'Show a green success toast — returns toast ID' },
  { name: 'toast.error(message, opts?)', type: 'string', description: 'Show a red error toast' },
  { name: 'toast.warning(message, opts?)', type: 'string', description: 'Show an amber warning toast' },
  { name: 'toast.info(message, opts?)', type: 'string', description: 'Show a blue info toast' },
  { name: 'toast.promise(p, labels)', type: 'Promise<T>', description: 'Track a promise — loading → success/error transition' },
  { name: 'toast.dismiss(id?)', type: 'void', description: 'Dismiss one (by ID) or all toasts' },
];

const OPTS_API: ApiRow[] = [
  { name: 'duration', type: 'number', description: 'Override auto-dismiss delay for this toast (ms)' },
  { name: 'closable', type: 'boolean', description: 'Show a × button on this toast' },
  { name: 'id', type: 'string', description: 'Stable ID — prevents duplicates if you pass the same id twice' },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export const ToastPage = createComponent({
  name: 'ToastPage',
  component() {
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/toast</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('toast.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('toast.subtitle')}
          </p>
          <CodeBlock code="pnpm add @liteforge/toast" language="bash" />
          <CodeBlock code="import { toast } from 'liteforge/toast';" language="typescript" />
        </div>

        <DocSection title={() => t('toast.setup')} id="setup" description={() => t('toast.setupDesc')}>
          <CodeBlock code={SETUP_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('toast.basic')} id="basic">
          <CodeBlock code={BASIC_CODE} language="typescript" />
          <LiveExample
            title={() => t('toast.liveTitle')}
            code={`toast.success('Saved!');
toast.error('Something went wrong.');
toast.warning('Check your input.');
toast.info('New version available.');`}
            component={ToastExample}
          />
        </DocSection>

        <DocSection title={() => t('toast.promise')} id="promise" description={() => t('toast.promiseDesc')}>
          <CodeBlock code={PROMISE_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('toast.position')} id="position">
          <CodeBlock code={POSITIONS_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('toast.cssVars')} id="css" description={() => t('toast.cssVarsDesc')}>
          <CodeBlock code={CSS_CODE} language="css" />
        </DocSection>

        <DocSection title={() => t('toast.pluginOptions')} id="plugin-api">
          <ApiTable rows={PLUGIN_API} />
        </DocSection>

        <DocSection title={() => t('toast.api')} id="api">
          <ApiTable rows={TOAST_API} />
        </DocSection>

        <DocSection title={() => t('toast.toastOptions')} id="opts-api">
          <ApiTable rows={OPTS_API} />
        </DocSection>
      </div>
    );
  },
});
