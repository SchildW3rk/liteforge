import { createComponent, use } from 'liteforge';
import { DocSection } from '../../components/DocSection.js';
import { CodeBlock } from '../../components/CodeBlock.js';
import { LiveExample } from '../../components/LiveExample.js';
import { ApiTable } from '../../components/ApiTable.js';
import { setToc } from '../../toc.js';
import {
  QUERY_CODE,
  REACTIVE_KEY_CODE,
  MUTATION_CODE,
  PROBLEM_CODE,
  SOLUTION_CODE,
  LIVE_CODE,
} from './snippets.js';
import { getQueryApi, getMutationApi } from './api.js';
import { QueryExample } from './QueryExample.js';

export const QueryPage = createComponent({
  name: 'QueryPage',
  component() {
    const { t } = use('i18n');

    setToc([
      { id: 'problem',       label: () => t('query.problem'),        level: 2 },
      { id: 'create-query',  label: () => t('query.createQuery'),    level: 2 },
      { id: 'reactive-keys', label: () => t('query.reactiveKeys'),   level: 2 },
      { id: 'mutation',      label: () => t('query.createMutation'), level: 2 },
      { id: 'live',          label: () => t('query.live'),           level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/query</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('query.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('query.subtitle')}
          </p>
          <CodeBlock code={`pnpm add @liteforge/query`} language="bash" />
          <CodeBlock code={`import { createQuery, createMutation } from '@liteforge/query';`} language="typescript" />
        </div>

        <DocSection
          title={() => t('query.problem')}
          id="problem"
        >
          <div class="space-y-0">
            <CodeBlock code={PROBLEM_CODE} language="typescript" title="❌ Without — manual state" />
            <CodeBlock code={SOLUTION_CODE} language="typescript" title="✅ With @liteforge/query" />
          </div>
        </DocSection>

        <DocSection
          title={() => t('query.createQuery')}
          id="create-query"
          description={() => t('query.createQueryDesc')}
        >
          <div>
            <CodeBlock code={QUERY_CODE} language="typescript" />
            <ApiTable rows={() => getQueryApi(t)} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('query.reactiveKeys')}
          id="reactive-keys"
          description={() => t('query.reactiveKeysDesc')}
        >
          <CodeBlock code={REACTIVE_KEY_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('query.createMutation')}
          id="mutation"
          description={() => t('query.createMutationDesc')}
        >
          <div>
            <CodeBlock code={MUTATION_CODE} language="typescript" />
            <ApiTable rows={() => getMutationApi(t)} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('query.live')}
          id="live"
          description={() => t('query.liveDesc')}
        >
          <LiveExample
            title={() => t('query.liveTitle')}
            component={QueryExample}
            code={LIVE_CODE}
          />
        </DocSection>
      </div>
    );
  },
});
