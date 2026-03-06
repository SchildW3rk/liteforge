# @liteforge/calendar

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
