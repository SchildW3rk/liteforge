import { createComponent, use } from 'liteforge';
import { DocSection } from '../../components/DocSection.js';
import { CodeBlock } from '../../components/CodeBlock.js';
import { LiveExample } from '../../components/LiveExample.js';
import { ApiTable } from '../../components/ApiTable.js';
import { setToc } from '../../toc.js';
import {
  BASIC_CODE,
  REF_CODE,
  SHOW_WHEN_CODE,
  CLEANUP_CODE,
  COMPONENT_CODE,
  CSS_CODE,
  AUTO_CODE,
  STYLING_CODE,
  DISMISS_CODE,
} from './snippets.js';
import { getOptionsApi, getFuncApi, getComponentApi } from './api.js';
import {
  BasicTooltipExample,
  DelayExample,
  ShowWhenExample,
  CleanupExample,
  StylingExample,
  DismissExample,
} from './TooltipExamples.js';

export const TooltipPage = createComponent({
  name: 'TooltipPage',
  component() {
    const { t } = use('i18n');

    setToc([
      { id: 'basic',         label: () => t('tooltip.basic'),         level: 2 },
      { id: 'ref',           label: () => t('tooltip.ref'),           level: 2 },
      { id: 'show-when',     label: () => t('tooltip.showWhen'),      level: 2 },
      { id: 'delay',         label: () => t('tooltip.delay'),         level: 2 },
      { id: 'cleanup',       label: () => t('tooltip.cleanup'),       level: 2 },
      { id: 'styling',       label: () => t('tooltip.styling'),       level: 2 },
      { id: 'dismiss',       label: () => t('tooltip.dismiss'),       level: 2 },
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
          <CodeBlock code="import { tooltip } from '@liteforge/tooltip';" language="typescript" />
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

        <DocSection title={() => t('tooltip.styling')} id="styling" description={() => t('tooltip.stylingDesc')}>
          <CodeBlock code={STYLING_CODE} language="typescript" />
          <LiveExample
            title={() => t('tooltip.liveStylingTitle')}
            code={`tooltip(el, { content: 'Square', borderRadius: '0px' })`}
            component={StylingExample}
          />
        </DocSection>

        <DocSection title={() => t('tooltip.dismiss')} id="dismiss" description={() => t('tooltip.dismissDesc')}>
          <CodeBlock code={DISMISS_CODE} language="typescript" />
          <LiveExample
            title={() => t('tooltip.liveDismissTitle')}
            code={`tooltip(btn, { content: '…', dismissOn: 'click' })`}
            component={DismissExample}
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
          <ApiTable rows={() => getFuncApi(t)} />
        </DocSection>

        <DocSection title={() => t('tooltip.optionsApi')} id="options-api">
          <ApiTable rows={() => getOptionsApi(t)} />
        </DocSection>

        <DocSection title={() => t('tooltip.componentApi')} id="component-api">
          <ApiTable rows={() => getComponentApi(t)} />
        </DocSection>
      </div>
    );
  },
});
