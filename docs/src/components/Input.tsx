import { createComponent, Show } from 'liteforge';
import { computed } from 'liteforge';

export type InputSize = 'sm' | 'md';

interface InputProps {
  label?: string;
  type?: string;
  placeholder?: string;
  value?: string | (() => string);
  error?: string | (() => string | undefined);
  disabled?: boolean;
  size?: InputSize;
  class?: string;
  oninput?: (e: Event) => void;
  onblur?: (e: Event) => void;
  onfocus?: (e: Event) => void;
}

const INPUT_BASE = 'w-full rounded bg-[var(--surface-overlay)] border text-[var(--content-primary)] focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[var(--content-muted)]';

const SIZE_CLASSES: Record<InputSize, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
};

/**
 * Returns the Tailwind class string for an input element.
 * Use this on native <input> JSX elements or in imperative DOM code.
 */
export function inputClass(opts: { size?: InputSize; error?: boolean; extra?: string } = {}): string {
  const size   = opts.size  ?? 'md';
  const border = opts.error ? 'border-red-500' : 'border-[var(--line-default)] focus:border-indigo-500';
  return [INPUT_BASE, SIZE_CLASSES[size], border, opts.extra ?? ''].filter(Boolean).join(' ');
}

export const Input = createComponent<InputProps>({
  name: 'Input',
  component({ props }) {
    const size  = props.size ?? 'md';
    const extra = props.class ?? '';

    const getError = typeof props.error === 'function'
      ? props.error
      : () => props.error as string | undefined;

    const hasError = computed(() => !!getError());

    const borderCls = () => hasError()
      ? 'border-red-500 focus:border-red-400'
      : 'border-[var(--line-default)] focus:border-indigo-500';

    return (
      <div class="space-y-1">
        {props.label !== undefined
          ? <label class="block text-xs text-[var(--content-secondary)]">{props.label}</label>
          : null}
        <input
          type={props.type ?? 'text'}
          placeholder={props.placeholder}
          value={props.value}
          disabled={props.disabled}
          class={() => [INPUT_BASE, SIZE_CLASSES[size], borderCls(), extra].filter(Boolean).join(' ')}
          oninput={props.oninput}
          onblur={props.onblur}
          onfocus={props.onfocus}
        />
        {Show({
          when: hasError,
          children: () => <p class="text-xs text-red-400">{() => getError()}</p>,
        })}
      </div>
    );
  },
});
