import { createComponent } from '@liteforge/runtime';

export interface DocSectionProps {
  title: string;
  description?: string;
  id?: string;
  children?: Node | Node[];
}

export const DocSection = createComponent<DocSectionProps>({
  name: 'DocSection',
  component({ props }) {
    return (
      <section id={props.id} class="py-8 border-b border-[var(--line-default)] last:border-0">
        <div class="flex items-center gap-2 mb-2">
          <h2 class="text-xl font-semibold text-[var(--content-primary)]">{props.title}</h2>
          {props.id !== undefined
            ? <a
                href={`#${props.id}`}
                class="text-[var(--content-subtle)] hover:text-indigo-400 transition-colors text-sm"
                aria-label={`Link to ${props.title}`}
              >#</a>
            : null}
        </div>
        {props.description !== undefined
          ? <p class="text-[var(--content-secondary)] text-sm leading-relaxed mb-4">{props.description}</p>
          : null}
        {props.children}
      </section>
    );
  },
});
