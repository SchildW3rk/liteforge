# @liteforge/toast

Toast notification system for LiteForge with Promise support and configurable positioning.

## Installation

```bash
npm install @liteforge/toast @liteforge/core @liteforge/runtime
```

Peer dependencies: `@liteforge/core >= 0.1.0`, `@liteforge/runtime >= 0.1.0`

## Overview

`@liteforge/toast` provides a signal-driven toast stack. Toasts are created imperatively via the `toast` object and rendered by a `ToastProvider` container. The recommended approach is to register `toastPlugin` when bootstrapping the app — it mounts the provider automatically and exposes `toast` via the app context.

## Setup

```ts
import { createApp } from 'liteforge'
import { toastPlugin } from '@liteforge/toast'
import { App } from './App'

createApp({ root: App, target: '#app' })
  .use(toastPlugin({
    position: 'bottom-right',   // default
    duration: 4000,             // ms, 0 = persistent
    pauseOnHover: true,
    closable: true,
  }))
  .mount()
```

### Plugin options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `position` | `ToastPosition` | `'bottom-right'` | Where toasts appear |
| `duration` | `number` | `4000` | Auto-dismiss delay in ms. `0` = persistent |
| `pauseOnHover` | `boolean` | `true` | Pause countdown on hover |
| `closable` | `boolean` | `true` | Show close button on each toast |
| `unstyled` | `boolean` | `false` | Skip default CSS injection |

**Positions:** `'top-left'`, `'top-center'`, `'top-right'`, `'bottom-left'`, `'bottom-center'`, `'bottom-right'`

---

## Basic Usage

```ts
import { toast } from '@liteforge/toast'

toast.success('Profile saved!')
toast.error('Something went wrong.')
toast.warning('Your session expires soon.')
toast.info('New version available.')
```

Each method returns the toast `id` (a `string`) in case you need to dismiss it programmatically.

### Per-toast options

```ts
toast.success('Saved!', {
  duration: 6000,
  pauseOnHover: false,
  closable: false,
})

// Persistent toast (never auto-dismisses)
const id = toast.info('Uploading…', { duration: 0 })

// Dismiss later
toast.dismiss(id)

// Dismiss all
toast.dismissAll()
```

---

## Promise toast

Track a Promise through its loading, success, and error states with a single call:

```ts
import { toast } from '@liteforge/toast'

const result = await toast.promise(
  uploadFile(file),
  {
    loading: 'Uploading file…',
    success: (res) => `Uploaded ${res.filename} successfully!`,
    error: (err) => `Upload failed: ${err.message}`,
  }
)
```

The `loading` toast stays visible until the Promise settles. `success` and `error` can be a static string or a function that receives the resolved value or rejection reason.

---

## Accessing toast via context

When `toastPlugin` is registered, `toast` is available anywhere via `use('toast')`:

```tsx
import { createComponent, use } from 'liteforge'

export const SaveButton = createComponent({
  component() {
    const toast = use('toast')

    async function save() {
      await toast.promise(
        api.save(data()),
        { loading: 'Saving…', success: 'Saved!', error: 'Save failed.' }
      )
    }

    return <button onclick={save}>Save</button>
  }
})
```

---

## Without the plugin

Mount `ToastProvider` manually if you prefer not to use the plugin:

```ts
import { ToastProvider } from '@liteforge/toast'

const provider = ToastProvider({ position: 'top-right' })
document.body.appendChild(provider)
```

Then call `toast` directly anywhere in your app.

---

## API

### toast

| Method | Signature | Description |
|--------|-----------|-------------|
| `toast.success` | `(message, options?) => string` | Show a success toast |
| `toast.error` | `(message, options?) => string` | Show an error toast |
| `toast.warning` | `(message, options?) => string` | Show a warning toast |
| `toast.info` | `(message, options?) => string` | Show an info toast |
| `toast.promise` | `(promise, messages, options?) => Promise<T>` | Track a Promise |
| `toast.dismiss` | `(id) => void` | Remove a specific toast |
| `toast.dismissAll` | `() => void` | Remove all toasts |

### ToastProvider(options?)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `position` | `ToastPosition` | `'bottom-right'` | Stack position |
| `unstyled` | `boolean` | `false` | Skip default CSS injection |

Returns an `HTMLElement` that renders the toast stack reactively.

### ToastOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `duration` | `number` | `4000` | Auto-dismiss delay in ms. `0` = persistent |
| `pauseOnHover` | `boolean` | `true` | Pause countdown on hover |
| `closable` | `boolean` | `true` | Show close button |

### ToastPromiseMessages

| Property | Type | Description |
|----------|------|-------------|
| `loading` | `string` | Shown while the Promise is pending |
| `success` | `string \| ((result) => string)` | Shown on resolve |
| `error` | `string \| ((err) => string)` | Shown on reject |

---

## Low-level Store

The signal-based toast store is exported for advanced use cases:

```ts
import { toasts, addToast, removeToast, clearToasts, toastConfig } from '@liteforge/toast'

// Read current toasts (Signal<ToastEntry[]>)
toasts()

// Programmatically add a toast
addToast('success', 'Done!', { duration: 3000 })

// Read or update global config
toastConfig()
toastConfig.update(cfg => ({ ...cfg, duration: 2000 }))
```

---

## Types

```ts
import type {
  ToastType,
  ToastPosition,
  ToastOptions,
  ToastEntry,
  ToastPromiseMessages,
  ToastPluginOptions
} from '@liteforge/toast'
```

## License

MIT
