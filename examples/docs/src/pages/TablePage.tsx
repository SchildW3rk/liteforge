import { createComponent } from '@liteforge/runtime';
import { createTable } from '@liteforge/table';
import { signal } from '@liteforge/core';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import type { ApiRow } from '../components/ApiTable.js';

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

function TableExampleDocs(): Node {
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

function TableExampleTailwind(): Node {
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

// ─── Code strings ──────────────────────────────────────────────────────────────

const SETUP_CODE = `import { createTable } from '@liteforge/table';
import { signal } from '@liteforge/core';

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
table.Root()`;

const COLUMNS_CODE = `columns: [
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
]`;

const FILTER_CODE = `createTable({
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
})`;

const SELECTION_CODE = `const table = createTable({
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
table.clearSelection();`;

const STATE_CODE = `table.sortState()        // { key, direction } | null
table.currentPage()      // number
table.totalPages()       // number
table.pageData()         // current page rows
table.filteredCount()    // total after filters

table.setSort('name', 'asc');
table.setPage(2);
table.setFilter('status', 'active');`;

const STYLES_TOKEN_CODE = `const table = createTable<Patient>({
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
});`;

const TAILWIND_CODE = `const table = createTable<Patient>({
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
});`;

const TABLE_API: ApiRow[] = [
  { name: 'data', type: '() => T[]', description: 'Data source — reactive function, re-renders when signal changes' },
  { name: 'columns', type: 'ColumnDef<T>[]', description: 'Column definitions — key, header, sortable, custom cell renderer' },
  { name: 'pagination', type: '{ pageSize: number }', description: 'Enable pagination with given page size' },
  { name: 'selection', type: "{ enabled: boolean, mode: 'single' | 'multi' }", description: 'Row selection mode' },
  { name: 'filters', type: 'FilterDef[]', description: 'Text, select, boolean, or number-range filter definitions' },
  { name: 'styles', type: 'TableStyles', description: 'Per-instance CSS variable overrides — Layer 2' },
  { name: 'classes', type: 'Partial<TableClasses>', description: 'Class overrides per element for Tailwind etc. — Layer 3' },
  { name: 'unstyled', type: 'boolean', description: 'Disable all default CSS injection — Layer 0' },
];

const STYLE_TOKENS_API: ApiRow[] = [
  { name: 'bg', type: 'string', description: '--lf-table-bg — table surface background' },
  { name: 'border', type: 'string', description: '--lf-table-border — border color' },
  { name: 'borderRadius', type: 'string', description: '--lf-table-border-radius — corner radius' },
  { name: 'headerBg', type: 'string', description: '--lf-table-header-bg — header row background' },
  { name: 'headerColor', type: 'string', description: '--lf-table-header-color — header text color' },
  { name: 'headerFontWeight', type: 'string', description: '--lf-table-header-font-weight' },
  { name: 'rowBg', type: 'string', description: '--lf-table-row-bg — default row background' },
  { name: 'rowBgHover', type: 'string', description: '--lf-table-row-bg-hover — row hover background' },
  { name: 'rowBgSelected', type: 'string', description: '--lf-table-row-bg-selected — selected row background' },
  { name: 'rowBgStriped', type: 'string', description: '--lf-table-row-bg-striped — odd row striping' },
  { name: 'cellPadding', type: 'string', description: '--lf-table-cell-padding' },
  { name: 'cellColor', type: 'string', description: '--lf-table-cell-color — cell text color' },
  { name: 'cellFontSize', type: 'string', description: '--lf-table-cell-font-size' },
  { name: 'accentColor', type: 'string', description: '--lf-table-sort-icon-active — sort icon + focus accent' },
  { name: 'sortIconColor', type: 'string', description: '--lf-table-sort-icon-color — inactive sort icon' },
  { name: 'paginationBg', type: 'string', description: '--lf-table-pagination-bg — pagination footer background' },
  { name: 'searchBorder', type: 'string', description: '--lf-table-search-border' },
  { name: 'searchFocus', type: 'string', description: '--lf-table-search-focus — search input focus ring' },
];

export const TablePage = createComponent({
  name: 'TablePage',
  component() {
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/table</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">Data Table</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            Reactive data grid with sorting, filtering, pagination, and row selection.
            Data is a signal — the table automatically re-renders when data changes.
          </p>
          <CodeBlock code={`pnpm add @liteforge/table`} language="bash" />
          <CodeBlock code={`import { createTable } from '@liteforge/table';`} language="typescript" />
        </div>

        <DocSection
          title="createTable()"
          id="create-table"
          description="Define columns, data source, and options. Call table.Root() to render."
        >
          <div>
            <CodeBlock code={SETUP_CODE} language="tsx" />
            <ApiTable rows={TABLE_API} />
          </div>
        </DocSection>

        <DocSection
          title="Column definitions"
          id="columns"
          description="Each column can have a custom cell renderer for badges, buttons, or any DOM element."
        >
          <CodeBlock code={COLUMNS_CODE} language="tsx" />
        </DocSection>

        <DocSection
          title="Filters"
          id="filters"
          description="Add search and filter controls with built-in filter types: text, select, boolean, number range."
        >
          <CodeBlock code={FILTER_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Row selection"
          id="selection"
          description="Single or multi-select with reactive selectedRows() signal."
        >
          <CodeBlock code={SELECTION_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Table state"
          id="state"
          description="All table state (sort, page, filters) is exposed as signals — read or set programmatically."
        >
          <CodeBlock code={STATE_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Styling"
          id="styling"
          description="Three layers of styling control — from full defaults to fully custom Tailwind."
        >
          <div>
            <p class="text-[var(--content-secondary)] text-sm mb-4">
              The table uses a 3-layer cascade. Each layer is independent and composable:
            </p>
            <ApiTable rows={[
              { name: 'unstyled: true', type: 'Layer 0', description: 'No CSS injected at all — full control for custom design systems' },
              { name: '(automatic)', type: 'Layer 1', description: 'Default theme via CSS custom properties — works out of the box' },
              { name: 'styles: {}', type: 'Layer 2', description: 'Per-instance token overrides — inline CSS vars scoped to that table only' },
              { name: 'classes: {}', type: 'Layer 3', description: 'Class overrides per element — Tailwind utility classes, BEM variants, etc.' },
            ] as ApiRow[]} />
          </div>
        </DocSection>

        <DocSection
          title="Style tokens"
          id="style-tokens"
          description="styles: {} maps named tokens to CSS custom properties on the root element. Child elements inherit them automatically."
        >
          <div>
            <ApiTable rows={STYLE_TOKENS_API} />
          </div>
        </DocSection>

        <DocSection
          title="Live example"
          id="live"
          description="Click column headers to sort. Use checkboxes to select rows. Navigate pages."
        >
          <LiveExample
            title="Patient list with sort + pagination + selection"
            component={TableExampleDocs}
            code={STYLES_TOKEN_CODE}
          />
        </DocSection>

        <DocSection
          title="Tailwind only"
          id="tailwind"
          description="unstyled: true removes all default CSS. classes: {} applies Tailwind utilities per element."
        >
          <LiveExample
            title="Tailwind — unstyled: true + classes: {}"
            component={TableExampleTailwind}
            code={TAILWIND_CODE}
          />
        </DocSection>
      </div>
    );
  },
});
