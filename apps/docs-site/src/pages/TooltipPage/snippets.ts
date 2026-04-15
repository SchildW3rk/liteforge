// No imports — pure string constants

export const BASIC_CODE = `import { tooltip } from '@liteforge/tooltip';

// String shorthand
tooltip(el, 'Save changes');

// Options object
tooltip(el, {
  content:  'Save changes',
  position: 'top',     // 'top' | 'right' | 'bottom' | 'left' | 'auto'
  delay:    150,        // hover delay in ms
  offset:   8,          // px gap between element and tooltip
});`

export const REF_CODE = `// Ref-callback in JSX (most common pattern)
<button
  ref={el => tooltip(el, { content: 'Settings', position: 'right', delay: 150 })}
>
  ⚙️
</button>`

export const SHOW_WHEN_CODE = `// showWhen — only show when a condition is true
// Perfect for collapsed sidebars
<button
  ref={el => tooltip(el, {
    content:  item.label,
    position: 'right',
    delay:    150,
    showWhen: () => !sidebarOpen(),  // ← signal-powered guard
  })}
>
  {item.icon}
</button>`

export const CLEANUP_CODE = `// tooltip() returns a cleanup function
const cleanup = tooltip(el, 'Hello');

// Remove listeners + hide active tooltip
cleanup();

// Inside createComponent — use ref callback + onCleanup:
import { onCleanup } from 'liteforge';

component({ props }) {
  return (
    <button ref={(el) => {
      const cleanup = tooltip(el, {
        content:  props.hint,
        position: 'top',
      });
      onCleanup(cleanup);  // auto-called on unmount
    }}>
      {props.label}
    </button>
  );
}`

export const COMPONENT_CODE = `import { Tooltip } from '@liteforge/tooltip';

// Wraps children in display:contents span
// Tooltip attaches to the first HTMLElement child
<Tooltip content="Save changes" position="top" delay={150}>
  <button>💾</button>
</Tooltip>`

export const CSS_CODE = `:root {
  --lf-tooltip-bg:         #1e1e2e;
  --lf-tooltip-color:      #cdd6f4;
  --lf-tooltip-radius:     6px;
  --lf-tooltip-font-size:  12px;
  --lf-tooltip-max-width:  240px;
  --lf-tooltip-arrow-size: 5px;
  --lf-tooltip-padding:    5px 10px;
  --lf-tooltip-shadow:     0 4px 12px rgba(0,0,0,0.25);
  --lf-tooltip-z:          99999;
}`

export const AUTO_CODE = `// position: 'auto' — tries top first, flips if overflows viewport
tooltip(el, { content: 'I find my own way', position: 'auto' });`

export const STYLING_CODE = `// Extra class + inline style override
tooltip(el, {
  content:      'Steuersatz',
  class:        'my-tooltip',
  borderRadius: '0px',
  styles: {
    tooltip: 'background: var(--lf-color-surface); border: 1px solid var(--lf-color-border); color: var(--lf-color-text);',
  },
});

// Same via JSX component
<Tooltip
  content="Steuersatz"
  class="my-tooltip"
  borderRadius="0px"
  styles={{ tooltip: 'background: var(--lf-color-surface);' }}
>
  <span>USt</span>
</Tooltip>`

export const DISMISS_CODE = `// 'auto' (default) — hides on pointerleave, blur, and click
tooltip(el, { content: 'Auto-hide', dismissOn: 'auto' });

// 'click' — stays visible on mouse-out, hides on click
tooltip(btn, {
  content:   'Click me to dismiss',
  dismissOn: 'click',
});

// 'manual' — never hides automatically; call cleanup() to hide
const cleanup = tooltip(el, {
  content:   'Persistent tooltip',
  dismissOn: 'manual',
});
// later: cleanup();`
