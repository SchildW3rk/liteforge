import { createComponent, Show } from 'liteforge';
import { signal, computed, effect } from 'liteforge';
import { BenchmarkCard, ConfigSelect, RunButton, ResultsTable } from './BenchmarkCard';
import { formatMs, formatOps, type BenchStatus, type BenchSummary } from './bench-utils';

const CHAIN_DEPTH_OPTIONS: number[] = [10, 25, 50, 100];
const DEFAULT_CHAIN_DEPTH = 50;

interface ComputedChainBenchProps {
  onComplete?: (summary: BenchSummary) => void;
}

export const ComputedChainBench = createComponent<ComputedChainBenchProps>({
  name: 'ComputedChainBench',
  component({ props }) {
    const status = signal<BenchStatus>('idle');
    const chainDepth = signal<number>(DEFAULT_CHAIN_DEPTH);
    const results = signal<string[][]>([]);
    const visualChain = signal<string>('');

    async function runBenchmark() {
      status.set('running');
      results.set([]);
      visualChain.set('');
      
      await new Promise(r => setTimeout(r, 10));
      
      const depth = chainDepth();
      const newResults: string[][] = [];
      const iterations = 1000; // Number of updates to measure
      
      try {
        // Test 1: Linear chain (A → B → C → ... → Z)
        {
          const source = signal(0);
          const chain: ReturnType<typeof computed<number>>[] = [];
          
          // Build the chain
          let prev: (() => number) = source;
          for (let i = 0; i < depth; i++) {
            const current = prev;
            const next = computed(() => current() + 1);
            chain.push(next);
            prev = next;
          }
          
          const lastComputed = chain[chain.length - 1]!;
          
          // Measure propagation
          let propagationTime = 0;
          for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            source.set(i);
            // Read the end of the chain to trigger propagation
            const _ = lastComputed();
            propagationTime += performance.now() - start;
            void _;
          }
          
          const avgTime = propagationTime / iterations;
          newResults.push([
            `Linear chain (depth ${depth})`,
            formatMs(avgTime),
            formatOps(1000 / avgTime),
          ]);
          
          visualChain.set(`A(${source()}) → [${depth} computeds] → Z(${lastComputed()})`);
        }
        
        // Test 2: Diamond dependency (A → B, A → C, B+C → D)
        {
          const source = signal(0);
          const branchB = computed(() => source() * 2);
          const branchC = computed(() => source() * 3);
          const diamond = computed(() => branchB() + branchC());
          
          let propagationTime = 0;
          for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            source.set(i);
            const _ = diamond();
            propagationTime += performance.now() - start;
            void _;
          }
          
          const avgTime = propagationTime / iterations;
          newResults.push([
            'Diamond dependency (A → B,C → D)',
            formatMs(avgTime),
            formatOps(1000 / avgTime),
          ]);
        }
        
        // Test 3: Fan-out (1 signal → N computeds)
        {
          const source = signal(0);
          const fanOut: ReturnType<typeof computed<number>>[] = [];
          
          for (let i = 0; i < depth; i++) {
            fanOut.push(computed(() => source() * (i + 1)));
          }
          
          let propagationTime = 0;
          for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            source.set(i);
            // Read all computeds
            let sum = 0;
            for (let j = 0; j < fanOut.length; j++) {
              sum += fanOut[j]!();
            }
            propagationTime += performance.now() - start;
            void sum;
          }
          
          const avgTime = propagationTime / iterations;
          newResults.push([
            `Fan-out (1 → ${depth} computeds)`,
            formatMs(avgTime),
            formatOps(1000 / avgTime),
          ]);
        }
        
        // Test 4: Deep diamond (multiple levels)
        {
          const source = signal(0);
          
          // Level 1: 2 branches
          const l1a = computed(() => source() + 1);
          const l1b = computed(() => source() + 2);
          
          // Level 2: 4 branches
          const l2a = computed(() => l1a() * 2);
          const l2b = computed(() => l1a() * 3);
          const l2c = computed(() => l1b() * 2);
          const l2d = computed(() => l1b() * 3);
          
          // Level 3: merge
          const l3a = computed(() => l2a() + l2b());
          const l3b = computed(() => l2c() + l2d());
          
          // Final merge
          const result = computed(() => l3a() + l3b());
          
          let propagationTime = 0;
          for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            source.set(i);
            const _ = result();
            propagationTime += performance.now() - start;
            void _;
          }
          
          const avgTime = propagationTime / iterations;
          newResults.push([
            'Deep diamond (4 levels, 8 nodes)',
            formatMs(avgTime),
            formatOps(1000 / avgTime),
          ]);
        }
        
        // Test 5: Effect at end of chain
        {
          const source = signal(0);
          const chain: ReturnType<typeof computed<number>>[] = [];
          
          let prev: (() => number) = source;
          for (let i = 0; i < depth; i++) {
            const current = prev;
            const next = computed(() => current() + 1);
            chain.push(next);
            prev = next;
          }
          
          const lastComputed = chain[chain.length - 1]!;
          let effectRuns = 0;
          
          const dispose = effect(() => {
            const _ = lastComputed();
            effectRuns++;
            void _;
          });
          
          effectRuns = 0; // Reset after initial run
          
          let propagationTime = 0;
          for (let i = 0; i < iterations; i++) {
            const start = performance.now();
            source.set(i + 1); // +1 to avoid same value
            propagationTime += performance.now() - start;
          }
          
          dispose();
          
          const avgTime = propagationTime / iterations;
          newResults.push([
            `Chain → effect (depth ${depth})`,
            formatMs(avgTime),
            `${effectRuns} runs`,
          ]);
        }
        
        results.set(newResults);
        status.set('complete');

        // Headline: linear chain propagation speed
        const chainRow = newResults[0];
        props.onComplete?.({
          result: chainRow ? chainRow[2] ?? '' : '',
          status: 'pass',
        });
      } catch (e) {
        console.error('Computed chain bench error:', e);
        status.set('error');
        props.onComplete?.({ result: 'error', status: 'fail' });
      }
    }

    return (
      <BenchmarkCard
        title="4. Computed Chain / Signal Propagation"
        description="How fast updates propagate through dependency graphs"
        status={status}
      >
        <div class="space-y-4">
          {/* Config */}
          <div class="flex items-center gap-4 flex-wrap">
            <ConfigSelect
              label="Chain depth:"
              options={CHAIN_DEPTH_OPTIONS}
              value={chainDepth}
            />
            <RunButton
              onclick={runBenchmark}
              disabled={() => status() === 'running'}
            />
          </div>
          
          {/* Results */}
          <ResultsTable
            headers={['Test', 'Avg propagation', 'Updates/sec']}
            rows={results}
          />
          
          {/* Visual chain representation */}
          {Show({
            when: () => visualChain() !== '',
            children: () => (
              <div class="text-xs font-mono text-[var(--content-muted)] px-3 py-2 bg-[var(--surface-overlay)]/30 rounded">
                {() => visualChain()}
              </div>
            ),
          })}
        </div>
      </BenchmarkCard>
    );
  },
});
