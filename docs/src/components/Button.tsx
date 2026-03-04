import { createComponent } from 'liteforge';

export type ButtonVariant = 'primary' | 'secondary' | 'neutral' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  class?: string;
  onclick?: (e: MouseEvent) => void;
  children?: Node | string | (() => string);
}

const BTN_BASE = 'inline-flex items-center justify-center rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:   'bg-indigo-600 hover:bg-indigo-500 text-[var(--content-primary)]',
  secondary: 'border border-[var(--line-default)] hover:border-[var(--content-muted)] text-[var(--content-secondary)] hover:text-[var(--content-primary)]',
  neutral:   'bg-[var(--surface-overlay)] hover:bg-[var(--surface-overlay)] text-[var(--content-secondary)] border border-[var(--line-default)]',
  ghost:     'text-[var(--content-muted)] hover:text-[var(--content-primary)]',
  danger:    'text-[var(--content-muted)] hover:text-red-400 hover:bg-red-900/20',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-1.5 text-sm',
};

/**
 * Returns the Tailwind class string for a button.
 * Use this in imperative DOM code or on native <button> JSX elements.
 */
export function btnClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md', extra = ''): string {
  return [BTN_BASE, VARIANT_CLASSES[variant], SIZE_CLASSES[size], extra].filter(Boolean).join(' ');
}

export const Button = createComponent<ButtonProps>({
  name: 'Button',
  component({ props }) {
    const variant  = props.variant  ?? 'secondary';
    const size     = props.size     ?? 'md';
    const type     = props.type     ?? 'button';
    const extra    = props.class    ?? '';

    return (
      <button
        type={type}
        class={btnClass(variant, size, extra)}
        disabled={props.disabled}
        onclick={props.onclick}
      >
        {props.children}
      </button>
    );
  },
});
