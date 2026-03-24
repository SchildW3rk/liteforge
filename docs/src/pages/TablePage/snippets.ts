// No imports — pure string constants

export const SETUP_CODE = `import { createTable } from '@liteforge/table';
import { signal } from 'liteforge';

interface Patient {
  id: number;
  name: string;
  dob: string;
  status: 'active' | 'inactive';
}

const patients = signal<Patient[]>([]);

const table = createTable<Patient>({
  data: () => patients(),
  columns: [
    { key: 'id',     header: 'ID',     sortable: true },
    { key: 'name',   header: 'Name',   sortable: true },
    { key: 'dob',    header: 'DOB',    sortable: true },
    { key: 'status', header: 'Status', sortable: false,
      cell: (value, row) => (
        <span class={\`badge \${row.status}\`}>{value}</span>
      ),
    },
  ],
  pagination: { pageSize: 20 },
  selection:  { enabled: true, mode: 'multi' },
});

// Render — includes table, pagination, and column headers
table.Root()`

export const COLUMNS_CODE = `columns: [
  // Simple column
  { key: 'name', header: 'Name', sortable: true },

  // Custom cell renderer
  {
    key: 'status',
    header: 'Status',
    sortable: false,
    cell: (value, row) => (
      <span class={\`pill pill-\${row.status}\`}>{value}</span>
    ),
  },

  // Actions column (no data key)
  {
    key: '_actions',
    header: '',
    cell: (_value, row) => (
      <button onclick={() => editPatient(row)}>Edit</button>
    ),
  },
]`

export const FILTER_CODE = `createTable({
  data: () => patients(),
  columns: [...],
  filters: [
    {
      type: 'text',
      key: 'name',
      label: 'Search by name',
      placeholder: 'Anna…',
    },
    {
      type: 'select',
      key: 'status',
      label: 'Status',
      options: [
        { label: 'Active',   value: 'active'   },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
  ],
})`

export const SELECTION_CODE = `const table = createTable({
  data: () => patients(),
  columns: [...],
  selection: {
    enabled: true,
    mode: 'multi',  // or 'single'
  },
});

// React to selection
table.selectedRows()  // Signal: Patient[]
table.isSelected(row) // Signal: boolean

table.selectAll();
table.clearSelection();`

export const STATE_CODE = `table.sortState()        // { key, direction } | null
table.currentPage()      // number
table.totalPages()       // number
table.pageData()         // current page rows
table.filteredCount()    // total after filters

table.setSort('name', 'asc');
table.setPage(2);
table.setFilter('status', 'active');`

export const STYLES_TOKEN_CODE = `const table = createTable<Patient>({
  data: () => patients(),
  columns: [...],
  // Layer 2: per-instance CSS variable overrides
  styles: {
    bg:           '#0a0a0a',
    border:       '#262626',
    borderRadius: '10px',
    headerBg:     '#171717',
    headerColor:  '#d4d4d4',
    rowBg:        '#0f0f0f',
    rowBgHover:   '#1a1a1a',
    cellColor:    '#d4d4d4',
    accentColor:  '#6366f1',
    paginationBg: '#111111',
  },
});`

export const TAILWIND_CODE = `const table = createTable<Patient>({
  data: () => patients(),
  columns: [...],
  // Layer 0: no default CSS at all
  unstyled: true,
  // Layer 3: Tailwind utility classes per element
  classes: {
    root:       'rounded-xl overflow-hidden border border-emerald-900/40',
    header:     'bg-emerald-900/40',
    headerCell: 'px-4 py-3 text-xs font-semibold text-emerald-300 uppercase',
    row:        'transition-colors hover:bg-emerald-900/20',
    cell:       'px-4 py-3 text-sm text-emerald-100',
    pagination: 'flex items-center justify-between px-4 py-3 text-xs',
  },
});`
