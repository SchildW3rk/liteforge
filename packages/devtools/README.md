# @liteforge/devtools

Debug panel for LiteForge applications with signal inspection, store time-travel, and performance monitoring.

## Installation

```bash
npm install @liteforge/devtools @liteforge/core
```

Peer dependency: `@liteforge/core >= 0.1.0`

## Setup

```ts
import { createApp } from '@liteforge/runtime'
import { devtoolsPlugin } from '@liteforge/devtools'

createApp({
  plugins: [
    devtoolsPlugin({
      shortcut: 'ctrl+shift+d',  // Toggle shortcut
      position: 'bottom',         // 'bottom' | 'right' | 'left'
      height: 300,                // Panel height in pixels
      defaultTab: 'signals'       // Initial tab
    })
  ]
}).mount(App)
```

## Features

The devtools panel has five tabs:

### Signals Tab

- View all active signals and their current values
- See update counts for each signal
- Track dependency relationships
- Filter by signal name

### Stores Tab

- Inspect all registered stores
- View current state tree
- **Time-travel debugging** — restore any previous state
- Track state changes over time

### Router Tab

- View navigation history
- See guard execution results
- Monitor route timing
- Inspect current route params and query

### Components Tab

- Component tree visualization
- Mount/unmount tracking
- Component instance counts
- Lifecycle timing

### Performance Tab

- Signal updates per second
- Effect executions
- Component mount/unmount rate
- Memory usage indicators

## API

### devtoolsPlugin

Creates the devtools plugin for `createApp`.

```ts
import { devtoolsPlugin } from '@liteforge/devtools'

devtoolsPlugin({
  // Keyboard shortcut to toggle panel
  shortcut: 'ctrl+shift+d',
  
  // Panel position
  position: 'bottom',  // 'bottom' | 'right' | 'left'
  
  // Panel size
  height: 300,         // For bottom position
  width: 400,          // For left/right position
  
  // Initial tab
  defaultTab: 'signals',
  
  // Enable in production (default: false)
  enableInProduction: false,
  
  // Buffer size for events
  bufferSize: 1000
})
```

### createDevTools

For standalone usage without `createApp`:

```ts
import { createDevTools } from '@liteforge/devtools'
import { storeRegistry } from '@liteforge/store'

const devtools = createDevTools({
  stores: storeRegistry,
  shortcut: 'ctrl+shift+d'
})

// Manual control
devtools.show()
devtools.hide()
devtools.toggle()
devtools.destroy()
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` | Toggle panel (default) |
| `Escape` | Close panel |
| `1-5` | Switch tabs (when panel focused) |

## Time-Travel Debugging

The Stores tab supports time-travel debugging:

1. Make changes to store state
2. Open the Stores tab
3. See state history with timestamps
4. Click any history entry to restore that state

```ts
// State changes are automatically recorded
userStore.actions.login(user)
userStore.actions.updateProfile(profile)

// In devtools, you can:
// - See each state change
// - Click to restore any previous state
// - Continue from that point
```

## Conditional Loading

Only load devtools in development:

```ts
import { createApp } from '@liteforge/runtime'

const plugins = []

if (import.meta.env.DEV) {
  const { devtoolsPlugin } = await import('@liteforge/devtools')
  plugins.push(devtoolsPlugin())
}

createApp({ plugins }).mount(App)
```

## Custom Panels

Extend devtools with custom panels (advanced):

```ts
import { createDevTools } from '@liteforge/devtools'

const devtools = createDevTools({
  stores: storeRegistry,
  customPanels: [
    {
      id: 'network',
      label: 'Network',
      render: () => {
        // Return DOM element
        const div = document.createElement('div')
        div.innerHTML = '<h3>Network Requests</h3>'
        return div
      }
    }
  ]
})
```

## Types

```ts
import type {
  DevToolsConfig,
  DevToolsInstance,
  PanelPosition,
  TabId,
  PanelState,
  SignalInfo,
  StoreInfo,
  StoreHistoryEntry,
  NavigationInfo,
  ComponentInfo,
  PerformanceCounters
} from '@liteforge/devtools'
```

## License

MIT
