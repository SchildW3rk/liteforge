import { createComponent, signal, effect, use } from 'liteforge';
import { DocSection } from '../components/DocSection.js';
import { CodeBlock } from '../components/CodeBlock.js';
import { LiveExample } from '../components/LiveExample.js';
import { ApiTable } from '../components/ApiTable.js';
import type { ApiRow } from '../components/ApiTable.js';
import { tooltip } from 'liteforge/tooltip';
import { setToc } from '../toc.js';

// ─── Live examples ─────────────────────────────────────────────────────────────

function BasicTooltipExample(): Node {
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-wrap gap-3';

  const makeBtn = (label: string, pos: 'top' | 'right' | 'bottom' | 'left') => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'px-3 py-1.5 text-sm rounded bg-[var(--surface-overlay)] border border-[var(--line-default)] text-[var(--content-primary)] hover:bg-[var(--surface-raised)] transition-colors';
    tooltip(btn, { content: `position: "${pos}"`, position: pos });
    return btn;
  };

  wrap.appendChild(makeBtn('Tooltip top', 'top'));
  wrap.appendChild(makeBtn('Tooltip right', 'right'));
  wrap.appendChild(makeBtn('Tooltip bottom', 'bottom'));
  wrap.appendChild(makeBtn('Tooltip left', 'left'));
  return wrap;
}

function DelayExample(): Node {
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-wrap gap-3';

  const makeBtn = (label: string, delay: number) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'px-3 py-1.5 text-sm rounded bg-[var(--surface-overlay)] border border-[var(--line-default)] text-[var(--content-primary)]';
    tooltip(btn, { content: `${delay}ms delay`, delay, position: 'top' });
    return btn;
  };

  wrap.appendChild(makeBtn('No delay', 0));
  wrap.appendChild(makeBtn('150ms delay', 150));
  wrap.appendChild(makeBtn('500ms delay', 500));
  return wrap;
}

function ShowWhenExample(): Node {
  const collapsed = signal(true);

  const wrap = document.createElement('div');
  wrap.className = 'space-y-3';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:opacity-80 transition-opacity';
  effect(() => {
    toggleBtn.textContent = collapsed() ? 'Expand sidebar (tooltip hidden)' : 'Collapse sidebar (tooltip shown)';
  });
  toggleBtn.addEventListener('click', () => collapsed.update(v => !v));

  const iconBtn = document.createElement('button');
  iconBtn.className = 'w-10 h-10 rounded bg-[var(--surface-overlay)] border border-[var(--line-default)] text-lg flex items-center justify-center';
  iconBtn.textContent = '⚙️';
  tooltip(iconBtn, {
    content: 'Settings',
    position: 'right',
    delay: 150,
    showWhen: () => collapsed(),
  });

  const hint = document.createElement('p');
  hint.className = 'text-xs text-[var(--content-muted)]';
  effect(() => {
    hint.textContent = collapsed()
      ? 'Hover ⚙️ — tooltip visible (collapsed)'
      : 'Hover ⚙️ — tooltip suppressed (expanded)';
  });

  wrap.appendChild(toggleBtn);
  wrap.appendChild(iconBtn);
  wrap.appendChild(hint);
  return wrap;
}

function CleanupExample(): Node {
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-col gap-3 items-start';

  const btn = document.createElement('button');
  btn.textContent = 'Hover me';
  btn.className = 'px-3 py-1.5 text-sm rounded bg-[var(--surface-overlay)] border border-[var(--line-default)] text-[var(--content-primary)]';

  let cleanup: (() => void) | null = null;
  const active = signal(true);

  const removeBtn = document.createElement('button');
  removeBtn.className = 'px-3 py-1.5 text-sm rounded bg-red-600/80 text-white hover:opacity-80';
  effect(() => {
    removeBtn.textContent = active() ? 'Remove tooltip' : 'Tooltip removed ✓';
    removeBtn.disabled = !active();
  });
  removeBtn.addEventListener('click', () => {
    if (cleanup) { cleanup(); cleanup = null; active.set(false); }
  });

  wrap.appendChild(btn);
  wrap.appendChild(removeBtn);

  // Attach tooltip after btn is in the DOM tree
  cleanup = tooltip(btn, { content: 'I can be removed', position: 'top' });

  return wrap;
}

// ─── Code strings ──────────────────────────────────────────────────────────────

const BASIC_CODE = `import { tooltip } from 'liteforge/tooltip';

// String shorthand
tooltip(el, 'Save changes');

// Options object
tooltip(el, {
  content:  'Save changes',
  position: 'top',     // 'top' | 'right' | 'bottom' | 'left' | 'auto'
  delay:    150,        // hover delay in ms
  offset:   8,          // px gap between element and tooltip
});`;

const REF_CODE = `// Ref-callback in JSX (most common pattern)
<button
  ref={el => tooltip(el, { content: 'Settings', position: 'right', delay: 150 })}
>
  ⚙️
</button>`;

const SHOW_WHEN_CODE = `// showWhen — only show when a condition is true
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
</button>`;

const CLEANUP_CODE = `// tooltip() returns a cleanup function
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
}`;

const COMPONENT_CODE = `import { Tooltip } from 'liteforge/tooltip';

// Wraps children in display:contents span
// Tooltip attaches to the first HTMLElement child
<Tooltip content="Save changes" position="top" delay={150}>
  <button>💾</button>
</Tooltip>`;

const CSS_CODE = `:root {
  --lf-tooltip-bg:         #1e1e2e;
  --lf-tooltip-color:      #cdd6f4;
  --lf-tooltip-radius:     6px;
  --lf-tooltip-font-size:  12px;
  --lf-tooltip-max-width:  240px;
  --lf-tooltip-arrow-size: 5px;
  --lf-tooltip-padding:    5px 10px;
  --lf-tooltip-shadow:     0 4px 12px rgba(0,0,0,0.25);
  --lf-tooltip-z:          99999;
}`;

const AUTO_CODE = `// position: 'auto' — tries top first, flips if overflows viewport
tooltip(el, { content: 'I find my own way', position: 'auto' });`;

// ─── Page ──────────────────────────────────────────────────────────────────────

export const TooltipPage = createComponent({
  name: 'TooltipPage',
  component() {
    const { t } = use('i18n');

    const getOptionsApi = (): ApiRow[] => [
      { name: 'content', type: 'string | Node', description: t('tooltip.apiContent') },
      { name: 'position', type: "'top' | 'right' | 'bottom' | 'left' | 'auto'", default: "'top'", description: t('tooltip.apiPosition') },
      { name: 'delay', type: 'number', default: '0', description: t('tooltip.apiDelay') },
      { name: 'offset', type: 'number', default: '8', description: t('tooltip.apiOffset') },
      { name: 'disabled', type: 'boolean', default: 'false', description: t('tooltip.apiDisabled') },
      { name: 'showWhen', type: '() => boolean', description: t('tooltip.apiShowWhen') },
    ];

    const getFuncApi = (): ApiRow[] => [
      { name: 'tooltip(el, input)', type: '() => void', description: t('tooltip.apiFnSignature') },
      { name: 'positionTooltip(el, target, position, offset)', type: 'void', description: t('tooltip.apiFnPositionTooltip') },
    ];

    const getComponentApi = (): ApiRow[] => [
      { name: 'content', type: 'string | Node', description: t('tooltip.apiCompContent') },
      { name: 'position', type: 'TooltipPosition', default: "'top'", description: t('tooltip.apiCompPosition') },
      { name: 'delay', type: 'number', description: t('tooltip.apiCompDelay') },
      { name: 'offset', type: 'number', description: t('tooltip.apiCompOffset') },
      { name: 'disabled', type: 'boolean', description: t('tooltip.apiCompDisabled') },
      { name: 'showWhen', type: '() => boolean', description: t('tooltip.apiCompShowWhen') },
      { name: 'children', type: 'Node', description: t('tooltip.apiCompChildren') },
    ];

    setToc([
      { id: 'basic',         label: () => t('tooltip.basic'),         level: 2 },
      { id: 'ref',           label: () => t('tooltip.ref'),           level: 2 },
      { id: 'show-when',     label: () => t('tooltip.showWhen'),      level: 2 },
      { id: 'delay',         label: () => t('tooltip.delay'),         level: 2 },
      { id: 'cleanup',       label: () => t('tooltip.cleanup'),       level: 2 },
      { id: 'gotcha',        label: () => t('tooltip.gotcha'),        level: 2 },
      { id: 'component',     label: () => t('tooltip.component'),     level: 2 },
      { id: 'auto',          label: () => t('tooltip.auto'),          level: 2 },
      { id: 'css',           label: () => t('tooltip.cssVars'),       level: 2 },
      { id: 'api',           label: () => t('tooltip.api'),           level: 2 },
      { id: 'options-api',   label: () => t('tooltip.optionsApi'),    level: 3 },
      { id: 'component-api', label: () => t('tooltip.componentApi'),  level: 3 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/tooltip</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('tooltip.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('tooltip.subtitlePre')}{' '}
            <code class="text-indigo-400 text-sm">{'<body>'}</code> — {() => t('tooltip.subtitleMid')}{' '}
            <code class="text-indigo-400 text-sm">overflow:hidden</code> {() => t('tooltip.subtitleMid2')}{' '}
            <code class="text-indigo-400 text-sm">showWhen</code>, {() => t('tooltip.subtitleSuffix')}
          </p>
          <CodeBlock code="pnpm add @liteforge/tooltip" language="bash" />
          <CodeBlock code="import { tooltip } from 'liteforge/tooltip';" language="typescript" />
        </div>

        <DocSection title={() => t('tooltip.basic')} id="basic">
          <CodeBlock code={BASIC_CODE} language="typescript" />
          <LiveExample
            title={() => t('tooltip.liveBasicTitle')}
            code={`tooltip(btn, { content: 'position: "top"', position: 'top' });`}
            component={BasicTooltipExample}
          />
        </DocSection>

        <DocSection title={() => t('tooltip.ref')} id="ref" description={() => t('tooltip.refDesc')}>
          <CodeBlock code={REF_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('tooltip.showWhen')} id="show-when"
          description={() => t('tooltip.showWhenDesc')}>
          <CodeBlock code={SHOW_WHEN_CODE} language="typescript" />
          <LiveExample
            title={() => t('tooltip.liveShowWhenTitle')}
            code={`tooltip(el, { content: 'Settings', showWhen: () => !sidebarOpen() })`}
            component={ShowWhenExample}
          />
        </DocSection>

        <DocSection title={() => t('tooltip.delay')} id="delay" description={() => t('tooltip.delayDesc')}>
          <LiveExample
            title={() => t('tooltip.liveDelayTitle')}
            code={`tooltip(btn, { content: '150ms delay', delay: 150 })`}
            component={DelayExample}
          />
        </DocSection>

        <DocSection title={() => t('tooltip.cleanup')} id="cleanup" description={() => t('tooltip.cleanupDesc')}>
          <CodeBlock code={CLEANUP_CODE} language="typescript" />
          <LiveExample
            title={() => t('tooltip.liveCleanupTitle')}
            code={`const cleanup = tooltip(el, 'Hello');\ncleanup(); // removes tooltip`}
            component={CleanupExample}
          />
        </DocSection>

        <DocSection title={() => t('tooltip.gotcha')} id="gotcha">
          <div class="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-sm text-[var(--content-secondary)] leading-relaxed">
            <strong class="text-amber-400">⚠ Never use the native <code>title</code> attribute on an element that also has <code>tooltip()</code> attached.</strong>
            {' '}The browser manages its own native tooltip independently — it ignores LiteForge's event listeners, doesn't hide on click, and overlaps the custom tooltip.
            Remove <code>title</code> and let <code>tooltip()</code> handle everything.
          </div>
          <CodeBlock code={`// ❌ Wrong — native title conflicts with tooltip()
tooltip(btn, 'Save');
btn.title = 'Save'; // browser shows its own tooltip on hover, ignores click-hide

// ✅ Correct — tooltip() only
tooltip(btn, 'Save');`} language="typescript" />
        </DocSection>

        <DocSection title={() => t('tooltip.component')} id="component" description={() => t('tooltip.componentDesc')}>
          <CodeBlock code={COMPONENT_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('tooltip.auto')} id="auto" description={() => t('tooltip.autoDesc')}>
          <CodeBlock code={AUTO_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('tooltip.cssVars')} id="css" description={() => t('tooltip.cssVarsDesc')}>
          <CodeBlock code={CSS_CODE} language="css" />
        </DocSection>

        <DocSection title={() => t('tooltip.api')} id="api">
          <ApiTable rows={() => getFuncApi()} />
        </DocSection>

        <DocSection title={() => t('tooltip.optionsApi')} id="options-api">
          <ApiTable rows={() => getOptionsApi()} />
        </DocSection>

        <DocSection title={() => t('tooltip.componentApi')} id="component-api">
          <ApiTable rows={() => getComponentApi()} />
        </DocSection>
      </div>
    );
  },
});
