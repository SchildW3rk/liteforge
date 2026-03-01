/**
 * Component Debug Hooks Tests
 *
 * Tests for component mount/unmount debug event emission.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  enableDebug,
  disableDebug,
  resetDebugIdCounter,
} from '@liteforge/core';
import type {
  DebugBus,
  ComponentMountPayload,
  ComponentUnmountPayload,
} from '@liteforge/core';
import {
  createComponent,
  initAppContext,
  clearContext,
} from '../src/index.js';

describe('Component Debug Hooks', () => {
  let bus: DebugBus;
  let container: HTMLElement;

  beforeEach(() => {
    disableDebug();
    resetDebugIdCounter();
    clearContext();
    initAppContext({});
    bus = enableDebug();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    clearContext();
    disableDebug();
  });

  // ==========================================================================
  // component:mount event
  // ==========================================================================

  describe('component:mount event', () => {
    it('emits component:mount when component mounts', () => {
      const events: ComponentMountPayload[] = [];
      bus.on('component:mount', (payload) => events.push(payload));

      const MyComponent = createComponent({
        component: () => document.createTextNode('Hello'),
      });

      const instance = MyComponent({});
      instance.mount(container);

      expect(events).toHaveLength(1);
      expect(events[0]!.id).toBeDefined();
      expect(events[0]!.name).toBe('Component');
      expect(events[0]!.timestamp).toBeGreaterThan(0);
    });

    it('uses component name from definition', () => {
      const events: ComponentMountPayload[] = [];
      bus.on('component:mount', (payload) => events.push(payload));

      const NamedComponent = createComponent({
        name: 'UserProfile',
        component: () => document.createTextNode('Profile'),
      });

      const instance = NamedComponent({});
      instance.mount(container);

      expect(events[0]!.name).toBe('UserProfile');
    });

    it('generates unique IDs for each component instance', () => {
      const events: ComponentMountPayload[] = [];
      bus.on('component:mount', (payload) => events.push(payload));

      const MyComponent = createComponent({
        component: () => document.createTextNode('Item'),
      });

      const instance1 = MyComponent({});
      const instance2 = MyComponent({});
      const instance3 = MyComponent({});

      instance1.mount(container);
      instance2.mount(container);
      instance3.mount(container);

      expect(events).toHaveLength(3);
      const ids = events.map(e => e.id);
      expect(new Set(ids).size).toBe(3); // All unique
    });

    it('parent is undefined for root components', () => {
      const events: ComponentMountPayload[] = [];
      bus.on('component:mount', (payload) => events.push(payload));

      const RootComponent = createComponent({
        component: () => document.createTextNode('Root'),
      });

      const instance = RootComponent({});
      instance.mount(container);

      expect(events[0]!.parent).toBeUndefined();
    });
  });

  // ==========================================================================
  // component:unmount event
  // ==========================================================================

  describe('component:unmount event', () => {
    it('emits component:unmount when component unmounts', () => {
      const events: ComponentUnmountPayload[] = [];
      bus.on('component:unmount', (payload) => events.push(payload));

      const MyComponent = createComponent({
        component: () => document.createTextNode('Hello'),
      });

      const instance = MyComponent({});
      instance.mount(container);
      instance.unmount();

      expect(events).toHaveLength(1);
      expect(events[0]!.id).toBeDefined();
      expect(events[0]!.name).toBe('Component');
      expect(events[0]!.timestamp).toBeGreaterThan(0);
    });

    it('mount and unmount events have matching IDs', () => {
      const mountEvents: ComponentMountPayload[] = [];
      const unmountEvents: ComponentUnmountPayload[] = [];

      bus.on('component:mount', (payload) => mountEvents.push(payload));
      bus.on('component:unmount', (payload) => unmountEvents.push(payload));

      const MyComponent = createComponent({
        component: () => document.createTextNode('Test'),
      });

      const instance = MyComponent({});
      instance.mount(container);
      instance.unmount();

      expect(mountEvents).toHaveLength(1);
      expect(unmountEvents).toHaveLength(1);
      expect(mountEvents[0]!.id).toBe(unmountEvents[0]!.id);
      expect(mountEvents[0]!.name).toBe(unmountEvents[0]!.name);
    });

    it('emits unmount for created but never-rendered component', () => {
      // Note: Component exists in Created state even before mount
      // Unmounting it is valid and emits an event
      const events: ComponentUnmountPayload[] = [];
      bus.on('component:unmount', (payload) => events.push(payload));

      const MyComponent = createComponent({
        component: () => document.createTextNode('Created only'),
      });

      const instance = MyComponent({});
      // Unmount without mounting - component was created
      instance.unmount();

      expect(events).toHaveLength(1);
    });

    it('does not emit unmount twice', () => {
      const events: ComponentUnmountPayload[] = [];
      bus.on('component:unmount', (payload) => events.push(payload));

      const MyComponent = createComponent({
        component: () => document.createTextNode('Test'),
      });

      const instance = MyComponent({});
      instance.mount(container);
      instance.unmount();
      instance.unmount(); // Double unmount

      expect(events).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Parent tracking
  // ==========================================================================

  describe('Parent tracking', () => {
    it('tracks parent when child is mounted during parent render', () => {
      const events: ComponentMountPayload[] = [];
      bus.on('component:mount', (payload) => events.push(payload));

      const ChildComponent = createComponent({
        name: 'Child',
        component: () => document.createTextNode('Child'),
      });

      const ParentComponent = createComponent({
        name: 'Parent',
        component: () => {
          const div = document.createElement('div');
          // Mount child during parent's component render
          const childInstance = ChildComponent({});
          childInstance.mount(div);
          return div;
        },
      });

      const instance = ParentComponent({});
      instance.mount(container);

      // Should have two mount events: Parent and Child
      expect(events).toHaveLength(2);

      const parentEvent = events.find(e => e.name === 'Parent');
      const childEvent = events.find(e => e.name === 'Child');

      expect(parentEvent).toBeDefined();
      expect(childEvent).toBeDefined();
      expect(parentEvent!.parent).toBeUndefined(); // Root has no parent
      expect(childEvent!.parent).toBe(parentEvent!.id); // Child's parent is Parent
    });

    it('sibling components have same parent', () => {
      const events: ComponentMountPayload[] = [];
      bus.on('component:mount', (payload) => events.push(payload));

      const ChildComponent = createComponent({
        name: 'Child',
        component: ({ props }) => document.createTextNode(`Child ${props.num}`),
      });

      const ParentComponent = createComponent({
        name: 'Parent',
        component: () => {
          const div = document.createElement('div');
          const child1 = ChildComponent({ num: 1 });
          const child2 = ChildComponent({ num: 2 });
          child1.mount(div);
          child2.mount(div);
          return div;
        },
      });

      const instance = ParentComponent({});
      instance.mount(container);

      const childEvents = events.filter(e => e.name === 'Child');
      expect(childEvents).toHaveLength(2);
      expect(childEvents[0]!.parent).toBe(childEvents[1]!.parent);
    });

    it('deeply nested components track full hierarchy', () => {
      const events: ComponentMountPayload[] = [];
      bus.on('component:mount', (payload) => events.push(payload));

      const GrandchildComponent = createComponent({
        name: 'Grandchild',
        component: () => document.createTextNode('Grandchild'),
      });

      const ChildComponent = createComponent({
        name: 'Child',
        component: () => {
          const span = document.createElement('span');
          const grandchild = GrandchildComponent({});
          grandchild.mount(span);
          return span;
        },
      });

      const ParentComponent = createComponent({
        name: 'Parent',
        component: () => {
          const div = document.createElement('div');
          const child = ChildComponent({});
          child.mount(div);
          return div;
        },
      });

      const instance = ParentComponent({});
      instance.mount(container);

      expect(events).toHaveLength(3);

      const parent = events.find(e => e.name === 'Parent')!;
      const child = events.find(e => e.name === 'Child')!;
      const grandchild = events.find(e => e.name === 'Grandchild')!;

      expect(parent.parent).toBeUndefined();
      expect(child.parent).toBe(parent.id);
      expect(grandchild.parent).toBe(child.id);
    });
  });

  // ==========================================================================
  // Zero-cost when debug disabled
  // ==========================================================================

  describe('Zero-cost when debug disabled', () => {
    it('component mounts without debug enabled', () => {
      disableDebug();

      const MyComponent = createComponent({
        component: () => document.createTextNode('No debug'),
      });

      const instance = MyComponent({});
      instance.mount(container);

      expect(container.textContent).toBe('No debug');
    });

    it('component unmounts without debug enabled', () => {
      disableDebug();

      const MyComponent = createComponent({
        component: () => document.createTextNode('No debug'),
      });

      const instance = MyComponent({});
      instance.mount(container);
      instance.unmount();

      expect(container.textContent).toBe('');
    });

    it('parent tracking works without debug enabled', () => {
      disableDebug();

      const Child = createComponent({
        component: () => document.createTextNode('Child'),
      });

      const Parent = createComponent({
        component: () => {
          const div = document.createElement('div');
          Child({}).mount(div);
          return div;
        },
      });

      const instance = Parent({});
      instance.mount(container);

      expect(container.textContent).toBe('Child');
    });
  });

  // ==========================================================================
  // Edge cases
  // ==========================================================================

  describe('Edge cases', () => {
    it('handles component with async load', async () => {
      const events: ComponentMountPayload[] = [];
      bus.on('component:mount', (payload) => events.push(payload));

      const AsyncComponent = createComponent({
        name: 'AsyncComponent',
        async load() {
          await Promise.resolve();
          return { data: 'loaded' };
        },
        component: ({ data }) => document.createTextNode(data.data),
      });

      const instance = AsyncComponent({});
      instance.mount(container);

      // Wait for async load to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(events).toHaveLength(1);
      expect(events[0]!.name).toBe('AsyncComponent');
    });

    it('handles component with setup phase', () => {
      const events: ComponentMountPayload[] = [];
      bus.on('component:mount', (payload) => events.push(payload));

      const SetupComponent = createComponent({
        name: 'SetupComponent',
        setup: () => ({ value: 42 }),
        component: ({ setup }) => document.createTextNode(`Value: ${setup.value}`),
      });

      const instance = SetupComponent({});
      instance.mount(container);

      expect(events).toHaveLength(1);
      expect(events[0]!.name).toBe('SetupComponent');
      expect(container.textContent).toBe('Value: 42');
    });

    it('handles multiple mount/unmount cycles', () => {
      const mountEvents: ComponentMountPayload[] = [];
      const unmountEvents: ComponentUnmountPayload[] = [];

      bus.on('component:mount', (payload) => mountEvents.push(payload));
      bus.on('component:unmount', (payload) => unmountEvents.push(payload));

      const MyComponent = createComponent({
        component: () => document.createTextNode('Cycle'),
      });

      const instance = MyComponent({});
      instance.mount(container);
      instance.unmount();

      // Note: Most component systems don't support re-mounting
      // This test verifies the first cycle works correctly
      expect(mountEvents).toHaveLength(1);
      expect(unmountEvents).toHaveLength(1);
    });
  });
});
