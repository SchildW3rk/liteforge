/**
 * Tables Page - Demonstrates @liteforge/table usage
 * 
 * Features:
 * - createTable with JSONPlaceholder data
 * - Sorting on multiple columns
 * - Global search
 * - Column filters (select)
 * - Pagination with size options
 * - Multi-select with checkboxes
 * - Column visibility toggle
 * - Custom cell renderers (links, actions)
 * - Row click handling
 * - Nested property access (company.name)
 */

import { createComponent, Show } from 'liteforge';
import { createQuery } from 'liteforge/query';
import { createTable } from 'liteforge/table';
import type { ColumnDef } from 'liteforge/table';

// =============================================================================
// User Type (JSONPlaceholder schema)
// =============================================================================

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  phone: string;
  website: string;
  company: {
    name: string;
    catchPhrase: string;
    bs: string;
  };
  address: {
    street: string;
    suite: string;
    city: string;
    zipcode: string;
  };
}

// =============================================================================
// Tables Page Component
// =============================================================================

export const TablesPage = createComponent({
  name: 'TablesPage',

  setup() {
    // Fetch users from JSONPlaceholder
    const usersQuery = createQuery<User[]>({
      key: 'users-table',
      fn: async () => {
        const response = await fetch('https://jsonplaceholder.typicode.com/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
      },
    });

    // Column definitions
    const columns: ColumnDef<User>[] = [
      { 
        key: 'id', 
        header: 'ID', 
        width: 60,
        sortable: true,
      },
      { 
        key: 'name', 
        header: 'Name', 
        sortable: true,
      },
      { 
        key: 'email', 
        header: 'Email', 
        sortable: true,
      },
      { 
        key: 'phone', 
        header: 'Phone',
        visible: false,  // Hidden by default, can be toggled
      },
      { 
        key: 'company.name', 
        header: 'Company', 
        sortable: true,
        filterable: true,
      },
      { 
        key: 'website', 
        header: 'Website',
        cell: (value) => {
          const link = document.createElement('a');
          link.href = `https://${value}`;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = String(value);
          link.style.color = '#3b82f6';
          link.style.textDecoration = 'none';
          link.addEventListener('mouseenter', () => {
            link.style.textDecoration = 'underline';
          });
          link.addEventListener('mouseleave', () => {
            link.style.textDecoration = 'none';
          });
          return link;
        },
      },
      {
        key: '_actions',
        header: 'Actions',
        cell: (_, row) => {
          const container = document.createElement('div');
          container.style.display = 'flex';
          container.style.gap = '8px';

          const viewBtn = document.createElement('button');
          viewBtn.textContent = 'View';
          viewBtn.className = 'action-btn action-btn-view';
          viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('View user:', row);
            alert(`Viewing: ${row.name}\nEmail: ${row.email}\nCompany: ${row.company.name}`);
          });

          const editBtn = document.createElement('button');
          editBtn.textContent = 'Edit';
          editBtn.className = 'action-btn action-btn-edit';
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('Edit user:', row);
          });

          container.appendChild(viewBtn);
          container.appendChild(editBtn);
          return container;
        },
      },
    ];

    // Create table
    const table = createTable<User>({
      data: () => usersQuery.data() ?? [],
      columns,
      search: {
        enabled: true,
        placeholder: 'Search users...',
        columns: ['name', 'email'],
      },
      filters: {
        'company.name': { type: 'select' },
      },
      pagination: {
        pageSize: 5,
        pageSizes: [5, 10],
      },
      selection: {
        enabled: true,
        mode: 'multi',
      },
      columnToggle: true,
      onRowClick: (row) => {
        console.log('Row clicked:', row.name);
      },
    });

    return { usersQuery, table };
  },

  component({ setup }) {
    const { usersQuery, table } = setup;

    return (
      <div class="tables-page">
        <h1>Users Tabelle (HMR Test)</h1>
        <p class="page-description">
          Data table with sorting, filtering, pagination, and selection.
          Data fetched from JSONPlaceholder API.
        </p>

        {Show({
          when: () => usersQuery.isLoading(),
          children: () => (
            <div class="loading-state">
              <div class="spinner" />
              <p>Loading users...</p>
            </div>
          ),
        })}

        {Show({
          when: () => !!usersQuery.error(),
          children: () => (
            <div class="error-state">
              <p>Error loading users: {() => usersQuery.error()?.message}</p>
              <button type="button" onclick={() => usersQuery.refetch()}>Retry</button>
            </div>
          ),
        })}

        {Show({
          when: () => usersQuery.isFetched() && !usersQuery.error(),
          children: () => (
            <div>
              <div class="table-info">
                <p>
                  <strong>{() => table.selectedCount()}</strong> user(s) selected
                  {' | '}
                  Showing {() => table.filteredRows()} of {() => table.totalRows()} users
                </p>
                {Show({
                  when: () => table.selectedCount() > 0,
                  children: () => (
                    <button 
                      type="button"
                      class="clear-selection-btn"
                      onclick={() => table.deselectAll()}
                    >
                      Clear Selection
                    </button>
                  ),
                })}
              </div>
              {table.Root()}
            </div>
          ),
        })}

        <style>{`
          .tables-page {
            padding: 20px;
          }

          .tables-page h1 {
            margin: 0 0 8px 0;
            color: #1e293b;
            font-size: 24px;
          }

          .page-description {
            color: #64748b;
            margin: 0 0 24px 0;
          }

          .loading-state,
          .error-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 40px;
            gap: 16px;
          }

          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #e2e8f0;
            border-top-color: #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .error-state {
            color: #dc2626;
          }

          .error-state button {
            padding: 8px 16px;
            background: #dc2626;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          }

          .table-info {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 16px;
            padding: 12px 16px;
            background: #f8fafc;
            border-radius: 8px;
          }

          .table-info p {
            margin: 0;
            color: #64748b;
          }

          .clear-selection-btn {
            padding: 6px 12px;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
          }

          .clear-selection-btn:hover {
            background: #dc2626;
          }

          .action-btn {
            padding: 4px 10px;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.15s;
          }

          .action-btn:hover {
            background: #f1f5f9;
          }

          .action-btn-view {
            color: #3b82f6;
            border-color: #3b82f6;
          }

          .action-btn-view:hover {
            background: #eff6ff;
          }

          .action-btn-edit {
            color: #f59e0b;
            border-color: #f59e0b;
          }

          .action-btn-edit:hover {
            background: #fffbeb;
          }
        `}</style>
      </div>
    );
  },
});
