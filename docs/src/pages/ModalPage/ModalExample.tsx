import { createComponent, signal } from 'liteforge';
import { createModal, confirm, alert, prompt } from '@liteforge/modal';
import { Button } from '../../components/Button.js';

export const ModalExample = createComponent({
  name: 'ModalExample',
  component() {
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
  },
});
