import { createComponent, use } from 'liteforge';
import { DocSection } from '../../components/DocSection.js';
import { CodeBlock } from '../../components/CodeBlock.js';
import { LiveExample } from '../../components/LiveExample.js';
import { ApiTable } from '../../components/ApiTable.js';
import { setToc } from '../../toc.js';
import {
  COMPONENT_CODE,
  JSX_CODE,
  SHOW_CODE,
  FOR_CODE,
  USE_CODE,
  LIFECYCLE_CODE,
  TOGGLE_CODE,
  FOR_LIVE_CODE,
  USE_CLICK_OUTSIDE_CODE,
} from './snippets.js';
import { getComponentApi } from './api.js';
import { ToggleExample } from './ToggleExample.js';
import { ForExample } from './ForExample.js';

export const RuntimePage = createComponent({
  name: 'RuntimePage',
  component() {
    const { t } = use('i18n');

    setToc([
      { id: 'create-component',   label: () => t('runtime.createComponent'),   level: 2 },
      { id: 'jsx',                label: () => t('runtime.jsx'),                level: 2 },
      { id: 'show',               label: () => t('runtime.show'),               level: 2 },
      { id: 'for',                label: () => t('runtime.for'),                level: 2 },
      { id: 'use',                label: () => t('runtime.use'),                level: 2 },
      { id: 'lifecycle',          label: () => t('runtime.lifecycle'),          level: 2 },
      { id: 'use-click-outside',  label: () => t('runtime.useClickOutside'),    level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/runtime</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('runtime.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('runtime.subtitlePre')}{' '}
            <code class="font-mono text-sm text-indigo-300">createComponent()</code>,
            {' '}{() => t('runtime.subtitleMid')}{' '}
            <code class="font-mono text-sm text-indigo-300">Show</code>,{' '}
            <code class="font-mono text-sm text-indigo-300">For</code>, {() => t('runtime.subtitleAnd')}{' '}
            <code class="font-mono text-sm text-indigo-300">Switch</code>.
          </p>
          <CodeBlock code={`pnpm add @liteforge/runtime @liteforge/core`} language="bash" />
          <CodeBlock code={`import { createComponent, Show, For } from 'liteforge';`} language="typescript" />
        </div>

        <DocSection
          title={() => t('runtime.createComponent')}
          id="create-component"
          description={() => t('runtime.createComponentDesc')}
        >
          <div>
            <CodeBlock code={COMPONENT_CODE} language="tsx" />
            <ApiTable rows={() => getComponentApi(t)} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('runtime.jsx')}
          id="jsx"
          description={() => t('runtime.jsxDesc')}
        >
          <CodeBlock code={JSX_CODE} language="tsx" />
        </DocSection>

        <DocSection
          title={() => t('runtime.show')}
          id="show"
          description={() => t('runtime.showDesc')}
        >
          <div>
            <CodeBlock code={SHOW_CODE} language="tsx" />
            <LiveExample
              title={() => t('runtime.showTitle')}
              description={() => t('runtime.showDescEx')}
              component={ToggleExample}
              code={TOGGLE_CODE}
            />
          </div>
        </DocSection>

        <DocSection
          title={() => t('runtime.for')}
          id="for"
          description={() => t('runtime.forDesc')}
        >
          <div>
            <CodeBlock code={FOR_CODE} language="tsx" />
            <LiveExample
              title={() => t('runtime.forTitle')}
              description={() => t('runtime.forDescEx')}
              component={ForExample}
              code={FOR_LIVE_CODE}
            />
          </div>
        </DocSection>

        <DocSection
          title={() => t('runtime.use')}
          id="use"
          description={() => t('runtime.useDesc')}
        >
          <CodeBlock code={USE_CODE} language="tsx" />
        </DocSection>

        <DocSection
          title={() => t('runtime.lifecycle')}
          id="lifecycle"
          description={() => t('runtime.lifecycleDesc')}
        >
          <CodeBlock code={LIFECYCLE_CODE} language="tsx" />
        </DocSection>

        <DocSection
          title={() => t('runtime.useClickOutside')}
          id="use-click-outside"
          description={() => t('runtime.useClickOutsideDesc')}
        >
          <CodeBlock code={USE_CLICK_OUTSIDE_CODE} language="tsx" />
        </DocSection>
      </div>
    );
  },
});
