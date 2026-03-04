import { createComponent } from '@liteforge/runtime';
import type { ComponentFactory } from '@liteforge/runtime';
import { CodeBlock } from './CodeBlock.js';

interface LiveExampleProps {
  title: string;
  description?: string;
  component: ComponentFactory<object, object> | (() => Node);
  code: string;
  language?: string;
}

export const LiveExample = createComponent<LiveExampleProps>({
  name: 'LiveExample',
  component({ props }) {
    const Component = props.component;
    return (
      <div class="my-6 rounded-xl border border-[var(--line-default)] overflow-hidden">
        <div class="px-4 py-2.5 bg-[var(--surface-raised)] border-b border-[var(--line-default)] flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span class="text-xs text-[var(--content-secondary)] font-medium">{props.title}</span>
          {props.description !== undefined
            ? <span class="text-xs text-[var(--content-subtle)] ml-1">— {props.description}</span>
            : null}
        </div>
        <div class="p-5 bg-[var(--surface-sunken)]">
          <Component />
        </div>
        <div class="border-t border-[var(--line-default)]">
          <CodeBlock code={props.code} language={props.language ?? 'tsx'} />
        </div>
      </div>
    );
  },
});
