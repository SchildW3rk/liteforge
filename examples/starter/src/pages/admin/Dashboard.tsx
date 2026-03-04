/**
 * Admin Dashboard Page
 * 
 * Admin-only dashboard with system stats.
 * 
 * Demonstrates:
 * - Async data loading in nested route
 * - Store registry inspection
 */

import { createComponent, For } from 'liteforge';
import { storeRegistry } from 'liteforge/store';

// =============================================================================
// Types
// =============================================================================

interface SystemStats {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  uptime: string;
}

interface StatDisplay {
  label: string;
  value: number | string;
  unit: string;
  isText?: boolean;
  color: string;
}

// =============================================================================
// Mock API
// =============================================================================

async function fetchSystemStats(): Promise<SystemStats> {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  return {
    cpuUsage: Math.round(Math.random() * 40 + 20),
    memoryUsage: Math.round(Math.random() * 30 + 50),
    activeConnections: Math.round(Math.random() * 100 + 50),
    uptime: '14d 3h 22m',
  };
}

// =============================================================================
// Component
// =============================================================================

export const AdminDashboard = createComponent({
  name: 'AdminDashboard',
  async load() {
    const stats = await fetchSystemStats();
    return { stats };
  },

  placeholder() {
    return (
      <div class="admin-dashboard loading">
        <div class="loading-spinner" />
      </div>
    );
  },

  error({ error, retry }) {
    return (
      <div class="admin-dashboard error">
        <p>Error: {error.message}</p>
        <button type="button" onClick={retry}>Retry</button>
      </div>
    );
  },

  component({ data }) {
    const { stats } = data;

    const statsData: StatDisplay[] = [
      { label: 'CPU Usage', value: stats.cpuUsage, unit: '%', color: stats.cpuUsage > 70 ? 'warning' : 'normal' },
      { label: 'Memory Usage', value: stats.memoryUsage, unit: '%', color: stats.memoryUsage > 80 ? 'warning' : 'normal' },
      { label: 'Active Connections', value: stats.activeConnections, unit: '', color: 'normal' },
      { label: 'Uptime', value: stats.uptime, unit: '', isText: true, color: 'normal' },
    ];

    return (
      <div class="admin-dashboard">
        <h2>System Overview</h2>
        
        <div class="system-stats">
          {For({
            each: () => statsData,
            children: (stat) => (
              <div class="stat-card">
                <span class="stat-label">{stat.label}</span>
                {!stat.isText && typeof stat.value === 'number' ? (
                  <div class="progress">
                    <div class={`bar ${stat.color}`} style={`width: ${stat.value}%`} />
                  </div>
                ) : null}
                <span class="value">{`${stat.value}${stat.unit}`}</span>
              </div>
            ),
          })}
        </div>
        
        <section class="store-info">
          <h3>Store Registry (Debug)</h3>
          <p>{`Registered stores: ${storeRegistry.list().join(', ')}`}</p>
          <button 
            type="button"
            class="btn"
            onClick={() => {
              console.log('[Admin] Store Registry Snapshot:');
              console.log(JSON.stringify(storeRegistry.snapshot(), null, 2));
            }}
          >
            Log Full Snapshot
          </button>
        </section>
      </div>
    );
  },
});
