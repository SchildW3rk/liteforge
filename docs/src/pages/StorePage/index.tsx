import { createComponent, use } from 'liteforge';
import { DocSection } from '../../components/DocSection.js';
import { CodeBlock } from '../../components/CodeBlock.js';
import { LiveExample } from '../../components/LiveExample.js';
import { ApiTable } from '../../components/ApiTable.js';
import { setToc } from '../../toc.js';
import { SETUP_CODE, LIVE_CODE, PLUGINS_CODE, TIME_TRAVEL_CODE } from './snippets.js';
import { getDefineStoreApi, getStoreInstanceApi } from './api.js';
import { StoreExample } from './StoreExample.js';

export const StorePage = createComponent({
  name: 'StorePage',
  component() {
    const { t } = use('i18n');

    setToc([
      { id: 'define-store', label: () => t('store.defineStore'),  level: 2 },
      { id: 'instance',     label: () => t('store.instance'),     level: 2 },
      { id: 'live',         label: () => t('store.live'),         level: 2 },
      { id: 'plugins',      label: () => t('store.plugins'),      level: 2 },
      { id: 'time-travel',  label: () => t('store.timeTravel'),   level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/store</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('store.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('store.subtitle')}
          </p>
          <CodeBlock code={`pnpm add @liteforge/store`} language="bash" />
          <CodeBlock code={`import { defineStore } from '@liteforge/store';`} language="typescript" />
        </div>

        <DocSection
          title={() => t('store.defineStore')}
          id="define-store"
          description={() => t('store.defineStoreDesc')}
        >
          <div>
            <CodeBlock code={SETUP_CODE} language="typescript" />
            <ApiTable rows={() => getDefineStoreApi(t)} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('store.instance')}
          id="instance"
          description={() => t('store.instanceDesc')}
        >
          <ApiTable rows={() => getStoreInstanceApi(t)} />
        </DocSection>

        <DocSection
          title={() => t('store.live')}
          id="live"
          description={() => t('store.liveDesc')}
        >
          <LiveExample
            title={() => t('store.liveTitle')}
            description={() => t('store.liveDescEx')}
            component={StoreExample}
            code={LIVE_CODE}
          />
        </DocSection>

        <DocSection
          title={() => t('store.plugins')}
          id="plugins"
          description={() => t('store.pluginsDesc')}
        >
          <CodeBlock code={PLUGINS_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('store.timeTravel')}
          id="time-travel"
          description={() => t('store.timeTravelDesc')}
        >
          <CodeBlock code={TIME_TRAVEL_CODE} language="typescript" />
        </DocSection>
      </div>
    );
  },
});
