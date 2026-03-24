import { createComponent, use } from 'liteforge';
import { Link } from '@liteforge/router';
import { DocSection } from '../../components/DocSection.js';
import { CodeBlock } from '../../components/CodeBlock.js';
import { ApiTable } from '../../components/ApiTable.js';
import { setToc } from '../../toc.js';
import {
  SETUP_CODE,
  RESOURCES_CODE,
  RECURRING_CODE,
  DRAG_CODE,
  CONFLICT_CODE,
  INDICATORS_CODE,
  TOOLTIP_CODE,
  ICAL_CODE,
  LOCALE_CODE,
  RESPONSIVE_CODE,
  NAVIGATION_CODE,
} from './snippets.js';
import { getOptionsApi, getEventApi, getResultApi } from './api.js';

export const CalendarPage = createComponent({
  name: 'CalendarPage',
  component() {
    const { t } = use('i18n');

    setToc([
      { id: 'live',       label: () => t('calendar.live'),              level: 2 },
      { id: 'setup',      label: () => t('calendar.createCalendar'),    level: 2 },
      { id: 'resources',  label: () => t('calendar.resources'),         level: 2 },
      { id: 'recurring',  label: () => t('calendar.recurring'),         level: 2 },
      { id: 'drag-drop',  label: () => t('calendar.dragDrop'),          level: 2 },
      { id: 'conflict',   label: () => t('calendar.conflict'),          level: 2 },
      { id: 'indicators', label: () => t('calendar.indicators'),        level: 2 },
      { id: 'tooltips',   label: () => t('calendar.tooltips'),          level: 2 },
      { id: 'ical',       label: () => t('calendar.ical'),              level: 2 },
      { id: 'locale',     label: () => t('calendar.locale'),            level: 2 },
      { id: 'responsive', label: () => t('calendar.responsive'),        level: 2 },
      { id: 'navigation', label: () => t('calendar.navigation'),        level: 2 },
      { id: 'api-event',  label: () => t('calendar.apiCalendarEvent'),  level: 2 },
      { id: 'api-result', label: () => t('calendar.apiResult'),         level: 2 },
    ]);
    return (
      <div>
        <div class="mb-10">
          <p class="text-xs font-mono text-[var(--content-muted)] mb-1">@liteforge/calendar</p>
          <h1 class="text-3xl font-bold text-[var(--content-primary)] mb-2">{() => t('calendar.title')}</h1>
          <p class="text-[var(--content-secondary)] leading-relaxed max-w-2xl">
            {() => t('calendar.subtitle')}
          </p>
          <CodeBlock code="pnpm add @liteforge/calendar" language="bash" />
          <CodeBlock code="import { createCalendar } from '@liteforge/calendar';" language="typescript" />
        </div>

        <DocSection title={() => t('calendar.live')} id="live" description={() => t('calendar.liveDesc')}>
          {Link({
            href: '/demo/calendar',
            class: 'group flex items-center justify-between px-5 py-4 rounded-lg border border-[var(--line-default)] bg-[var(--surface-raised)]/50 hover:bg-[var(--surface-raised)] hover:border-[var(--content-subtle)] transition-all',
            children: (
              <div class="flex items-center justify-between w-full gap-4">
                <div>
                  <p class="text-sm font-semibold text-[var(--content-primary)] mb-0.5">{() => t('calendar.liveTitle')}</p>
                  <p class="text-xs text-[var(--content-muted)]">{() => t('calendar.liveDesc')}</p>
                </div>
                <span class="text-[var(--content-muted)] group-hover:text-[var(--content-primary)] transition-colors text-lg shrink-0">↗</span>
              </div>
            ),
          })}
        </DocSection>

        <DocSection title={() => t('calendar.createCalendar')} id="setup" description={() => t('calendar.createCalendarDesc')}>
          <div>
            <CodeBlock code={SETUP_CODE} language="typescript" />
            <ApiTable rows={() => getOptionsApi(t)} />
          </div>
        </DocSection>

        <DocSection title={() => t('calendar.resources')} id="resources" description={() => t('calendar.resourcesDesc')}>
          <CodeBlock code={RESOURCES_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.recurring')} id="recurring" description={() => t('calendar.recurringDesc')}>
          <CodeBlock code={RECURRING_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.dragDrop')} id="drag-drop" description={() => t('calendar.dragDropDesc')}>
          <CodeBlock code={DRAG_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.conflict')} id="conflict" description={() => t('calendar.conflictDesc')}>
          <CodeBlock code={CONFLICT_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.indicators')} id="indicators" description={() => t('calendar.indicatorsDesc')}>
          <CodeBlock code={INDICATORS_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.tooltips')} id="tooltips" description={() => t('calendar.tooltipsDesc')}>
          <CodeBlock code={TOOLTIP_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.ical')} id="ical" description={() => t('calendar.icalDesc')}>
          <CodeBlock code={ICAL_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.locale')} id="locale" description={() => t('calendar.localeDesc')}>
          <CodeBlock code={LOCALE_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.responsive')} id="responsive" description={() => t('calendar.responsiveDesc')}>
          <CodeBlock code={RESPONSIVE_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.navigation')} id="navigation" description={() => t('calendar.navigationDesc')}>
          <CodeBlock code={NAVIGATION_CODE} language="typescript" />
        </DocSection>

        <DocSection title={() => t('calendar.apiCalendarEvent')} id="api-event" description={() => t('calendar.apiCalendarEventDesc')}>
          <ApiTable rows={() => getEventApi(t)} />
        </DocSection>

        <DocSection title={() => t('calendar.apiResult')} id="api-result" description={() => t('calendar.apiResultDesc')}>
          <ApiTable rows={() => getResultApi(t)} />
        </DocSection>
      </div>
    )
  },
})
