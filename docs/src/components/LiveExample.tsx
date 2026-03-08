import { createComponent, signal } from 'liteforge';
import type { ComponentFactory } from 'liteforge';
import { renderHighlighted } from './CodeBlock';

interface LiveExampleProps {
  title: string | (() => string);
  description?: string | (() => string);
  component: ComponentFactory<object, object> | (() => Node);
  code: string;
  language?: string;
}

function resolveStr(v: string | (() => string)): string {
  return typeof v === 'function' ? v() : v;
}

export const LiveExample = createComponent<LiveExampleProps>({
  name: 'LiveExample',
  component({ props }) {
    const Component = props.component;
    const copied = signal(false);

    function copy() {
      navigator.clipboard.writeText(props.code).then(() => {
        copied.set(true);
        setTimeout(() => copied.set(false), 1800);
      }).catch(() => undefined);
    }

    const codeEl = document.createElement('code');
    codeEl.appendChild(renderHighlighted(props.code));

    return (
      <div class="my-6 border border-[var(--line-default)] overflow-hidden" style="border-radius: var(--lf-radius)">
        {/* Header */}
        <div class="px-4 py-2.5 bg-[var(--surface-raised)] border-b border-[var(--line-default)] flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          <span class="text-xs text-[var(--content-secondary)] font-medium flex-1">{() => resolveStr(props.title)}</span>
          {props.description !== undefined
            ? <span class="text-xs text-[var(--content-subtle)]">— {() => resolveStr(props.description!)}</span>
            : null}
        </div>

        {/* Preview */}
        <div class="p-5 bg-[var(--surface-sunken)]">
          <Component />
        </div>

        {/* Code — divider + inline, no nested card */}
        <div class="border-t border-[var(--line-default)] bg-[var(--surface-raised)]">
          <div class="flex items-center justify-between px-4 py-2 border-b border-[var(--line-default)]">
            <span class="text-xs text-[var(--content-muted)] font-mono">
              {props.language ?? 'tsx'}
            </span>
            <button
              type="button"
              onclick={copy}
              class="text-xs text-[var(--content-muted)] hover:text-[var(--content-primary)] transition-colors select-none"
            >
              {() => copied() ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre class="overflow-x-auto p-4 text-sm leading-relaxed font-mono">
            {codeEl}
          </pre>
        </div>
      </div>
    );
  },
});
