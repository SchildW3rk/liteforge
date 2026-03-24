import { createComponent, use } from 'liteforge';
import { DocSection } from '../../components/DocSection.js';
import { CodeBlock } from '../../components/CodeBlock.js';
import { ApiTable } from '../../components/ApiTable.js';
import { LiveExample } from '../../components/LiveExample.js';
import { setToc } from '../../toc.js';
import {
  SETUP_CODE,
  RESOURCE_CODE,
  QUERY_CLIENT_CODE,
  ERROR_CODE,
  INTERCEPTOR_CODE,
  MIDDLEWARE_CODE,
  CONTRAST_CODE,
  FETCH_DEMO_CODE,
} from './snippets.js';
import { getClientApi } from './api.js';
import { FetchDemo } from './FetchDemo.js';

export const ClientPage = createComponent({
  name: 'ClientPage',
  component() {
    const { t } = use('i18n');

    setToc([
      { id: 'contrast',      label: () => t('client.progressiveDx'),  level: 2 },
      { id: 'create-client', label: () => t('client.createClient'),   level: 2 },
      { id: 'resource',      label: () => t('client.resource'),       level: 2 },
      { id: 'query-client',  label: () => t('client.queryClient'),    level: 2 },
      { id: 'errors',        label: () => t('client.errors'),         level: 2 },
      { id: 'interceptors',  label: () => t('client.interceptors'),   level: 2 },
      { id: 'middleware',    label: () => t('client.middleware'),      level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/client</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('client.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('client.subtitle')}
          </p>
          <CodeBlock code={`pnpm add @liteforge/client`} language="bash" />
          <CodeBlock code={`import { createClient, ApiError } from '@liteforge/client';`} language="typescript" />
        </div>

        <DocSection
          title={() => t('client.progressiveDx')}
          id="contrast"
          description={() => t('client.progressiveDxDesc')}
        >
          <CodeBlock code={CONTRAST_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('client.createClient')}
          id="create-client"
          description={() => t('client.createClientDesc')}
        >
          <div>
            <CodeBlock code={SETUP_CODE} language="typescript" />
            <ApiTable rows={() => getClientApi(t)} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('client.resource')}
          id="resource"
          description={() => t('client.resourceDesc')}
        >
          <CodeBlock code={RESOURCE_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('client.queryClient')}
          id="query-client"
          description={() => t('client.queryClientDesc')}
        >
          <CodeBlock code={QUERY_CLIENT_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('client.errors')}
          id="errors"
          description={() => t('client.errorsDesc')}
        >
          <div>
            <CodeBlock code={ERROR_CODE} language="typescript" />
            <LiveExample
              title={() => t('client.liveTitle')}
              description={() => t('client.liveDesc')}
              component={FetchDemo}
              code={FETCH_DEMO_CODE}
            />
          </div>
        </DocSection>

        <DocSection
          title={() => t('client.interceptors')}
          id="interceptors"
          description={() => t('client.interceptorsDesc')}
        >
          <CodeBlock code={INTERCEPTOR_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('client.middleware')}
          id="middleware"
          description={() => t('client.middlewareDesc')}
        >
          <CodeBlock code={MIDDLEWARE_CODE} language="typescript" />
        </DocSection>
      </div>
    );
  },
});
