/**
 * Store Debug Hooks Tests
 *
 * Tests for debug event emission from stores and time-travel functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  enableDebug,
  disableDebug,
  effect,
  computed,
  resetDebugIdCounter,
} from '@liteforge/core';
import type {
  DebugBus,
  StoreCreatePayload,
  StoreStateChangePayload,
  StoreActionPayload,
} from '@liteforge/core';
import { defineStore, storeRegistry } from '../src/index.js';

describe('Store Debug Hooks', () => {
  let bus: DebugBus;

  beforeEach(() => {
    storeRegistry.clear();
    disableDebug();
    resetDebugIdCounter();
    bus = enableDebug();
  });

  afterEach(() => {
    storeRegistry.clear();
    disableDebug();
  });

  // ==========================================================================
  // store:create event
  // ==========================================================================

  describe('store:create event', () => {
    it('emits store:create when store is defined', () => {
      const events: StoreCreatePayload[] = [];
      bus.on('store:create', (payload) => events.push(payload));

      defineStore('users', {
        state: {
          list: [] as string[],
          loading: false,
        },
      });

      expect(events).toHaveLength(1);
      expect(events[0]!.id).toBe('users');
      expect(events[0]!.initialState).toEqual({
        list: [],
        loading: false,
      });
      expect(events[0]!.timestamp).toBeGreaterThan(0);
    });

    it('emits store:create with complex initial state', () => {
      const events: StoreCreatePayload[] = [];
      bus.on('store:create', (payload) => events.push(payload));

      defineStore('settings', {
        state: {
          theme: 'dark',
          notifications: { email: true, push: false },
          tags: ['a', 'b', 'c'],
        },
      });

      expect(events[0]!.initialState).toEqual({
        theme: 'dark',
        notifications: { email: true, push: false },
        tags: ['a', 'b', 'c'],
      });
    });

    it('emits unique store IDs for multiple stores', () => {
      const events: StoreCreatePayload[] = [];
      bus.on('store:create', (payload) => events.push(payload));

      defineStore('store-a', { state: { value: 1 } });
      defineStore('store-b', { state: { value: 2 } });
      defineStore('store-c', { state: { value: 3 } });

      expect(events).toHaveLength(3);
      expect(events[0]!.id).toBe('store-a');
      expect(events[1]!.id).toBe('store-b');
      expect(events[2]!.id).toBe('store-c');
    });
  });

  // ==========================================================================
  // store:stateChange event
  // ==========================================================================

  describe('store:stateChange event', () => {
    it('emits store:stateChange when signal value changes', () => {
      const events: StoreStateChangePayload[] = [];
      bus.on('store:stateChange', (payload) => events.push(payload));

      const store = defineStore('counter', {
        state: { count: 0 },
      });

      store.count.set(5);

      expect(events).toHaveLength(1);
      expect(events[0]!.storeId).toBe('counter');
      expect(events[0]!.key).toBe('count');
      expect(events[0]!.oldValue).toBe(0);
      expect(events[0]!.newValue).toBe(5);
    });

    it('emits store:stateChange for each property change', () => {
      const events: StoreStateChangePayload[] = [];
      bus.on('store:stateChange', (payload) => events.push(payload));

      const store = defineStore('multi', {
        state: {
          name: 'initial',
          age: 0,
          active: false,
        },
      });

      store.name.set('updated');
      store.age.set(25);
      store.active.set(true);

      expect(events).toHaveLength(3);
      expect(events[0]).toMatchObject({ key: 'name', oldValue: 'initial', newValue: 'updated' });
      expect(events[1]).toMatchObject({ key: 'age', oldValue: 0, newValue: 25 });
      expect(events[2]).toMatchObject({ key: 'active', oldValue: false, newValue: true });
    });

    it('does not emit store:stateChange when value is unchanged', () => {
      const events: StoreStateChangePayload[] = [];
      bus.on('store:stateChange', (payload) => events.push(payload));

      const store = defineStore('unchanged', {
        state: { value: 42 },
      });

      store.value.set(42); // Same value

      expect(events).toHaveLength(0);
    });

    it('emits store:stateChange with object values', () => {
      const events: StoreStateChangePayload[] = [];
      bus.on('store:stateChange', (payload) => events.push(payload));

      const store = defineStore('objects', {
        state: {
          user: { name: 'Alice', id: 1 },
        },
      });

      store.user.set({ name: 'Bob', id: 2 });

      expect(events).toHaveLength(1);
      expect(events[0]!.oldValue).toEqual({ name: 'Alice', id: 1 });
      expect(events[0]!.newValue).toEqual({ name: 'Bob', id: 2 });
    });

    it('emits store:stateChange with .update() calls', () => {
      const events: StoreStateChangePayload[] = [];
      bus.on('store:stateChange', (payload) => events.push(payload));

      const store = defineStore('update-fn', {
        state: { count: 10 },
      });

      store.count.update(n => n + 5);

      expect(events).toHaveLength(1);
      expect(events[0]!.oldValue).toBe(10);
      expect(events[0]!.newValue).toBe(15);
    });
  });

  // ==========================================================================
  // store:action event
  // ==========================================================================

  describe('store:action event', () => {
    it('emits store:action when action is called', () => {
      const events: StoreActionPayload[] = [];
      bus.on('store:action', (payload) => events.push(payload));

      const store = defineStore('actions', {
        state: { count: 0 },
        actions: (state) => ({
          increment() {
            state.count.update(n => n + 1);
          },
        }),
      });

      store.increment();

      expect(events).toHaveLength(1);
      expect(events[0]!.storeId).toBe('actions');
      expect(events[0]!.action).toBe('increment');
      expect(events[0]!.args).toEqual([]);
    });

    it('captures action arguments', () => {
      const events: StoreActionPayload[] = [];
      bus.on('store:action', (payload) => events.push(payload));

      const store = defineStore('with-args', {
        state: { items: [] as string[] },
        actions: (state) => ({
          addItem(item: string, _priority: number) {
            state.items.update(arr => [...arr, item]);
          },
        }),
      });

      store.addItem('test-item', 5);

      expect(events).toHaveLength(1);
      expect(events[0]!.action).toBe('addItem');
      expect(events[0]!.args).toEqual(['test-item', 5]);
    });

    it('emits store:action for async actions', async () => {
      const events: StoreActionPayload[] = [];
      bus.on('store:action', (payload) => events.push(payload));

      const store = defineStore('async-actions', {
        state: { data: null as string | null },
        actions: (state) => ({
          async fetchData(id: number) {
            await Promise.resolve();
            state.data.set(`data-${id}`);
          },
        }),
      });

      await store.fetchData(123);

      expect(events).toHaveLength(1);
      expect(events[0]!.action).toBe('fetchData');
      expect(events[0]!.args).toEqual([123]);
    });

    it('emits store:action before state changes', () => {
      const order: string[] = [];

      bus.on('store:action', () => order.push('action'));
      bus.on('store:stateChange', () => order.push('stateChange'));

      const store = defineStore('order-test', {
        state: { value: 0 },
        actions: (state) => ({
          setValue(v: number) {
            state.value.set(v);
          },
        }),
      });

      store.setValue(42);

      expect(order).toEqual(['action', 'stateChange']);
    });
  });

  // ==========================================================================
  // $snapshot and $restore
  // ==========================================================================

  describe('$snapshot', () => {
    it('returns a plain object copy of state', () => {
      const store = defineStore('snapshot-basic', {
        state: {
          name: 'test',
          count: 42,
          items: [1, 2, 3],
        },
      });

      const snapshot = store.$snapshot();

      expect(snapshot).toEqual({
        name: 'test',
        count: 42,
        items: [1, 2, 3],
      });
    });

    it('snapshot is a deep clone (mutations do not affect store)', () => {
      const store = defineStore('snapshot-clone', {
        state: {
          nested: { value: 'original' },
          array: [1, 2, 3],
        },
      });

      const snapshot = store.$snapshot();
      snapshot.nested.value = 'mutated';
      snapshot.array.push(4);

      expect(store.nested().value).toBe('original');
      expect(store.array()).toEqual([1, 2, 3]);
    });
  });

  describe('$restore', () => {
    it('restores all state values from snapshot', () => {
      const store = defineStore('restore-basic', {
        state: {
          name: 'initial',
          count: 0,
          active: false,
        },
      });

      store.name.set('changed');
      store.count.set(100);
      store.active.set(true);

      store.$restore({
        name: 'restored',
        count: 42,
        active: false,
      });

      expect(store.name()).toBe('restored');
      expect(store.count()).toBe(42);
      expect(store.active()).toBe(false);
    });

    it('emits store:stateChange for each restored property', () => {
      const events: StoreStateChangePayload[] = [];
      bus.on('store:stateChange', (payload) => events.push(payload));

      const store = defineStore('restore-events', {
        state: {
          a: 1,
          b: 2,
          c: 3,
        },
      });

      // Clear initial events
      events.length = 0;

      store.$restore({ a: 10, b: 20, c: 30 });

      expect(events).toHaveLength(3);
      expect(events.map(e => e.key).sort()).toEqual(['a', 'b', 'c']);
    });

    it('does not emit stateChange for unchanged values during restore', () => {
      const events: StoreStateChangePayload[] = [];
      bus.on('store:stateChange', (payload) => events.push(payload));

      const store = defineStore('restore-unchanged', {
        state: { a: 1, b: 2 },
      });

      events.length = 0;

      // Restore with same values
      store.$restore({ a: 1, b: 2 });

      expect(events).toHaveLength(0);
    });

    it('restores nested objects correctly', () => {
      const store = defineStore('restore-nested', {
        state: {
          user: { name: 'Alice', settings: { theme: 'light' } },
        },
      });

      store.user.set({ name: 'Bob', settings: { theme: 'dark' } });

      store.$restore({
        user: { name: 'Charlie', settings: { theme: 'system' } },
      });

      expect(store.user()).toEqual({
        name: 'Charlie',
        settings: { theme: 'system' },
      });
    });
  });

  // ==========================================================================
  // Time-Travel Roundtrip
  // ==========================================================================

  describe('Time-Travel Roundtrip', () => {
    it('full roundtrip: snapshot → mutate → restore → verify', () => {
      const store = defineStore('time-travel', {
        state: {
          count: 0,
          name: 'initial',
          items: [] as string[],
        },
      });

      // Step 1: Take initial snapshot
      const snapshot1 = store.$snapshot();
      expect(snapshot1).toEqual({ count: 0, name: 'initial', items: [] });

      // Step 2: Mutate state 3 times
      store.count.set(10);
      store.name.set('modified');
      store.items.set(['a', 'b', 'c']);

      // Step 3: Take second snapshot
      const snapshot2 = store.$snapshot();
      expect(snapshot2).toEqual({ count: 10, name: 'modified', items: ['a', 'b', 'c'] });

      // Step 4: Restore to snapshot1
      store.$restore(snapshot1);
      expect(store.count()).toBe(0);
      expect(store.name()).toBe('initial');
      expect(store.items()).toEqual([]);

      // Step 5: Restore to snapshot2
      store.$restore(snapshot2);
      expect(store.count()).toBe(10);
      expect(store.name()).toBe('modified');
      expect(store.items()).toEqual(['a', 'b', 'c']);
    });

    it('effects react to restored state', () => {
      const store = defineStore('time-travel-effects', {
        state: { value: 0 },
      });

      const effectLog: number[] = [];
      const dispose = effect(() => {
        effectLog.push(store.value());
      });

      // Effect runs on creation
      expect(effectLog).toEqual([0]);

      // Take snapshot
      const snapshot = store.$snapshot();

      // Mutate
      store.value.set(42);
      expect(effectLog).toEqual([0, 42]);

      // Restore
      store.$restore(snapshot);
      expect(effectLog).toEqual([0, 42, 0]);

      dispose();
    });

    it('computed values update after restore', () => {
      const store = defineStore('time-travel-computed', {
        state: {
          price: 100,
          quantity: 2,
        },
      });

      const total = computed(() => store.price() * store.quantity());

      expect(total()).toBe(200);

      // Take snapshot
      const snapshot = store.$snapshot();

      // Mutate
      store.price.set(50);
      store.quantity.set(10);
      expect(total()).toBe(500);

      // Restore
      store.$restore(snapshot);
      expect(total()).toBe(200);
    });

    it('multiple restore cycles work correctly', () => {
      const store = defineStore('multi-restore', {
        state: { step: 0 },
      });

      const snapshots: Array<{ step: number }> = [];

      // Create 5 snapshots
      for (let i = 0; i < 5; i++) {
        store.step.set(i);
        snapshots.push(store.$snapshot());
      }

      // Restore in reverse order
      for (let i = 4; i >= 0; i--) {
        store.$restore(snapshots[i]!);
        expect(store.step()).toBe(i);
      }

      // Restore in forward order
      for (let i = 0; i < 5; i++) {
        store.$restore(snapshots[i]!);
        expect(store.step()).toBe(i);
      }
    });

    it('getters update after restore', () => {
      const store = defineStore('time-travel-getters', {
        state: {
          firstName: 'John',
          lastName: 'Doe',
        },
        getters: (state) => ({
          fullName: () => `${state.firstName()} ${state.lastName()}`,
        }),
      });

      expect(store.fullName()).toBe('John Doe');

      const snapshot = store.$snapshot();

      store.firstName.set('Jane');
      store.lastName.set('Smith');
      expect(store.fullName()).toBe('Jane Smith');

      store.$restore(snapshot);
      expect(store.fullName()).toBe('John Doe');
    });

    it('effects with multiple dependencies react to partial restore', () => {
      const store = defineStore('partial-deps', {
        state: {
          a: 1,
          b: 2,
          c: 3,
        },
      });

      const log: string[] = [];
      const dispose = effect(() => {
        log.push(`a=${store.a()}, b=${store.b()}`);
      });

      expect(log).toEqual(['a=1, b=2']);

      store.a.set(10);
      expect(log).toEqual(['a=1, b=2', 'a=10, b=2']);

      const snapshot = store.$snapshot();

      store.a.set(100);
      store.b.set(200);
      expect(log).toEqual(['a=1, b=2', 'a=10, b=2', 'a=100, b=2', 'a=100, b=200']);

      // Restore - should trigger effect once or twice depending on batching
      store.$restore(snapshot);
      const lastEntry = log[log.length - 1];
      expect(lastEntry).toBe('a=10, b=2');

      dispose();
    });
  });

  // ==========================================================================
  // Zero-cost when debug disabled
  // ==========================================================================

  describe('Zero-cost when debug disabled', () => {
    it('no store:create event when debug is disabled', () => {
      disableDebug();

      // This should not throw even without a bus
      const store = defineStore('no-debug', {
        state: { value: 0 },
      });

      expect(store.value()).toBe(0);
    });

    it('no store:stateChange event when debug is disabled', () => {
      const store = defineStore('before-disable', {
        state: { count: 0 },
      });

      disableDebug();

      // Should work without errors
      store.count.set(100);
      expect(store.count()).toBe(100);
    });

    it('no store:action event when debug is disabled', () => {
      const store = defineStore('actions-no-debug', {
        state: { value: 0 },
        actions: (state) => ({
          increment() {
            state.value.update(n => n + 1);
          },
        }),
      });

      disableDebug();

      // Should work without errors
      store.increment();
      expect(store.value()).toBe(1);
    });

    it('$snapshot and $restore work without debug enabled', () => {
      const store = defineStore('snapshot-no-debug', {
        state: { value: 42 },
      });

      disableDebug();

      const snapshot = store.$snapshot();
      store.value.set(100);
      store.$restore(snapshot);

      expect(store.value()).toBe(42);
    });
  });

  // ==========================================================================
  // Edge cases
  // ==========================================================================

  describe('Edge cases', () => {
    it('handles null values in state', () => {
      const store = defineStore('null-state', {
        state: {
          user: null as { name: string } | null,
        },
      });

      const snapshot1 = store.$snapshot();
      expect(snapshot1.user).toBeNull();

      store.user.set({ name: 'Alice' });
      const snapshot2 = store.$snapshot();

      store.$restore(snapshot1);
      expect(store.user()).toBeNull();

      store.$restore(snapshot2);
      expect(store.user()).toEqual({ name: 'Alice' });
    });

    it('handles undefined values in state', () => {
      const store = defineStore('undefined-state', {
        state: {
          optional: undefined as string | undefined,
        },
      });

      const snapshot = store.$snapshot();
      store.optional.set('defined');
      store.$restore(snapshot);

      expect(store.optional()).toBeUndefined();
    });

    it('handles Date objects in state', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-06-15');

      const store = defineStore('date-state', {
        state: {
          created: date1,
        },
      });

      const snapshot = store.$snapshot();
      store.created.set(date2);

      store.$restore(snapshot);
      expect(store.created().getTime()).toBe(date1.getTime());
    });

    it('handles empty arrays and objects', () => {
      const store = defineStore('empty-collections', {
        state: {
          arr: [] as number[],
          obj: {} as Record<string, number>,
        },
      });

      const emptySnapshot = store.$snapshot();

      store.arr.set([1, 2, 3]);
      store.obj.set({ a: 1, b: 2 });

      store.$restore(emptySnapshot);

      expect(store.arr()).toEqual([]);
      expect(store.obj()).toEqual({});
    });
  });
});
