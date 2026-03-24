import { createComponent, use } from 'liteforge';
import { DocSection } from '../../components/DocSection.js';
import { CodeBlock } from '../../components/CodeBlock.js';
import { ApiTable } from '../../components/ApiTable.js';
import { LiveExample } from '../../components/LiveExample.js';
import { setToc } from '../../toc.js';
import {
  SETUP_CODE,
  NESTED_CODE,
  LAZY_CODE,
  LINK_CODE,
  USE_ROUTER_CODE,
  GUARD_CODE,
  MIDDLEWARE_CODE,
  TYPED_ROUTES_PHASE1_CODE,
  TYPED_ROUTES_PHASE2_CODE,
  VIEW_TRANSITIONS_CODE,
  LAZY_WRAPPER_CODE,
  LAZY_CHILDREN_CODE,
  ROUTER_DEMO_CODE,
} from './snippets.js';
import { getRouteApi } from './api.js';
import { RouterDemo } from './RouterDemo.js';

export const RouterPage = createComponent({
  name: 'RouterPage',
  component() {
    const { t } = use('i18n');

    setToc([
      { id: 'setup',            label: () => t('router.setup'),            level: 2 },
      { id: 'nested',           label: () => t('router.nested'),           level: 2 },
      { id: 'lazy',             label: () => t('router.lazy'),             level: 2 },
      { id: 'link',             label: () => t('router.link'),             level: 2 },
      { id: 'params',           label: () => t('router.useRouter'),        level: 2 },
      { id: 'guards',           label: () => t('router.guards'),           level: 2 },
      { id: 'middleware',       label: () => t('router.middleware'),       level: 2 },
      { id: 'typed-routes',     label: () => t('router.typedRoutes'),      level: 2 },
      { id: 'view-transitions', label: () => t('router.viewTransitions'),  level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/router</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('router.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-xl">
            {() => t('router.subtitle')}
          </p>
          <CodeBlock code={`pnpm add @liteforge/router`} language="bash" />
          <CodeBlock code={`import { createRouter, createBrowserHistory, Link, RouterOutlet } from '@liteforge/router';`} language="typescript" />
        </div>

        <DocSection
          title={() => t('router.setup')}
          id="setup"
          description={() => t('router.setupDesc')}
        >
          <div>
            <CodeBlock code={SETUP_CODE} language="typescript" />
            <ApiTable rows={() => getRouteApi(t)} />
          </div>
        </DocSection>

        <DocSection
          title={() => t('router.nested')}
          id="nested"
          description={() => t('router.nestedDesc')}
        >
          <CodeBlock code={NESTED_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('router.lazy')}
          id="lazy"
          description={() => t('router.lazyDesc')}
        >
          <div>
            <CodeBlock code={LAZY_CODE} language="typescript" />
            <p class="text-sm font-medium text-[var(--content-secondary)] mt-4 mb-1">{() => t('router.lazyWrapper')}</p>
            <p class="text-sm text-[var(--content-muted)] mb-2">{() => t('router.lazyWrapperDesc')}</p>
            <CodeBlock code={LAZY_WRAPPER_CODE} language="tsx" />
            <p class="text-sm font-medium text-[var(--content-secondary)] mt-4 mb-1">{() => t('router.lazyChildren')}</p>
            <p class="text-sm text-[var(--content-muted)] mb-2">{() => t('router.lazyChildrenDesc')}</p>
            <CodeBlock code={LAZY_CHILDREN_CODE} language="typescript" />
          </div>
        </DocSection>

        <DocSection
          title={() => t('router.link')}
          id="link"
          description={() => t('router.linkDesc')}
        >
          <CodeBlock code={LINK_CODE} language="tsx" />
        </DocSection>

        <DocSection
          title={() => t('router.useRouter')}
          id="params"
          description={() => t('router.useRouterDesc')}
        >
          <div>
            <CodeBlock code={USE_ROUTER_CODE} language="tsx" />
            <LiveExample
              title={() => t('router.liveTitle')}
              description={() => t('router.liveDesc')}
              component={RouterDemo}
              code={ROUTER_DEMO_CODE}
            />
          </div>
        </DocSection>

        <DocSection
          title={() => t('router.guards')}
          id="guards"
          description={() => t('router.guardsDesc')}
        >
          <CodeBlock code={GUARD_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('router.middleware')}
          id="middleware"
          description={() => t('router.middlewareDesc')}
        >
          <CodeBlock code={MIDDLEWARE_CODE} language="typescript" />
        </DocSection>

        <DocSection
          title={() => t('router.typedRoutes')}
          id="typed-routes"
          description={() => t('router.typedRoutesDesc')}
        >
          <div>
            <p class="text-sm font-medium text-[var(--content-secondary)] mb-2">{() => t('router.typedRoutesPhase1')}</p>
            <p class="text-sm text-[var(--content-muted)] mb-2">{() => t('router.typedRoutesPhase1Desc')}</p>
            <CodeBlock code={TYPED_ROUTES_PHASE1_CODE} language="typescript" />
            <p class="text-sm font-medium text-[var(--content-secondary)] mt-4 mb-2">{() => t('router.typedRoutesPhase2')}</p>
            <p class="text-sm text-[var(--content-muted)] mb-2">{() => t('router.typedRoutesPhase2Desc')}</p>
            <CodeBlock code={TYPED_ROUTES_PHASE2_CODE} language="typescript" />
            <p class="text-xs text-[var(--content-subtle)] mt-3 italic">{() => t('router.typedRoutesNote')}</p>
          </div>
        </DocSection>

        <DocSection
          title={() => t('router.viewTransitions')}
          id="view-transitions"
          description={() => t('router.viewTransitionsDesc')}
        >
          <div>
            <CodeBlock code={VIEW_TRANSITIONS_CODE} language="typescript" />
            <p class="text-xs text-[var(--content-subtle)] mt-1 italic">{() => t('router.viewTransitionsNote')}</p>
          </div>
        </DocSection>
      </div>
    );
  },
});
