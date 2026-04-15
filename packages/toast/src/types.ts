export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface ToastStyles {
  /** Inline style string for the container element */
  container?: string;
  /** Inline style string for each toast item */
  toast?: string;
  /** Inline style string for the icon span */
  icon?: string;
  /** Inline style string for the close button */
  close?: string;
}

export interface ToastClasses {
  /** Extra class(es) for the container element */
  container?: string;
  /** Extra class(es) for each toast item */
  toast?: string;
  /** Extra class(es) for success toasts */
  success?: string;
  /** Extra class(es) for error toasts */
  error?: string;
  /** Extra class(es) for warning toasts */
  warning?: string;
  /** Extra class(es) for info toasts */
  info?: string;
  /** Extra class(es) for the icon span */
  icon?: string;
  /** Extra class(es) for the close button */
  close?: string;
}

export interface ToastOptions {
  /** Duration in ms. 0 = persistent. Default: 4000 */
  duration?: number;
  /** Pause auto-dismiss on hover. Default: true */
  pauseOnHover?: boolean;
  /** Show close button. Default: true */
  closable?: boolean;
  /** Extra class(es) added to this specific toast item */
  class?: string;
  /** Inline styles for this specific toast item (overrides provider-level styles) */
  styles?: Pick<ToastStyles, 'toast' | 'icon' | 'close'>;
}

export interface ToastEntry {
  readonly id: string;
  readonly type: ToastType;
  readonly message: string;
  readonly options: Required<Pick<ToastOptions, 'duration' | 'pauseOnHover' | 'closable'>> & Pick<ToastOptions, 'class' | 'styles'>;
}

export interface ToastPromiseMessages {
  loading: string;
  success: string | ((result: unknown) => string);
  error: string | ((err: unknown) => string);
}

export interface ToastPluginOptions {
  position?: ToastPosition;
  duration?: number;
  pauseOnHover?: boolean;
  closable?: boolean;
  unstyled?: boolean;
  styles?: ToastStyles;
  classes?: ToastClasses;
}
