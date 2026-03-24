import { createComponent, use } from 'liteforge';
import { DocSection } from '../../components/DocSection.js';
import { CodeBlock } from '../../components/CodeBlock.js';
import { LiveExample } from '../../components/LiveExample.js';
import { ApiTable } from '../../components/ApiTable.js';
import type { ApiRow } from '../../components/ApiTable.js';
import { setToc } from '../../toc.js';
import {
  SETUP_CODE,
  COLUMNS_CODE,
  FILTER_CODE,
  SELECTION_CODE,
  STATE_CODE,
  STYLES_TOKEN_CODE,
  TAILWIND_CODE,
} from './snippets.js';
import { getTableApi, getStyleTokensApi } from './api.js';
import { TableExampleDocs, TableExampleTailwind } from './TableExamples.js';

export const TablePage = createComponent({
  name: 'TablePage',
  component() {
    const { t } = use('i18n');

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
          <CodeBlock code={`import { createTable } from '@liteforge/table';`} language="typescript" />
        </div>

        <DocSection
          title={() => t('table.createTable')}
          id="create-table"
          description={() => t('table.createTableDesc')}
        >
          <div>
            <CodeBlock code={SETUP_CODE} language="tsx" />
            <ApiTable rows={() => getTableApi(t)} />
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
            <ApiTable rows={() => getStyleTokensApi(t)} />
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
