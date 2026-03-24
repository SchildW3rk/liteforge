import { createComponent, use } from 'liteforge';
import { DocSection } from '../../components/DocSection.js';
import { CodeBlock } from '../../components/CodeBlock.js';
import { LiveExample } from '../../components/LiveExample.js';
import { ApiTable } from '../../components/ApiTable.js';
import { setToc } from '../../toc.js';
import {
  SETUP_CODE,
  FIELD_CODE,
  ZOD_CODE,
  ARRAY_CODE,
  FORM_STATE_CODE,
  LIVE_CODE,
  ARRAY_LIVE_CODE,
} from './snippets.js';
import { getFormApi, getArrayApi } from './api.js';
import { LoginFormExample } from './LoginFormExample.js';
import { ArrayFieldExample } from './ArrayFieldExample.js';

export const FormPage = createComponent({
  name: 'FormPage',
  component() {
    const { t } = use('i18n');

    setToc([
      { id: 'create-form', label: () => t('form.createForm'),  level: 2 },
      { id: 'fields',      label: () => t('form.fields'),      level: 2 },
      { id: 'validation',  label: () => t('form.validation'),  level: 2 },
      { id: 'arrays',      label: () => t('form.arrays'),      level: 2 },
      { id: 'state',       label: () => t('form.state'),       level: 2 },
      { id: 'live',        label: () => t('form.live'),        level: 2 },
      { id: 'live-array',  label: () => t('form.liveArray'),   level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/form</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('form.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('form.subtitle')}
          </p>
          <CodeBlock code={`pnpm add @liteforge/form zod`} language="bash" />
          <CodeBlock code={`import { createForm } from '@liteforge/form';\nimport { z } from 'zod';`} language="typescript" />
        </div>

        <DocSection
          title={() => t('form.createForm')}
          id="create-form"
          description={() => t('form.createFormDesc')}
        >
          <div>
            <CodeBlock code={SETUP_CODE} language="typescript" />
            <ApiTable rows={() => getFormApi(t)} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('form.fields')}
          id="fields"
          description={() => t('form.fieldsDesc')}
        >
          <CodeBlock code={FIELD_CODE} language="tsx" />
        </DocSection>

        <DocSection
          title={() => t('form.validation')}
          id="validation"
          description={() => t('form.validationDesc')}
        >
          <CodeBlock code={ZOD_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('form.arrays')}
          id="arrays"
          description={() => t('form.arraysDesc')}
        >
          <div>
            <CodeBlock code={ARRAY_CODE} language="typescript" />
            <ApiTable rows={() => getArrayApi(t)} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('form.state')}
          id="state"
        >
          <CodeBlock code={FORM_STATE_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('form.live')}
          id="live"
        >
          <LiveExample
            title={() => t('form.liveTitle')}
            description={() => t('form.liveDesc')}
            component={LoginFormExample}
            code={LIVE_CODE}
          />
        </DocSection>

        <DocSection
          title={() => t('form.liveArray')}
          id="live-array"
          description={() => t('form.liveArrayDesc')}
        >
          <LiveExample
            title={() => t('form.liveArrayTitle')}
            description={() => t('form.liveArrayDescEx')}
            component={ArrayFieldExample}
            code={ARRAY_LIVE_CODE}
          />
        </DocSection>
      </div>
    );
  },
});
