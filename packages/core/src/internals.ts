/**
 * LiteForge Core Internals
 *
 * Shared reactive system state used by signal, effect, computed, and batch.
 * These are internal implementation details and should not be exported publicly.
 */

// ============================================================================
// Types
// ============================================================================

/** A subscriber function that gets called when a signal changes */
export type Subscriber = () => void;

/** Subscriber with priority information */
export interface TaggedSubscriber {
  fn: Subscriber;
  isEffect: boolean;
}

/** An effect or computed that can track dependencies */
export interface Observer {
  /** Execute the observer's function */
  execute: () => void;
  /** Clean up all subscriptions */
  cleanup: () => void;
  /** Set of signals this observer depends on */
  dependencies: Set<Set<TaggedSubscriber>>;
  /** Whether this is an effect (true) or computed (false) */
  isEffect: boolean;
}

// ============================================================================
// Global State
// ============================================================================

/**
 * Stack of currently executing observers.
 * When a signal is read, the top observer (if any) is registered as a subscriber.
 * This enables automatic dependency tracking.
 */
export const observerStack: Observer[] = [];

/**
 * Current batch depth. When > 0, effect notifications are deferred.
 * Supports nested batches - only flushes when depth returns to 0.
 */
export let batchDepth = 0;

/**
 * Whether we're currently flushing pending effects.
 * Used to prevent recursive flushing and to defer effects triggered during flush.
 */
let isFlushing = false;

/**
 * Effects pending execution after the current batch completes.
 * Uses a Set to deduplicate effects that are triggered multiple times.
 */
export const pendingEffects: Set<Subscriber> = new Set();

/**
 * Map from observer to its cleanup functions.
 * Cleanup functions are called before each re-execution and on disposal.
 */
export const cleanupMap: WeakMap<Observer, Set<() => void>> = new WeakMap();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the currently active observer (top of stack).
 */
export function getCurrentObserver(): Observer | undefined {
  return observerStack[observerStack.length - 1];
}

/**
 * Increment batch depth to start batching.
 */
export function startBatch(): void {
  batchDepth++;
}

/**
 * Decrement batch depth and flush pending effects if we're at the outermost batch.
 */
export function endBatch(): void {
  batchDepth--;
  if (batchDepth === 0 && !isFlushing) {
    flushPendingEffects();
  }
}

/**
 * Execute all pending effects and clear the queue.
 * Handles effects that trigger other effects during flush.
 */
export function flushPendingEffects(): void {
  if (isFlushing) return;

  isFlushing = true;
  try {
    // Keep flushing until no more pending effects
    // (effects during flush can add more effects)
    while (pendingEffects.size > 0) {
      const effects = [...pendingEffects];
      pendingEffects.clear();

      // Run all effects — collect errors so a throwing effect doesn't
      // prevent sibling effects from receiving the updated value.
      const errors: unknown[] = [];
      for (const effect of effects) {
        try {
          effect();
        } catch (err) {
          errors.push(err);
        }
      }

      // Re-throw after all effects have had a chance to run.
      if (errors.length === 1) throw errors[0];
      if (errors.length > 1) throw new AggregateError(errors, 'Multiple effects threw');
    }
  } finally {
    isFlushing = false;
  }
}

/**
 * Schedule an effect to run. Always batches to handle diamond dependencies.
 * Effects are deduplicated and run in a single flush.
 */
export function scheduleEffect(effect: Subscriber): void {
  pendingEffects.add(effect);

  // If not in explicit batch and not currently flushing, flush at end of current task
  if (batchDepth === 0 && !isFlushing) {
    flushPendingEffects();
  }
}

/**
 * Notify all subscribers of a signal/computed change.
 * Computeds are notified synchronously (to propagate dirty flag).
 * Effects are scheduled for later execution (batched).
 */
export function notifySubscribers(subscribers: Set<TaggedSubscriber>): void {
  // First, notify all computeds synchronously (propagate dirty)
  for (const sub of [...subscribers]) {
    if (!sub.isEffect) {
      sub.fn();
    }
  }
  // Then, schedule all effects
  for (const sub of [...subscribers]) {
    if (sub.isEffect) {
      scheduleEffect(sub.fn);
    }
  }
}

/**
 * Register a cleanup function for the current observer.
 * Throws if called outside of an effect.
 */
export function registerCleanup(fn: () => void): void {
  const observer = getCurrentObserver();
  if (!observer) {
    throw new Error('onCleanup must be called inside an effect');
  }

  let cleanups = cleanupMap.get(observer);
  if (!cleanups) {
    cleanups = new Set();
    cleanupMap.set(observer, cleanups);
  }
  cleanups.add(fn);
}

/**
 * Run all cleanup functions for an observer.
 */
export function runCleanups(observer: Observer): void {
  const cleanups = cleanupMap.get(observer);
  if (cleanups) {
    for (const cleanup of cleanups) {
      cleanup();
    }
    cleanups.clear();
  }
}
