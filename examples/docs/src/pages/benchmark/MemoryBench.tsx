import { createComponent, For, Show } from '@liteforge/runtime';
import { signal, computed, effect } from '@liteforge/core';
import { BenchmarkCard, ConfigSelect, RunButton } from './BenchmarkCard.js';
import { formatBytes, nextFrame, type BenchStatus, type BenchSummary } from './bench-utils.js';

const CYCLE_COUNT_OPTIONS: number[] = [25, 50, 100, 200];
const DEFAULT_CYCLE_COUNT = 100;
const REPEAT_COUNT = 5;

// Check if performance.memory is available (Chrome only)
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

declare global {
  interface Performance {
    memory?: PerformanceMemory;
  }
}

const hasMemoryAPI = typeof performance !== 'undefined' && 'memory' in performance;

interface RunRecord {
  run: number;
  delta: number | null; // null = GC ran (inconclusive)
  leakPerCycle: number | null;
}

/**
 * Complex test component that creates many reactive primitives:
 * - 10 signals
 * - 5 computeds
 * - 3 effects
 * - Nested children with For list
 */
const HeavyTestComponent = createComponent({
  name: 'HeavyTestComponent',
  component() {
    // 10 signals
    const signals: ReturnType<typeof signal<number>>[] = [];
    for (let i = 0; i < 10; i++) {
      signals.push(signal(i));
    }

    // 5 computeds
    const computeds: ReturnType<typeof computed<number>>[] = [];
    for (let i = 0; i < 5; i++) {
      const idx = i;
      computeds.push(computed(() => signals[idx]!() * 2 + signals[idx + 5]!()));
    }

    // 3 effects
    const disposers: (() => void)[] = [];
    for (let i = 0; i < 3; i++) {
      const idx = i;
      const dispose = effect(() => {
        const _ = signals[idx]!() + computeds[idx]!();
        void _;
      });
      disposers.push(dispose);
    }

    // List items
    const items = signal(Array.from({ length: 50 }, (_, i) => ({
      id: i,
      value: signal(i)
    })));

    return (
      <div class="heavy-component">
        <div class="signals">
          {signals.map((s, i) => (
            <span data-idx={i}>{() => s()}</span>
          ))}
        </div>
        <div class="computeds">
          {computeds.map((c, i) => (
            <span data-idx={i}>{() => c()}</span>
          ))}
        </div>
        <div class="list">
          {For({
            each: items,
            key: (item) => item.id,
            children: (item) => (
              <div class="list-item">
                {() => item.value()}
              </div>
            ),
          })}
        </div>
      </div>
    );
  },
});

interface MemoryBenchProps {
  onComplete?: (summary: BenchSummary) => void;
}

export const MemoryBench = createComponent<MemoryBenchProps>({
  name: 'MemoryBench',
  component({ props }) {
    const status = signal<BenchStatus>('idle');
    const cycleCount = signal<number>(DEFAULT_CYCLE_COUNT);
    const showComponent = signal(false);

    // Single-run results
    const memoryBefore = signal<number | null>(null);
    const memoryAfter = signal<number | null>(null);
    const memoryDelta = signal<number | null>(null);
    const cyclesCompleted = signal(0);
    const estimatedLeakPerCycle = signal<number | null>(null);

    // Repeat-run results
    const repeatRuns = signal<RunRecord[]>([]);
    const repeatProgress = signal<{ current: number; total: number } | null>(null);
    const trendLabel = signal<string>('');

    function getMemory(): number | null {
      if (hasMemoryAPI && performance.memory) {
        return performance.memory.usedJSHeapSize;
      }
      return null;
    }

    function tryGC() {
      if (typeof (globalThis as unknown as { gc?: () => void }).gc === 'function') {
        (globalThis as unknown as { gc: () => void }).gc();
      }
    }

    /** Runs one full mount/unmount cycle sequence and returns the delta (or null if GC ran). */
    async function runOnce(n: number): Promise<RunRecord> {
      tryGC();
      await nextFrame();
      await nextFrame();

      const before = getMemory();
      memoryBefore.set(before);

      for (let i = 0; i < n; i++) {
        showComponent.set(true);
        await nextFrame();
        showComponent.set(false);
        await nextFrame();
        cyclesCompleted.set(i + 1);
      }

      await nextFrame();
      await nextFrame();
      tryGC();
      await nextFrame();

      const after = getMemory();
      memoryAfter.set(after);

      if (before === null || after === null) {
        return { run: 0, delta: null, leakPerCycle: null };
      }

      const delta = after - before;
      const leakPerCycle = delta > 0 ? delta / n : null;
      memoryDelta.set(delta);
      estimatedLeakPerCycle.set(leakPerCycle);
      return { run: 0, delta, leakPerCycle };
    }

    async function runBenchmark() {
      status.set('running');
      memoryBefore.set(null);
      memoryAfter.set(null);
      memoryDelta.set(null);
      cyclesCompleted.set(0);
      estimatedLeakPerCycle.set(null);
      repeatRuns.set([]);
      repeatProgress.set(null);
      trendLabel.set('');
      showComponent.set(false);

      await nextFrame();

      const n = cycleCount();

      try {
        const record = await runOnce(n);
        status.set('complete');
        reportComplete(n, record.delta);
      } catch (e) {
        console.error('Memory bench error:', e);
        status.set('error');
        props.onComplete?.({ result: 'error', status: 'fail' });
      }
    }

    async function runRepeat() {
      status.set('running');
      memoryBefore.set(null);
      memoryAfter.set(null);
      memoryDelta.set(null);
      cyclesCompleted.set(0);
      estimatedLeakPerCycle.set(null);
      repeatRuns.set([]);
      trendLabel.set('');
      showComponent.set(false);

      await nextFrame();

      const n = cycleCount();
      const records: RunRecord[] = [];

      try {
        for (let r = 1; r <= REPEAT_COUNT; r++) {
          repeatProgress.set({ current: r, total: REPEAT_COUNT });
          cyclesCompleted.set(0);

          const record = await runOnce(n);
          record.run = r;
          records.push(record);
          repeatRuns.set([...records]);

          // 500ms pause between runs to give GC a chance
          if (r < REPEAT_COUNT) {
            await new Promise(res => setTimeout(res, 500));
          }
        }

        repeatProgress.set(null);
        trendLabel.set(computeTrend(records));
        status.set('complete');

        // Report summary from repeat runs
        const conclusive = records.filter(r => r.delta !== null && r.delta >= 0);
        if (conclusive.length > 0) {
          const avgDelta = conclusive.reduce((s, r) => s + r.delta!, 0) / conclusive.length;
          props.onComplete?.({
            result: `${REPEAT_COUNT}× avg ${formatBytes(avgDelta)} — ${trendLabel()}`,
            status: 'pass',
          });
        } else {
          props.onComplete?.({ result: `${REPEAT_COUNT}× (all inconclusive — GC ran)`, status: 'pass' });
        }
      } catch (e) {
        console.error('Memory bench repeat error:', e);
        repeatProgress.set(null);
        status.set('error');
        props.onComplete?.({ result: 'error', status: 'fail' });
      }
    }

    function reportComplete(n: number, delta: number | null) {
      if (!hasMemoryAPI || delta === null) {
        props.onComplete?.({ result: `${n} cycles (no memory API)`, status: 'pass' });
        return;
      }
      const resultText = delta < 0
        ? `${n} cycles (GC ran — inconclusive)`
        : `+${formatBytes(delta)} over ${n} cycles`;
      props.onComplete?.({ result: resultText, status: 'pass' });
    }

    /**
     * Determines whether deltas are growing linearly or staying stable.
     * Uses linear regression slope as the signal:
     *   - slope > 10KB/run → linear growth (potential leak)
     *   - otherwise → stable
     */
    function computeTrend(records: RunRecord[]): string {
      const conclusive = records.filter(r => r.delta !== null && r.delta! >= 0);
      // Need at least 3 conclusive runs for a meaningful trend
      if (conclusive.length < 3) return 'inconclusive (too many GC interruptions — try more cycles)';

      // Simple linear regression on (run number, delta) — use actual run numbers
      // so gaps from GC-interrupted runs don't compress the x-axis
      const xs = conclusive.map(r => r.run);
      const ys = conclusive.map(r => r.delta!);
      const n = xs.length;
      const meanX = xs.reduce((a, b) => a + b, 0) / n;
      const meanY = ys.reduce((a, b) => a + b, 0) / n;
      const slope = xs.reduce((acc, x, i) => acc + (x - meanX) * (ys[i]! - meanY), 0)
                  / xs.reduce((acc, x) => acc + (x - meanX) ** 2, 0);

      // slope is bytes/run
      if (slope > 10 * 1024) {
        return `growing ~${formatBytes(slope)}/run — possible leak`;
      }
      return `stable (±${formatBytes(Math.abs(slope))}/run)`;
    }

    const isRunning = () => status() === 'running';

    // Threshold: 20 KB per cycle — first run is often higher due to JIT warm-up
    const isHighDelta = () => {
      const lpc = estimatedLeakPerCycle();
      return lpc !== null && lpc > 20 * 1024;
    };

    const deltaColorClass = () => {
      const d = memoryDelta();
      if (d === null || d < 0) return 'bg-neutral-800/50 border-neutral-700';
      if (!isHighDelta()) return 'bg-emerald-500/10 border-emerald-500/30';
      return 'bg-amber-500/10 border-amber-500/30';
    };

    const deltaTextClass = () => {
      const d = memoryDelta();
      if (d === null || d < 0) return 'text-neutral-400';
      if (!isHighDelta()) return 'text-emerald-400';
      return 'text-amber-400';
    };

    const trendColorClass = () => {
      const t = trendLabel();
      if (t.includes('growing')) return 'text-amber-400';
      if (t.includes('stable')) return 'text-emerald-400';
      return 'text-neutral-400';
    };

    return (
      <BenchmarkCard
        title="6. Memory Leak Detection"
        description="Verify components properly clean up signals, effects, and computeds on unmount"
        status={status}
      >
        <div class="space-y-4">
          {/* Memory API warning */}
          {Show({
            when: () => !hasMemoryAPI,
            children: () => (
              <div class="px-4 py-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-sm">
                <p class="font-medium mb-1">performance.memory not available</p>
                <p class="text-amber-400/70 text-xs">
                  This API is only available in Chromium-based browsers.
                  Use Chrome DevTools Memory tab for accurate measurements:
                </p>
                <ol class="text-xs text-amber-400/70 mt-2 ml-4 list-decimal space-y-1">
                  <li>Open DevTools (F12) &rarr; Memory tab</li>
                  <li>Take a heap snapshot before running</li>
                  <li>Run this benchmark</li>
                  <li>Take another heap snapshot after</li>
                  <li>Compare the two snapshots</li>
                </ol>
              </div>
            ),
          })}

          {/* Config + buttons */}
          <div class="flex items-center gap-4 flex-wrap">
            <ConfigSelect
              label="Cycles:"
              options={CYCLE_COUNT_OPTIONS}
              value={cycleCount}
            />
            <RunButton
              onclick={runBenchmark}
              disabled={isRunning}
            />
            <button
              onclick={runRepeat}
              disabled={() => isRunning()}
              class={() => `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                isRunning()
                  ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30'
              }`}
            >
              {() => `Run ${REPEAT_COUNT}× (trend)`}
            </button>
          </div>

          {/* Progress */}
          {Show({
            when: isRunning,
            children: () => (
              <div class="text-sm text-neutral-400">
                {Show({
                  when: () => repeatProgress() !== null,
                  children: () => (
                    <span class="text-neutral-500 text-xs mr-2">
                      {() => {
                        const p = repeatProgress();
                        return p ? `Run ${p.current}/${p.total} —` : '';
                      }}
                    </span>
                  ),
                })}
                {() => cyclesCompleted()} / {() => cycleCount()} cycles
                <div class="mt-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-indigo-500 transition-all duration-100"
                    style={() => `width: ${(cyclesCompleted() / cycleCount()) * 100}%`}
                  />
                </div>
              </div>
            ),
          })}

          {/* Single-run results */}
          {Show({
            when: () => status() === 'complete' && hasMemoryAPI && repeatRuns().length === 0,
            children: () => (
              <div class="space-y-2">
                <div class="grid grid-cols-2 gap-4">
                  <div class="px-4 py-3 rounded-lg bg-neutral-800/50 border border-neutral-800">
                    <div class="text-xs text-neutral-500 mb-1">Memory Before</div>
                    <div class="text-lg font-mono text-neutral-200">
                      {() => memoryBefore() !== null ? formatBytes(memoryBefore()!) : 'N/A'}
                    </div>
                  </div>
                  <div class="px-4 py-3 rounded-lg bg-neutral-800/50 border border-neutral-800">
                    <div class="text-xs text-neutral-500 mb-1">Memory After</div>
                    <div class="text-lg font-mono text-neutral-200">
                      {() => memoryAfter() !== null ? formatBytes(memoryAfter()!) : 'N/A'}
                    </div>
                  </div>
                </div>

                <div class={() => `px-4 py-3 rounded-lg border ${deltaColorClass()}`}>
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="text-xs text-neutral-500 mb-1">Memory Delta</div>
                      <div class={() => `text-lg font-mono ${deltaTextClass()}`}>
                        {() => {
                          const d = memoryDelta();
                          if (d === null) return 'N/A';
                          if (d < 0) return `${formatBytes(d)} (GC ran)`;
                          return `+${formatBytes(d)}`;
                        }}
                      </div>
                    </div>
                    {Show({
                      when: () => estimatedLeakPerCycle() !== null,
                      children: () => (
                        <div class="text-right">
                          <div class="text-xs text-neutral-500 mb-1">Est. leak per cycle</div>
                          <div class="text-sm font-mono text-neutral-400">
                            {() => formatBytes(estimatedLeakPerCycle()!)}
                          </div>
                        </div>
                      ),
                    })}
                  </div>
                </div>

                <p class="text-xs text-neutral-500 italic">
                  Note: A negative delta means the GC ran during the test — result is inconclusive.
                  Use <strong>Run {REPEAT_COUNT}×</strong> to detect trends across multiple runs.
                </p>
              </div>
            ),
          })}

          {/* Repeat-run results table */}
          {Show({
            when: () => repeatRuns().length > 0,
            children: () => (
              <div class="space-y-3">
                <div class="overflow-hidden rounded-lg border border-neutral-800">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b border-neutral-800 bg-neutral-800/40">
                        <th class="text-left px-3 py-2 text-xs text-neutral-500 font-medium">Run</th>
                        <th class="text-left px-3 py-2 text-xs text-neutral-500 font-medium">Delta</th>
                        <th class="text-left px-3 py-2 text-xs text-neutral-500 font-medium">Leak / cycle</th>
                        <th class="text-left px-3 py-2 text-xs text-neutral-500 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {For({
                        each: repeatRuns,
                        key: (r) => r.run,
                        children: (row) => {
                          const isInconclusive = row.delta === null || row.delta < 0;
                          // Threshold: 20 KB per cycle — first run is often higher due to JIT warm-up
                          const isLarge = !isInconclusive && row.leakPerCycle !== null && row.leakPerCycle > 20 * 1024;
                          return (
                            <tr class="border-b border-neutral-800/50 last:border-0">
                              <td class="px-3 py-2 text-neutral-400 font-mono">#{row.run}</td>
                              <td class={() => `px-3 py-2 font-mono ${
                                isInconclusive ? 'text-neutral-500' : isLarge ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                                {isInconclusive
                                  ? (row.delta !== null ? `${formatBytes(row.delta)} (GC)` : 'N/A')
                                  : `+${formatBytes(row.delta!)}`
                                }
                              </td>
                              <td class="px-3 py-2 font-mono text-neutral-400">
                                {row.leakPerCycle !== null ? formatBytes(row.leakPerCycle) : '—'}
                              </td>
                              <td class="px-3 py-2">
                                {isInconclusive
                                  ? <span class="text-xs px-2 py-0.5 rounded bg-neutral-700 text-neutral-400">GC ran</span>
                                  : isLarge
                                    ? <span class="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">high</span>
                                    : <span class="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">ok</span>
                                }
                              </td>
                            </tr>
                          );
                        },
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Trend verdict */}
                {Show({
                  when: () => trendLabel() !== '',
                  children: () => (
                    <div class={() => `px-4 py-3 rounded-lg border flex items-center gap-3 ${
                      trendLabel().includes('growing')
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : trendLabel().includes('stable')
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-neutral-800/50 border-neutral-700'
                    }`}>
                      <div class="text-xl">
                        {() => trendLabel().includes('growing') ? '⚠️' : trendLabel().includes('stable') ? '✓' : '~'}
                      </div>
                      <div>
                        <div class="text-xs text-neutral-500 mb-0.5">Trend across {REPEAT_COUNT} runs</div>
                        <div class={() => `text-sm font-medium ${trendColorClass()}`}>
                          {() => trendLabel()}
                        </div>
                      </div>
                    </div>
                  ),
                })}

                <p class="text-xs text-neutral-500 italic">
                  A growing trend means memory increases each run — potential leak.
                  Stable means it's one-time engine overhead (normal).
                  If too many runs show "GC ran", increase cycles to 100+ for reliable results.
                </p>
              </div>
            ),
          })}

          {/* Results when no memory API */}
          {Show({
            when: () => status() === 'complete' && !hasMemoryAPI,
            children: () => (
              <div class="px-4 py-3 rounded-lg bg-neutral-800/50 border border-neutral-800">
                <p class="text-sm text-neutral-300">
                  Completed {() => cyclesCompleted()} mount/unmount cycles.
                </p>
                <p class="text-xs text-neutral-500 mt-1">
                  Check Chrome DevTools Memory tab for actual memory measurements.
                </p>
              </div>
            ),
          })}

          {/* Hidden mount area for the test component */}
          <div class="border border-neutral-800 rounded-lg p-2 max-h-20 overflow-hidden">
            <div class="text-xs text-neutral-600 mb-1">Mount area:</div>
            {Show({
              when: showComponent,
              children: () => <HeavyTestComponent />,
              fallback: () => (
                <span class="text-xs text-neutral-700 italic">Empty</span>
              ),
            })}
          </div>
        </div>
      </BenchmarkCard>
    );
  },
});
