import { createComponent } from 'liteforge';
import { signal, computed, batch } from 'liteforge';
import { BenchmarkCard, ConfigSelect, RunButton, ResultsTable } from './BenchmarkCard.js';
import { measure, formatMs, formatOps, type BenchStatus, type BenchSummary } from './bench-utils.js';

const SIGNAL_COUNT_OPTIONS: number[] = [1_000, 5_000, 10_000, 50_000];
const DEFAULT_SIGNAL_COUNT = 10_000;

interface SignalBenchProps {
  onComplete?: (summary: BenchSummary) => void;
}

export const SignalBench = createComponent<SignalBenchProps>({
  name: 'SignalBench',
  component({ props }) {
    const status = signal<BenchStatus>('idle');
    const signalCount = signal<number>(DEFAULT_SIGNAL_COUNT);
    const results = signal<string[][]>([]);

    async function runBenchmark() {
      status.set('running');
      results.set([]);
      
      // Small delay to let UI update
      await new Promise(r => setTimeout(r, 10));
      
      const n: number = signalCount();
      const newResults: string[][] = [];
      
      try {
        // Test 1: Create N signals
        let signals: ReturnType<typeof signal<number>>[] = [];
        const createResult = measure('Create signals', () => {
          signals = [];
          for (let i = 0; i < n; i++) {
            signals.push(signal(i));
          }
        }, n);
        newResults.push([
          `Create ${n.toLocaleString()} signals`,
          formatMs(createResult.timeMs),
          formatOps(createResult.opsPerSec!),
        ]);
        
        // Test 2: Read all signals
        const readResult = measure('Read all signals', () => {
          let sum = 0;
          for (let i = 0; i < n; i++) {
            sum += signals[i]!();
          }
          // Prevent optimization
          if (sum < 0) console.log(sum);
        }, n);
        newResults.push([
          `Read ${n.toLocaleString()} signals`,
          formatMs(readResult.timeMs),
          formatOps(readResult.opsPerSec!),
        ]);
        
        // Test 3: Write all signals sequentially
        const writeResult = measure('Write all signals', () => {
          for (let i = 0; i < n; i++) {
            signals[i]!.set(i + 1);
          }
        }, n);
        newResults.push([
          `Write ${n.toLocaleString()} signals (sequential)`,
          formatMs(writeResult.timeMs),
          formatOps(writeResult.opsPerSec!),
        ]);
        
        // Test 4: Write all signals in batch
        const batchResult = measure('Batch write all signals', () => {
          batch(() => {
            for (let i = 0; i < n; i++) {
              signals[i]!.set(i + 2);
            }
          });
        }, n);
        newResults.push([
          `Write ${n.toLocaleString()} signals (batch)`,
          formatMs(batchResult.timeMs),
          formatOps(batchResult.opsPerSec!),
        ]);
        
        // Test 5: Create computed signals and trigger updates
        const computedCount = Math.min(n, 1000); // Cap at 1000 computeds
        let computeds: ReturnType<typeof computed<number>>[] = [];
        
        const computedCreateResult = measure('Create computed signals', () => {
          computeds = [];
          for (let i = 0; i < computedCount; i++) {
            const idx = i;
            computeds.push(computed(() => signals[idx]!() * 2));
          }
        }, computedCount);
        newResults.push([
          `Create ${computedCount.toLocaleString()} computeds`,
          formatMs(computedCreateResult.timeMs),
          formatOps(computedCreateResult.opsPerSec!),
        ]);
        
        // Test 6: Update source signals and read computeds
        const propagateResult = measure('Propagate to computeds', () => {
          // Update source signals
          for (let i = 0; i < computedCount; i++) {
            signals[i]!.set(i * 10);
          }
          // Read all computeds to trigger recalculation
          let sum = 0;
          for (let i = 0; i < computedCount; i++) {
            sum += computeds[i]!();
          }
          if (sum < 0) console.log(sum);
        }, computedCount);
        newResults.push([
          `Update + read ${computedCount.toLocaleString()} computeds`,
          formatMs(propagateResult.timeMs),
          formatOps(propagateResult.opsPerSec!),
        ]);
        
        // Test 7: .update() calls
        const updateResult = measure('Functional updates', () => {
          for (let i = 0; i < n; i++) {
            signals[i]!.update(v => v + 1);
          }
        }, n);
        newResults.push([
          `update() ${n.toLocaleString()} signals`,
          formatMs(updateResult.timeMs),
          formatOps(updateResult.opsPerSec!),
        ]);
        
        results.set(newResults);
        status.set('complete');

        // Report the headline number: batch write ops/sec
        const batchRow = newResults[3];
        props.onComplete?.({
          result: batchRow ? batchRow[2] ?? '' : '',
          status: 'pass',
        });
      } catch (e) {
        console.error('Signal bench error:', e);
        status.set('error');
        props.onComplete?.({ result: 'error', status: 'fail' });
      }
    }

    return (
      <BenchmarkCard
        title="1. Signal Stress Test"
        description="Raw signal creation, reading, writing, and batched update performance"
        status={status}
      >
        <div class="space-y-4">
          {/* Config */}
          <div class="flex items-center gap-4 flex-wrap">
            <ConfigSelect
              label="Signal count:"
              options={SIGNAL_COUNT_OPTIONS}
              value={signalCount}
            />
            <RunButton
              onclick={runBenchmark}
              disabled={() => status() === 'running'}
            />
          </div>
          
          {/* Results */}
          <ResultsTable
            headers={['Test', 'Time', 'Ops/sec']}
            rows={results}
          />
        </div>
      </BenchmarkCard>
    );
  },
});
