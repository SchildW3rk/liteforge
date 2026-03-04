import { createComponent, For, Show } from '@liteforge/runtime';
import { signal } from '@liteforge/core';
import { SignalBench } from './SignalBench.js';
import { ListBench } from './ListBench.js';
import { MountBench } from './MountBench.js';
import { ComputedChainBench } from './ComputedChainBench.js';
import { DomPrecisionBench } from './DomPrecisionBench.js';
import { MemoryBench } from './MemoryBench.js';
import type { BenchSummary } from './bench-utils.js';

interface SummaryRow {
  name: string;
  result: string;
  status: 'pass' | 'fail' | 'pending';
}

const INITIAL_ROWS: SummaryRow[] = [
  { name: 'Signal Stress Test',      result: 'Run benchmark below ↓', status: 'pending' },
  { name: 'List Reconciliation',     result: 'Run benchmark below ↓', status: 'pending' },
  { name: 'Mount/Unmount Cycle',     result: 'Run benchmark below ↓', status: 'pending' },
  { name: 'Computed Chain',          result: 'Run benchmark below ↓', status: 'pending' },
  { name: 'DOM Precision',           result: 'Run benchmark below ↓', status: 'pending' },
  { name: 'Memory Leak Detection',   result: 'Run benchmark below ↓', status: 'pending' },
];

export const BenchmarkPage = createComponent({
  name: 'BenchmarkPage',
  component() {
    const summaryRows = signal<SummaryRow[]>(INITIAL_ROWS.map(r => ({ ...r })));

    function updateRow(name: string, summary: BenchSummary) {
      summaryRows.update(rows =>
        rows.map(row =>
          row.name === name
            ? { ...row, result: summary.result, status: summary.status }
            : row
        )
      );
    }

    return (
      <div>
        {/* Header */}
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/benchmark</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">Performance Benchmarks</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-2xl">
            Comprehensive performance tests for the LiteForge framework. Each benchmark
            measures different aspects of the reactivity system, DOM updates, and component
            lifecycle. All UI on this page is built with LiteForge itself.
          </p>

          <div class="mt-4 flex flex-wrap gap-2 text-xs">
            <span class="px-2 py-1 rounded bg-[var(--badge-indigo-bg)] text-[var(--badge-indigo-text)]">
              Fine-grained signals
            </span>
            <span class="px-2 py-1 rounded bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)]">
              No Virtual DOM
            </span>
            <span class="px-2 py-1 rounded bg-[var(--badge-amber-bg)] text-[var(--badge-amber-text)]">
              Minimal DOM mutations
            </span>
          </div>
        </div>

        {/* Summary — always visible, updates as benchmarks complete */}
        <div class="mb-8 p-5 rounded-xl border border-[var(--line-default)] bg-[var(--surface-raised)]/30">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-lg font-semibold text-[var(--content-primary)]">Summary</h2>
              <p class="text-xs text-[var(--content-muted)] mt-0.5">
                Results update automatically as you run each benchmark below.
              </p>
            </div>
            {Show({
              when: () => summaryRows().every(r => r.status !== 'pending'),
              children: () => (
                <span class="text-xs px-2 py-1 rounded-full bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)]">
                  All complete
                </span>
              ),
            })}
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-[var(--line-default)]">
                  <th class="text-left px-3 py-2 text-xs text-[var(--content-muted)] font-medium uppercase tracking-wider">
                    Benchmark
                  </th>
                  <th class="text-left px-3 py-2 text-xs text-[var(--content-muted)] font-medium uppercase tracking-wider">
                    Result
                  </th>
                  <th class="text-left px-3 py-2 text-xs text-[var(--content-muted)] font-medium uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {For({
                  each: summaryRows,
                  key: (row) => row.name,
                  children: (row) => (
                    <tr class="border-b border-[var(--line-default)]/50 last:border-0">
                      <td class="px-3 py-2 text-[var(--content-secondary)]">{row.name}</td>
                      <td class="px-3 py-2 font-mono text-indigo-300">{row.result}</td>
                      <td class="px-3 py-2">
                        {Show({
                          when: () => row.status === 'pass',
                          children: () => (
                            <span class="text-xs px-2 py-0.5 rounded bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)]">
                              PASS
                            </span>
                          ),
                          fallback: () => Show({
                            when: () => row.status === 'fail',
                            children: () => (
                              <span class="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                                FAIL
                              </span>
                            ),
                            fallback: () => (
                              <span class="text-xs px-2 py-0.5 rounded bg-[var(--surface-overlay)] text-[var(--content-secondary)]">
                                PENDING
                              </span>
                            ),
                          }),
                        })}
                      </td>
                    </tr>
                  ),
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Individual Benchmarks */}
        <div class="space-y-6">
          <SignalBench
            onComplete={(s: BenchSummary) => updateRow('Signal Stress Test', s)}
          />
          <ListBench
            onComplete={(s: BenchSummary) => updateRow('List Reconciliation', s)}
          />
          <MountBench
            onComplete={(s: BenchSummary) => updateRow('Mount/Unmount Cycle', s)}
          />
          <ComputedChainBench
            onComplete={(s: BenchSummary) => updateRow('Computed Chain', s)}
          />
          <DomPrecisionBench
            onComplete={(s: BenchSummary) => updateRow('DOM Precision', s)}
          />
          <MemoryBench
            onComplete={(s: BenchSummary) => updateRow('Memory Leak Detection', s)}
          />
        </div>

        {/* Footer notes */}
        <div class="mt-10 pt-6 border-t border-[var(--line-default)]">
          <h3 class="text-sm font-semibold text-[var(--content-secondary)] mb-2">Notes</h3>
          <ul class="text-xs text-[var(--content-muted)] space-y-1">
            <li>
              Results vary based on hardware, browser, and system load. Run multiple
              times for accurate measurements.
            </li>
            <li>
              For memory tests, use Chrome with DevTools Memory tab for most accurate results.
            </li>
            <li>
              DOM Precision tests verify that LiteForge's fine-grained reactivity only
              updates exactly the DOM nodes that need updating.
            </li>
            <li>
              List shuffle test verifies that DOM nodes are reordered, not recreated —
              a key optimization for keyed lists.
            </li>
          </ul>
        </div>
      </div>
    );
  },
});
