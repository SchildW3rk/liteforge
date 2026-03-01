/**
 * Tests for Control Flow Component Generics
 * 
 * These tests verify:
 * 1. TypeScript type inference works correctly (compile-time)
 * 2. Runtime behavior matches the expected generic contracts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signal } from '@liteforge/core';
import { Show, For, Switch, Match } from '../src/control-flow.js';
import { initAppContext, clearContext } from '../src/context.js';

/**
 * Helper to wait for MutationObserver callbacks to process.
 */
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

// =============================================================================
// Test Fixtures
// =============================================================================

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

// =============================================================================
// Type Inference Tests
// =============================================================================

describe('Type Inference', () => {
  describe('For<T>', () => {
    it('infers item type from each array', () => {
      const users = signal<User[]>([{ id: '1', name: 'Alice', email: 'a@b.c', role: 'admin' }]);
      
      // TypeScript should infer user as User
      For({
        each: users,
        children: (user) => {
          // These should compile without explicit types
          const name: string = user.name;
          const email: string = user.email;
          const role: 'admin' | 'user' = user.role;
          
          expect(name).toBe('Alice');
          expect(email).toBe('a@b.c');
          expect(role).toBe('admin');
          
          return document.createElement('div');
        },
      });
    });

    it('restricts key to valid properties of T', () => {
      const users = signal<User[]>([]);
      
      // Valid keys - should compile
      For({
        each: users,
        key: 'id',
        children: () => document.createElement('div'),
      });

      For({
        each: users,
        key: 'name',
        children: () => document.createElement('div'),
      });

      For({
        each: users,
        key: 'email',
        children: () => document.createElement('div'),
      });

      // Note: TypeScript would error on invalid keys like 'foo'
      // We can't test that directly without @ts-expect-error
    });

    it('provides index as second argument', () => {
      const items = signal<string[]>(['a', 'b', 'c']);
      
      For({
        each: items,
        children: (item, index) => {
          // item should be string, index should be number
          const str: string = item;
          const num: number = index;
          
          expect(typeof str).toBe('string');
          expect(typeof num).toBe('number');
          
          return document.createElement('div');
        },
      });
    });

    it('works with readonly arrays', () => {
      const items = signal<readonly User[]>([
        { id: '1', name: 'Alice', email: 'a@b.c', role: 'admin' }
      ]);
      
      For({
        each: items,
        children: (user) => {
          const name: string = user.name;
          expect(name).toBe('Alice');
          return document.createElement('div');
        },
      });
    });

    it('works with function key extractor', () => {
      const items = signal<User[]>([]);
      
      For({
        each: items,
        key: (user, index) => `${user.id}-${index}`,
        children: () => document.createElement('div'),
      });
    });
  });

  describe('Show<T>', () => {
    it('narrows type to NonNullable in children callback', () => {
      const currentUser = signal<User | null>(
        { id: '1', name: 'Alice', email: 'a@b.c', role: 'admin' }
      );
      
      Show({
        when: currentUser,
        children: (user) => {
          // user should be User, NOT User | null
          const name: string = user.name;
          const role: 'admin' | 'user' = user.role;
          
          expect(name).toBe('Alice');
          expect(role).toBe('admin');
          
          return document.createElement('div');
        },
      });
    });

    it('works with union types including undefined', () => {
      const value = signal<string | null | undefined>('hello');
      
      Show({
        when: value,
        children: (str) => {
          // str should be string (null and undefined removed)
          const upper: string = str.toUpperCase();
          expect(upper).toBe('HELLO');
          return document.createElement('div');
        },
      });
    });

    it('works with boolean signals', () => {
      const isReady = signal(true);
      
      // When when is a boolean, the callback receives true (which is NonNullable<boolean>)
      Show({
        when: isReady,
        children: (value) => {
          // value should be true (the truthy boolean value)
          expect(value).toBe(true);
          return document.createElement('div');
        },
      });
    });

    it('works with getter function', () => {
      const user = signal<User | null>(
        { id: '1', name: 'Bob', email: 'b@c.d', role: 'user' }
      );
      
      Show({
        when: () => user(),
        children: (u) => {
          const name: string = u.name;
          expect(name).toBe('Bob');
          return document.createElement('div');
        },
      });
    });
  });

  describe('Switch/Match', () => {
    it('has properly typed when condition', () => {
      const status = signal<'loading' | 'success' | 'error'>('loading');
      
      Switch({
        children: [
          Match({
            when: () => status() === 'loading',
            children: () => document.createTextNode('Loading'),
          }),
          Match({
            when: () => status() === 'success',
            children: () => document.createTextNode('Success'),
          }),
        ],
        fallback: () => document.createTextNode('Error'),
      });
    });

    it('Match returns MatchCase type', () => {
      const matchCase = Match({
        when: true,
        children: () => document.createElement('div'),
      });
      
      expect(matchCase.when).toBe(true);
      expect(typeof matchCase.render).toBe('function');
    });
  });
});

// =============================================================================
// Runtime Behavior Tests
// =============================================================================

describe('Runtime Behavior', () => {
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

  describe('For<T> Runtime', () => {
    it('passes item to children callback', async () => {
      const users = signal([
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ]);
      
      const receivedItems: Array<{ id: string; name: string }> = [];
      
      const node = For({
        each: users,
        children: (user) => {
          receivedItems.push(user);
          return document.createElement('div');
        },
      });
      
      container.appendChild(node);
      await tick();
      
      expect(receivedItems).toHaveLength(2);
      expect(receivedItems[0]?.name).toBe('Alice');
      expect(receivedItems[1]?.name).toBe('Bob');
    });

    it('passes index as second argument (plain number)', async () => {
      const items = signal(['a', 'b', 'c']);
      const receivedIndices: number[] = [];
      
      const node = For({
        each: items,
        children: (_item, index) => {
          receivedIndices.push(index);
          return document.createElement('div');
        },
      });
      
      container.appendChild(node);
      await tick();
      
      expect(receivedIndices).toEqual([0, 1, 2]);
    });

    it('renders fallback when array is empty', async () => {
      const items = signal<string[]>([]);
      let fallbackRendered = false;
      
      const node = For({
        each: items,
        children: () => document.createElement('div'),
        fallback: () => {
          fallbackRendered = true;
          return document.createTextNode('No items');
        },
      });
      
      container.appendChild(node);
      await tick();
      
      expect(fallbackRendered).toBe(true);
      expect(container.textContent).toBe('No items');
    });

    it('removes fallback when items are added', async () => {
      const items = signal<string[]>([]);
      
      const node = For({
        each: items,
        children: (item) => document.createTextNode(`[${item}]`),
        fallback: () => document.createTextNode('Empty'),
      });
      
      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('Empty');
      
      items.set(['a', 'b']);
      await tick();
      expect(container.textContent).toBe('[a][b]');
    });

    it('shows fallback when items become empty', async () => {
      const items = signal(['a', 'b']);
      
      const node = For({
        each: items,
        children: (item) => document.createTextNode(`[${item}]`),
        fallback: () => document.createTextNode('Empty'),
      });
      
      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('[a][b]');
      
      items.set([]);
      await tick();
      expect(container.textContent).toBe('Empty');
    });

    it('key restricts to valid properties', async () => {
      const users = signal([{ id: '1', name: 'Alice' }]);
      
      const node = For({
        each: users,
        key: 'id',
        children: (user) => {
          const div = document.createElement('div');
          div.textContent = user.name;
          return div;
        },
      });
      
      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('Alice');
    });

    it('key accepts function extractor', async () => {
      const users = signal([{ id: '1', name: 'Alice' }]);
      
      const node = For({
        each: users,
        key: (user) => user.id,
        children: (user) => {
          const div = document.createElement('div');
          div.textContent = user.name;
          return div;
        },
      });
      
      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('Alice');
    });
  });

  describe('Show<T> Runtime', () => {
    it('passes truthy value to children callback', async () => {
      const user = signal<{ name: string } | null>({ name: 'Alice' });
      let receivedValue: { name: string } | undefined;
      
      const node = Show({
        when: user,
        children: (value) => {
          receivedValue = value;
          return document.createElement('div');
        },
      });
      
      container.appendChild(node);
      await tick();
      
      expect(receivedValue).toBeDefined();
      expect(receivedValue?.name).toBe('Alice');
    });

    it('does NOT call children when value is null', async () => {
      const user = signal<{ name: string } | null>(null);
      let childrenCalled = false;
      
      const node = Show({
        when: user,
        children: () => {
          childrenCalled = true;
          return document.createElement('div');
        },
      });
      
      container.appendChild(node);
      await tick();
      
      expect(childrenCalled).toBe(false);
    });

    it('does NOT call children when value is undefined', async () => {
      const value = signal<string | undefined>(undefined);
      let childrenCalled = false;
      
      const node = Show({
        when: value,
        children: () => {
          childrenCalled = true;
          return document.createElement('div');
        },
      });
      
      container.appendChild(node);
      await tick();
      
      expect(childrenCalled).toBe(false);
    });

    it('does NOT call children when value is false', async () => {
      const flag = signal(false);
      let childrenCalled = false;
      
      const node = Show({
        when: flag,
        children: () => {
          childrenCalled = true;
          return document.createElement('div');
        },
      });
      
      container.appendChild(node);
      await tick();
      
      expect(childrenCalled).toBe(false);
    });

    it('does NOT call children when value is 0', async () => {
      const count = signal(0);
      let childrenCalled = false;
      
      const node = Show({
        when: count,
        children: () => {
          childrenCalled = true;
          return document.createElement('div');
        },
      });
      
      container.appendChild(node);
      await tick();
      
      expect(childrenCalled).toBe(false);
    });

    it('does NOT call children when value is empty string', async () => {
      const text = signal('');
      let childrenCalled = false;
      
      const node = Show({
        when: text,
        children: () => {
          childrenCalled = true;
          return document.createElement('div');
        },
      });
      
      container.appendChild(node);
      await tick();
      
      expect(childrenCalled).toBe(false);
    });

    it('calls children with new value when signal updates', async () => {
      const user = signal<{ name: string } | null>(null);
      const receivedValues: Array<{ name: string }> = [];
      
      const node = Show({
        when: user,
        children: (value) => {
          receivedValues.push(value);
          return document.createElement('div');
        },
      });
      
      container.appendChild(node);
      await tick();
      expect(receivedValues).toHaveLength(0);
      
      user.set({ name: 'Alice' });
      await tick();
      expect(receivedValues).toHaveLength(1);
      expect(receivedValues[0]?.name).toBe('Alice');
      
      user.set({ name: 'Bob' });
      await tick();
      expect(receivedValues).toHaveLength(2);
      expect(receivedValues[1]?.name).toBe('Bob');
    });

    it('renders fallback when value is falsy', async () => {
      const user = signal<{ name: string } | null>(null);
      let fallbackRendered = false;
      
      const node = Show({
        when: user,
        children: () => document.createElement('div'),
        fallback: () => {
          fallbackRendered = true;
          return document.createTextNode('No user');
        },
      });
      
      container.appendChild(node);
      await tick();
      
      expect(fallbackRendered).toBe(true);
      expect(container.textContent).toBe('No user');
    });

    it('swaps from fallback to children when value becomes truthy', async () => {
      const user = signal<{ name: string } | null>(null);
      
      const node = Show({
        when: user,
        children: (u) => document.createTextNode(`Hello ${u.name}`),
        fallback: () => document.createTextNode('No user'),
      });
      
      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('No user');
      
      user.set({ name: 'Alice' });
      await tick();
      expect(container.textContent).toBe('Hello Alice');
    });

    it('swaps from children to fallback when value becomes falsy', async () => {
      const user = signal<{ name: string } | null>({ name: 'Alice' });
      
      const node = Show({
        when: user,
        children: (u) => document.createTextNode(`Hello ${u.name}`),
        fallback: () => document.createTextNode('No user'),
      });
      
      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('Hello Alice');
      
      user.set(null);
      await tick();
      expect(container.textContent).toBe('No user');
    });
  });

  describe('Switch/Match Runtime', () => {
    it('uses Match helper correctly', async () => {
      const status = signal<'a' | 'b' | 'c'>('a');
      
      const node = Switch({
        children: [
          Match({ when: () => status() === 'a', children: () => document.createTextNode('A') }),
          Match({ when: () => status() === 'b', children: () => document.createTextNode('B') }),
          Match({ when: () => status() === 'c', children: () => document.createTextNode('C') }),
        ],
      });
      
      container.appendChild(node);
      await tick();
      expect(container.textContent).toBe('A');
      
      status.set('b');
      await tick();
      expect(container.textContent).toBe('B');
      
      status.set('c');
      await tick();
      expect(container.textContent).toBe('C');
    });
  });
});
