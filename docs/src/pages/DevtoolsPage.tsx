import { createComponent } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { ApiTable } from '../components/ApiTable.js';
import type { ApiRow } from '../components/ApiTable.js';

// ─── Code strings ─────────────────────────────────────────────────────────────

const INTEGRATION_CODE = `// main.tsx
import { createApp } from 'liteforge';
import { devtoolsPlugin } from 'liteforge/devtools';

await createApp({
  root: App,
  target: '#app',
  router,
  plugins: [
    devtoolsPlugin({
      shortcut:    'ctrl+shift+d',   // toggle panel
      position:    'right',          // 'right' | 'bottom' | 'floating'
      defaultTab:  'signals',
      width:       360,
      maxEvents:   1000,
    }),
  ],
});`;

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

// ─── API rows ─────────────────────────────────────────────────────────────────

const CONFIG_API: ApiRow[] = [
  { name: 'shortcut', type: 'string', default: "'ctrl+shift+d'", description: 'Keyboard shortcut to toggle the panel open/closed' },
  { name: 'position', type: "'right' | 'bottom' | 'floating'", default: "'right'", description: 'Where the panel docks — right side, bottom, or floating' },
  { name: 'defaultTab', type: "'signals' | 'stores' | 'router' | 'components' | 'performance'", default: "'signals'", description: 'Which tab is active when the panel opens' },
  { name: 'width', type: 'number', default: '360', description: 'Panel width in px — applies when position is right' },
  { name: 'height', type: 'number', default: '300', description: 'Panel height in px — applies when position is bottom' },
  { name: 'maxEvents', type: 'number', default: '1000', description: 'Maximum number of events kept in the circular buffer' },
];

const TABS_INFO: ApiRow[] = [
  { name: 'Signals', type: 'tab', description: 'Live list of all active signals — ID, current value, read/write counts, and last update timestamp' },
  { name: 'Stores', type: 'tab', description: 'Per-store state inspector with time-travel history — click any past action to restore state' },
  { name: 'Router', type: 'tab', description: 'Current route, matched params, navigation history, and guard evaluation log' },
  { name: 'Components', type: 'tab', description: 'Registered component tree — shows which components are mounted, their HMR IDs, and re-render counts' },
  { name: 'Performance', type: 'tab', description: 'Effect/computed evaluation timeline, slow-render warnings, and signal fan-out graph' },
];

export const DevtoolsPage = createComponent({
  name: 'DevtoolsPage',
  component() {
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/devtools</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">DevTools</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            In-browser debug panel for LiteForge applications. Inspect signals,
            stores, router state, and component trees. Includes time-travel debugging
            for store history.
          </p>
          <CodeBlock code={INSTALL_CODE} language="bash" />
          <CodeBlock code={IMPORT_CODE} language="typescript" />
        </div>

        <DocSection
          title="Integration"
          id="integration"
          description="Pass devtoolsPlugin() in the plugins array to createApp(). It only activates in development mode — tree-shaken from production builds."
        >
          <CodeBlock code={INTEGRATION_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Configuration"
          id="config"
          description="All options are optional — sensible defaults apply. The shortcut, position, and maxEvents are the most commonly customized."
        >
          <ApiTable rows={CONFIG_API} />
        </DocSection>

        <DocSection
          title="Panel tabs"
          id="tabs"
          description="The panel has 5 tabs. Each tab shows a live view of a different aspect of your application."
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
            <ApiTable rows={TABS_INFO} />
          </div>
        </DocSection>

        <DocSection
          title="Time-travel debugging"
          id="time-travel"
          description="The Stores tab records every action dispatch. Click any past entry to rewind all signals to that snapshot."
        >
          <CodeBlock code={TIME_TRAVEL_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="Standalone usage"
          id="standalone"
          description="createDevTools() lets you attach DevTools without createApp() — useful for testing or non-SPA contexts."
        >
          <CodeBlock code={STANDALONE_CODE} language="typescript" />
        </DocSection>
      </div>
    );
  },
});
