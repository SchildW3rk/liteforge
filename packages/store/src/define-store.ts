/**
 * LiteForge defineStore
 *
 * Creates a reactive store with state (Signals), getters (Computed-like),
 * and actions (functions that modify state).
 */

import {
  signal,
  effect,
  emitStoreCreate,
  emitStoreStateChange,
  emitStoreAction,
} from '@liteforge/core';
import type { Signal } from '@liteforge/core';
import type {
  StoreDefinition,
  Store,
  StoreInternal,
  SignalifiedState,
  StateDefinition,
  GettersDefinition,
  ActionsDefinition,
  UseFn,
  WatchCallback,
  OnChangeCallback,
  WidenedState,
} from './types.js';
import { storeRegistry } from './registry.js';

// ============================================================================
// defineStore Implementation
// ============================================================================

/**
 * Create a reactive store from a definition.
 *
 * @param name - Unique store name
 * @param definition - Store definition with state, getters, and actions
 * @returns A store object with reactive state, getters, and actions
 *
 * @example
 * ```ts
 * const userStore = defineStore('users', {
 *   state: {
 *     currentUser: null as User | null,
 *     loading: false,
 *   },
 *   getters: (state) => ({
 *     isLoggedIn: () => state.currentUser() !== null,
 *   }),
 *   actions: (state, use) => ({
 *     async login(email: string, password: string) {
 *       state.loading.set(true);
 *       const api = use('api');
 *       state.currentUser.set(await api.login(email, password));
 *       state.loading.set(false);
 *     },
 *   }),
 * });
 * ```
 */
export function defineStore<
  S extends StateDefinition,
  G extends GettersDefinition = Record<string, never>,
  A extends ActionsDefinition = Record<string, never>,
>(
  name: string,
  definition: StoreDefinition<S, G, A>
): Store<S, G, A> {
  // Check if store already exists (singleton semantics)
  const existing = storeRegistry.get<S, G, A>(name);
  if (existing) {
    return existing;
  }

  // Store the initial state for reset functionality
  // Cast to WidenedState<S> - this is the type widening boundary
  // After this point, all state values use widened types
  const initialState = deepClone(definition.state) as WidenedState<S>;

  // Convert state to signals with debug hooks
  const signalState = createSignalifiedStateWithDebug(name, definition.state);

  // Track if context is connected
  let contextUseFn: UseFn | null = null;

  // Create a use function that throws if not connected
  const use: UseFn = <T = unknown>(key: string): T => {
    if (!contextUseFn) {
      throw new Error(
        `Store "${name}" is not connected to an app context. ` +
        `Make sure to register it in createApp({ stores: [...] }) ` +
        `before calling actions that use context.`
      );
    }
    return contextUseFn<T>(key);
  };

  // Create getters (if defined)
  const getters: G = definition.getters 
    ? definition.getters(signalState) 
    : ({} as G);

  // Create actions with debug hooks (if defined)
  const rawActions: A = definition.actions 
    ? definition.actions(signalState, use) 
    : ({} as A);
  
  // Wrap actions with debug emit
  const actions = wrapActionsWithDebug(name, rawActions);

  // Track onChange listeners
  const onChangeListeners = new Set<OnChangeCallback>();

  // Track watch listeners per key
  const watchListeners = new Map<keyof S, Set<WatchCallback<unknown>>>();

  // ========================================
  // Internal Methods
  // ========================================

  function $watch<K extends keyof S>(key: K, callback: WatchCallback<S[K]>): () => void {
    // Get or create listener set for this key
    let listeners = watchListeners.get(key);
    if (!listeners) {
      listeners = new Set();
      watchListeners.set(key, listeners);
    }

    listeners.add(callback as WatchCallback<unknown>);

    // Set up effect to watch this key
    // signalState[key]() returns Widen<S[K]>, which is what the callback expects
    let previousValue = signalState[key]();
    let isFirstRun = true;

    const cleanup = effect(() => {
      const currentValue = signalState[key]();
      
      if (!isFirstRun && currentValue !== previousValue) {
        callback(currentValue, previousValue);
      }
      
      previousValue = currentValue;
      isFirstRun = false;
    });

    return () => {
      listeners?.delete(callback as WatchCallback<unknown>);
      cleanup();
    };
  }

  function $onChange(callback: OnChangeCallback): () => void {
    onChangeListeners.add(callback);

    // Set up effects to watch all keys
    const cleanups: Array<() => void> = [];

    for (const key of Object.keys(signalState) as Array<keyof S>) {
      let previousValue: unknown = signalState[key]();
      let isFirstRun = true;

      const cleanup = effect(() => {
        const currentValue = signalState[key]();

        if (!isFirstRun && currentValue !== previousValue) {
          callback(key as string, currentValue, previousValue);
        }

        previousValue = currentValue;
        isFirstRun = false;
      });

      cleanups.push(cleanup);
    }

    return () => {
      onChangeListeners.delete(callback);
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }

  function $reset(): void {
    // Restore each state property to its initial value
    // initialState is already WidenedState<S>, so types match naturally
    for (const key of Object.keys(initialState) as Array<keyof S>) {
      const initialValue = deepClone(initialState[key]);
      signalState[key].set(initialValue);
    }
  }

  function $snapshot(): WidenedState<S> {
    const result = {} as WidenedState<S>;
    for (const key of Object.keys(signalState) as Array<keyof S>) {
      result[key] = deepClone(signalState[key]());
    }
    return result;
  }

  function $restore(snapshot: Record<string, unknown>): void {
    // Restore state from a snapshot (used for time-travel debugging)
    // Only restore keys that exist in our state definition
    for (const key of Object.keys(signalState) as Array<keyof S>) {
      if (key in snapshot) {
        const value = deepClone(snapshot[key as string]);
        // Safe: We trust snapshot data from time-travel debugging
        // The signal.set() accepts Widen<S[K]>, and value came from a prior state
        (signalState[key].set as (v: unknown) => void)(value);
      }
    }
  }

  function $connectContext(useFn: UseFn): void {
    contextUseFn = useFn;
  }

  function $getState(): SignalifiedState<S> {
    return signalState;
  }

  function $getInitialState(): WidenedState<S> {
    return deepClone(initialState);
  }

  function $getActionNames(): string[] {
    return Object.keys(actions);
  }

  function $getGetterNames(): string[] {
    return Object.keys(getters);
  }

  // ========================================
  // Build Store Object
  // ========================================

  // Combine everything into the store object
  // We use a carefully constructed object that matches Store<S, G, A>
  const store: Store<S, G, A> = {
    // Metadata ($ prefix to avoid collisions with user state/getters/actions)
    $name: name,

    // State (spread signals)
    ...signalState,

    // Getters
    ...getters,

    // Actions
    ...actions,

    // Internal methods
    $watch,
    $onChange,
    $reset,
    $snapshot,
    $restore,
    $connectContext,
    $getState,
    $getInitialState,
    $getActionNames,
    $getGetterNames,
  } as Store<S, G, A>;

  // Emit store:create event (zero cost if debug not enabled)
  emitStoreCreate(name, $snapshot() as Record<string, unknown>);

  // Register in the global registry
  // Cast to StoreInternal for registry (it only needs the internal methods)
  storeRegistry.register(name, store as unknown as StoreInternal<S, G, A>);

  return store;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a state definition object into signalified state with debug hooks.
 * Each signal's setter is wrapped to emit store:stateChange events.
 */
function createSignalifiedStateWithDebug<S extends StateDefinition>(
  storeName: string,
  state: S
): SignalifiedState<S> {
  const result = {} as SignalifiedState<S>;

  for (const key of Object.keys(state) as Array<keyof S>) {
    // Create the base signal with a debug label
    const baseSignal = signal(state[key], { 
      label: `${storeName}.${String(key)}` 
    });

    // Wrap the set method to emit storeStateChange
    const originalSet = baseSignal.set.bind(baseSignal);
    const wrappedSet = (newValue: S[typeof key]): void => {
      const oldValue = baseSignal.peek();
      
      // Emit state change event before setting (zero cost if debug not enabled)
      if (!Object.is(oldValue, newValue)) {
        emitStoreStateChange(storeName, String(key), oldValue, newValue);
      }
      
      originalSet(newValue);
    };

    // Create wrapped signal
    const wrappedSignal = Object.assign(
      () => baseSignal(),
      {
        set: wrappedSet,
        update: (fn: (current: S[typeof key]) => S[typeof key]) => {
          wrappedSet(fn(baseSignal.peek()));
        },
        peek: () => baseSignal.peek(),
        __debugId: baseSignal.__debugId,
        __debugLabel: baseSignal.__debugLabel,
      }
    ) as Signal<S[typeof key]>;

    result[key] = wrappedSignal as SignalifiedState<S>[typeof key];
  }

  return result;
}

/**
 * Wrap actions to emit store:action events.
 */
function wrapActionsWithDebug<A extends ActionsDefinition>(
  storeName: string,
  actions: A
): A {
  const wrapped = {} as A;

  for (const actionName of Object.keys(actions)) {
    const originalAction = actions[actionName];
    
    if (typeof originalAction === 'function') {
      // Wrap the action to emit events
      const wrappedAction = (...args: unknown[]): unknown => {
        // Emit action event (zero cost if debug not enabled)
        emitStoreAction(storeName, actionName, args);
        
        // Call original action
        return (originalAction as (...args: unknown[]) => unknown)(...args);
      };
      
      (wrapped as Record<string, unknown>)[actionName] = wrappedAction;
    } else {
      (wrapped as Record<string, unknown>)[actionName] = originalAction;
    }
  }

  return wrapped;
}

/**
 * Deep clone a value to ensure initial state is preserved.
 */
function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => deepClone(item)) as T;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }

  if (value instanceof Map) {
    const result = new Map();
    for (const [k, v] of value) {
      result.set(deepClone(k), deepClone(v));
    }
    return result as T;
  }

  if (value instanceof Set) {
    const result = new Set();
    for (const v of value) {
      result.add(deepClone(v));
    }
    return result as T;
  }

  // Plain object
  const result = {} as T;
  for (const key of Object.keys(value) as Array<keyof T>) {
    result[key] = deepClone(value[key]);
  }
  return result;
}
