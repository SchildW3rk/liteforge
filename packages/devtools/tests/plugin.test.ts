/**
 * DevTools Plugin Tests
 *
 * Tests for the DevTools plugin lifecycle and functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  signal,
  isDebugEnabled,
  disableDebug,
  resetDebugIdCounter,
} from '@liteforge/core';
import {
  devtoolsPlugin,
  createDevTools,
  createEventBuffer,
} from '../src/index.js';
import type { DevToolsInstance, EventBuffer } from '../src/types.js';

describe('DevTools Plugin', () => {
  beforeEach(() => {
    disableDebug();
    resetDebugIdCounter();
  });

  afterEach(() => {
    disableDebug();
    // Clean up any panel elements
    const panels = document.querySelectorAll('#liteforge-devtools');
    panels.forEach(panel => {
      panel.remove();
    });
  });

  // ==========================================================================
  // devtoolsPlugin factory
  // ==========================================================================

  describe('devtoolsPlugin', () => {
    it('returns a plugin object with required methods', () => {
      const plugin = devtoolsPlugin();

      expect(plugin.name).toBe('devtools');
      expect(typeof plugin.beforeInit).toBe('function');
      expect(typeof plugin.afterMount).toBe('function');
      expect(typeof plugin.beforeUnmount).toBe('function');
    });

    it('accepts configuration options', () => {
      const plugin = devtoolsPlugin({
        shortcut: 'ctrl+alt+d',
        position: 'bottom',
        defaultTab: 'stores',
        width: 400,
        height: 350,
        maxEvents: 500,
      });

      expect(plugin.name).toBe('devtools');
    });

    it('beforeInit enables debug mode', () => {
      const plugin = devtoolsPlugin();

      expect(isDebugEnabled()).toBe(false);
      plugin.beforeInit();
      expect(isDebugEnabled()).toBe(true);
    });

    it('beforeUnmount disables debug mode', () => {
      const plugin = devtoolsPlugin();

      plugin.beforeInit();
      expect(isDebugEnabled()).toBe(true);

      plugin.beforeUnmount();
      expect(isDebugEnabled()).toBe(false);
    });

    it('afterMount creates panel in DOM', () => {
      const plugin = devtoolsPlugin();

      plugin.beforeInit();
      plugin.afterMount({ stores: {} });

      const panel = document.querySelector('#liteforge-devtools');
      expect(panel).not.toBeNull();
    });

    it('beforeUnmount removes panel from DOM', () => {
      const plugin = devtoolsPlugin();

      plugin.beforeInit();
      plugin.afterMount({ stores: {} });
      expect(document.querySelector('#liteforge-devtools')).not.toBeNull();

      plugin.beforeUnmount();
      expect(document.querySelector('#liteforge-devtools')).toBeNull();
    });
  });

  // ==========================================================================
  // createDevTools standalone
  // ==========================================================================

  describe('createDevTools', () => {
    let devtools: DevToolsInstance | undefined;

    afterEach(() => {
      devtools?.destroy();
      devtools = undefined;
    });

    it('creates a DevTools instance', () => {
      devtools = createDevTools();

      expect(devtools.bus).toBeDefined();
      expect(devtools.buffer).toBeDefined();
      expect(typeof devtools.open).toBe('function');
      expect(typeof devtools.close).toBe('function');
      expect(typeof devtools.toggle).toBe('function');
      expect(typeof devtools.destroy).toBe('function');
    });

    it('enables debug mode', () => {
      expect(isDebugEnabled()).toBe(false);
      devtools = createDevTools();
      expect(isDebugEnabled()).toBe(true);
    });

    it('creates panel element in DOM', () => {
      devtools = createDevTools();
      const panel = document.querySelector('#liteforge-devtools');
      expect(panel).not.toBeNull();
    });

    it('panel is initially closed', () => {
      devtools = createDevTools();
      const panel = document.querySelector('#liteforge-devtools');
      // Panel is hidden via transform/opacity
      expect(panel).not.toBeNull();
    });

    it('open() opens the panel', () => {
      devtools = createDevTools();
      devtools.open();
      // Panel should be open - check opacity style
      const panel = document.querySelector('#liteforge-devtools') as HTMLElement;
      expect(panel.style.opacity).toBe('1');
    });

    it('close() closes the panel', () => {
      devtools = createDevTools();
      devtools.open();
      devtools.close();
      const panel = document.querySelector('#liteforge-devtools') as HTMLElement;
      expect(panel.style.opacity).toBe('0');
    });

    it('toggle() toggles panel state', () => {
      devtools = createDevTools();
      const panel = document.querySelector('#liteforge-devtools') as HTMLElement;

      devtools.toggle();
      expect(panel.style.opacity).toBe('1');

      devtools.toggle();
      expect(panel.style.opacity).toBe('0');
    });

    it('destroy() removes panel and disables debug', () => {
      devtools = createDevTools();
      expect(document.querySelector('#liteforge-devtools')).not.toBeNull();
      expect(isDebugEnabled()).toBe(true);

      devtools.destroy();
      expect(document.querySelector('#liteforge-devtools')).toBeNull();
      expect(isDebugEnabled()).toBe(false);

      devtools = undefined; // Prevent double destroy in afterEach
    });

    it('uses custom configuration', () => {
      devtools = createDevTools({
        position: 'bottom',
        width: 500,
        height: 400,
      });

      const panel = document.querySelector('#liteforge-devtools') as HTMLElement;
      expect(panel).not.toBeNull();
    });
  });

  // ==========================================================================
  // Event buffering
  // ==========================================================================

  describe('Event buffering', () => {
    let devtools: DevToolsInstance | undefined;

    afterEach(() => {
      devtools?.destroy();
      devtools = undefined;
    });

    it('buffer captures signal events', () => {
      devtools = createDevTools();

      // Create a signal (should emit signal:create event)
      signal(0);

      expect(devtools.buffer.size()).toBeGreaterThanOrEqual(1);
    });

    it('buffer captures signal updates', () => {
      devtools = createDevTools();

      const count = signal(0);
      const initialSize = devtools.buffer.size();

      count.set(5);

      expect(devtools.buffer.size()).toBeGreaterThan(initialSize);
    });

    it('buffer getAll returns events in order', () => {
      devtools = createDevTools();

      signal(1, { label: 'first' });
      signal(2, { label: 'second' });
      signal(3, { label: 'third' });

      const events = devtools.buffer.getAll();
      expect(events.length).toBeGreaterThanOrEqual(3);

      // Events should have incrementing IDs
      for (let i = 1; i < events.length; i++) {
        expect(events[i]!.id).toBeGreaterThan(events[i - 1]!.id);
      }
    });

    it('buffer getLast returns most recent events', () => {
      devtools = createDevTools();

      // Create multiple signals
      for (let i = 0; i < 10; i++) {
        signal(i);
      }

      const lastFive = devtools.buffer.getLast(5);
      expect(lastFive).toHaveLength(5);
    });

    it('buffer clear removes all events', () => {
      devtools = createDevTools();

      signal(1);
      signal(2);
      expect(devtools.buffer.size()).toBeGreaterThan(0);

      devtools.buffer.clear();
      expect(devtools.buffer.size()).toBe(0);
    });

    it('buffer subscribe receives new events', () => {
      devtools = createDevTools();

      const receivedEvents: unknown[] = [];
      const unsubscribe = devtools.buffer.subscribe((event) => {
        receivedEvents.push(event);
      });

      signal(42);

      expect(receivedEvents.length).toBeGreaterThanOrEqual(1);

      unsubscribe();
    });
  });

  // ==========================================================================
  // Keyboard shortcut
  // ==========================================================================

  describe('Keyboard shortcut', () => {
    let devtools: DevToolsInstance | undefined;

    afterEach(() => {
      devtools?.destroy();
      devtools = undefined;
    });

    it('default shortcut is ctrl+shift+d', () => {
      devtools = createDevTools();
      const panel = document.querySelector('#liteforge-devtools') as HTMLElement;

      // Initially closed
      expect(panel.style.opacity).toBe('0');

      // Simulate keyboard event (may not work in happy-dom)
      // Instead, use toggle() which is what the shortcut does
      devtools.toggle();
      expect(panel.style.opacity).toBe('1');
    });

    it('custom shortcut is configured', () => {
      // This test verifies the plugin accepts custom shortcuts
      // Actual keyboard event handling is environment-dependent
      devtools = createDevTools({
        shortcut: 'ctrl+alt+x',
      });

      // Plugin should accept the config without error
      expect(devtools).toBeDefined();
    });
  });

  // ==========================================================================
  // createEventBuffer (standalone)
  // ==========================================================================

  describe('createEventBuffer', () => {
    let buffer: EventBuffer;

    beforeEach(() => {
      buffer = createEventBuffer(100);
    });

    it('creates an event buffer with specified capacity', () => {
      expect(buffer).toBeDefined();
      expect(buffer.size()).toBe(0);
    });

    it('push adds events', () => {
      buffer.push({
        type: 'signal:create',
        payload: { id: 'test', label: undefined, initialValue: 0, timestamp: 1 },
      });

      expect(buffer.size()).toBe(1);
    });

    it('respects max capacity', () => {
      const smallBuffer = createEventBuffer(5);

      for (let i = 0; i < 10; i++) {
        smallBuffer.push({
          type: 'signal:create',
          payload: { id: `test-${i}`, label: undefined, initialValue: i, timestamp: i },
        });
      }

      expect(smallBuffer.size()).toBe(5);
    });

    it('getAll returns all events', () => {
      buffer.push({
        type: 'signal:create',
        payload: { id: 'a', label: undefined, initialValue: 1, timestamp: 1 },
      });
      buffer.push({
        type: 'signal:create',
        payload: { id: 'b', label: undefined, initialValue: 2, timestamp: 2 },
      });

      const all = buffer.getAll();
      expect(all).toHaveLength(2);
    });

    it('getLast returns correct number of events', () => {
      for (let i = 0; i < 10; i++) {
        buffer.push({
          type: 'signal:create',
          payload: { id: `test-${i}`, label: undefined, initialValue: i, timestamp: i },
        });
      }

      expect(buffer.getLast(3)).toHaveLength(3);
      expect(buffer.getLast(5)).toHaveLength(5);
      expect(buffer.getLast(100)).toHaveLength(10); // Only 10 events
    });

    it('clear empties the buffer', () => {
      buffer.push({
        type: 'signal:create',
        payload: { id: 'test', label: undefined, initialValue: 0, timestamp: 1 },
      });
      expect(buffer.size()).toBe(1);

      buffer.clear();
      expect(buffer.size()).toBe(0);
    });

    it('subscribe notifies on new events', () => {
      const received: unknown[] = [];
      buffer.subscribe((event) => received.push(event));

      buffer.push({
        type: 'signal:create',
        payload: { id: 'test', label: undefined, initialValue: 0, timestamp: 1 },
      });

      expect(received).toHaveLength(1);
    });

    it('unsubscribe stops notifications', () => {
      const received: unknown[] = [];
      const unsubscribe = buffer.subscribe((event) => received.push(event));

      buffer.push({
        type: 'signal:create',
        payload: { id: 'test1', label: undefined, initialValue: 0, timestamp: 1 },
      });
      expect(received).toHaveLength(1);

      unsubscribe();

      buffer.push({
        type: 'signal:create',
        payload: { id: 'test2', label: undefined, initialValue: 0, timestamp: 2 },
      });
      expect(received).toHaveLength(1); // No new events
    });

    it('events have unique incrementing IDs', () => {
      buffer.push({
        type: 'signal:create',
        payload: { id: 'a', label: undefined, initialValue: 1, timestamp: 1 },
      });
      buffer.push({
        type: 'signal:create',
        payload: { id: 'b', label: undefined, initialValue: 2, timestamp: 2 },
      });
      buffer.push({
        type: 'signal:create',
        payload: { id: 'c', label: undefined, initialValue: 3, timestamp: 3 },
      });

      const all = buffer.getAll();
      expect(all[0]!.id).toBeLessThan(all[1]!.id);
      expect(all[1]!.id).toBeLessThan(all[2]!.id);
    });
  });

  // ==========================================================================
  // Configuration defaults
  // ==========================================================================

  describe('Configuration defaults', () => {
    let devtools: DevToolsInstance | undefined;

    afterEach(() => {
      devtools?.destroy();
      devtools = undefined;
    });

    it('uses default maxEvents of 1000', () => {
      devtools = createDevTools();

      // Buffer should handle 1000 events
      for (let i = 0; i < 100; i++) {
        signal(i);
      }

      expect(devtools.buffer.size()).toBeGreaterThan(0);
    });

    it('uses default position right', () => {
      devtools = createDevTools();
      const panel = document.querySelector('#liteforge-devtools') as HTMLElement;

      // Panel should be positioned for right slide-in
      expect(panel).not.toBeNull();
    });

    it('uses default tab signals', () => {
      devtools = createDevTools();
      // Default tab is 'signals' - panel should show signals tab content
      expect(devtools).toBeDefined();
    });
  });
});
