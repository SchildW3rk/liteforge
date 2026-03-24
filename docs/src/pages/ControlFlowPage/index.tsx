import { createComponent, use } from 'liteforge';
import { createTable } from '@liteforge/table';
import { DocSection } from '../../components/DocSection.js';
import { CodeBlock } from '../../components/CodeBlock.js';
import { LiveExample } from '../../components/LiveExample.js';
import { ApiTable } from '../../components/ApiTable.js';
import { setToc } from '../../toc.js';
import {
  REACTIVE_EXPR_CODE,
  REACTIVE_EXPR_SIGNAL_CODE,
  SHOW_BASIC_CODE,
  SHOW_REALISTIC_CODE,
  SHOW_JSX_CODE,
  SWITCH_CODE,
  SWITCH_JSX_CODE,
  FOR_BASIC_CODE,
  FOR_JSX_CODE,
  FOR_WHY_NOT_MAP_CODE,
  NESTED_CODE,
  QUERY_SHOW_CODE,
  LIVE_SHOW_CODE,
  LIVE_FOR_CODE,
  LIVE_SWITCH_CODE,
} from './snippets.js';
import { getShowApi, getForApi, getSwitchApi, getMatchApi } from './api.js';
import { ShowLiveExample } from './ShowLiveExample.js';
import { ForLiveExample } from './ForLiveExample.js';
import { SwitchLiveExample } from './SwitchLiveExample.js';

// =============================================================================
// Decision guide data
// =============================================================================

interface DecisionRow {
  situation: string;
  use: string;
}

const DECISION_ROWS: DecisionRow[] = [
  { situation: 'Simple true/false, no fallback',   use: '{() => cond() ? <A /> : null}' },
  { situation: 'True/false with fallback UI',       use: 'Show' },
  { situation: 'Multiple exclusive conditions (3+)', use: 'Switch / Match' },
  { situation: 'Rendering an array',                use: 'For' },
  { situation: 'Dynamic text / interpolation',      use: '{() => signal()}' },
  { situation: 'Typed value in condition body',     use: 'Show (narrows NonNullable<T>)' },
];

// =============================================================================
// Page
// =============================================================================

export const ControlFlowPage = createComponent({
  name: 'ControlFlowPage',
  component() {
    const { t } = use('i18n');

    setToc([
      { id: 'decision-guide', label: () => t('controlflow.whenToUse'), level: 2 },
    ]);
    const decisionTable = createTable<DecisionRow>({
      data: () => DECISION_ROWS,
      columns: [
        {
          key: 'situation',
          header: 'Situation',
          sortable: false,
          cell: (v) => <span class="text-[var(--content-secondary)]">{String(v)}</span>,
        },
        {
          key: 'use',
          header: 'Use',
          sortable: false,
          cell: (v) => <span class="font-mono text-indigo-300 text-xs">{String(v)}</span>,
        },
      ],
      unstyled: true,
      classes: {
        root:       'overflow-x-auto rounded-lg border border-[var(--line-default)] my-4',
        table:      'w-full text-sm text-left',
        header:     'bg-[var(--surface-raised)] text-[var(--content-secondary)] text-xs uppercase tracking-wider',
        headerCell: 'px-4 py-3',
        body:       '',
        row:        '',
        cell:       'px-4 py-3',
      },
    });

    return (
      <div>
        {/* Header */}
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/runtime</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('controlflow.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('controlflow.subtitle')}
          </p>
          <CodeBlock
            code={`import { Show, Switch, Match, For } from 'liteforge';`}
            language="typescript"
          />
        </div>

        {/* Section 1: Reactive expressions */}
        <DocSection
          title={() => t('controlflow.reactiveExpr')}
          id="reactive-expressions"
          description={() => t('controlflow.reactiveExprDesc')}
        >
          <div>
            <CodeBlock code={REACTIVE_EXPR_SIGNAL_CODE} language="tsx" />
            <CodeBlock code={REACTIVE_EXPR_CODE} language="tsx" />
            <div class="mt-4 p-4 rounded-lg border border-indigo-500/20 bg-indigo-950/20 text-sm text-[var(--content-secondary)] leading-relaxed">
              <span class="font-semibold text-indigo-300">When to use inline expressions: </span>
              Simple signal reads, text interpolation, and short ternaries. For complex conditions or fallbacks, use
              <code class="mx-1 px-1 py-0.5 rounded bg-[var(--surface-overlay)] text-xs font-mono text-indigo-300">Show</code>.
            </div>
          </div>
        </DocSection>

        {/* Section 2: Show */}
        <DocSection
          title={() => t('controlflow.show')}
          id="show"
          description={() => t('controlflow.showDesc')}
        >
          <div>
            <CodeBlock code={SHOW_BASIC_CODE} language="tsx" />
            <CodeBlock code={SHOW_JSX_CODE} language="tsx" title="JSX tag syntax" />
            <ApiTable rows={() => getShowApi(t)} />
            <CodeBlock code={SHOW_REALISTIC_CODE} language="tsx" title="With @liteforge/query" />
            <LiveExample
              title={() => t('controlflow.liveShowTitle')}
              component={ShowLiveExample}
              code={LIVE_SHOW_CODE}
            />
          </div>
        </DocSection>

        {/* Section 3: Switch / Match */}
        <DocSection
          title={() => t('controlflow.switchMatch')}
          id="switch"
          description={() => t('controlflow.switchMatchDesc')}
        >
          <div>
            <CodeBlock code={SWITCH_CODE} language="tsx" />
            <CodeBlock code={SWITCH_JSX_CODE} language="tsx" title="JSX tag syntax" />
            <p class="text-xs font-semibold text-[var(--content-secondary)] mb-1 mt-4">Switch</p>
            <ApiTable rows={() => getSwitchApi(t)} />
            <p class="text-xs font-semibold text-[var(--content-secondary)] mb-1 mt-4">Match</p>
            <ApiTable rows={() => getMatchApi(t)} />
            <LiveExample
              title={() => t('controlflow.liveSwitchTitle')}
              component={SwitchLiveExample}
              code={LIVE_SWITCH_CODE}
            />
          </div>
        </DocSection>

        {/* Section 4: For */}
        <DocSection
          title={() => t('controlflow.for')}
          id="for"
          description={() => t('controlflow.forDesc')}
        >
          <div>
            <CodeBlock code={FOR_BASIC_CODE} language="tsx" />
            <CodeBlock code={FOR_JSX_CODE} language="tsx" title="JSX tag syntax" />
            <ApiTable rows={() => getForApi(t)} />
            <CodeBlock code={FOR_WHY_NOT_MAP_CODE} language="tsx" title="Why not .map()?" />
            <LiveExample
              title={() => t('controlflow.liveForTitle')}
              component={ForLiveExample}
              code={LIVE_FOR_CODE}
            />
          </div>
        </DocSection>

        {/* Section 5: Decision guide */}
        <DocSection title={() => t('controlflow.whenToUse')} id="decision-guide">
          {decisionTable.Root()}
        </DocSection>

        {/* Section 6: Patterns & tips */}
        <DocSection
          title={() => t('controlflow.patterns')}
          id="patterns"
        >
          <div>
            <p class="text-sm text-[var(--content-secondary)] mb-3">Composing control flow primitives for real-world UIs:</p>
            <CodeBlock code={NESTED_CODE} language="tsx" title="Nesting Show inside For (and vice versa)" />
            <CodeBlock code={QUERY_SHOW_CODE} language="tsx" title="Show + @liteforge/query — three-state loading UI" />
          </div>
        </DocSection>
      </div>
    );
  },
});
