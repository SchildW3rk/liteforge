/**
 * @liteforge/modal — modalPlugin
 *
 * Wraps ModalProvider as a formal LiteForgePlugin.
 * Inserts the modal root container next to the app target (not on body).
 * Registers the modal API under the 'modal' key in the app context.
 */

import type { LiteForgePlugin, PluginContext } from '@liteforge/runtime';
import { createModal } from './modal.js';
import { ModalProvider } from './provider.js';
import { confirm, alert, prompt } from './presets.js';

export interface ModalApi {
  open: typeof createModal;
  confirm: typeof confirm;
  alert: typeof alert;
  prompt: typeof prompt;
}

export function modalPlugin(options?: { unstyled?: boolean }): LiteForgePlugin {
  return {
    name: 'modal',
    install(context: PluginContext): () => void {
      const api: ModalApi = { open: createModal, confirm, alert, prompt };
      context.provide('modal', api);

      // Insert container next to #app, not on body
      const container = document.createElement('div');
      container.id = 'liteforge-modal-root';

      const parent = context.target.parentElement;
      const next = context.target.nextSibling;
      if (parent) {
        parent.insertBefore(container, next);
      }

      const provider = options?.unstyled ? ModalProvider({ unstyled: true }) : ModalProvider();
      container.appendChild(provider);

      return () => {
        container.parentNode?.removeChild(container);
      };
    },
  };
}

declare module '@liteforge/runtime' {
  interface PluginRegistry {
    modal: ModalApi;
  }
}
