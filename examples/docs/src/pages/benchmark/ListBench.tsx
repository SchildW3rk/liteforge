import { createComponent, For, Show } from '@liteforge/runtime';
import { signal } from '@liteforge/core';
import { BenchmarkCard, ConfigSelect, RunButton, ResultsTable } from './BenchmarkCard.js';
import { measure, formatMs, shuffleArray, uniqueId, nextFrame, type BenchStatus, type BenchSummary } from './bench-utils.js';

const ITEM_COUNT_OPTIONS: number[] = [50, 100, 500, 1_000, 5_000];
const DEFAULT_ITEM_COUNT = 50;
const PREVIEW_SIZE = 50;

interface ListItem {
  id: number;
  label: string;
  selected: boolean;
}

function createItems(count: number): ListItem[] {
  const items: ListItem[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      id: uniqueId(),
      label: `Item ${i + 1}`,
      selected: false,
    });
  }
  return items;
}

interface ListBenchProps {
  onComplete?: (summary: BenchSummary) => void;
}

export const ListBench = createComponent<ListBenchProps>({
  name: 'ListBench',
  component({ props }) {
    const status = signal<BenchStatus>('idle');
    const itemCount = signal<number>(DEFAULT_ITEM_COUNT);
    const results = signal<string[][]>([]);
    const items = signal<ListItem[]>([]);
    const shuffleVerification = signal<string>('');
    
    // Track DOM elements to verify reordering vs recreation
    let listContainer: HTMLElement | null = null;
    // Map from item-id → the DOM element that was rendered for it before shuffle
    let elementByItemId = new Map<number, HTMLElement>();

    function captureElementIdentities() {
      if (!listContainer) return;
      const children = listContainer.children;
      elementByItemId = new Map();
      for (let i = 0; i < children.length; i++) {
        const el = children[i] as HTMLElement;
        const itemId = parseInt(el.dataset.itemId ?? '0', 10);
        elementByItemId.set(itemId, el);
      }
    }

    function verifyElementReorder(): { reused: number; recreated: number } {
      if (!listContainer) return { reused: 0, recreated: 0 };
      const children = listContainer.children;
      let reused = 0;
      let recreated = 0;

      for (let i = 0; i < children.length; i++) {
        const el = children[i] as HTMLElement;
        const itemId = parseInt(el.dataset.itemId ?? '0', 10);
        const previousEl = elementByItemId.get(itemId);
        if (previousEl === undefined) {
          // This item was not visible in the preview before — skip (can't determine reuse)
          continue;
        }
        // The node is "reused" if it is the exact same DOM object we saw before for this item
        if (previousEl === el) {
          reused++;
        } else {
          recreated++;
        }
      }

      return { reused, recreated };
    }

    async function runBenchmark() {
      status.set('running');
      results.set([]);
      shuffleVerification.set('');
      
      await nextFrame();
      
      const n = itemCount();
      const newResults: string[][] = [];
      
      try {
        // Test 1: Initial render
        const initialItems = createItems(n);
        const mountResult = measure('Initial render', () => {
          items.set(initialItems);
        }, n);
        
        await nextFrame();
        await nextFrame();
        
        newResults.push([
          `Mount ${n.toLocaleString()} items`,
          formatMs(mountResult.timeMs),
          `${Math.round(n / (mountResult.timeMs / 1000)).toLocaleString()} items/s`,
        ]);
        
        // Capture element identities before shuffle
        captureElementIdentities();
        
        // Test 2: Append 100 items
        const appendResult = measure('Append 100', () => {
          const current = items();
          const newItems = createItems(100);
          items.set([...current, ...newItems]);
        }, 100);
        await nextFrame();
        newResults.push([
          'Append 100 items',
          formatMs(appendResult.timeMs),
          `${Math.round(100 / (appendResult.timeMs / 1000)).toLocaleString()} items/s`,
        ]);
        
        // Test 3: Prepend 100 items
        const prependResult = measure('Prepend 100', () => {
          const current = items();
          const newItems = createItems(100);
          items.set([...newItems, ...current]);
        }, 100);
        await nextFrame();
        newResults.push([
          'Prepend 100 items',
          formatMs(prependResult.timeMs),
          `${Math.round(100 / (prependResult.timeMs / 1000)).toLocaleString()} items/s`,
        ]);
        
        // Reset to original count for consistent testing
        items.set(createItems(n));
        await nextFrame();
        captureElementIdentities();
        
        // Test 4: Remove 100 random items
        const removeResult = measure('Remove 100 random', () => {
          const current = [...items()];
          const indicesToRemove = new Set<number>();
          while (indicesToRemove.size < 100 && indicesToRemove.size < current.length) {
            indicesToRemove.add(Math.floor(Math.random() * current.length));
          }
          const filtered = current.filter((_, i) => !indicesToRemove.has(i));
          items.set(filtered);
        }, 100);
        await nextFrame();
        newResults.push([
          'Remove 100 random items',
          formatMs(removeResult.timeMs),
          `${Math.round(100 / (removeResult.timeMs / 1000)).toLocaleString()} items/s`,
        ]);
        
        // Reset again
        items.set(createItems(n));
        await nextFrame();
        captureElementIdentities();
        
        // Test 5: Shuffle all items - CRITICAL TEST for DOM reordering
        const currentBeforeShuffle = items();
        const shuffled = shuffleArray(currentBeforeShuffle);

        const shuffleResult = measure('Shuffle all', () => {
          items.set(shuffled);
        }, n);
        await nextFrame();

        // Verify DOM reordering: same node objects must appear for the same item IDs
        const verification = verifyElementReorder();
        const reorderRatio = verification.reused / (verification.reused + verification.recreated);
        
        newResults.push([
          `Shuffle ${n.toLocaleString()} items`,
          formatMs(shuffleResult.timeMs),
          `${Math.round(n / (shuffleResult.timeMs / 1000)).toLocaleString()} items/s`,
        ]);
        
        // Report DOM reorder verification
        if (verification.reused + verification.recreated > 0) {
          const verificationText = reorderRatio > 0.9
            ? `DOM Reorder: ${verification.reused} reused, ${verification.recreated} recreated (${Math.round(reorderRatio * 100)}% reuse)`
            : `WARNING: Low DOM reuse! ${verification.reused} reused, ${verification.recreated} recreated (${Math.round(reorderRatio * 100)}% reuse)`;
          shuffleVerification.set(verificationText);
        }
        
        // Test 6: Clear all
        const clearResult = measure('Clear all', () => {
          items.set([]);
        }, n);
        await nextFrame();
        newResults.push([
          'Clear all items',
          formatMs(clearResult.timeMs),
          '-',
        ]);
        
        // Test 7: Replace all with new set
        const replaceItems = createItems(n);
        const replaceResult = measure('Replace all', () => {
          items.set(replaceItems);
        }, n);
        await nextFrame();
        newResults.push([
          `Replace with ${n.toLocaleString()} new items`,
          formatMs(replaceResult.timeMs),
          `${Math.round(n / (replaceResult.timeMs / 1000)).toLocaleString()} items/s`,
        ]);
        
        results.set(newResults);
        status.set('complete');

        // Headline: shuffle throughput + reuse ratio
        const shuffleRow = newResults[4];
        const reused = verification.reused;
        const total = verification.reused + verification.recreated;
        const pct = total > 0 ? Math.round((reused / total) * 100) : 100;
        props.onComplete?.({
          result: `${shuffleRow?.[2] ?? ''} · ${pct}% reuse`,
          status: pct >= 90 ? 'pass' : 'fail',
        });
      } catch (e) {
        console.error('List bench error:', e);
        status.set('error');
        props.onComplete?.({ result: 'error', status: 'fail' });
      }
    }

    function setListRef(el: HTMLElement) {
      listContainer = el;
    }

    return (
      <BenchmarkCard
        title="2. Reactive List Test (For)"
        description="List reconciliation performance - add, remove, reorder, verify DOM reuse"
        status={status}
      >
        <div class="space-y-4">
          {/* Config */}
          <div class="flex items-center gap-4 flex-wrap">
            <ConfigSelect
              label="Item count:"
              options={ITEM_COUNT_OPTIONS}
              value={itemCount}
            />
            <RunButton
              onclick={runBenchmark}
              disabled={() => status() === 'running'}
            />
          </div>
          
          {/* Results */}
          <ResultsTable
            headers={['Test', 'Time', 'Throughput']}
            rows={results}
          />
          
          {/* Shuffle verification */}
          {Show({
            when: () => shuffleVerification() !== '',
            children: () => (
              <div class={() => `text-sm px-3 py-2 rounded ${
                shuffleVerification().includes('WARNING')
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              }`}>
                {() => shuffleVerification()}
              </div>
            ),
          })}
          
          {/* Visual list preview */}
          <div class="border border-[var(--line-default)] rounded-lg overflow-hidden">
            <div class="px-3 py-2 bg-[var(--surface-overlay)]/50 text-xs text-[var(--content-muted)]">
              {() => {
                const total = items().length;
                const shown = Math.min(total, PREVIEW_SIZE);
                return total <= PREVIEW_SIZE
                  ? `Preview (all ${total} items)`
                  : `Preview (first ${shown} of ${total.toLocaleString()} items)`;
              }}
            </div>
            <div
              class="max-h-48 overflow-y-auto p-2"
              ref={setListRef}
            >
              {For({
                each: () => items().slice(0, PREVIEW_SIZE),
                key: (item) => item.id,
                children: (item) => (
                  <div
                    class="text-xs px-2 py-1 text-[var(--content-secondary)] border-b border-[var(--line-default)]/30 last:border-0"
                    data-item-id={String(item.id)}
                  >
                    <span class="text-[var(--content-subtle)] mr-2">{`#${item.id}`}</span>
                    {item.label}
                  </div>
                ),
                fallback: () => (
                  <div class="text-xs text-[var(--content-subtle)] italic px-2 py-4 text-center">
                    No items - run benchmark to populate
                  </div>
                ),
              })}
            </div>
          </div>
        </div>
      </BenchmarkCard>
    );
  },
});
