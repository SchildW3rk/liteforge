import stylesUrl from '../css/styles.css?url';

let injected = false;

export function injectAdminStyles(): void {
  if (injected) return;
  if (typeof document === 'undefined') return; // SSR safety
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = stylesUrl;
  link.setAttribute('data-lf-admin', '');
  document.head.appendChild(link);
  injected = true;
}

export function resetStylesInjection(): void {
  injected = false;
  document.querySelector('link[data-lf-admin]')?.remove();
}
