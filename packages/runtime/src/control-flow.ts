/**
 * LiteForge Control Flow Components
 *
 * Components for conditional rendering and list iteration.
 * These handle DOM insertion/removal reactively based on signals.
 */

import { effect } from '@liteforge/core';
import type { ComponentInstance, ComponentFactory, ComponentFactoryInternal, RenderFunction } from './types.js';
import { isComponentFactory } from './component.js';
import { getContextSnapshot, withContext } from './context.js';

// ============================================================================
// Type Discrimination Helper
// ============================================================================

/**
 * Discriminated union for dynamic component types.
 * Helps TypeScript properly narrow between RenderFunction and ComponentFactory.
 */
type DynamicComponentDiscriminator<P extends Record<string, unknown>> =
  | { kind: 'factory'; value: ComponentFactory<P> }
  | { kind: 'render'; value: RenderFunction }
  | { kind: 'null' };

/**
 * Discriminate a dynamic component value into a tagged union.
 * This helps TypeScript narrow types that can't be narrowed with type guards alone.
 */
function discriminateDynamicComponent<P extends Record<string, unknown>>(
  comp: RenderFunction | ComponentFactory<P> | null
): DynamicComponentDiscriminator<P> {
  if (comp === null) {
    return { kind: 'null' };
  }
  if (isComponentFactory(comp)) {
    // Safe cast: isComponentFactory checks for __liteforge_component
    return { kind: 'factory', value: comp as ComponentFactory<P> };
  }
  // If it's not null and not a ComponentFactory, it must be a RenderFunction
  return { kind: 'render', value: comp as RenderFunction };
}

// ============================================================================
// Show Component
// ============================================================================

/**
 * Config for Show component (internal use).
 * Use ShowProps<T> from types.ts for external typing.
 */
export interface ShowConfig<T = unknown> {
  when: (() => T) | T;
  fallback?: () => Node;
  children: (value: NonNullable<T>) => Node;
}

/**
 * Conditionally render children based on a condition.
 * When the condition is truthy, the truthy value is passed to the children callback.
 * 
 * @typeParam T - The type returned by the `when` getter
 *
 * @example
 * ```ts
 * // Boolean condition
 * Show({
 *   when: () => isLoggedIn(),
 *   fallback: () => document.createTextNode('Please log in'),
 *   children: () => createWelcomeMessage(),
 * })
 * 
 * // Value-based condition with type narrowing
 * Show({
 *   when: () => currentUser(),  // User | null
 *   children: (user) => (       // user is User, guaranteed non-null
 *     <h1>{user.name}</h1>
 *   ),
 * })
 * ```
 */
// Debug counter for Show instances
let showInstanceId = 0;

export function Show<T>(config: ShowConfig<T>): Node {
  const { when, fallback, children } = config;

  if (typeof children !== 'function') {
    console.error(
      '[LiteForge] Show: `children` must be a render function `(value) => Node`, ' +
      'but received a ' + typeof children + '. ' +
      'Wrap your JSX children in an arrow function: ' +
      '<Show when={...}>{() => <YourComponent />}</Show>'
    );
  }

  // Create a marker comment for positioning
  const instanceId = ++showInstanceId;
  const marker = document.createComment(`Show:${instanceId}`);
  let currentNode: Node | null = null;
  let lastValue: T | undefined;
  let hasRendered = false;

  // Resolve the condition to a function.
  // Handles two cases:
  //   when: signal           → vite-plugin compiles to () => signal, getValue returns signal fn
  //   when: () => signal()   → getValue returns boolean/value directly
  // If the result is itself a function (i.e. a signal was passed through a getter),
  // call it once more to get the actual value.
  const getValue = (): T => {
    let val: T = typeof when === 'function' ? (when as () => T)() : when;
    if (typeof val === 'function') val = (val as () => T)();
    return val;
  };

  // Update content based on condition
  function updateContent(): void {
    const parentElement = marker.parentNode as Element;
    if (!parentElement) return;

    const value = getValue();
    
    // Value unchanged (by reference) → nothing to do
    // This handles: same primitive (boolean true/false/null), same object reference
    // Prevents re-rendering when isAdmin() returns same boolean but effect re-runs
    if (hasRendered && Object.is(value, lastValue)) {
      return;
    }
    
    lastValue = value;
    hasRendered = true;

    // Remove old node if it exists
    if (currentNode && currentNode.parentNode) {
      currentNode.parentNode.removeChild(currentNode);
      currentNode = null;
    }

    // Create and insert new node
    const isTruthy = Boolean(value);
    const newNode = isTruthy 
      ? children(value as NonNullable<T>) 
      : fallback?.() ?? null;

    if (newNode) {
      parentElement.insertBefore(newNode, marker.nextSibling);
      currentNode = newNode;
    }
  }

  // Set up reactive effect for updates
  effect(() => {
    // Read the value to track dependencies
    getValue();

    if (marker.isConnected) {
      // Marker already in DOM — update synchronously
      updateContent();
    } else {
      // Marker not in DOM yet (Show() called before _insert) — defer one frame.
      // Use isConnected (not parentNode) so the RAF is a no-op if the router
      // has already unmounted the outlet before the frame fires.
      requestAnimationFrame(() => {
        if (marker.isConnected) {
          updateContent();
        }
      });
    }
  });

  return marker;
}

// ============================================================================
// For Component
// ============================================================================

import { signal } from '@liteforge/core';
import type { Signal } from '@liteforge/core';

/**
 * Config for For component.
 * children receives plain values — the Vite plugin transforms item.x to () => item().x
 * at compile time. Internally, For still uses signal-backed getters for performance.
 */
export interface ForConfig<T> {
  each: (() => ReadonlyArray<T>) | (() => T[]) | ReadonlyArray<T> | T[];
  key?: keyof T | ((item: T, index: number) => string | number);
  children: (item: T, index: number) => Node;
  fallback?: () => Node;
}

/**
 * Internal config used by For() after wrapping children params into getters.
 */
interface ForConfigInternal<T> {
  each: (() => ReadonlyArray<T>) | (() => T[]) | ReadonlyArray<T> | T[];
  key?: keyof T | ((item: T, index: number) => string | number);
  children: (item: () => T, index: () => number) => Node;
  fallback?: () => Node;
}

/**
 * Internal structure for tracking each rendered item in the For list.
 */
interface MappedItem<T> {
  /** The stable key for this item */
  key: unknown;
  /** The rendered DOM node for this item */
  node: Node;
  /** Signal holding the current item value (updated in place on reorder) */
  itemSignal: Signal<T>;
  /** Signal holding the current index */
  indexSignal: Signal<number>;
  /** Cleanup function (disposes effects, signals created for this item) */
  dispose: () => void;
}

// Dev mode warning for duplicate keys
const isDev = typeof globalThis !== 'undefined' && (globalThis as Record<string, unknown>).__DEV__ !== false;

/**
 * Detect if two key arrays differ only by a single swap of two elements.
 * Returns the two swapped indices, or null if it's not a simple swap.
 */
function detectSwap(oldKeys: unknown[], newKeys: unknown[]): [number, number] | null {
  if (oldKeys.length !== newKeys.length) return null;

  let diff1 = -1;
  let diff2 = -1;
  let diffCount = 0;

  for (let i = 0; i < oldKeys.length; i++) {
    if (oldKeys[i] !== newKeys[i]) {
      if (diffCount === 0) diff1 = i;
      else if (diffCount === 1) diff2 = i;
      else return null; // more than 2 differences — not a swap
      diffCount++;
    }
  }

  if (diffCount !== 2) return null;
  // Verify it's actually a swap (not two replacements)
  if (oldKeys[diff1] !== newKeys[diff2] || oldKeys[diff2] !== newKeys[diff1]) return null;

  return [diff1, diff2];
}

/**
 * Swap two DOM nodes in place using minimal DOM operations.
 * Handles adjacent nodes as a special case (2 ops instead of 3).
 */
function swapDomNodes(parent: Node, nodeA: Node, nodeB: Node): void {
  const afterB = nodeB.nextSibling;

  if (nodeA.nextSibling === nodeB) {
    // Adjacent: A immediately before B — one insertBefore suffices
    parent.insertBefore(nodeB, nodeA);
  } else if (afterB === nodeA) {
    // Adjacent: B immediately before A
    parent.insertBefore(nodeA, nodeB);
  } else {
    // General case: use a placeholder comment to avoid double-insert
    const placeholder = document.createComment('');
    parent.insertBefore(placeholder, nodeA);
    parent.insertBefore(nodeA, afterB);
    parent.replaceChild(nodeB, placeholder);
  }
}

/**
 * Render a list of items with keyed reconciliation.
 * 
 * When items reorder, DOM nodes are moved (not destroyed/recreated).
 * When item data changes, the item signal is updated and reactive bindings auto-update.
 * 
 * @typeParam T - The item type, inferred from the `each` array
 *
 * @example
 * ```ts
 * For({
 *   each: () => users(),
 *   key: (user) => user.id,
 *   children: (user, index) => {
 *     // user() and index() are getters - read them inside reactive contexts
 *     return <div>{() => `${index()}: ${user().name}`}</div>;
 *   },
 *   fallback: () => <div>No users</div>,
 * })
 * ```
 */
export function For<T>(config: ForConfig<T>): Node {
  const { each, key: keyProp, fallback } = config;
  // The Vite plugin transforms children body at compile time so that property
  // accesses on `item` become reactive getter calls (item.name → item().name).
  // At runtime, we pass getters so the rendered DOM updates in-place on reorder.
  // We cast here because the compiled children are compatible with the getter signature.
  const children = config.children as unknown as ForConfigInternal<T>['children'];

  // Capture the current context snapshot synchronously (during component render).
  // reconcile() and createMappedItem() run asynchronously (MutationObserver / effect),
  // at which point the context stack has already been popped. We restore it when
  // calling children() so that use('router') and other context lookups work correctly.
  const capturedContext = getContextSnapshot();

  // Create markers for positioning
  const startMarker = document.createComment('For:start');
  const endMarker = document.createComment('For:end');
  
  // Current mappings: key -> MappedItem
  let mappings = new Map<unknown, MappedItem<T>>();
  
  let fallbackNode: Node | null = null;
  let isInitialized = false;

  // Resolve the list to a function
  const getList = (): ReadonlyArray<T> => {
    if (typeof each === 'function') {
      return (each as () => ReadonlyArray<T>)();
    }
    return each;
  };

  // Get key for an item
  const getKey = (item: T, index: number): unknown => {
    if (keyProp === undefined) {
      // Without explicit key, use referential identity for objects
      // or value+index for primitives
      if (typeof item === 'object' && item !== null) {
        return item; // Use object reference as key
      }
      // For primitives, combine with index to handle duplicates
      return `__idx_${index}_${String(item)}`;
    }
    if (typeof keyProp === 'function') {
      return keyProp(item, index);
    }
    // keyProp is keyof T
    return item[keyProp];
  };

  // Remove fallback node if present
  function removeFallback(): void {
    if (fallbackNode && fallbackNode.parentNode) {
      fallbackNode.parentNode.removeChild(fallbackNode);
      fallbackNode = null;
    }
  }

  // Create a new MappedItem for an item
  function createMappedItem(item: T, index: number, itemKey: unknown): MappedItem<T> {
    // Create signals for this item
    const itemSignal = signal(item);
    const indexSignal = signal(index);
    
    // Track cleanup functions
    const cleanupFns: (() => void)[] = [];
    
    // Create a disposal context
    const dispose = () => {
      for (const fn of cleanupFns) {
        try {
          fn();
        } catch (e) {
          console.error('Error during For item cleanup:', e);
        }
      }
      cleanupFns.length = 0;
    };
    
    // Render the children with getters, restoring the captured context so that
    // use('router') and other context lookups work inside children callbacks
    // even though createMappedItem runs asynchronously (MutationObserver / effect).
    const node = withContext(capturedContext, () => children(
      () => itemSignal(),
      () => indexSignal()
    ));
    
    return {
      key: itemKey,
      node,
      itemSignal,
      indexSignal,
      dispose,
    };
  }

  // Reconcile the list
  function reconcile(): void {
    const parentElement = startMarker.parentNode as Element;
    if (!parentElement) return;

    const list = getList();

    // Handle empty list with fallback
    if (list.length === 0) {
      // Remove all existing items
      for (const mapping of mappings.values()) {
        if (mapping.node.parentNode) {
          mapping.node.parentNode.removeChild(mapping.node);
        }
        mapping.dispose();
      }
      mappings.clear();

      // Show fallback if provided
      if (fallback && !fallbackNode) {
        fallbackNode = fallback();
        parentElement.insertBefore(fallbackNode, endMarker);
      }
      return;
    }

    // Remove fallback if list has items
    removeFallback();

    // Build new key list and detect duplicates
    const newKeys: unknown[] = [];
    const seenKeys = new Set<unknown>();
    const duplicateKeys = new Set<unknown>();
    
    for (let i = 0; i < list.length; i++) {
      const item = list[i] as T;
      const itemKey = getKey(item, i);
      
      if (seenKeys.has(itemKey)) {
        duplicateKeys.add(itemKey);
        if (isDev) {
          console.warn(
            `For(): Duplicate key detected: ${String(itemKey)}. ` +
            `Each item should have a unique key for proper reconciliation.`
          );
        }
      }
      seenKeys.add(itemKey);
      newKeys.push(itemKey);
    }

    // Track which old mappings are still needed
    const claimedKeys = new Set<unknown>();
    const newMappings = new Map<unknown, MappedItem<T>>();

    // Process each new item
    for (let i = 0; i < list.length; i++) {
      const item = list[i] as T;
      const itemKey = newKeys[i]!;
      
      // Handle duplicate keys: only reuse the first occurrence
      const canReuse = !claimedKeys.has(itemKey) && mappings.has(itemKey);
      
      if (canReuse) {
        // REUSE: existing mapping
        const existing = mappings.get(itemKey)!;
        claimedKeys.add(itemKey);
        
        // Update signals with new values (this triggers reactive updates)
        existing.itemSignal.set(item);
        existing.indexSignal.set(i);
        
        newMappings.set(itemKey, existing);
      } else {
        // CREATE: new mapping
        const mapping = createMappedItem(item, i, itemKey);
        newMappings.set(itemKey, mapping);
      }
    }

    // REMOVE: dispose items no longer in the list
    for (const [oldKey, oldMapping] of mappings) {
      if (!claimedKeys.has(oldKey)) {
        if (oldMapping.node.parentNode) {
          oldMapping.node.parentNode.removeChild(oldMapping.node);
        }
        oldMapping.dispose();
      }
    }

    // Build the old key order (before signal updates changed mappings)
    // We need the previous DOM order to detect swaps
    const oldKeys: unknown[] = [];
    for (const key of mappings.keys()) {
      oldKeys.push(key);
    }

    // SWAP FAST PATH: detect pure two-element swap — only 2-3 DOM ops
    const noNewItems = newKeys.every(k => mappings.has(k));
    const noRemovedItems = oldKeys.every(k => newMappings.has(k));
    if (noNewItems && noRemovedItems && duplicateKeys.size === 0) {
      const swap = detectSwap(oldKeys, newKeys);
      if (swap !== null) {
        const [i1, i2] = swap;
        const keyA = newKeys[i1]!;
        const keyB = newKeys[i2]!;
        const nodeA = newMappings.get(keyA)!.node;
        const nodeB = newMappings.get(keyB)!.node;
        swapDomNodes(parentElement, nodeA, nodeB);
        mappings = newMappings;
        return;
      }
    }

    // REORDER: general case — position nodes correctly using insertBefore.
    // insertBefore on an already-attached node implicitly removes it first (1 op, not 2).
    let insertBeforeNode: Node = endMarker;

    for (let i = newKeys.length - 1; i >= 0; i--) {
      const itemKey = newKeys[i]!;
      const mapping = newMappings.get(itemKey)!;
      const node = mapping.node;

      if (node.nextSibling !== insertBeforeNode || node.parentNode !== parentElement) {
        parentElement.insertBefore(node, insertBeforeNode);
      }

      insertBeforeNode = node;
    }

    // Update state
    mappings = newMappings;
  }

  // Create a container fragment to hold the markers initially
  const fragment = document.createDocumentFragment();
  fragment.appendChild(startMarker);
  fragment.appendChild(endMarker);

  // Use MutationObserver to detect when markers are added to DOM
  const observer = new MutationObserver(() => {
    if (startMarker.parentNode && !isInitialized) {
      isInitialized = true;
      observer.disconnect();
      reconcile();
    }
  });

  observer.observe(document, { childList: true, subtree: true });

  // Set up reactive effect for updates
  effect(() => {
    // Read the list to track dependencies
    getList();

    // Only update if markers are in DOM
    if (startMarker.parentNode) {
      reconcile();
    }
  });

  // Return the fragment containing both markers
  // When appended to DOM, children will be inserted between the markers
  return fragment;
}

// ============================================================================
// Switch / Match Components
// ============================================================================

/**
 * A single case in a Switch statement.
 */
export interface MatchCase {
  when: (() => boolean) | boolean;
  render: () => Node;
}

/**
 * Config for Switch component (internal use).
 * Use SwitchProps from types.ts for external typing.
 */
export interface SwitchConfig {
  fallback?: () => Node;
  children: Array<MatchCase>;
}

/**
 * Config for Match helper.
 */
export interface MatchConfig {
  when: (() => boolean) | boolean;
  children: () => Node;
}

/**
 * Render the first matching case, or fallback.
 *
 * @example
 * ```ts
 * Switch({
 *   fallback: () => document.createTextNode('Unknown'),
 *   children: [
 *     Match({ when: () => status() === 'loading', children: () => Spinner() }),
 *     Match({ when: () => status() === 'error', children: () => ErrorView() }),
 *     Match({ when: () => status() === 'success', children: () => SuccessView() }),
 *   ],
 * })
 * ```
 */
export function Switch(config: SwitchConfig): Node {
  const { fallback, children } = config;

  const marker = document.createComment('Switch');
  let currentNode: Node | null = null;
  let currentIndex = -1;
  let isInitialized = false;

  function findMatchIndex(): number {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (!child) continue;
      const condition = typeof child.when === 'function' ? child.when() : child.when;
      if (condition) {
        return i;
      }
    }
    return fallback ? -2 : -1; // -2 = fallback, -1 = no match
  }

  function updateSwitch(): void {
    const parentElement = marker.parentNode as Element;
    if (!parentElement) return;

    const matchedIndex = findMatchIndex();

    // Only update if the matched case changed
    if (matchedIndex !== currentIndex) {
      // Remove old node
      if (currentNode && currentNode.parentNode) {
        currentNode.parentNode.removeChild(currentNode);
        currentNode = null;
      }

      // Insert new node
      let render: (() => Node) | undefined;
      if (matchedIndex >= 0) {
        render = children[matchedIndex]?.render;
      } else if (matchedIndex === -2) {
        render = fallback;
      }

      if (render) {
        currentNode = render();
        parentElement.insertBefore(currentNode, marker.nextSibling);
      }

      currentIndex = matchedIndex;
    }
  }

  // Use MutationObserver to detect when marker is added to DOM
  const observer = new MutationObserver(() => {
    if (marker.parentNode && !isInitialized) {
      isInitialized = true;
      observer.disconnect();
      updateSwitch();
    }
  });

  observer.observe(document, { childList: true, subtree: true });

  // Set up reactive effect
  effect(() => {
    // Read all conditions to track dependencies
    for (const child of children) {
      if (typeof child.when === 'function') {
        child.when();
      }
    }

    if (marker.parentNode) {
      updateSwitch();
    }
  });

  return marker;
}

/**
 * Helper to create a Match case for Switch.
 * 
 * @example
 * ```ts
 * Match({
 *   when: () => status() === 'active',
 *   children: () => <span>Active</span>,
 * })
 * ```
 */
export function Match(config: MatchConfig): MatchCase {
  if (typeof config.children !== 'function') {
    console.error(
      '[LiteForge] Match: `children` must be a render function `() => Node`, ' +
      'but received a ' + typeof config.children + '. ' +
      'Wrap your JSX children in an arrow function: ' +
      '<Match when={...}>{() => <YourComponent />}</Match>'
    );
  }
  return { when: config.when, render: config.children };
}

// ============================================================================
// Dynamic Component
// ============================================================================

/**
 * Configuration for the Dynamic component.
 * The component prop is a getter that returns either:
 * - RenderFunction: A simple () => Node function
 * - ComponentFactory: A LiteForge component from createComponent()
 * - null: No component to render
 */
export interface DynamicConfig<P extends Record<string, unknown>> {
  component: () => RenderFunction | ComponentFactory<P> | null;
  props?: P | (() => P);
}

/**
 * Dynamically render a component based on a signal.
 *
 * @example
 * ```ts
 * Dynamic({
 *   component: () => currentView(),
 *   props: () => ({ id: currentId() }),
 * })
 * ```
 */
export function Dynamic<P extends Record<string, unknown>>(config: DynamicConfig<P>): Node {
  const { component, props } = config;

  const marker = document.createComment('Dynamic');
  let currentNode: Node | null = null;
  let currentComponent: RenderFunction | ComponentFactory<P> | null = null;
  let currentInstance: ComponentInstance | null = null;
  let isInitialized = false;

  const getComponent = (): RenderFunction | ComponentFactory<P> | null => {
    return component();
  };

  const getProps = (): P => {
    if (typeof props === 'function') {
      return props();
    }
    return (props ?? {}) as P;
  };

  function updateDynamic(): void {
    const parentElement = marker.parentNode as Element;
    if (!parentElement) return;

    const comp = getComponent();
    const currentProps = getProps();

    // Check if component changed
    if (comp !== currentComponent) {
      // Unmount old component/remove old node
      if (currentInstance) {
        currentInstance.unmount();
        currentInstance = null;
      }
      if (currentNode && currentNode.parentNode) {
        currentNode.parentNode.removeChild(currentNode);
        currentNode = null;
      }

      // Mount new component using discriminated union for proper type narrowing
      const discriminated = discriminateDynamicComponent(comp);

      if (discriminated.kind === 'factory') {
        currentInstance = (discriminated.value as unknown as ComponentFactoryInternal)(currentProps);
        // Create a temporary container to get the node
        const tempContainer = document.createElement('div');
        currentInstance.mount(tempContainer);
        const node = tempContainer.firstChild;
        if (node) {
          tempContainer.removeChild(node);
          parentElement.insertBefore(node, marker.nextSibling);
          currentNode = node;
        }
      } else if (discriminated.kind === 'render') {
        currentNode = discriminated.value();
        if (currentNode) {
          parentElement.insertBefore(currentNode, marker.nextSibling);
        }
      }
      // kind === 'null' means no component to mount

      currentComponent = comp;
    } else if (currentInstance) {
      // Same component, just update props
      currentInstance.updateProps(currentProps);
    }
  }

  // Use MutationObserver to detect when marker is added to DOM
  const observer = new MutationObserver(() => {
    if (marker.parentNode && !isInitialized) {
      isInitialized = true;
      observer.disconnect();
      updateDynamic();
    }
  });

  observer.observe(document, { childList: true, subtree: true });

  // Set up reactive effect
  effect(() => {
    // Read to track dependencies
    getComponent();
    getProps();

    if (marker.parentNode) {
      updateDynamic();
    }
  });

  return marker;
}
