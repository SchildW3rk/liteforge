import stylesUrl from '../css/styles.css?url';

let stylesInjected = false;

export function injectCalendarStyles(): void {
  if (stylesInjected) return;
  if (typeof document === 'undefined') return; // SSR safety
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = stylesUrl;
  link.setAttribute('data-lf-calendar', '');
  document.head.appendChild(link);
  stylesInjected = true;
}

export function resetCalendarStylesInjection(): void {
  stylesInjected = false;
  document.querySelector('link[data-lf-calendar]')?.remove();
}
