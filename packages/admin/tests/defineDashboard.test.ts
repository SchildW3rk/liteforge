import { describe, it, expect } from 'vitest';
import { defineDashboard } from '../src/core/defineDashboard.js';
import type { DashboardConfig } from '../src/types.js';

describe('defineDashboard', () => {
  it('returns the config passed in', () => {
    const config: DashboardConfig = { widgets: [] };
    const result = defineDashboard(config);
    expect(result.widgets).toEqual([]);
  });

  it('freezes the returned config', () => {
    const config: DashboardConfig = { widgets: [] };
    const result = defineDashboard(config);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('preserves count widgets', () => {
    const config: DashboardConfig = {
      widgets: [{ type: 'count', label: 'Total Posts' }],
    };
    const result = defineDashboard(config);
    expect(result.widgets).toHaveLength(1);
    expect(result.widgets[0].type).toBe('count');
    expect(result.widgets[0].label).toBe('Total Posts');
  });

  it('preserves list widgets with limit', () => {
    const config: DashboardConfig = {
      widgets: [{ type: 'list', label: 'Recent Posts', limit: 5 }],
    };
    const result = defineDashboard(config);
    expect(result.widgets[0].limit).toBe(5);
  });

  it('preserves custom widgets with render fn', () => {
    const renderFn = () => document.createElement('div');
    const config: DashboardConfig = {
      widgets: [{ type: 'custom', label: 'Custom', render: renderFn }],
    };
    const result = defineDashboard(config);
    expect(result.widgets[0].render).toBe(renderFn);
  });

  it('preserves multiple widgets', () => {
    const config: DashboardConfig = {
      widgets: [
        { type: 'count', label: 'Posts' },
        { type: 'list', label: 'Recent Users' },
        { type: 'custom', label: 'Chart', render: () => document.createElement('div') },
      ],
    };
    const result = defineDashboard(config);
    expect(result.widgets).toHaveLength(3);
  });

  it('widgets array reference is the same as input', () => {
    const widgets: DashboardConfig['widgets'] = [{ type: 'count', label: 'X' }];
    const config: DashboardConfig = { widgets };
    const result = defineDashboard(config);
    expect(result.widgets).toBe(widgets);
  });
});
