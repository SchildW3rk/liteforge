/**
 * Fullstack entry.
 *
 *   bun run dev               → HMR dev server (default)
 *   LF_MODE=listen bun run start  → production server
 *   LF_MODE=build bun run build   → emits dist/
 *
 * The same `app` const is consumed by src/client.ts on the browser via
 * `await app.mount()`.
 */

import { defineApp, defineDocument } from '@liteforge/server'
import { routerPlugin, defineRouter, createBrowserHistory } from '@liteforge/router'
import { toastPlugin } from '@liteforge/toast'
import { AppShell } from './AppShell.js'
import { HomePage } from './pages/Home.js'
import { AboutPage } from './pages/About.js'
import { greetingsModule } from './server/greetings.server.js'

export const app = defineApp({
  root: AppShell,
  target: '#app',
  document: defineDocument({
    lang: 'en',
    head: {
      title: 'LiteForge Starter',
      description: 'Fullstack Bun starter with typed RPC',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      links: [{ rel: 'stylesheet', href: '/styles.css' }],
    },
  }),
})
  .serverModules({ greetings: greetingsModule })
  // Lazy factory — createBrowserHistory() reads `window`, which doesn't exist
  // server-side. The factory is only evaluated by .mount() on the client.
  .use(() => routerPlugin(defineRouter({
    history: createBrowserHistory(),
    routes: [
      { path: '/', component: HomePage },
      { path: '/about', component: AboutPage },
    ],
  })))
  .use(toastPlugin({ position: 'bottom-right' }))

if (import.meta.main) {
  const mode = process.env['LF_MODE'] ?? 'dev'
  const port = Number(process.env['PORT'] ?? 3000)
  const clientEntry = './src/client.ts'

  if (mode === 'listen') {
    const handle = await app.listen({ port, clientEntry })
    console.log(`Production server at http://localhost:${handle.port}`)
  } else if (mode === 'build') {
    const outDir = process.env['OUT_DIR'] ?? './dist'
    const result = await app.build({ clientEntry, outDir })
    console.log(`Built → ${result.outDir}`)
    for (const f of result.files) console.log(`  ${f}`)
  } else {
    const handle = await app.dev({ port, clientEntry })
    console.log(`Dev server at http://localhost:${handle.port}`)
    console.log('  HMR active — save a file under ./src to reload the browser.')
  }
}
