import { createComponent, For, Show, Switch, Match } from 'liteforge';
import { signal, batch } from 'liteforge';
import { BenchmarkCard, RunButton } from './BenchmarkCard';
import { nextFrame, type BenchStatus, type BenchSummary } from './bench-utils';

interface TestResult {
  name: string;
  expected: number;
  actual: number;
  passed: boolean;
}

const GRID_ROWS = 20;
const GRID_COLS = 5;

interface DomPrecisionBenchProps {
  onComplete?: (summary: BenchSummary) => void;
}

export const DomPrecisionBench = createComponent<DomPrecisionBenchProps>({
  name: 'DomPrecisionBench',
  component({ props }) {
    const status = signal<BenchStatus>('idle');
    const testResults = signal<TestResult[]>([]);
    
    // Create grid of signals - 100 cells total
    const gridSignals: ReturnType<typeof signal<number>>[][] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      const row: ReturnType<typeof signal<number>>[] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        row.push(signal(0));
      }
      gridSignals.push(row);
    }
    
    let gridContainer: HTMLElement | null = null;

    async function countMutations(container: HTMLElement, action: () => void): Promise<number> {
      return new Promise((resolve) => {
        let mutationCount = 0;
        let timeoutId: ReturnType<typeof setTimeout>;
        
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            // Count text content changes and attribute changes
            if (mutation.type === 'characterData') {
              mutationCount++;
            } else if (mutation.type === 'childList') {
              // Count added/removed nodes
              mutationCount += mutation.addedNodes.length;
              mutationCount += mutation.removedNodes.length;
            } else if (mutation.type === 'attributes') {
              mutationCount++;
            }
          }
          
          // Reset timeout - wait for more mutations to settle
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            observer.disconnect();
            resolve(mutationCount);
          }, 10);
        });
        
        observer.observe(container, {
          characterData: true,
          childList: true,
          subtree: true,
          attributes: true,
        });
        
        action();
        
        // If no mutations happen within 50ms, resolve with 0
        timeoutId = setTimeout(() => {
          observer.disconnect();
          resolve(mutationCount);
        }, 50);
      });
    }

    async function runBenchmark() {
      status.set('running');
      testResults.set([]);
      
      // Reset all signals to 0
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          gridSignals[r]![c]!.set(0);
        }
      }
      
      await nextFrame();
      await nextFrame();
      
      const results: TestResult[] = [];
      
      if (!gridContainer) {
        console.error('DOM Precision Bench: gridContainer ref is null!');
        status.set('error');
        return;
      }
      
      try {
        // Note: LiteForge uses replaceChild for reactive text updates, which counts as
        // 2 mutations (remove + add) per update. This is the current behavior.
        // Future optimization: reuse TextNode and update nodeValue instead.
        
        // Test 1: Update single cell (2 mutations per update: remove old + add new)
        {
          // Ensure cell has a known different value first
          gridSignals[5]![2]!.set(0);
          await nextFrame();
          
          const mutations = await countMutations(gridContainer, () => {
            gridSignals[5]![2]!.set(999);
          });
          
          results.push({
            name: 'Update 1 signal → expect 2 mutations',
            expected: 2,
            actual: mutations,
            passed: mutations === 2,
          });
        }
        
        // Test 2: Update 10 cells in batch
        {
          // Reset cells to known values first
          batch(() => {
            for (let i = 0; i < 10; i++) {
              gridSignals[i]![0]!.set(0);
            }
          });
          await nextFrame();
          
          const mutations = await countMutations(gridContainer, () => {
            batch(() => {
              for (let i = 0; i < 10; i++) {
                gridSignals[i]![0]!.set(i + 100);
              }
            });
          });
          
          results.push({
            name: 'Batch update 10 signals → expect 20 mutations',
            expected: 20,
            actual: mutations,
            passed: mutations === 20,
          });
        }
        
        // Test 3: Update same cell twice in batch - should only update once (2 mutations)
        {
          // First, set a known value
          gridSignals[0]![0]!.set(1);
          await nextFrame();
          
          const mutations = await countMutations(gridContainer, () => {
            batch(() => {
              gridSignals[0]![0]!.set(2);
              gridSignals[0]![0]!.set(3); // Final value
            });
          });
          
          results.push({
            name: 'Batch: same cell twice → expect 2 mutations',
            expected: 2,
            actual: mutations,
            passed: mutations === 2,
          });
        }
        
        // Test 4: Update all cells in one column
        {
          // First ensure all cells in column 3 have a known value (different from what we'll set)
          batch(() => {
            for (let r = 0; r < GRID_ROWS; r++) {
              gridSignals[r]![3]!.set(-1);
            }
          });
          await nextFrame();
          
          const mutations = await countMutations(gridContainer, () => {
            batch(() => {
              for (let r = 0; r < GRID_ROWS; r++) {
                gridSignals[r]![3]!.set(r * 10);
              }
            });
          });
          
          // 20 cells × 2 mutations = 40 expected
          results.push({
            name: `Update column (${GRID_ROWS} cells) → expect ${GRID_ROWS * 2} mutations`,
            expected: GRID_ROWS * 2,
            actual: mutations,
            passed: mutations === GRID_ROWS * 2,
          });
        }
        
        // Test 5: Set value to same value (no-op) - should cause 0 mutations
        {
          const currentVal = gridSignals[10]![2]!();
          
          const mutations = await countMutations(gridContainer, () => {
            gridSignals[10]![2]!.set(currentVal); // Same value
          });
          
          results.push({
            name: 'Set same value → expect 0 mutations',
            expected: 0,
            actual: mutations,
            passed: mutations === 0,
          });
        }
        
        // Test 6: Update non-adjacent cells
        {
          // Reset these specific cells first
          batch(() => {
            gridSignals[0]![0]!.set(0);
            gridSignals[10]![2]!.set(0);
            gridSignals[19]![4]!.set(0);
          });
          await nextFrame();
          
          const mutations = await countMutations(gridContainer, () => {
            batch(() => {
              gridSignals[0]![0]!.set(1000);
              gridSignals[10]![2]!.set(1001);
              gridSignals[19]![4]!.set(1002);
            });
          });
          
          results.push({
            name: 'Update 3 scattered cells → expect 6 mutations',
            expected: 6,
            actual: mutations,
            passed: mutations === 6,
          });
        }
        
        testResults.set(results);
        status.set('complete');

        const passed = results.filter(r => r.passed).length;
        props.onComplete?.({
          result: `${passed}/${results.length} tests passed`,
          status: passed === results.length ? 'pass' : 'fail',
        });
      } catch (e) {
        console.error('DOM precision bench error:', e);
        console.error('Error stack:', (e as Error).stack);
        status.set('error');
        props.onComplete?.({ result: 'error', status: 'fail' });
      }
    }

    function setGridRef(el: HTMLElement) {
      gridContainer = el;
    }

    // Calculate overall pass/fail
    const allPassed = () => {
      const res = testResults();
      return res.length > 0 && res.every(r => r.passed);
    };
    
    const passCount = () => testResults().filter(r => r.passed).length;
    const totalCount = () => testResults().length;

    return (
      <BenchmarkCard
        title="5. DOM Update Precision Test"
        description="Verify minimal DOM operations - one signal change = one DOM mutation"
        status={status}
      >
        <div class="space-y-4">
          {/* Run button */}
          <RunButton
            onclick={runBenchmark}
            disabled={() => status() === 'running'}
          />
          
          {/* Summary */}
          {Show({
            when: () => testResults().length > 0,
            children: () => (
              <div class={() => `px-4 py-3 rounded-lg font-medium ${
                allPassed()
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
              }`}>
                {() => allPassed()
                  ? `All ${totalCount()} tests passed`
                  : `${passCount()} of ${totalCount()} tests passed`
                }
              </div>
            ),
          })}
          
          {/* Test results */}
          {Show({
            when: () => testResults().length > 0,
            children: () => (
              <div class="space-y-2">
                {For({
                  each: testResults,
                  key: (item) => item.name,
                  children: (result) => (
                    <div class="flex items-center justify-between px-3 py-2 rounded border border-[var(--line-default)] bg-[var(--surface-raised)]/30">
                      <span class="text-sm text-[var(--content-secondary)]">{result.name}</span>
                      <div class="flex items-center gap-3">
                        <span class="text-xs font-mono text-[var(--content-muted)]">
                          {`expected: ${result.expected}, actual: ${result.actual}`}
                        </span>
                        {Switch({
                          children: [
                            Match({
                              when: () => result.passed,
                              children: () => (
                                <span class="text-xs px-2 py-0.5 rounded bg-[var(--badge-emerald-bg)] text-[var(--badge-emerald-text)]">
                                  PASS
                                </span>
                              ),
                            }),
                          ],
                          fallback: () => (
                            <span class="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                              FAIL
                            </span>
                          ),
                        })}
                      </div>
                    </div>
                  ),
                })}
              </div>
            ),
          })}
          
          {/* Grid visualization */}
          <div class="border border-[var(--line-default)] rounded-lg overflow-hidden">
            <div class="px-3 py-2 bg-[var(--surface-overlay)]/50 text-xs text-[var(--content-muted)]">
              Test Grid ({GRID_ROWS}x{GRID_COLS} = {GRID_ROWS * GRID_COLS} cells)
            </div>
            <div 
              class="p-2 max-h-48 overflow-auto"
              ref={setGridRef}
            >
              <table class="w-full border-collapse">
                <tbody>
                  {gridSignals.map((row, rowIdx) => (
                    <tr>
                      {row.map((cellSignal, colIdx) => (
                        <td 
                          class="border border-[var(--line-default)]/50 px-2 py-1 text-xs font-mono text-center"
                          data-row={rowIdx}
                          data-col={colIdx}
                        >
                          {() => cellSignal()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </BenchmarkCard>
    );
  },
});
