import { createComponent } from '@liteforge/runtime';
import { createTable } from '@liteforge/table';

export interface ApiRow {
  name: string;
  type: string;
  default?: string;
  description: string;
}

interface ApiTableProps {
  rows: ApiRow[];
}

export const ApiTable = createComponent<ApiTableProps>({
  name: 'ApiTable',
  component({ props }) {
    const table = createTable<ApiRow>({
      data: () => props.rows,
      columns: [
        {
          key: 'name',
          header: 'Name',
          sortable: false,
          cell: (v) => <span class="font-mono text-indigo-300 whitespace-nowrap">{String(v)}</span>,
        },
        {
          key: 'type',
          header: 'Type',
          sortable: false,
          cell: (v) => <span class="font-mono text-emerald-400 text-xs">{String(v)}</span>,
        },
        {
          key: 'default',
          header: 'Default',
          sortable: false,
          cell: (v) => (
            <span class="font-mono text-amber-400 text-xs whitespace-nowrap">
              {v !== undefined ? String(v) : '—'}
            </span>
          ),
        },
        {
          key: 'description',
          header: 'Description',
          sortable: false,
          cell: (v) => <span class="text-neutral-300">{String(v)}</span>,
        },
      ],
      unstyled: true,
      classes: {
        root:       'overflow-x-auto rounded-lg border border-neutral-800 my-4',
        table:      'w-full text-sm text-left',
        header:     'bg-neutral-900 text-neutral-400 text-xs uppercase tracking-wider',
        headerCell: 'px-4 py-3',
        body:       '',
        row:        '',
        cell:       'px-4 py-3',
      },
    });

    return table.Root();
  },
});
