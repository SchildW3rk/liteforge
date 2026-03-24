// No imports — pure string constants

export const INTEGRATION_CODE = `// main.tsx
import { createApp } from 'liteforge';

await createApp({ root: App, target: '#app' })
  // useDev() is tree-shaken from production builds automatically
  .useDev(() => import('@liteforge/devtools').then(m => m.devtoolsPlugin({
    shortcut:   'ctrl+shift+d',   // toggle panel
    position:   'right',          // 'right' | 'bottom' | 'floating'
    defaultTab: 'signals',
    width:      360,
    maxEvents:  1000,
  })))
  .mount();`

export const INSTALL_CODE = `pnpm add -D @liteforge/devtools`
export const IMPORT_CODE = `import { devtoolsPlugin } from '@liteforge/devtools';`

export const TIME_TRAVEL_CODE = `// Stores tab → click any history entry to rewind

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
// Live effects and computed values re-run automatically.`

export const STANDALONE_CODE = `// Attach DevTools without createApp — useful for plain scripts
import { createDevTools } from '@liteforge/devtools';

const dt = createDevTools({
  position: 'bottom',
  stores: { counter: counterStore },
});

dt.open();
dt.close();`
