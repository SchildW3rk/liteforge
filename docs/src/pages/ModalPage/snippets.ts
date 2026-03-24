// No imports — pure string constants

export const SETUP_CODE = `// main.tsx — mount ModalProvider once at app root
import { ModalProvider } from '@liteforge/modal';

document.body.appendChild(ModalProvider());

await createApp({ root: App, target: '#app', router });`;

export const BASIC_CODE = `import { createModal } from '@liteforge/modal';

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

export const PRESETS_CODE = `import { confirm, alert, prompt } from '@liteforge/modal';

// Confirm — resolves to boolean
const ok = await confirm('Delete this record?');
if (ok) await api.delete(id);

// Alert — resolves when dismissed
await alert('Saved successfully!');

// Prompt — resolves to string | null (null = cancelled)
const name = await prompt('Enter your name:', 'Ada Lovelace');
if (name !== null) saveProfile({ name });`;

export const LIVE_CODE = `const modal = createModal({
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
