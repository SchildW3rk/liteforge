import { createComponent, signal, effect } from 'liteforge';
import { toast } from '@liteforge/toast';

export const ToastExample = createComponent({
  name: 'ToastExample',
  component() {
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

    const lastResult = signal('');
    const status = document.createElement('div');

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

    effect(() => {
      status.textContent = lastResult() || '';
      status.className = lastResult()
        ? 'px-3 py-2 rounded bg-[var(--surface-overlay)] border border-[var(--line-default)] text-sm font-mono text-emerald-400'
        : '';
    });

    wrap.appendChild(row);
    wrap.appendChild(note);
    wrap.appendChild(status);
    return wrap;
  },
});
