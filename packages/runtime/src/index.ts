/**
 * @liteforge/runtime
 *
 * DOM runtime for LiteForge: components, context, lifecycle, and control flow.
 */

// Types
export type {
  // Component types
  PropType,
  PropDefinition,
  PropsSchema,
  ExtractProps,
  ComponentDefinition,
  ComponentFactory,
  ComponentInstance,
  // Context types
  UseFn,
  ContextValues,
  ProviderFn,
  // Lifecycle argument types
  SetupArgs,
  LoadArgs,
  PlaceholderArgs,
  ErrorArgs,
  ComponentArgs,
  MountedArgs,
  DestroyedArgs,
  // App types
  AppConfig,
  AppInstance,
  Plugin,
  AnyStore,
  RouterLike,
  // Control flow types
  Falsy,
  ShowProps,
  ForProps,
  SwitchProps,
  MatchCase,
  MatchProps,
  DynamicProps,
  // JSX types
  Child,
  FunctionComponent,
  HTMLAttributes,
} from './types.js';

// Context
export { use, hasContext } from './context.js';

// For internal/testing use
export {
  pushContext,
  popContext,
  initAppContext,
  clearContext,
  getContextDepth,
  withContext,
  createBoundUse,
} from './context.js';

// Component
export { createComponent, isComponentFactory } from './component.js';

// App
export { createApp } from './app.js';

// Control Flow
export { Show, For, Switch, Match, Dynamic } from './control-flow.js';
export type { 
  ShowConfig, 
  ForConfig, 
  SwitchConfig, 
  MatchConfig,
  MatchCase as MatchCaseInternal,
  DynamicConfig 
} from './control-flow.js';

// h() function and Fragment for JSX
export { h, Fragment } from './h.js';

// Template runtime for compile-time optimizations
export { _template, _insert, _setProp, _addEventListener } from './template.js';

// HMR support (auto-initializes in development)
export { initHMR, getHMRHandler } from './hmr.js';
export type { HMRInstance, HMRHandler } from './hmr.js';
