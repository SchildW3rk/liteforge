import { createComponent } from 'liteforge';
import { createTable } from '@liteforge/table';

export interface ApiRow {
  name: string;
  type: string;
  default?: string;
  description: string;
}

interface ApiTableProps {
  rows: ApiRow[] | (() => ApiRow[]);
}

export const ApiTable = createComponent<ApiTableProps>({
  name: 'ApiTable',
  component({ props }) {
    const table = createTable<ApiRow>({
      data: () => typeof props.rows === 'function' ? props.rows() : props.rows,
      columns: [
        {
          key: 'name',
          header: 'Name',
          sortable: false,
          cell: (v) => <span class="font-mono text-[var(--badge-indigo-text)] whitespace-nowrap">{String(v)}</span>,
        },
        {
          key: 'type',
          header: 'Type',
          sortable: false,
          cell: (v) => <span class="font-mono text-[var(--badge-emerald-text)] text-xs">{String(v)}</span>,
        },
        {
          key: 'default',
          header: 'Default',
          sortable: false,
          cell: (v) => (
            <span class="font-mono text-[var(--badge-amber-text)] text-xs whitespace-nowrap">
              {v !== undefined ? String(v) : '—'}
            </span>
          ),
        },
        {
          key: 'description',
          header: 'Description',
          sortable: false,
          cell: (v) => <span class="text-[var(--content-secondary)]">{String(v)}</span>,
        },
      ],
      unstyled: true,
      styles: {
        rowBg:       'var(--surface-base)',
        rowBgStriped: 'var(--surface-raised)',
        rowBgHover:  'var(--surface-overlay)',
      },
      classes: {
        root:       'overflow-x-auto border border-[var(--line-default)] my-4 [border-radius:var(--lf-radius,8px)]',
        table:      'w-full text-sm text-left',
        header:     'bg-[var(--surface-raised)] text-[var(--content-muted)] text-xs uppercase tracking-wider',
        headerCell: 'px-4 py-3',
        body:       '',
        row:        '',
        cell:       'px-4 py-3',
      },
    });

    return table.Root();
  },
});
