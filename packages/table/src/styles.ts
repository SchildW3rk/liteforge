import stylesUrl from '../css/styles.css?url';

let stylesInjected = false;

export function injectDefaultStyles(): void {
  if (stylesInjected) return;
  if (typeof document === 'undefined') return; // SSR safety
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = stylesUrl;
  link.setAttribute('data-lf-table', '');
  document.head.appendChild(link);
  stylesInjected = true;
}

export function resetStylesInjection(): void {
  stylesInjected = false;
  document.querySelector('link[data-lf-table]')?.remove();
}
