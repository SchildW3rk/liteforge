import { createComponent, use } from 'liteforge';
import { DocSection } from '../../components/DocSection.js';
import { CodeBlock } from '../../components/CodeBlock.js';
import { LiveExample } from '../../components/LiveExample.js';
import { ApiTable } from '../../components/ApiTable.js';
import { setToc } from '../../toc.js';
import { SETUP_CODE, BASIC_CODE, PROMISE_CODE, POSITIONS_CODE, CSS_CODE, STYLING_CODE } from './snippets.js';
import { getPluginApi, getToastApi, getOptsApi, getProviderStylesApi, getProviderClassesApi } from './api.js';
import { ToastExample } from './ToastExample.js';

export const ToastPage = createComponent({
  name: 'ToastPage',
  component() {
    const { t } = use('i18n');

    setToc([
      { id: 'setup',          label: () => t('toast.setup'),          level: 2 },
      { id: 'basic',          label: () => t('toast.basic'),          level: 2 },
      { id: 'promise',        label: () => t('toast.promise'),        level: 2 },
      { id: 'position',       label: () => t('toast.position'),       level: 2 },
      { id: 'styling',        label: () => t('toast.styling'),        level: 2 },
      { id: 'css',            label: () => t('toast.cssVars'),        level: 2 },
      { id: 'plugin-api',     label: () => t('toast.pluginOptions'),  level: 2 },
      { id: 'api',            label: () => t('toast.api'),            level: 2 },
      { id: 'opts-api',       label: () => t('toast.toastOptions'),   level: 3 },
      { id: 'styles-api',     label: () => t('toast.stylesApi'),      level: 3 },
      { id: 'classes-api',    label: () => t('toast.classesApi'),     level: 3 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/toast</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('toast.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('toast.subtitle')}
          </p>
          <CodeBlock code="pnpm add @liteforge/toast" language="bash" />
          <CodeBlock code="import { toast } from '@liteforge/toast';" language="typescript" />
        </div>

        <DocSection title={() => t('toast.setup')} id="setup" description={() => t('toast.setupDesc')}>
          <CodeBlock code={SETUP_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('toast.basic')} id="basic">
          <CodeBlock code={BASIC_CODE} language="typescript" />
          <LiveExample
            title={() => t('toast.liveTitle')}
            code={`toast.success('Saved!');
toast.error('Something went wrong.');
toast.warning('Check your input.');
toast.info('New version available.');`}
            component={ToastExample}
          />
        </DocSection>

        <DocSection title={() => t('toast.promise')} id="promise" description={() => t('toast.promiseDesc')}>
          <CodeBlock code={PROMISE_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('toast.position')} id="position">
          <CodeBlock code={POSITIONS_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('toast.styling')} id="styling" description={() => t('toast.stylingDesc')}>
          <CodeBlock code={STYLING_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('toast.cssVars')} id="css" description={() => t('toast.cssVarsDesc')}>
          <CodeBlock code={CSS_CODE} language="css" />
        </DocSection>

        <DocSection title={() => t('toast.pluginOptions')} id="plugin-api">
          <ApiTable rows={() => getPluginApi(t)} />
        </DocSection>

        <DocSection title={() => t('toast.api')} id="api">
          <ApiTable rows={() => getToastApi(t)} />
        </DocSection>

        <DocSection title={() => t('toast.toastOptions')} id="opts-api">
          <ApiTable rows={() => getOptsApi(t)} />
        </DocSection>

        <DocSection title={() => t('toast.stylesApi')} id="styles-api" description={() => t('toast.stylesApiDesc')}>
          <ApiTable rows={() => getProviderStylesApi(t)} />
        </DocSection>

        <DocSection title={() => t('toast.classesApi')} id="classes-api" description={() => t('toast.classesApiDesc')}>
          <ApiTable rows={() => getProviderClassesApi(t)} />
        </DocSection>
      </div>
    );
  },
});
