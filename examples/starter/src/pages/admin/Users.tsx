/**
 * Admin Users Page
 * 
 * Admin-only user management with actions.
 * 
 * Demonstrates:
 * - For component with mutable list
 * - Signal-based state mutations
 * - UI notifications
 */

import { signal } from 'liteforge';
import { createComponent, For } from 'liteforge';
import { uiStore } from '../../stores/ui.js';

// =============================================================================
// Types
// =============================================================================

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
}

// =============================================================================
// Mock Data
// =============================================================================

const initialUsers: AdminUser[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'admin', status: 'active' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'user', status: 'active' },
  { id: '3', name: 'Carol Williams', email: 'carol@example.com', role: 'user', status: 'suspended' },
  { id: '4', name: 'David Brown', email: 'david@example.com', role: 'user', status: 'active' },
];

// =============================================================================
// Component
// =============================================================================

export const AdminUsers = createComponent({
  name: 'AdminUsers',
  setup() {
    const users = signal<AdminUser[]>([...initialUsers]);
    return { users };
  },

  component({ setup }) {
    const { users } = setup;

    // Actions
    const toggleStatus = (userId: string) => {
      users.update(list => 
        list.map(u => 
          u.id === userId 
            ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' }
            : u
        )
      );
      uiStore.notify('success', 'User status updated');
    };

    const toggleRole = (userId: string) => {
      users.update(list => 
        list.map(u => 
          u.id === userId 
            ? { ...u, role: u.role === 'admin' ? 'user' : 'admin' }
            : u
        )
      );
      uiStore.notify('info', 'User role updated');
    };

    const deleteUser = (userId: string) => {
      const user = users().find(u => u.id === userId);
      if (user && confirm(`Delete user ${user.name}?`)) {
        users.update(list => list.filter(u => u.id !== userId));
        uiStore.notify('warning', `User ${user.name} deleted`);
      }
    };

    return (
      <div class="admin-users">
        <h2>Manage Users</h2>
        <p class="user-count">{() => `Total: ${users().length} users`}</p>
        
        <table class="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {For({
              each: users,
              key: 'id',
              children: (user) => (
                <tr>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <button 
                      type="button"
                      class={`badge ${user.role}`}
                      title="Click to toggle role"
                      onClick={() => toggleRole(user.id)}
                    >
                      {user.role}
                    </button>
                  </td>
                  <td>
                    <button 
                      type="button"
                      class={`status ${user.status}`}
                      title="Click to toggle status"
                      onClick={() => toggleStatus(user.id)}
                    >
                      {user.status}
                    </button>
                  </td>
                  <td>
                    <button 
                      type="button"
                      class="btn-danger"
                      onClick={() => deleteUser(user.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ),
            })}
          </tbody>
        </table>
      </div>
    );
  },
});
