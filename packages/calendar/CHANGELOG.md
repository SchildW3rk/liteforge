# @liteforge/calendar

## 0.4.0

### Minor Changes

- Major feature release: timeline, quarter/year views, snap, conflict detection, indicators, event tooltips, WAI-ARIA, iCal, virtualization

  **New Views**

  - Timeline view: horizontal time axis with drag-to-move (time + resource), resize, now-indicator, drag-to-create
  - Quarter view: 3-month grid overview with event dots
  - Year view: 12-month overview grid

  **Drag & Drop**

  - Unified `snapToSlot()` utility shared across week and day views
  - Slot selection with snap-indicator badge and `maxDuration` cap

  **Event Conflict Detection**

  - `findConflicts()` pure utility exported from package
  - `onEventConflict` callback: `'allow' | 'warn' | 'prevent'`
  - Visual `data-conflict="true"` indicator on conflicting events

  **Event Indicators**

  - New `EventIndicator` type on `CalendarEvent`: `icon`, `tooltip`, `color`
  - Rendered bottom-right corner of event chips in all timed views

  **Event Tooltips**

  - `eventTooltip` option: wire in `tooltip` from `@liteforge/tooltip`
  - Default content renders title + time range
  - `triggerOnFocus: false` prevents tooltip re-appearing after modal close

  **Toolbar & UI**

  - ⋮ More menu: Export iCal, Import iCal, Print, Mini-calendar toggle
  - `miniCalendarVisible()` + `toggleMiniCalendar()` in `CalendarResult`
  - `clearSelectedEvent()` in `CalendarResult`

  **iCal / RRULE**

  - Full iCal-compatible RRULE engine (FREQ, INTERVAL, UNTIL, COUNT, BYDAY, BYMONTHDAY, BYMONTH, BYSETPOS, EXDATE, WKST)
  - `exportICal()`, `importICal()`, `downloadICal()`, `importICalFile()`

  **Accessibility**

  - WAI-ARIA roles, labels, keyboard navigation throughout all views

  **Virtualization**

  - Windowed event rendering for day/week views above threshold

  625 tests across 16 test files.

## 0.3.0

### Minor Changes

- Add full mobile/responsive support:

  - **ResizeObserver breakpoints** — `data-size="mobile|tablet|desktop"` attribute on `.lf-cal` and `.lf-cal-toolbar` driven by container width (not viewport), configurable via `responsive.mobileBp` (default 768px)
  - **`sizeClass()`** signal exposed on `CalendarResult` — lets external wrappers (e.g. sidebar) react to breakpoint changes
  - **Mobile Resource Bar** — `MobileResourceBar()` component with per-resource tabs and an "Alle / All" overview tab; exposes `setActiveResource(id | null)` and `activeResource()` on the API
  - **Mobile day view** — on mobile, resource columns merge into a single column with resource-label chips on events; per-resource tab selects which resource to show
  - **`+N more` chip** in all-day row — `maxVisible` option on `renderAllDayRow` limits visible all-day events and shows an overflow chip
  - **localStorage persistence** — last selected view persisted under `lf-cal-preferred-view`; active resource tab persisted under `lf-cal-preferred-resource`; both restored on init (no auto view-switching — user controls view at all times)
  - **Touch drag-drop fix** — ghost element now anchors to the exact grab point (offset from pointer to event top-left), eliminating the jump on touchstart; original event dims to `opacity: 0.3` during drag (slot stays reserved visually); opacity restored on drop/cancel
  - **Toolbar mobile dropdown** — view-switcher dropdown opens right-anchored (`right: 0`) to prevent clipping at screen edge
  - Various CSS polish: mobile time-label hiding, styled mobile scrollbars, `white-space: nowrap` on resource tabs

## 0.2.0

### Minor Changes

- Migrate CSS from injected TS strings to real CSS files

  Each UI package now ships a `css/styles.css` file importable directly:

  ```css
  @import "@liteforge/modal/styles";
  @import "@liteforge/table/styles";
  @import "@liteforge/calendar/styles";
  @import "@liteforge/admin/styles";
  ```

  The `injectDefaultStyles()` function now creates a `<link>` element
  using a `?url` import so bundlers copy and hash the asset correctly
  in production builds. The `unstyled: true` option continues to work.
