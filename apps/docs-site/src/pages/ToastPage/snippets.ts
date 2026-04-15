// No imports — pure string constants

export const SETUP_CODE = `// main.tsx
import { toastPlugin } from '@liteforge/toast';

await createApp({ root: App, target: '#app' })
  .use(toastPlugin({ position: 'bottom-right' }))
  .mount();`;

export const BASIC_CODE = `import { toast } from '@liteforge/toast';

toast.success('Saved!');
toast.error('Something went wrong.');
toast.warning('Double-check your input.');
toast.info('New version available.');

// All accept an options object as the second argument
toast.success('Saved!', { duration: 3000, closable: true });`;

export const PROMISE_CODE = `import { toast } from '@liteforge/toast';

const p = fetch('/api/save', { method: 'POST', body: JSON.stringify(data) });

toast.promise(p, {
  loading: 'Saving changes…',
  success: () => 'Changes saved!',
  error:   (err) => \`Error: \${err.message}\`,
});`;

export const POSITIONS_CODE = `// Available positions:
// 'top-left' | 'top-center' | 'top-right'
// 'bottom-left' | 'bottom-center' | 'bottom-right'

.use(toastPlugin({ position: 'top-right', maxToasts: 5 }))`;

export const CSS_CODE = `:root {
  --lf-toast-bg:      #1e1e2e;
  --lf-toast-color:   #cdd6f4;
  --lf-toast-radius:  8px;
  --lf-toast-shadow:  0 8px 24px rgba(0,0,0,.4);
  --lf-toast-z:       9999;
  --lf-toast-width:   360px;
  --lf-toast-offset:  20px;
  --lf-toast-gap:     10px;
}`;

export const STYLING_CODE = `// Provider-level styles + classes
<ToastProvider
  styles={{
    container: 'top: 24px; right: 24px;',
    toast:     'border-radius: 0; font-size: 13px;',
    icon:      'border-radius: 0;',
    close:     'border-radius: 0;',
  }}
  classes={{
    toast:   'my-toast',
    success: 'my-toast--success',
    error:   'my-toast--error',
  }}
/>

// Per-toast override (layers on top of provider styles)
toast.success('Gespeichert', {
  class:  'my-toast--custom',
  styles: { toast: 'min-width: 300px;' },
});`;