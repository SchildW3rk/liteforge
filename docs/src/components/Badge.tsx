import { createComponent } from 'liteforge';

export type BadgeVariant = 'default' | 'indigo' | 'green' | 'amber' | 'red' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  class?: string;
  children?: Node | string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-[var(--surface-overlay)] text-[var(--content-secondary)] border border-[var(--line-default)]',
  indigo:  'bg-[var(--badge-indigo-bg)] text-[var(--badge-indigo-text)] border border-[var(--badge-indigo-border)]',
  green:   'bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)] border border-[var(--badge-emerald-border)]',
  amber:   'bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)] border border-[var(--badge-amber-border)]',
  red:     'bg-[var(--badge-red-bg)] text-[var(--badge-red-text)] border border-[var(--badge-red-border)]',
  neutral: 'bg-[var(--surface-overlay)] text-[var(--content-muted)] border border-[var(--line-default)]',
};

const BASE = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium';

export const Badge = createComponent<BadgeProps>({
  name: 'Badge',
  component({ props }) {
    const variant = props.variant ?? 'default';
    const extra   = props.class   ?? '';
    const cls     = [BASE, VARIANT_CLASSES[variant], extra].filter(Boolean).join(' ');

    return (
      <span class={cls}>
        {props.children}
      </span>
    );
  },
});
