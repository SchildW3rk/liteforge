import { createComponent } from 'liteforge';
import { createModal, confirm, alert, prompt } from 'liteforge/modal';
import { signal } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import { Button } from '../components/Button.js';
import type { ApiRow } from '../components/ApiTable.js';

// ─── Live example ─────────────────────────────────────────────────────────────

function ModalExample(): Node {
  const lastResult = signal<string>('');

  const basicModal = createModal({
    config: { title: 'Hello from LiteForge', size: 'sm', closable: true },
    component: () => (
      <div class="space-y-4">
        <p class="text-sm text-[var(--content-secondary)]">
          This modal is managed by <code class="text-indigo-400 text-xs bg-[var(--surface-overlay)] px-1 py-0.5 rounded">@liteforge/modal</code>.
          It lives in a portal outside your app root, and is driven by a signal.
        </p>
        <Button variant="primary" onclick={() => basicModal.close()}>Close</Button>
      </div>
    ),
  });

  async function handleConfirm() {
    const ok = await confirm('Do you want to proceed with this action?');
    lastResult.set(ok ? 'Confirmed: yes' : 'Confirmed: cancelled');
  }

  async function handleAlert() {
    await alert('Operation completed successfully!');
    lastResult.set('Alert: dismissed');
  }

  async function handlePrompt() {
    const value = await prompt('Enter your name:', 'Ada Lovelace');
    lastResult.set(value !== null ? `Prompt: "${value}"` : 'Prompt: cancelled');
  }

  return (
    <div class="space-y-4 max-w-sm">
      <div class="flex flex-wrap gap-2">
        <Button variant="primary" onclick={() => basicModal.open()}>Open modal</Button>
        <Button variant="neutral" onclick={handleConfirm}>confirm()</Button>
        <Button variant="neutral" onclick={handleAlert}>alert()</Button>
        <Button variant="neutral" onclick={handlePrompt}>prompt()</Button>
      </div>

      {() => lastResult() !== ''
        ? (
          <div class="px-3 py-2 rounded bg-[var(--surface-overlay)] border border-[var(--line-default)] text-sm font-mono text-emerald-400">
            {() => lastResult()}
          </div>
        )
        : null}
    </div>
  );
}

// ─── Code strings ─────────────────────────────────────────────────────────────

const SETUP_CODE = `// main.tsx — mount ModalProvider once at app root
import { ModalProvider } from 'liteforge/modal';

document.body.appendChild(ModalProvider());

await createApp({ root: App, target: '#app', router });`;

const BASIC_CODE = `import { createModal } from 'liteforge/modal';

const modal = createModal({
  config: {
    title:           'Confirm action',
    size:            'md',       // 'sm' | 'md' | 'lg' | 'xl' | 'full'
    closable:        true,       // show × button
    closeOnBackdrop: true,       // click outside to close
    closeOnEsc:      true,       // Escape key closes
    onOpen:  () => console.log('opened'),
    onClose: () => console.log('closed'),

    // Per-instance style overrides (CSS variables)
    styles: {
      bg:           '#0f0f0f',
      headerBg:     '#171717',
      headerColor:  '#f5f5f5',
      bodyColor:    '#a3a3a3',
      borderRadius: '12px',
    },

    // Per-instance BEM class overrides
    classes: {
      overlay: 'my-overlay',
      modal:   'my-modal',
      body:    'my-modal-body',
    },
  },
  component: () => (
    <div>
      <p>Are you sure you want to delete this item?</p>
      <div class="flex gap-2 mt-4 justify-end">
        <button onclick={() => modal.close()}>Cancel</button>
        <button onclick={() => { deleteItem(); modal.close(); }}>Delete</button>
      </div>
    </div>
  ),
});

modal.open();    // show
modal.close();   // hide
modal.toggle();  // toggle
modal.destroy(); // remove from DOM`;

const PRESETS_CODE = `import { confirm, alert, prompt } from 'liteforge/modal';

// Confirm — resolves to boolean
const ok = await confirm('Delete this record?');
if (ok) await api.delete(id);

// Alert — resolves when dismissed
await alert('Saved successfully!');

// Prompt — resolves to string | null (null = cancelled)
const name = await prompt('Enter your name:', 'Ada Lovelace');
if (name !== null) saveProfile({ name });`;

const LIVE_CODE = `const modal = createModal({
  config: { title: 'Hello', size: 'sm', closable: true },
  component: () => (
    <div>
      <p>Modal content here</p>
      <button onclick={() => modal.close()}>Close</button>
    </div>
  ),
});

modal.open();

// Presets
const ok    = await confirm('Proceed?');
await alert('Done!');
const value = await prompt('Enter name:', 'Ada');`;

// ─── API rows ─────────────────────────────────────────────────────────────────

const CONFIG_API: ApiRow[] = [
  { name: 'title', type: 'string', description: 'Modal header title' },
  { name: 'size', type: "'sm' | 'md' | 'lg' | 'xl' | 'full'", default: "'md'", description: 'Width of the modal dialog' },
  { name: 'closable', type: 'boolean', default: 'true', description: 'Show × close button in the header' },
  { name: 'closeOnBackdrop', type: 'boolean', default: 'true', description: 'Close when clicking the backdrop' },
  { name: 'closeOnEsc', type: 'boolean', default: 'true', description: 'Close when pressing the Escape key' },
  { name: 'unstyled', type: 'boolean', default: 'false', description: 'Skip default CSS injection — bring your own styles' },
  { name: 'styles', type: 'ModalStyles', description: 'Per-instance CSS variable overrides (bg, headerBg, headerColor, bodyColor, closeColor, backdrop, shadow, borderRadius)' },
  { name: 'classes', type: 'ModalClasses', description: 'Per-instance BEM class overrides (overlay, modal, header, title, close, body)' },
  { name: 'onOpen', type: '() => void', description: 'Called when the modal opens' },
  { name: 'onClose', type: '() => void', description: 'Called when the modal closes' },
];

const INSTANCE_API: ApiRow[] = [
  { name: 'isOpen', type: 'Signal<boolean>', description: 'Reactive open/closed state' },
  { name: 'open()', type: 'void', description: 'Show the modal' },
  { name: 'close()', type: 'void', description: 'Hide the modal' },
  { name: 'toggle()', type: 'void', description: 'Toggle open/closed' },
  { name: 'destroy()', type: 'void', description: 'Remove the modal from the DOM entirely' },
];

const PRESET_API: ApiRow[] = [
  { name: 'confirm(message, config?)', type: 'Promise<boolean>', description: 'Show a confirmation dialog — resolves true (OK) or false (Cancel)' },
  { name: 'alert(message, config?)', type: 'Promise<void>', description: 'Show an alert dialog — resolves when dismissed' },
  { name: 'prompt(message, default?, config?)', type: 'Promise<string | null>', description: 'Show an input dialog — resolves with the entered string, or null if cancelled' },
];

export const ModalPage = createComponent({
  name: 'ModalPage',
  component() {
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/modal</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">Modal</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            Portal-based modal system with focus trap, keyboard handling, and CSS transitions.
            Includes ready-made <code class="text-indigo-400 text-sm">confirm()</code>,{' '}
            <code class="text-indigo-400 text-sm">alert()</code>, and{' '}
            <code class="text-indigo-400 text-sm">prompt()</code> presets.
          </p>
          <CodeBlock code={`pnpm add @liteforge/modal`} language="bash" />
          <CodeBlock code={`import { createModal, confirm, alert, prompt } from 'liteforge/modal';`} language="typescript" />
        </div>

        <DocSection
          title="Setup — ModalProvider"
          id="setup"
          description="Mount ModalProvider once in main.tsx. It creates a portal div that modals render into — outside your app root."
        >
          <CodeBlock code={SETUP_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title="createModal()"
          id="create-modal"
          description="Create a modal instance with config and a component function. The component renders your modal content using JSX."
        >
          <div>
            <CodeBlock code={BASIC_CODE} language="tsx" />
            <ApiTable rows={CONFIG_API} />
            <ApiTable rows={INSTANCE_API} />
          </div>
        </DocSection>

        <DocSection
          title="Presets"
          id="presets"
          description="confirm(), alert(), and prompt() return Promises. Use them with async/await for clean imperative code."
        >
          <div>
            <CodeBlock code={PRESETS_CODE} language="typescript" />
            <ApiTable rows={PRESET_API} />
          </div>
        </DocSection>

        <DocSection
          title="Live example"
          id="live"
          description="Try all four modal types. Results are shown below the buttons."
        >
          <LiveExample
            title="Modal — createModal + presets"
            description="Open modal, then try confirm / alert / prompt"
            component={ModalExample}
            code={LIVE_CODE}
          />
        </DocSection>
      </div>
    );
  },
});
