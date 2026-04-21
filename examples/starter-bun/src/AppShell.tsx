/**
 * App Shell — root component mounted into #app.
 *
 * Hosts the RouterOutlet. All route content (Home, About, etc.) renders
 * inside this shell.
 */

import { defineComponent } from 'liteforge'
import { RouterOutlet } from '@liteforge/router'

export const AppShell = defineComponent({
  name: 'AppShell',
  component() {
    return <RouterOutlet />
  },
})