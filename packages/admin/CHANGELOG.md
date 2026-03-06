# @liteforge/admin

## 0.2.0

### Minor Changes

- Admin Phase 2+3 — Dashboard, Permissions, Activity Log, Theme Toggle, Export

  **Phase 2 (Bulk Actions & Dashboard)**

  - `defineDashboard()` — define stat cards and quick-link sections
  - `DashboardView` — renders dashboard as the admin index page
  - Bulk actions — configure `bulkActions` on a resource, act on selected rows

  **Phase 3 (Permissions, Theme, Export, Activity Log)**

  Permissions (`ResourcePermissions<T>`):

  - `canView / canEdit / canDestroy` — `boolean | ((record: T) => boolean)` (row-level)
  - `canCreate` — `boolean | (() => boolean)`
  - Default `undefined` = allow; guards applied in DataTable, DetailView, ResourceForm

  Theme Toggle:

  - `setAdminTheme(theme)` exported from `@liteforge/admin`
  - ☀️/🌙 button in admin header; persists to `localStorage`; falls back to `prefers-color-scheme`

  Export:

  - CSV + JSON download buttons in DataTable toolbar
  - Exports current page data; uses resource column definitions for CSV headers

  Activity Log:

  - `activityLog` signal — client-side in-memory log (max 200 entries)
  - `logActivity()` — called automatically after create/update/delete
  - Optional `logEndpoint` — POSTs each entry as JSON (non-fatal on failure)
  - `/activity` route in admin with timeline view and Clear button
  - `showActivityLog: true` in `buildAdminRoutes()` enables the route + sidebar link

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

### Patch Changes

- Updated dependencies
  - @liteforge/runtime@0.4.3
  - @liteforge/client@1.0.0
  - @liteforge/router@0.3.0
