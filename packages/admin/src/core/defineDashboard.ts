import type { DashboardConfig } from '../types.js';

export function defineDashboard(config: DashboardConfig): DashboardConfig {
  return Object.freeze(config);
}
