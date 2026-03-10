import { createComponent, use } from 'liteforge';
import { createTable } from 'liteforge/table';
import { signal } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import type { ApiRow } from '../components/ApiTable.js';
import { setToc } from '../toc.js';

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

const SETUP_CODE = `import { createTable } from 'liteforge/table';
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

export const TablePage = createComponent({
  name: 'TablePage',
  component() {
    const { t } = use('i18n');

    const getTableApi = (): ApiRow[] => [
      { name: 'data', type: '() => T[]', description: t('table.apiData') },
      { name: 'columns', type: 'ColumnDef<T>[]', description: t('table.apiColumns') },
      { name: 'pagination', type: '{ pageSize: number }', description: t('table.apiPagination') },
      { name: 'selection', type: "{ enabled: boolean, mode: 'single' | 'multi' }", description: t('table.apiSelection') },
      { name: 'filters', type: 'FilterDef[]', description: t('table.apiFilters') },
      { name: 'styles', type: 'TableStyles', description: t('table.apiStyles') },
      { name: 'classes', type: 'Partial<TableClasses>', description: t('table.apiClasses') },
      { name: 'unstyled', type: 'boolean', description: t('table.apiUnstyled') },
    ];

    const getStyleTokensApi = (): ApiRow[] => [
      { name: 'bg', type: 'string', description: t('table.styleBg') },
      { name: 'border', type: 'string', description: t('table.styleBorder') },
      { name: 'borderRadius', type: 'string', description: t('table.styleBorderRadius') },
      { name: 'headerBg', type: 'string', description: t('table.styleHeaderBg') },
      { name: 'headerColor', type: 'string', description: t('table.styleHeaderColor') },
      { name: 'headerFontWeight', type: 'string', description: t('table.styleHeaderFontWeight') },
      { name: 'rowBg', type: 'string', description: t('table.styleRowBg') },
      { name: 'rowBgHover', type: 'string', description: t('table.styleRowBgHover') },
      { name: 'rowBgSelected', type: 'string', description: t('table.styleRowBgSelected') },
      { name: 'rowBgStriped', type: 'string', description: t('table.styleRowBgStriped') },
      { name: 'cellPadding', type: 'string', description: t('table.styleCellPadding') },
      { name: 'cellColor', type: 'string', description: t('table.styleCellColor') },
      { name: 'cellFontSize', type: 'string', description: t('table.styleCellFontSize') },
      { name: 'accentColor', type: 'string', description: t('table.styleAccentColor') },
      { name: 'sortIconColor', type: 'string', description: t('table.styleSortIconColor') },
      { name: 'paginationBg', type: 'string', description: t('table.stylePaginationBg') },
      { name: 'searchBorder', type: 'string', description: t('table.styleSearchBorder') },
      { name: 'searchFocus', type: 'string', description: t('table.styleSearchFocus') },
    ];

    setToc([
      { id: 'create-table', label: () => t('table.createTable'),  level: 2 },
      { id: 'columns',      label: () => t('table.columns'),      level: 2 },
      { id: 'filters',      label: () => t('table.filters'),      level: 2 },
      { id: 'selection',    label: () => t('table.selection'),    level: 2 },
      { id: 'state',        label: () => t('table.state'),        level: 2 },
      { id: 'styling',      label: () => t('table.styling'),      level: 2 },
      { id: 'style-tokens', label: () => t('table.styleTokens'),  level: 3 },
      { id: 'live',         label: () => t('table.live'),         level: 2 },
      { id: 'tailwind',     label: () => t('table.tailwind'),     level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/table</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('table.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('table.subtitle')}
          </p>
          <CodeBlock code={`pnpm add @liteforge/table`} language="bash" />
          <CodeBlock code={`import { createTable } from 'liteforge/table';`} language="typescript" />
        </div>

        <DocSection
          title={() => t('table.createTable')}
          id="create-table"
          description={() => t('table.createTableDesc')}
        >
          <div>
            <CodeBlock code={SETUP_CODE} language="tsx" />
            <ApiTable rows={() => getTableApi()} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('table.columns')}
          id="columns"
          description={() => t('table.columnsDesc')}
        >
          <CodeBlock code={COLUMNS_CODE} language="tsx" />
        </DocSection>

        <DocSection
          title={() => t('table.filters')}
          id="filters"
          description={() => t('table.filtersDesc')}
        >
          <CodeBlock code={FILTER_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('table.selection')}
          id="selection"
          description={() => t('table.selectionDesc')}
        >
          <CodeBlock code={SELECTION_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('table.state')}
          id="state"
          description={() => t('table.stateDesc')}
        >
          <CodeBlock code={STATE_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('table.styling')}
          id="styling"
          description={() => t('table.stylingDesc')}
        >
          <div>
            <p class="text-[var(--content-secondary)] text-sm mb-4">
              The table uses a 3-layer cascade. Each layer is independent and composable:
            </p>
            <ApiTable rows={[
              { name: 'unstyled: true', type: 'Layer 0', description: t('table.layer0') },
              { name: '(automatic)', type: 'Layer 1', description: t('table.layer1') },
              { name: 'styles: {}', type: 'Layer 2', description: t('table.layer2') },
              { name: 'classes: {}', type: 'Layer 3', description: t('table.layer3') },
            ] as ApiRow[]} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('table.styleTokens')}
          id="style-tokens"
          description={() => t('table.styleTokensDesc')}
        >
          <div>
            <ApiTable rows={() => getStyleTokensApi()} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('table.live')}
          id="live"
          description={() => t('table.liveDesc')}
        >
          <LiveExample
            title={() => t('table.liveTitle')}
            component={TableExampleDocs}
            code={STYLES_TOKEN_CODE}
          />
        </DocSection>

        <DocSection
          title={() => t('table.tailwind')}
          id="tailwind"
          description={() => t('table.tailwindDesc')}
        >
          <LiveExample
            title={() => t('table.tailwindTitle')}
            component={TableExampleTailwind}
            code={TAILWIND_CODE}
          />
        </DocSection>
      </div>
    );
  },
});
