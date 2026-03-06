import { signal } from '@liteforge/core';
import type { ActivityEntry } from '../types.js';

export const activityLog = signal<ActivityEntry[]>([]);
let _logEndpoint: string | undefined;

export function configureActivityLog(options: { logEndpoint?: string }): void {
  _logEndpoint = options.logEndpoint;
}

export function logActivity(entry: Omit<ActivityEntry, 'id' | 'timestamp'>): void {
  const full: ActivityEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date(),
  };
  activityLog.update(log => [full, ...log].slice(0, 200));
  if (_logEndpoint) {
    void fetch(_logEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(full),
    }).catch(() => {});
  }
}

export function clearActivityLog(): void {
  activityLog.set([]);
}
