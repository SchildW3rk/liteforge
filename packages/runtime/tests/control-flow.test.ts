import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { signal } from '@liteforge/core';
import { Show, For, Switch, Match, Dynamic } from '../src/control-flow.js';
import { createComponent } from '../src/component.js';
import { initAppContext, clearContext } from '../src/context.js';

/**
 * Helper to wait for MutationObserver callbacks to process.
 * Happy-dom's MutationObserver fires on the macrotask queue, so we need setTimeout.
 */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('control flow components', () => {
  let container: HTMLElement;

  beforeEach(() => {
    clearContext();
    initAppContext({});
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  describe('Show', () => {
    it('should render children when condition is true', async () => {
      const node = Show({
        when: true,
        children: () => document.createTextNode('Visible'),
      });

      container.appendChild(node);
      await tick();

      expect(container.textContent).toBe('Visible');
    });

    it('should not render children when condition is false', async () => {
      const node = Show({
        when: false,
        children: () => document.createTextNode('Hidden'),
      });

      container.appendChild(node);
      await tick();

      expect(container.textContent).toBe('');
    });

    it('should render fallback when condition is false', async () => {
      const node = Show({
        when: false,
        fallback: () => document.createTextNode('Fallback'),
        children: () => document.createTextNode('Content'),
      });

      container.appendChild(node);
      await tick();

      expect(container.textContent).toBe('Fallback');
    });

    it('should react to signal changes', async () => {
      const visible = signal(false);

      const node = Show({
        when: () => visible(),
        children: () => document.createTextNode('Now Visible'),
      });

      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('');

      visible.set(true);
      await tick();
      expect(container.textContent).toBe('Now Visible');

      visible.set(false);
      await tick();
      expect(container.textContent).toBe('');
    });

    it('should swap between children and fallback reactively', async () => {
      const showContent = signal(true);

      const node = Show({
        when: () => showContent(),
        fallback: () => document.createTextNode('Fallback'),
        children: () => document.createTextNode('Content'),
      });

      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('Content');

      showContent.set(false);
      await tick();
      expect(container.textContent).toBe('Fallback');

      showContent.set(true);
      await tick();
      expect(container.textContent).toBe('Content');
    });

    it('logs a console.error when children is not a function', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      Show({
        when: true,
        // @ts-expect-error intentionally passing wrong type to test runtime warning
        children: document.createTextNode('bad'),
      })
      expect(spy).toHaveBeenCalledOnce()
      expect(spy.mock.calls[0]![0]).toContain('[LiteForge] Show')
      expect(spy.mock.calls[0]![0]).toContain('children')
      spy.mockRestore()
    });
  });

  describe('For', () => {
    // NOTE: For() now uses getter-based API - item() and index() are functions
    // This enables keyed reconciliation where DOM nodes are reused when items reorder

    it('should render list items', async () => {
      const node = For({
        each: ['a', 'b', 'c'],
        children: (item) => document.createTextNode(item()),
      });

      container.appendChild(node);
      await tick();

      expect(container.textContent).toBe('abc');
    });

    it('should render with index', async () => {
      const node = For({
        each: ['x', 'y', 'z'],
        children: (item, index) => document.createTextNode(`${index()}:${item()} `),
      });

      container.appendChild(node);
      await tick();

      expect(container.textContent).toBe('0:x 1:y 2:z ');
    });

    it('should react to signal changes', async () => {
      const items = signal(['one']);

      const node = For({
        each: () => items(),
        children: (item) => document.createTextNode(`[${item()}]`),
      });

      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('[one]');

      items.set(['one', 'two', 'three']);
      await tick();
      expect(container.textContent).toBe('[one][two][three]');

      items.set([]);
      await tick();
      expect(container.textContent).toBe('');
    });

    it('should use key for reconciliation', async () => {
      interface Item {
        id: number;
        text: string;
      }

      const items = signal<Item[]>([
        { id: 1, text: 'First' },
        { id: 2, text: 'Second' },
        { id: 3, text: 'Third' },
      ]);

      // Track which items are created
      const createdIds: number[] = [];

      const node = For({
        each: () => items(),
        key: (item) => item.id,
        children: (item, _index) => {
          // This is called ONCE per unique key - captures initial value
          createdIds.push(item().id);
          const span = document.createElement('span');
          span.dataset.id = String(item().id);
          span.textContent = item().text;
          return span;
        },
      });

      container.appendChild(node);
      await tick();
      expect(createdIds).toEqual([1, 2, 3]);

      // Reorder items - should reuse existing nodes
      createdIds.length = 0;
      items.set([
        { id: 3, text: 'Third' },
        { id: 1, text: 'First' },
        { id: 2, text: 'Second' },
      ]);
      await tick();

      // No new items created (reused)
      expect(createdIds).toEqual([]);

      // Check order is correct
      const spans = container.querySelectorAll('span');
      expect(spans[0]?.dataset.id).toBe('3');
      expect(spans[1]?.dataset.id).toBe('1');
      expect(spans[2]?.dataset.id).toBe('2');
    });

    it('should handle item removal', async () => {
      const items = signal(['a', 'b', 'c', 'd']);

      const node = For({
        each: () => items(),
        children: (item) => {
          const span = document.createElement('span');
          span.textContent = item();
          return span;
        },
      });

      container.appendChild(node);
      await tick();
      expect(container.querySelectorAll('span').length).toBe(4);

      items.set(['a', 'c']);
      await tick();
      expect(container.querySelectorAll('span').length).toBe(2);
      expect(container.textContent).toBe('ac');
    });

    it('should handle item insertion', async () => {
      const items = signal(['a', 'c']);

      const node = For({
        each: () => items(),
        children: (item) => document.createTextNode(item()),
      });

      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('ac');

      items.set(['a', 'b', 'c']);
      await tick();
      expect(container.textContent).toBe('abc');
    });

    it('should support function key', async () => {
      interface Item {
        firstName: string;
        lastName: string;
      }

      const items = signal<Item[]>([
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' },
      ]);

      const node = For({
        each: () => items(),
        key: (item) => `${item.firstName}-${item.lastName}`,
        children: (item) => document.createTextNode(item().firstName),
      });

      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('JohnJane');
    });

    it('should handle item reordering with keys', async () => {
      interface Item {
        id: number;
        name: string;
      }

      const items = signal<Item[]>([
        { id: 1, name: 'First' },
        { id: 2, name: 'Second' },
      ]);

      const node = For({
        each: () => items(),
        key: (item) => item.id,
        children: (item, index) => {
          const span = document.createElement('span');
          span.dataset.id = String(item().id);
          // Note: index() is reactive - but we capture initial in textContent
          span.textContent = `${item().name}:${index()}`;
          return span;
        },
      });

      container.appendChild(node);
      await tick();

      // Reverse order
      items.set([
        { id: 2, name: 'Second' },
        { id: 1, name: 'First' },
      ]);
      await tick();

      const spans = container.querySelectorAll('span');
      expect(spans[0]?.dataset.id).toBe('2');
      expect(spans[1]?.dataset.id).toBe('1');
    });

    it('swap rows: two non-adjacent nodes end up at correct positions', async () => {
      interface Item { id: number }
      const items = signal<Item[]>([
        { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 },
      ]);

      const node = For({
        each: () => items(),
        key: (item) => item.id,
        children: (item) => {
          const span = document.createElement('span');
          span.dataset.id = String(item().id);
          return span;
        },
      });

      container.appendChild(node);
      await tick();

      // Swap rows 1 and 4 (index 0 and 3) — non-adjacent
      items.set([
        { id: 4 }, { id: 2 }, { id: 3 }, { id: 1 }, { id: 5 },
      ]);
      await tick();

      const spans = container.querySelectorAll('span');
      expect(spans[0]?.dataset.id).toBe('4');
      expect(spans[1]?.dataset.id).toBe('2');
      expect(spans[2]?.dataset.id).toBe('3');
      expect(spans[3]?.dataset.id).toBe('1');
      expect(spans[4]?.dataset.id).toBe('5');
    });

    it('swap rows: adjacent nodes swap correctly', async () => {
      interface Item { id: number }
      const items = signal<Item[]>([
        { id: 1 }, { id: 2 }, { id: 3 },
      ]);

      const node = For({
        each: () => items(),
        key: (item) => item.id,
        children: (item) => {
          const span = document.createElement('span');
          span.dataset.id = String(item().id);
          return span;
        },
      });

      container.appendChild(node);
      await tick();

      // Swap adjacent rows 1 and 2
      items.set([{ id: 2 }, { id: 1 }, { id: 3 }]);
      await tick();

      const spans = container.querySelectorAll('span');
      expect(spans[0]?.dataset.id).toBe('2');
      expect(spans[1]?.dataset.id).toBe('1');
      expect(spans[2]?.dataset.id).toBe('3');
    });

    it('swap rows: item signals still reactive after swap', async () => {
      interface Item { id: number; label: string }
      const items = signal<Item[]>([
        { id: 1, label: 'A' }, { id: 2, label: 'B' }, { id: 3, label: 'C' },
      ]);

      const node = For({
        each: () => items(),
        key: (item) => item.id,
        children: (item) => {
          const span = document.createElement('span');
          span.dataset.id = String(item().id);
          span.textContent = item().label;
          return span;
        },
      });

      container.appendChild(node);
      await tick();

      // Swap rows 0 and 2
      items.set([
        { id: 3, label: 'C' }, { id: 2, label: 'B' }, { id: 1, label: 'A' },
      ]);
      await tick();

      const spans = container.querySelectorAll('span');
      expect(spans[0]?.textContent).toBe('C');
      expect(spans[1]?.textContent).toBe('B');
      expect(spans[2]?.textContent).toBe('A');
    });

    it('swap rows: no DOM nodes are created, only moved', async () => {
      interface Item { id: number }
      const items = signal<Item[]>([
        { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 },
      ]);

      const createdCount = { value: 0 };
      const node = For({
        each: () => items(),
        key: (item) => item.id,
        children: (item) => {
          createdCount.value++;
          const span = document.createElement('span');
          span.dataset.id = String(item().id);
          return span;
        },
      });

      container.appendChild(node);
      await tick();
      expect(createdCount.value).toBe(4);

      // Swap rows — should reuse existing nodes
      items.set([{ id: 3 }, { id: 2 }, { id: 1 }, { id: 4 }]);
      await tick();

      // No new nodes created — same count
      expect(createdCount.value).toBe(4);

      const spans = container.querySelectorAll('span');
      expect(spans[0]?.dataset.id).toBe('3');
      expect(spans[3]?.dataset.id).toBe('4');
    });
  });

  describe('Switch', () => {
    it('should render first matching case', async () => {
      const node = Switch({
        children: [
          { when: false, render: () => document.createTextNode('A') },
          { when: true, render: () => document.createTextNode('B') },
          { when: true, render: () => document.createTextNode('C') },
        ],
      });

      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('B');
    });

    it('should render fallback when no match', async () => {
      const node = Switch({
        fallback: () => document.createTextNode('Default'),
        children: [
          { when: false, render: () => document.createTextNode('A') },
          { when: false, render: () => document.createTextNode('B') },
        ],
      });

      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('Default');
    });

    it('should render nothing when no match and no fallback', async () => {
      const node = Switch({
        children: [
          { when: false, render: () => document.createTextNode('A') },
        ],
      });

      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('');
    });

    it('should react to signal changes', async () => {
      const status = signal<'loading' | 'success' | 'error'>('loading');

      const node = Switch({
        children: [
          { when: () => status() === 'loading', render: () => document.createTextNode('Loading...') },
          { when: () => status() === 'success', render: () => document.createTextNode('Success!') },
          { when: () => status() === 'error', render: () => document.createTextNode('Error!') },
        ],
      });

      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('Loading...');

      status.set('success');
      await tick();
      expect(container.textContent).toBe('Success!');

      status.set('error');
      await tick();
      expect(container.textContent).toBe('Error!');

      status.set('loading');
      await tick();
      expect(container.textContent).toBe('Loading...');
    });
  });

  describe('Match helper', () => {
    it('should create match object', () => {
      const match = Match({ 
        when: true, 
        children: () => document.createTextNode('Test') 
      });

      expect(match.when).toBe(true);
      expect(typeof match.render).toBe('function');
    });
  });

  describe('Dynamic', () => {
    it('should render component from signal', async () => {
      const CompA = () => document.createTextNode('Component A');
      const CompB = () => document.createTextNode('Component B');
      const current = signal(CompA);

      const node = Dynamic({
        component: () => current(),
      });

      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('Component A');

      current.set(CompB);
      await tick();
      expect(container.textContent).toBe('Component B');
    });

    it('should handle null component', async () => {
      const current = signal<(() => Node) | null>(() => document.createTextNode('Initial'));

      const node = Dynamic({
        component: () => current(),
      });

      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('Initial');

      current.set(null);
      await tick();
      expect(container.textContent).toBe('');
    });

    it('should work with createComponent factories', async () => {
      const CompA = createComponent<{ value: string }>({
        component: ({ props }) => {
          const div = document.createElement('div');
          div.textContent = `A: ${props.value}`;
          return div;
        },
      });

      const CompB = createComponent<{ value: string }>({
        component: ({ props }) => {
          const div = document.createElement('div');
          div.textContent = `B: ${props.value}`;
          return div;
        },
      });

      const current = signal<typeof CompA | typeof CompB>(CompA);
      const value = signal('test');

      const node = Dynamic({
        component: () => current(),
        props: () => ({ value: value() }),
      });

      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('A: test');

      current.set(CompB);
      await tick();
      expect(container.textContent).toBe('B: test');
    });
  });
});
