import { createComponent, use } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { ApiTable } from '../components/ApiTable.js';
import type { ApiRow } from '../components/ApiTable.js';
import { setToc } from '../toc.js';

// ─── Code strings ─────────────────────────────────────────────────────────────

const INTEGRATION_CODE = `// main.tsx
import { createApp } from 'liteforge';

await createApp({ root: App, target: '#app' })
  // useDev() is tree-shaken from production builds automatically
  .useDev(() => import('liteforge/devtools').then(m => m.devtoolsPlugin({
    shortcut:   'ctrl+shift+d',   // toggle panel
    position:   'right',          // 'right' | 'bottom' | 'floating'
    defaultTab: 'signals',
    width:      360,
    maxEvents:  1000,
  })))
  .mount();`;

const INSTALL_CODE = `pnpm add -D @liteforge/devtools`;
const IMPORT_CODE = `import { devtoolsPlugin } from 'liteforge/devtools';`;

const TIME_TRAVEL_CODE = `// Stores tab → click any history entry to rewind

// The store plugin records every action dispatch.
// DevTools displays a timeline per store:
//
//   counter  ──────────────────────────────────
//   [0]  increment → 1
//   [1]  increment → 2   ← click to rewind here
//   [2]  decrement → 1   (greyed out / future)
//
// Rewinding calls myStore.$restore(snapshot),
// which writes all signals back to their snapshotted values.
// Live effects and computed values re-run automatically.`;

const STANDALONE_CODE = `// Attach DevTools without createApp — useful for plain scripts
import { createDevTools } from 'liteforge/devtools';

const dt = createDevTools({
  position: 'bottom',
  stores: { counter: counterStore },
});

dt.open();
dt.close();`;

export const DevtoolsPage = createComponent({
  name: 'DevtoolsPage',
  component() {
    const { t } = use('i18n');

    const getConfigApi = (): ApiRow[] => [
      { name: 'shortcut', type: 'string', default: "'ctrl+shift+d'", description: t('devtools.apiShortcut') },
      { name: 'position', type: "'right' | 'bottom' | 'floating'", default: "'right'", description: t('devtools.apiPosition') },
      { name: 'defaultTab', type: "'signals' | 'stores' | 'router' | 'components' | 'performance'", default: "'signals'", description: t('devtools.apiDefaultTab') },
      { name: 'width', type: 'number', default: '360', description: t('devtools.apiWidth') },
      { name: 'height', type: 'number', default: '300', description: t('devtools.apiHeight') },
      { name: 'maxEvents', type: 'number', default: '1000', description: t('devtools.apiMaxEvents') },
    ];

    const getTabsInfo = (): ApiRow[] => [
      { name: 'Signals', type: 'tab', description: t('devtools.tabSignals') },
      { name: 'Stores', type: 'tab', description: t('devtools.tabStores') },
      { name: 'Router', type: 'tab', description: t('devtools.tabRouter') },
      { name: 'Components', type: 'tab', description: t('devtools.tabComponents') },
      { name: 'Performance', type: 'tab', description: t('devtools.tabPerformance') },
    ];

    setToc([
      { id: 'integration', label: () => t('devtools.integration'),  level: 2 },
      { id: 'config',      label: () => t('devtools.config'),       level: 2 },
      { id: 'tabs',        label: () => t('devtools.tabs'),         level: 2 },
      { id: 'time-travel', label: () => t('devtools.timeTravel'),   level: 2 },
      { id: 'standalone',  label: () => t('devtools.standalone'),   level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/devtools</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('devtools.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('devtools.subtitle')}
          </p>
          <CodeBlock code={INSTALL_CODE} language="bash" />
          <CodeBlock code={IMPORT_CODE} language="typescript" />
        </div>

        <DocSection
          title={() => t('devtools.integration')}
          id="integration"
          description={() => t('devtools.integrationDesc')}
        >
          <CodeBlock code={INTEGRATION_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('devtools.config')}
          id="config"
          description={() => t('devtools.configDesc')}
        >
          <ApiTable rows={() => getConfigApi()} />
        </DocSection>

        <DocSection
          title={() => t('devtools.tabs')}
          id="tabs"
          description={() => t('devtools.tabsDesc')}
        >
          <div>
            <div class="p-4 rounded-lg border border-[var(--line-default)] bg-[var(--surface-raised)]/60 font-mono text-xs text-[var(--content-secondary)] leading-relaxed mb-4">
              <div class="text-[var(--content-secondary)] mb-2 text-[0.7rem] uppercase tracking-widest">Panel preview</div>
              <div class="flex gap-3 border-b border-[var(--line-default)] pb-2 mb-3 text-[0.7rem]">
                <span class="text-indigo-400 border-b border-indigo-500 pb-1">Signals</span>
                <span>Stores</span>
                <span>Router</span>
                <span>Components</span>
                <span>Performance</span>
              </div>
              <div class="space-y-1">
                <div class="flex justify-between">
                  <span class="text-[var(--content-muted)]">count</span>
                  <span class="text-emerald-400">5</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-[var(--content-muted)]">doubled</span>
                  <span class="text-sky-400">10</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-[var(--content-muted)]">isNegative</span>
                  <span class="text-orange-400">false</span>
                </div>
              </div>
            </div>
            <ApiTable rows={() => getTabsInfo()} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('devtools.timeTravel')}
          id="time-travel"
          description={() => t('devtools.timeTravelDesc')}
        >
          <CodeBlock code={TIME_TRAVEL_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('devtools.standalone')}
          id="standalone"
          description={() => t('devtools.standaloneDesc')}
        >
          <CodeBlock code={STANDALONE_CODE} language="typescript" />
        </DocSection>
      </div>
    );
  },
});
