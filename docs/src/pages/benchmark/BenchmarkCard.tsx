import { createComponent, Show, Switch, Match } from 'liteforge';
import type { Signal } from 'liteforge';
import type { BenchStatus } from './bench-utils.js';

interface BenchmarkCardProps {
  title: string;
  description: string;
  status: Signal<BenchStatus>;
  children?: Node | Node[];
}

const StatusBadge = createComponent<{ status: Signal<BenchStatus> }>({
  name: 'StatusBadge',
  component({ props }) {
    return (
      <span>
        {Switch({
          children: [
            Match({
              when: () => props.status() === 'idle',
              children: () => (
                <span class="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-overlay)] text-[var(--content-secondary)]">
                  idle
                </span>
              ),
            }),
            Match({
              when: () => props.status() === 'running',
              children: () => (
                <span class="text-xs px-2 py-0.5 rounded-full bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)] animate-pulse">
                  running
                </span>
              ),
            }),
            Match({
              when: () => props.status() === 'complete',
              children: () => (
                <span class="text-xs px-2 py-0.5 rounded-full bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)]">
                  complete
                </span>
              ),
            }),
            Match({
              when: () => props.status() === 'error',
              children: () => (
                <span class="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                  error
                </span>
              ),
            }),
          ],
        })}
      </span>
    );
  },
});

export const BenchmarkCard = createComponent<BenchmarkCardProps>({
  name: 'BenchmarkCard',
  component({ props }) {
    return (
      <div class="rounded-xl border border-[var(--line-default)] bg-[var(--surface-raised)]/50 overflow-hidden mb-6">
        {/* Header */}
        <div class="px-5 py-4 border-b border-[var(--line-default)] flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-[var(--content-primary)]">{props.title}</h3>
            <p class="text-sm text-[var(--content-secondary)] mt-0.5">{props.description}</p>
          </div>
          <StatusBadge status={props.status} />
        </div>
        
        {/* Content */}
        <div class="p-5">
          {props.children}
        </div>
      </div>
    );
  },
});

/**
 * Reusable config select component
 */
interface ConfigSelectProps<T extends number | string> {
  label: string;
  options: T[];
  value: Signal<T>;
  formatOption?: (opt: T) => string;
}

let selectIdCounter = 0;

export const ConfigSelect = createComponent<ConfigSelectProps<number>>({
  name: 'ConfigSelect',
  component({ props }) {
    const formatFn = props.formatOption ?? ((n: number) => n.toLocaleString());
    const selectId = `bench-select-${++selectIdCounter}`;
    
    // Note: Testing if LiteForge handles reactive value on <select>
    // If this doesn't work correctly, it's a framework bug
    return (
      <div class="flex items-center gap-2">
        <label for={selectId} class="text-xs text-[var(--content-muted)]">{props.label}</label>
        <select
          id={selectId}
          class="bg-[var(--surface-overlay)] border border-[var(--line-default)] rounded px-2 py-1 text-sm text-[var(--content-primary)] focus:border-indigo-500 focus:outline-none"
          value={() => String(props.value())}
          onchange={(e: Event) => {
            const val = Number((e.target as HTMLSelectElement).value);
            props.value.set(val);
          }}
        >
          {props.options.map(opt => (
            <option value={opt}>{formatFn(opt)}</option>
          ))}
        </select>
      </div>
    );
  },
});

/**
 * Run button component
 */
interface RunButtonProps {
  onclick: () => void;
  disabled?: boolean | (() => boolean);
  children?: Node | string;
}

export const RunButton = createComponent<RunButtonProps>({
  name: 'RunButton',
  component({ props }) {
    const isDisabled = typeof props.disabled === 'function' 
      ? props.disabled 
      : () => props.disabled ?? false;
    
    return (
      <button
        type="button"
        class={() => `px-4 py-2 rounded-md font-medium text-sm transition-colors ${
          isDisabled() 
            ? 'bg-[var(--surface-overlay)] text-[var(--content-muted)] cursor-not-allowed' 
            : 'bg-indigo-600 hover:bg-indigo-500 text-[var(--content-primary)]'
        }`}
        disabled={isDisabled()}
        onclick={props.onclick}
      >
        {props.children ?? 'Run Benchmark'}
      </button>
    );
  },
});

/**
 * Results table component
 */
interface ResultsTableProps {
  headers: string[];
  rows: Signal<string[][]>;
}

export const ResultsTable = createComponent<ResultsTableProps>({
  name: 'ResultsTable',
  component({ props }) {
    return (
      <div class="mt-4 overflow-x-auto">
        {Show({
          when: () => props.rows().length > 0,
          children: () => (
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-[var(--line-default)]">
                  {props.headers.map(header => (
                    <th class="text-left px-3 py-2 text-xs text-[var(--content-muted)] font-medium uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {() => props.rows().map(row => (
                  <tr class="border-b border-[var(--line-default)]/50 last:border-0">
                    {row.map((cell, i) => (
                      <td class={`px-3 py-2 ${i === 0 ? 'text-[var(--content-secondary)]' : 'font-mono text-indigo-300'}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ),
          fallback: () => (
            <p class="text-sm text-[var(--content-muted)] italic">No results yet. Click "Run Benchmark" to start.</p>
          ),
        })}
      </div>
    );
  },
});
