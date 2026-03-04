/**
 * Users Page
 * 
 * Displays a list of users with For control flow.
 * 
 * Demonstrates:
 * - For component for list rendering
 * - Async data loading
 * - Keyed list items for efficient updates
 * - Signals for search/filter state
 */

import { signal, computed } from 'liteforge';
import { createComponent, For, Show } from 'liteforge';

// =============================================================================
// Types
// =============================================================================

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive';
  joinedAt: string;
}

// =============================================================================
// Mock API
// =============================================================================

const mockUsers: User[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'admin', status: 'active', joinedAt: '2024-01-15' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'user', status: 'active', joinedAt: '2024-02-20' },
  { id: '3', name: 'Carol Williams', email: 'carol@example.com', role: 'user', status: 'inactive', joinedAt: '2024-03-10' },
  { id: '4', name: 'David Brown', email: 'david@example.com', role: 'user', status: 'active', joinedAt: '2024-04-05' },
  { id: '5', name: 'Eve Davis', email: 'eve@example.com', role: 'admin', status: 'active', joinedAt: '2024-05-01' },
  { id: '6', name: 'Frank Miller', email: 'frank@example.com', role: 'user', status: 'inactive', joinedAt: '2024-05-15' },
  { id: '7', name: 'Grace Wilson', email: 'grace@example.com', role: 'user', status: 'active', joinedAt: '2024-06-01' },
  { id: '8', name: 'Henry Taylor', email: 'henry@example.com', role: 'user', status: 'active', joinedAt: '2024-06-20' },
];

async function fetchUsers(): Promise<User[]> {
  await new Promise(resolve => setTimeout(resolve, 800));
  return mockUsers;
}

// =============================================================================
// Component
// =============================================================================

export const UsersPage = createComponent({
  name: 'UsersPage',
  setup() {
    const searchQuery = signal('');
    const statusFilter = signal<'all' | 'active' | 'inactive'>('all');
    
    return { searchQuery, statusFilter };
  },

  async load() {
    const users = await fetchUsers();
    return { users };
  },

  placeholder() {
    return (
      <div class="users-page loading">
        <div class="loading-spinner" />
        <p>Loading users...</p>
      </div>
    );
  },

  error({ error, retry }) {
    return (
      <div class="users-page error">
        <p>Error: {error.message}</p>
        <button type="button" onClick={retry}>Retry</button>
      </div>
    );
  },

  component({ setup, data }) {
    const { searchQuery, statusFilter } = setup;
    const allUsers = signal(data.users);

    // Computed filtered users based on search and status filter
    const filteredUsers = computed(() => {
      const query = searchQuery().toLowerCase();
      const status = statusFilter();
      
      return allUsers().filter(user => {
        const matchesSearch = !query || 
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query);
        
        const matchesStatus = status === 'all' || user.status === status;
        
        return matchesSearch && matchesStatus;
      });
    });

    return (
      <div class="users-page">
        <header class="page-header">
          <h1>Users</h1>
          <p>Manage your team members</p>
        </header>
        
        <div class="filters">
          <input 
            type="search"
            placeholder="Search users..."
            onInput={(e: Event) => searchQuery.set((e.target as HTMLInputElement).value)}
          />
          <select 
            onChange={(e: Event) => statusFilter.set((e.target as HTMLSelectElement).value as 'all' | 'active' | 'inactive')}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        
        <div class="user-count">
          {() => `Showing ${filteredUsers().length} of ${allUsers().length} users`}
        </div>
        
        {Show({
          when: () => filteredUsers().length > 0,
          fallback: () => (
            <div class="empty-state">No users found</div>
          ),
          children: () => (
            <ul class="user-list">
              {For({
                each: filteredUsers,
                key: 'id',
                children: (user) => (
                  <li class="user-item">
                    <span class="avatar">{user.name[0] ?? '?'}</span>
                    <div class="user-info">
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <span class={`badge ${user.role}`}>{user.role}</span>
                    <span class={`status ${user.status}`}>{user.status}</span>
                  </li>
                ),
              })}
            </ul>
          ),
        })}
      </div>
    );
  },
});
