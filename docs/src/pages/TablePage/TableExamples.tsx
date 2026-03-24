import { signal } from 'liteforge';
import { createTable } from '@liteforge/table';

// ─── Sample data ───────────────────────────────────────────────────────────────

interface Patient {
  id: number;
  name: string;
  age: number;
  status: 'active' | 'inactive' | 'pending';
}

const SAMPLE_PATIENTS: Patient[] = [
  { id: 1, name: 'Anna Müller',   age: 34, status: 'active'   },
  { id: 2, name: 'Tom Weber',     age: 45, status: 'inactive' },
  { id: 3, name: 'Maria Schmidt', age: 28, status: 'active'   },
  { id: 4, name: 'Klaus Fischer', age: 61, status: 'pending'  },
  { id: 5, name: 'Eva Braun',     age: 39, status: 'active'   },
];

// ─── Live example A: Docs-themed (uses styles: {} tokens) ─────────────────────

export function TableExampleDocs(): Node {
  const data = signal<Patient[]>(SAMPLE_PATIENTS);

  const table = createTable<Patient>({
    data: () => data(),
    columns: [
      { key: 'id',     header: 'ID',     sortable: true,  cell: (v) => <span>{String(v)}</span> },
      { key: 'name',   header: 'Name',   sortable: true,  cell: (v) => <span>{String(v)}</span> },
      { key: 'age',    header: 'Age',    sortable: true,  cell: (v) => <span>{String(v)}</span> },
      { key: 'status', header: 'Status', sortable: false, cell: (v) => <span>{String(v)}</span> },
    ],
    pagination: { pageSize: 3 },
    selection: { enabled: true, mode: 'multi' },
    styles: {
      bg:           '#0a0a0a',
      border:       '#262626',
      borderRadius: '10px',
      headerBg:     '#171717',
      headerColor:  '#d4d4d4',
      rowBg:        '#0f0f0f',
      rowBgStriped: '#0d0d0d',
      rowBgHover:   '#1a1a1a',
      rowBgSelected:'#1e293b',
      cellColor:    '#d4d4d4',
      paginationBg: '#111111',
      searchBorder: '#404040',
      accentColor:  '#6366f1',
    },
  });

  return table.Root();
}

// ─── Live example B: Tailwind-only (unstyled + classes) ───────────────────────

export function TableExampleTailwind(): Node {
  const data = signal<Patient[]>(SAMPLE_PATIENTS);

  const table = createTable<Patient>({
    data: () => data(),
    columns: [
      { key: 'id',     header: 'ID',     sortable: true,  cell: (v) => <span>{String(v)}</span> },
      { key: 'name',   header: 'Name',   sortable: true,  cell: (v) => <span>{String(v)}</span> },
      { key: 'age',    header: 'Age',    sortable: true,  cell: (v) => <span>{String(v)}</span> },
      { key: 'status', header: 'Status', sortable: false, cell: (v) => <span>{String(v)}</span> },
    ],
    pagination: { pageSize: 3 },
    selection: { enabled: true, mode: 'multi' },
    unstyled: true,
    classes: {
      root:              'rounded-xl overflow-hidden border border-emerald-900/40 bg-emerald-950/30',
      table:             'w-full border-collapse',
      header:            'bg-emerald-900/40',
      headerRow:         'border-b border-emerald-800/40',
      headerCell:        'px-4 py-3 text-left text-xs font-semibold text-emerald-300 uppercase tracking-wider cursor-pointer select-none',
      body:              'divide-y divide-emerald-900/30',
      row:               'transition-colors hover:bg-emerald-900/20',
      rowSelected:       'bg-emerald-900/40',
      cell:              'px-4 py-3 text-sm text-emerald-100',
      pagination:        'flex items-center justify-between px-4 py-3 bg-emerald-900/20 border-t border-emerald-900/40 text-xs text-emerald-400',
      paginationInfo:    'text-emerald-500',
      paginationControls:'flex gap-2',
    },
  });

  return table.Root();
}
