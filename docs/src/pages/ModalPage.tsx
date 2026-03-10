import { createComponent, use } from 'liteforge';
import { createModal, confirm, alert, prompt } from 'liteforge/modal';
import { signal } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import { Button } from '../components/Button.js';
import type { ApiRow } from '../components/ApiTable.js';
import { setToc } from '../toc.js';

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

export const ModalPage = createComponent({
  name: 'ModalPage',
  component() {
    const { t } = use('i18n');

    const getConfigApi = (): ApiRow[] => [
      { name: 'title', type: 'string', description: t('modal.apiTitle') },
      { name: 'size', type: "'sm' | 'md' | 'lg' | 'xl' | 'full'", default: "'md'", description: t('modal.apiSize') },
      { name: 'closable', type: 'boolean', default: 'true', description: t('modal.apiClosable') },
      { name: 'closeOnBackdrop', type: 'boolean', default: 'true', description: t('modal.apiCloseOnBackdrop') },
      { name: 'closeOnEsc', type: 'boolean', default: 'true', description: t('modal.apiCloseOnEsc') },
      { name: 'unstyled', type: 'boolean', default: 'false', description: t('modal.apiUnstyled') },
      { name: 'styles', type: 'ModalStyles', description: t('modal.apiStyles') },
      { name: 'classes', type: 'ModalClasses', description: t('modal.apiClasses') },
      { name: 'onOpen', type: '() => void', description: t('modal.apiOnOpen') },
      { name: 'onClose', type: '() => void', description: t('modal.apiOnClose') },
    ];

    const getInstanceApi = (): ApiRow[] => [
      { name: 'isOpen', type: 'Signal<boolean>', description: t('modal.apiIsOpen') },
      { name: 'open()', type: 'void', description: t('modal.apiOpen') },
      { name: 'close()', type: 'void', description: t('modal.apiClose') },
      { name: 'toggle()', type: 'void', description: t('modal.apiToggle') },
      { name: 'destroy()', type: 'void', description: t('modal.apiDestroy') },
    ];

    const getPresetApi = (): ApiRow[] => [
      { name: 'confirm(message, config?)', type: 'Promise<boolean>', description: t('modal.apiConfirm') },
      { name: 'alert(message, config?)', type: 'Promise<void>', description: t('modal.apiAlert') },
      { name: 'prompt(message, default?, config?)', type: 'Promise<string | null>', description: t('modal.apiPrompt') },
    ];

    setToc([
      { id: 'setup',        label: () => t('modal.setup'),        level: 2 },
      { id: 'create-modal', label: () => t('modal.createModal'),  level: 2 },
      { id: 'presets',      label: () => t('modal.presets'),      level: 2 },
      { id: 'live',         label: () => t('modal.live'),         level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/modal</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('modal.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('modal.subtitlePre')}{' '}
            <code class="text-indigo-400 text-sm">confirm()</code>,{' '}
            <code class="text-indigo-400 text-sm">alert()</code>, {() => t('modal.subtitleAnd')}{' '}
            <code class="text-indigo-400 text-sm">prompt()</code> {() => t('modal.subtitleSuffix')}
          </p>
          <CodeBlock code={`pnpm add @liteforge/modal`} language="bash" />
          <CodeBlock code={`import { createModal, confirm, alert, prompt } from 'liteforge/modal';`} language="typescript" />
        </div>

        <DocSection
          title={() => t('modal.setup')}
          id="setup"
          description={() => t('modal.setupDesc')}
        >
          <CodeBlock code={SETUP_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('modal.createModal')}
          id="create-modal"
          description={() => t('modal.createModalDesc')}
        >
          <div>
            <CodeBlock code={BASIC_CODE} language="tsx" />
            <ApiTable rows={() => getConfigApi()} />
            <ApiTable rows={() => getInstanceApi()} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('modal.presets')}
          id="presets"
          description={() => t('modal.presetsDesc')}
        >
          <div>
            <CodeBlock code={PRESETS_CODE} language="typescript" />
            <ApiTable rows={() => getPresetApi()} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('modal.live')}
          id="live"
          description={() => t('modal.liveDesc')}
        >
          <LiveExample
            title={() => t('modal.liveTitle')}
            description={() => t('modal.liveDescEx')}
            component={ModalExample}
            code={LIVE_CODE}
          />
        </DocSection>
      </div>
    );
  },
});
