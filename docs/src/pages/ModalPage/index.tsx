import { createComponent, use } from 'liteforge';
import { DocSection } from '../../components/DocSection.js';
import { CodeBlock } from '../../components/CodeBlock.js';
import { LiveExample } from '../../components/LiveExample.js';
import { ApiTable } from '../../components/ApiTable.js';
import { setToc } from '../../toc.js';
import { SETUP_CODE, BASIC_CODE, PRESETS_CODE, LIVE_CODE } from './snippets.js';
import { getConfigApi, getInstanceApi, getPresetApi } from './api.js';
import { ModalExample } from './ModalExample.js';

export const ModalPage = createComponent({
  name: 'ModalPage',
  component() {
    const { t } = use('i18n');

    setToc([
      { id: 'setup',        label: () => t('modal.setup'),        level: 2 },
      { id: 'create-modal', label: () => t('modal.createModal'),  level: 2 },
      { id: 'presets',      label: () => t('modal.presets'),      level: 2 },
      { id: 'live',         label: () => t('modal.live'),         level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/modal</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('modal.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('modal.subtitlePre')}{' '}
            <code class="text-indigo-400 text-sm">confirm()</code>,{' '}
            <code class="text-indigo-400 text-sm">alert()</code>, {() => t('modal.subtitleAnd')}{' '}
            <code class="text-indigo-400 text-sm">prompt()</code> {() => t('modal.subtitleSuffix')}
          </p>
          <CodeBlock code={`pnpm add @liteforge/modal`} language="bash" />
          <CodeBlock code={`import { createModal, confirm, alert, prompt } from '@liteforge/modal';`} language="typescript" />
        </div>

        <DocSection
          title={() => t('modal.setup')}
          id="setup"
          description={() => t('modal.setupDesc')}
        >
          <CodeBlock code={SETUP_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('modal.createModal')}
          id="create-modal"
          description={() => t('modal.createModalDesc')}
        >
          <div>
            <CodeBlock code={BASIC_CODE} language="tsx" />
            <ApiTable rows={() => getConfigApi(t)} />
            <ApiTable rows={() => getInstanceApi(t)} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('modal.presets')}
          id="presets"
          description={() => t('modal.presetsDesc')}
        >
          <div>
            <CodeBlock code={PRESETS_CODE} language="typescript" />
            <ApiTable rows={() => getPresetApi(t)} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('modal.live')}
          id="live"
          description={() => t('modal.liveDesc')}
        >
          <LiveExample
            title={() => t('modal.liveTitle')}
            description={() => t('modal.liveDescEx')}
            component={ModalExample}
            code={LIVE_CODE}
          />
        </DocSection>
      </div>
    );
  },
});
