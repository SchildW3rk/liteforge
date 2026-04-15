import { signal } from '@liteforge/core';
import type { ToastEntry, ToastOptions, ToastType } from './types.js';

export const toasts = signal<ToastEntry[]>([]);

export interface ToastConfig {
  duration: number;
  pauseOnHover: boolean;
  closable: boolean;
}

export const toastConfig = signal<ToastConfig>({
  duration: 4000,
  pauseOnHover: true,
  closable: true,
});

export function addToast(type: ToastType, message: string, options?: ToastOptions): string {
  const cfg = toastConfig();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const entry: ToastEntry = {
    id,
    type,
    message,
    options: {
      duration: options?.duration ?? cfg.duration,
      pauseOnHover: options?.pauseOnHover ?? cfg.pauseOnHover,
      closable: options?.closable ?? cfg.closable,
      class: options?.class,
      styles: options?.styles,
    },
  };
  toasts.update(list => [...list, entry]);
  return id;
}

export function removeToast(id: string): void {
  toasts.update(list => list.filter(t => t.id !== id));
}

export function clearToasts(): void {
  toasts.set([]);
}
