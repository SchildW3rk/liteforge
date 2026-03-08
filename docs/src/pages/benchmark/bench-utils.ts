/**
 * Benchmark timing utilities
 * Pure functions - no DOM manipulation
 */

export interface BenchResult {
  label: string;
  timeMs: number;
  opsPerSec?: number;
  extra?: string;
}

/**
 * Synchronously measure execution time of a function
 */
export function measure(label: string, fn: () => void, ops?: number): BenchResult {
  const start = performance.now();
  fn();
  const timeMs = performance.now() - start;
  const result: BenchResult = { label, timeMs };
  if (ops !== undefined) {
    result.opsPerSec = calcOpsPerSec(timeMs, ops);
  }
  return result;
}

/**
 * Asynchronously measure execution time of a function
 */
export async function measureAsync(label: string, fn: () => Promise<void>, ops?: number): Promise<BenchResult> {
  const start = performance.now();
  await fn();
  const timeMs = performance.now() - start;
  const result: BenchResult = { label, timeMs };
  if (ops !== undefined) {
    result.opsPerSec = calcOpsPerSec(timeMs, ops);
  }
  return result;
}

/**
 * Format milliseconds to human-readable string
 */
export function formatMs(ms: number): string {
  if (ms < 0.001) {
    return `${(ms * 1_000_000).toFixed(2)}ns`;
  }
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}us`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Calculate operations per second
 */
export function calcOpsPerSec(timeMs: number, ops: number): number {
  if (timeMs === 0) return Infinity;
  return Math.round(ops / (timeMs / 1000));
}

/**
 * Format large numbers with locale separators
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/**
 * Format ops/sec to human-readable string
 */
export function formatOps(ops: number): string {
  if (ops >= 1_000_000_000) {
    return `${(ops / 1_000_000_000).toFixed(2)}B ops/s`;
  }
  if (ops >= 1_000_000) {
    return `${(ops / 1_000_000).toFixed(2)}M ops/s`;
  }
  if (ops >= 1_000) {
    return `${(ops / 1_000).toFixed(2)}K ops/s`;
  }
  return `${ops} ops/s`;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (!isFinite(bytes)) return '—';
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Shuffle array in place (Fisher-Yates)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i] as T;
    result[i] = result[j] as T;
    result[j] = temp;
  }
  return result;
}

/**
 * Generate a unique ID
 */
let idCounter = 0;
export function uniqueId(): number {
  return ++idCounter;
}

/**
 * Reset the ID counter (for tests)
 */
export function resetIdCounter(): void {
  idCounter = 0;
}

/**
 * Delay for a given number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Request animation frame as promise
 */
export function nextFrame(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

/**
 * Wait for multiple animation frames to ensure DOM is settled
 */
export async function waitFrames(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await nextFrame();
  }
}

export type BenchStatus = 'idle' | 'running' | 'complete' | 'error';

/**
 * Summary entry reported by each benchmark when it completes.
 */
export interface BenchSummary {
  /** Human-readable result (e.g. "2M ops/s" or "100% reuse") */
  result: string;
  /** Whether the benchmark passed its own acceptance criteria */
  status: 'pass' | 'fail';
}
