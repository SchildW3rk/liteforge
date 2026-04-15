import type { LiteForgePlugin, PluginContext } from '@liteforge/runtime';
import { toastConfig } from './store.js';
import { ToastProvider } from './provider.js';
import { toast } from './toast.js';
import type { ToastPluginOptions } from './types.js';

export function toastPlugin(options?: ToastPluginOptions): LiteForgePlugin {
  return {
    name: 'toast',
    install(context: PluginContext): () => void {
      // Apply global config overrides
      if (options?.duration !== undefined || options?.pauseOnHover !== undefined || options?.closable !== undefined) {
        toastConfig.update(cfg => ({
          duration: options.duration ?? cfg.duration,
          pauseOnHover: options.pauseOnHover ?? cfg.pauseOnHover,
          closable: options.closable ?? cfg.closable,
        }));
      }

      context.provide('toast', toast);

      const container = document.createElement('div');
      container.id = 'liteforge-toast-root';

      const parent = context.target.parentElement;
      const next = context.target.nextSibling;
      if (parent) {
        parent.insertBefore(container, next);
      }

      const providerOpts: Parameters<typeof ToastProvider>[0] = {
        position: options?.position ?? 'bottom-right',
      };
      if (options?.unstyled === true) providerOpts.unstyled = true;
      if (options?.styles) providerOpts.styles = options.styles;
      if (options?.classes) providerOpts.classes = options.classes;
      const provider = ToastProvider(providerOpts);
      container.appendChild(provider);

      return () => {
        container.parentNode?.removeChild(container);
      };
    },
  };
}

declare module '@liteforge/runtime' {
  interface PluginRegistry {
    toast: typeof toast;
  }
}
