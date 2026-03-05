import { h } from '@liteforge/runtime';

export interface ConfirmDialogOptions {
  message: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function ConfirmDialog(options: ConfirmDialogOptions): Node {
  const { message, onConfirm, onCancel } = options;

  const confirmBtn = h('button', { class: 'lf-admin-btn lf-admin-btn--danger' }, 'Confirm') as HTMLButtonElement;
  confirmBtn.addEventListener('click', () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = '...';
    onConfirm().then(() => {
      overlay.remove();
    }).catch(() => {
      overlay.remove();
    });
  });

  const overlay = h('div', { class: 'lf-admin-overlay' },
    h('div', { class: 'lf-admin-dialog' },
      h('p', { class: 'lf-admin-dialog__title' }, 'Confirm'),
      h('p', { class: 'lf-admin-dialog__message' }, message),
      h('div', { class: 'lf-admin-dialog__actions' },
        h('button', { class: 'lf-admin-btn lf-admin-btn--ghost', onclick: () => {
          (overlay as HTMLElement).remove();
          onCancel();
        } }, 'Cancel'),
        confirmBtn,
      ),
    ),
  ) as HTMLElement;

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      onCancel();
    }
  });

  return overlay;
}
