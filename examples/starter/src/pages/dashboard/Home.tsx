/**
 * Dashboard Home Page
 * 
 * Displays dashboard stats with async data loading.
 * 
 * Demonstrates:
 * - Async load() with placeholder and error states
 * - Zero-flicker rendering (component only renders when data is ready)
 * - Retry functionality on error
 */

import { createComponent } from 'liteforge';
import { authStore } from '../../stores/auth.js';

// =============================================================================
// Types
// =============================================================================

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  revenue: number;
  growth: number;
}

// =============================================================================
// Mock API
// =============================================================================

let loadCount = 0;

async function fetchDashboardStats(): Promise<DashboardStats> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate occasional failures (fail first load 30% of the time for demo)
  loadCount++;
  if (loadCount === 1 && Math.random() < 0.3) {
    throw new Error('Failed to fetch dashboard stats. Please try again.');
  }
  
  return {
    totalUsers: 1234,
    activeUsers: 892,
    revenue: 45678,
    growth: 12.5,
  };
}

// =============================================================================
// Component
// =============================================================================

export const DashboardHome = createComponent({
  name: 'DashboardHome',
  // Async data loading - runs BEFORE component renders
  async load() {
    console.log('[DashboardHome] LOAD');
    const stats = await fetchDashboardStats();
    return { stats };
  },

  // Placeholder shown IMMEDIATELY while load() is running
  placeholder() {
    console.log('[DashboardHome] PLACEHOLDER');
    return (
      <div class="dashboard-home loading">
        <div class="loading-spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  },

  // Error component shown if load() rejects
  error({ error, retry }) {
    return (
      <div class="dashboard-home error">
        <div class="error-icon">!</div>
        <h2>Something went wrong</h2>
        <p>{error.message}</p>
        <button type="button" class="btn btn-primary" onClick={retry}>Try Again</button>
      </div>
    );
  },

  // Main component - ONLY renders when load() succeeds
  // `data` is guaranteed to be available (no null checks needed)
  component({ data }) {
    console.log('[DashboardHome] COMPONENT');
    const { stats } = data;

    return (
      <div class="dashboard-home">
        <header class="page-header">
          <h1>Welcome back, {authStore.displayName()}!</h1>
          <p>Here's what's happening with your business today.</p>
        </header>
        
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Total Users</h3>
            <span class="value">{stats.totalUsers.toLocaleString()}</span>
          </div>
          <div class="stat-card">
            <h3>Active Users</h3>
            <span class="value">{stats.activeUsers.toLocaleString()}</span>
          </div>
          <div class="stat-card">
            <h3>Revenue</h3>
            <span class="value">${stats.revenue.toLocaleString()}</span>
          </div>
          <div class="stat-card">
            <h3>Growth</h3>
            <span class="value positive">+{stats.growth}%</span>
          </div>
        </div>
      </div>
    );
  },
});
