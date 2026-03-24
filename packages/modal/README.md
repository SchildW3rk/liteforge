# @liteforge/modal

Signal-based modal system for LiteForge with focus trap, CSS transitions, and confirm/alert/prompt presets.

## Installation

```bash
npm install @liteforge/modal @liteforge/core @liteforge/runtime
```

Peer dependencies: `@liteforge/core >= 0.1.0`, `@liteforge/runtime >= 0.1.0`

## Overview

`@liteforge/modal` provides a declarative modal system built on LiteForge signals. Modals are created once (e.g. in `setup()`), opened and closed reactively, and rendered into a dedicated portal container that sits next to the app root.

The registry uses a `globalThis` singleton, which means modals defined in lazily loaded chunks are visible to the `ModalProvider` in the main bundle without any additional configuration.

## Setup

Register `modalPlugin` when creating your app. The plugin mounts a `ModalProvider` container next to your app root and registers the modal API under the `'modal'` context key.

```ts
import { createApp } from 'liteforge'
import { modalPlugin } from '@liteforge/modal'
import { App } from './App'

createApp({ root: App, target: '#app' })
  .use(modalPlugin())
  .mount()
```

### Plugin options

```ts
modalPlugin({ unstyled: true })  // skip default CSS injection
```

---

## Basic Usage

```tsx
import { createComponent, signal } from 'liteforge'
import { createModal } from '@liteforge/modal'

export const Settings = createComponent({
  setup() {
    const confirmDelete = createModal({
      config: {
        title: 'Delete account?',
        size: 'sm',
        closeOnBackdrop: true,
        closeOnEsc: true,
      },
      component: () => (
        <div>
          <p>This action cannot be undone.</p>
          <button onclick={() => confirmDelete.close()}>Cancel</button>
          <button onclick={() => { deleteAccount(); confirmDelete.close() }}>Delete</button>
        </div>
      )
    })

    return { confirmDelete }
  },
  component({ setup }) {
    return (
      <button onclick={() => setup.confirmDelete.open()}>
        Delete account
      </button>
    )
  }
})
```

### Passing data to a modal

Use the generic overload to type the data argument of `open()`:

```tsx
const editModal = createModal<{ userId: string }>({
  config: { title: 'Edit User' },
  component: (data) => <UserForm userId={data.userId} />
})

// open with data
editModal.open({ userId: '42' })
```

---

## Presets

`confirm`, `alert`, and `prompt` are Promise-based helpers built on `createModal`. They require no setup — `ModalProvider` must be mounted (via `modalPlugin`) for them to render.

### confirm

Returns `Promise<boolean>`. Resolves `true` when the user clicks OK, `false` on Cancel or external close.

```ts
import { confirm } from '@liteforge/modal'

const ok = await confirm('Are you sure you want to delete this item?')
if (ok) {
  await deleteItem()
}
```

### alert

Returns `Promise<void>`. Resolves when the user clicks OK.

```ts
import { alert } from '@liteforge/modal'

await alert('Your changes have been saved.')
```

### prompt

Returns `Promise<string | null>`. Resolves with the entered string, or `null` if cancelled.

```ts
import { prompt } from '@liteforge/modal'

const name = await prompt('Enter your name:', 'Jane Doe')
if (name !== null) {
  rename(name)
}
```

All presets accept an optional `config` argument (partial `ModalConfig`) to override title, size, and other options:

```ts
await confirm('Proceed?', { title: 'Confirm action', size: 'md' })
```

---

## Without the plugin

If you prefer manual setup, mount `ModalProvider` directly and place it in your app's DOM:

```ts
import { ModalProvider } from '@liteforge/modal'

const provider = ModalProvider()          // or ModalProvider({ unstyled: true })
document.body.appendChild(provider)
```

`createModal` calls then work without any plugin registration.

---

## API

### createModal(options)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `config.title` | `string` | `''` | Modal header title |
| `config.size` | `'sm' \| 'md' \| 'lg' \| 'xl' \| 'full'` | `'md'` | Width preset |
| `config.closable` | `boolean` | `true` | Show the × close button |
| `config.closeOnBackdrop` | `boolean` | `true` | Close when clicking the backdrop |
| `config.closeOnEsc` | `boolean` | `true` | Close on Escape key |
| `config.unstyled` | `boolean` | `false` | Skip default CSS injection |
| `config.styles` | `ModalStyles` | `{}` | Per-instance CSS variable overrides |
| `config.classes` | `ModalClasses` | `{}` | BEM class name overrides |
| `config.onOpen` | `() => void` | — | Callback fired when modal opens |
| `config.onClose` | `() => void` | — | Callback fired when modal closes |
| `component` | `() => Node` or `(data: TData) => Node` | required | Content factory |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `isOpen` | `Signal<boolean>` | Reactive open state |
| `open` | `(data?: TData) => void` | Open the modal |
| `close` | `() => void` | Close the modal |
| `toggle` | `() => void` | Toggle open/closed |
| `destroy` | `() => void` | Close and remove from registry |

### ModalProvider(options?)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `unstyled` | `boolean` | `false` | Skip default CSS injection |

Returns an `HTMLElement` (the portal container). Reactively renders all open modals.

### confirm(message, config?)

```ts
confirm(message: string, config?: Partial<ModalConfig>): Promise<boolean>
```

### alert(message, config?)

```ts
alert(message: string, config?: Partial<ModalConfig>): Promise<void>
```

### prompt(message, defaultValue?, config?)

```ts
prompt(message: string, defaultValue?: string, config?: Partial<ModalConfig>): Promise<string | null>
```

### modalPlugin(options?)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `unstyled` | `boolean` | `false` | Skip default CSS injection |

Returns a `LiteForgePlugin`. Provides `'modal'` context key with `{ open, confirm, alert, prompt }`.

---

## Styling

Default styles use BEM classes and CSS custom properties. Override tokens globally or per-instance:

```css
/* Global override */
:root {
  --lf-modal-bg: #1e1e2e;
  --lf-modal-header-bg: #181825;
  --lf-modal-header-color: #cdd6f4;
  --lf-modal-body-color: #bac2de;
  --lf-modal-backdrop: rgba(0, 0, 0, 0.6);
  --lf-modal-border-radius: 12px;
  --lf-modal-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}
```

Per-instance via `config.styles`:

```ts
createModal({
  config: {
    styles: {
      bg: '#fff',
      borderRadius: '4px',
    }
  },
  component: () => <p>Content</p>
})
```

Override class names entirely via `config.classes`:

```ts
createModal({
  config: {
    classes: {
      overlay: 'my-overlay',
      modal: 'my-modal',
      header: 'my-header',
      body: 'my-body',
    }
  },
  component: () => <p>Content</p>
})
```

---

## Types

```ts
import type {
  ModalConfig,
  ModalSize,
  ModalStyles,
  ModalClasses,
  ModalResult,
  ModalResultNoData,
  CreateModalOptions,
  CreateModalOptionsNoData,
  ModalApi
} from '@liteforge/modal'
```

## License

MIT
