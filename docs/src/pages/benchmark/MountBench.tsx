import { createComponent, Show } from 'liteforge';
import { signal, computed, effect } from 'liteforge';
import { BenchmarkCard, ConfigSelect, RunButton, ResultsTable } from './BenchmarkCard';
import { measure, formatMs, nextFrame, type BenchStatus, type BenchSummary } from './bench-utils';

const CYCLE_COUNT_OPTIONS: number[] = [100, 500, 1_000, 5_000];
const DEFAULT_CYCLE_COUNT = 1_000;

/**
 * Test component with realistic complexity:
 * - 5 signals
 * - 2 computed values
 * - 2 effects
 * - JSX with conditional rendering
 */
const TestComponent = createComponent({
  name: 'TestComponent',
  component() {
    // 5 signals
    const count = signal(0);
    const name = signal('Test');
    const active = signal(true);
    const items = signal<number[]>([1, 2, 3]);
    const timestamp = signal(Date.now());
    
    // 2 computed values
    const doubled = computed(() => count() * 2);
    const itemCount = computed(() => items().length);
    
    // 2 effects
    effect(() => {
      // Effect that reads signals
      const _ = count() + doubled();
      void _;
    });
    
    effect(() => {
      // Effect that would update something
      const _ = `${name()} - ${timestamp()}`;
      void _;
    });
    
    return (
      <div class="test-component">
        <span>{() => `Count: ${count()}`}</span>
        {Show({
          when: active,
          children: () => (
            <span>{() => `Items: ${itemCount()}, Doubled: ${doubled()}`}</span>
          ),
        })}
      </div>
    );
  },
});

/**
 * More complex test component with children
 */
const ComplexTestComponent = createComponent({
  name: 'ComplexTestComponent',
  component() {
    const parentSignal = signal(0);
    
    // Create 10 child component instances using JSX
    const childIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    return (
      <div class="complex-component">
        <span>{() => `Parent: ${parentSignal()}`}</span>
        <div class="children">
          {childIndices.map(() => <TestComponent />)}
        </div>
      </div>
    );
  },
});

interface MountBenchProps {
  onComplete?: (summary: BenchSummary) => void;
}

export const MountBench = createComponent<MountBenchProps>({
  name: 'MountBench',
  component({ props }) {
    const status = signal<BenchStatus>('idle');
    const cycleCount = signal<number>(DEFAULT_CYCLE_COUNT);
    const results = signal<string[][]>([]);
    const showComponent = signal(false);
    const showComplex = signal(false);

    async function runBenchmark() {
      status.set('running');
      results.set([]);
      showComponent.set(false);
      showComplex.set(false);
      
      await nextFrame();
      
      const n = cycleCount();
      const newResults: string[][] = [];
      
      try {
        // Test 1: Simple component mount/unmount (synchronous measurement)
        // We measure the actual DOM work, not frame timing
        const simpleResult = measure(`Simple mount/unmount x${n}`, () => {
          for (let i = 0; i < n; i++) {
            showComponent.set(true);
            showComponent.set(false);
          }
        }, n * 2);
        
        newResults.push([
          `Simple component x${n.toLocaleString()}`,
          formatMs(simpleResult.timeMs),
          `${formatMs(simpleResult.timeMs / n)} per cycle`,
        ]);
        
        await nextFrame();
        
        // Test 2: Complex component (parent + 10 children)
        const complexCycles = Math.min(n, 500);
        const complexResult = measure(`Complex mount/unmount x${complexCycles}`, () => {
          for (let i = 0; i < complexCycles; i++) {
            showComplex.set(true);
            showComplex.set(false);
          }
        }, complexCycles * 2);
        
        newResults.push([
          `Complex tree (11 components) x${complexCycles}`,
          formatMs(complexResult.timeMs),
          `${formatMs(complexResult.timeMs / complexCycles)} per cycle`,
        ]);
        
        await nextFrame();
        
        // Test 3: Mount WITH rendered frame (actual visual mount)
        // This measures real-world mount including browser paint
        const visualCycles = Math.min(n, 50); // Limited because it includes frames
        let visualMountTime = 0;
        
        for (let i = 0; i < visualCycles; i++) {
          showComponent.set(false);
          await nextFrame();
          
          const start = performance.now();
          showComponent.set(true);
          await nextFrame();
          visualMountTime += performance.now() - start;
        }
        showComponent.set(false);
        
        newResults.push([
          `Visual mount (with paint) x${visualCycles}`,
          formatMs(visualMountTime),
          `${formatMs(visualMountTime / visualCycles)} avg`,
        ]);
        
        results.set(newResults);
        status.set('complete');

        // Headline: avg per cycle for simple mount
        const simpleRow = newResults[0];
        props.onComplete?.({
          result: simpleRow ? simpleRow[2] ?? '' : '',
          status: 'pass',
        });
      } catch (e) {
        console.error('Mount bench error:', e);
        status.set('error');
        props.onComplete?.({ result: 'error', status: 'fail' });
      }
    }

    return (
      <BenchmarkCard
        title="3. Component Mount/Unmount Cycle"
        description="Component lifecycle overhead - creating and destroying components rapidly"
        status={status}
      >
        <div class="space-y-4">
          {/* Config */}
          <div class="flex items-center gap-4 flex-wrap">
            <ConfigSelect
              label="Cycles:"
              options={CYCLE_COUNT_OPTIONS}
              value={cycleCount}
            />
            <RunButton
              onclick={runBenchmark}
              disabled={() => status() === 'running'}
            />
          </div>
          
          {/* Results */}
          <ResultsTable
            headers={['Test', 'Total Time', 'Avg per cycle']}
            rows={results}
          />
          
          {/* Hidden mount area */}
          <div class="border border-[var(--line-default)] rounded-lg p-2 min-h-8">
            <div class="text-xs text-[var(--content-subtle)] mb-1">Mount area:</div>
            {Show({
              when: showComponent,
              children: () => <TestComponent />,
            })}
            {Show({
              when: showComplex,
              children: () => <ComplexTestComponent />,
            })}
            {Show({
              when: () => !showComponent() && !showComplex(),
              children: () => (
                <span class="text-xs text-[var(--content-subtle)] italic">Empty</span>
              ),
            })}
          </div>
        </div>
      </BenchmarkCard>
    );
  },
});
