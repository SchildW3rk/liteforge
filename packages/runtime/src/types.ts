/**
 * LiteForge Runtime Types
 *
 * Type definitions for components, context, and lifecycle.
 */

// ============================================================================
// Component Types
// ============================================================================

/**
 * Supported prop types for component props definition.
 */
export type PropType<T> =
  | typeof String
  | typeof Number
  | typeof Boolean
  | typeof Object
  | typeof Array
  | { new (...args: unknown[]): T };

/**
 * Single prop definition with type, required flag, and default.
 */
export interface PropDefinition<T = unknown> {
  type?: PropType<T>;
  required?: boolean;
  default?: T | (() => T);
}

/**
 * Props schema - maps prop names to their definitions.
 */
export type PropsSchema<T extends object> = {
  [K in keyof T]: PropDefinition<T[K]>;
};

/**
 * Extract the actual prop types from a props schema.
 */
export type ExtractProps<S extends PropsSchema<object>> = {
  [K in keyof S]: S[K] extends PropDefinition<infer T> ? T : never;
};

// ============================================================================
// Props Input Type Utilities
// ============================================================================

/**
 * Check if a prop definition has a default value.
 * We check if 'default' key exists and is not undefined type.
 */
type PropHasDefault<Def> = Def extends { default: infer D }
  ? D extends undefined
    ? false
    : true
  : false;

/**
 * Check if a prop definition is marked as required.
 */
type PropIsRequired<Def> = Def extends { required: true } ? true : false;

/**
 * A prop requires input if it's marked required AND has no default.
 */
type PropRequiresInput<Def> = PropIsRequired<Def> extends true
  ? PropHasDefault<Def> extends true
    ? false
    : true
  : false;

/**
 * Extract keys of props that require input (required: true, no default).
 */
type RequiredInputKeys<Schema> = {
  [K in keyof Schema]: PropRequiresInput<Schema[K]> extends true ? K : never;
}[keyof Schema];

/**
 * Extract keys of props that are optional for input.
 */
type OptionalInputKeys<Schema> = Exclude<keyof Schema, RequiredInputKeys<Schema>>;

/**
 * Compute the input props type from a schema and full props type.
 * - Props with `required: true` and no default: required in input
 * - Props with `default` or not required: optional in input
 */
export type InputPropsFromSchema<
  Schema,
  FullProps extends Record<string, unknown>
> = 
  // Required input props (must be provided)
  { [K in RequiredInputKeys<Schema> & keyof FullProps]: FullProps[K] } &
  // Optional input props (can be omitted, will use default or undefined)
  { [K in OptionalInputKeys<Schema> & keyof FullProps]?: FullProps[K] };

/**
 * Simplify a type for better IDE display.
 * Flattens intersection types into a single object type.
 */
export type Simplify<T> = { [K in keyof T]: T[K] } & {};

// ============================================================================
// Context Types
// ============================================================================

// ============================================================================
// Plugin System Types
// ============================================================================

/**
 * Registry of known context keys and their types.
 * Extend via Declaration Merging to make `use()` return typed values.
 *
 * Built-in entries are registered by their respective packages
 * (e.g. `@liteforge/router` registers `router: Router`).
 * Register your own stores or services the same way:
 *
 * @example
 * ```ts
 * // In your app's type declarations (e.g. src/types.d.ts):
 * import type { AuthStore } from './stores/auth'
 * import type { CartStore } from './stores/cart'
 *
 * declare module '@liteforge/runtime' {
 *   interface PluginRegistry {
 *     auth: AuthStore
 *     cart: CartStore
 *   }
 * }
 *
 * // Now use() is typed:
 * const auth = use('auth')   // AuthStore — no cast needed
 * const cart = use('cart')   // CartStore — no cast needed
 * ```
 */
export interface PluginRegistry {}

/**
 * Context passed to a LiteForgePlugin's install() function.
 */
export interface PluginContext {
  /** The resolved target HTMLElement the app is mounted into */
  target: HTMLElement;
  /** Register a named value in the app context (accessible via use()) */
  provide<K extends string, T>(key: K, value: T): void;
  /**
   * Read a previously provided value.
   * Returns undefined if the key has not been registered yet.
   */
  resolve<T = unknown>(key: string): T | undefined;
}

/**
 * A formal LiteForge plugin with install lifecycle.
 */
export interface LiteForgePlugin {
  /** Unique plugin name — duplicate names throw before any install() runs */
  name: string;
  /**
   * Called during app bootstrap. May return a cleanup function.
   * Cleanup is called in reverse order on app.unmount().
   */
  install(context: PluginContext): void | (() => void) | Promise<void | (() => void)>;
}

/**
 * Builder returned by createApp() — supports chained .use() and async .mount().
 * Also implements Thenable so `await createApp(...)` auto-calls mount().
 */
export interface AppBuilder {
  /** Register a new-style plugin. Chainable. Throws after mount() is called. */
  use(plugin: LiteForgePlugin): AppBuilder;
  /**
   * Register a dev-only plugin via a factory that returns a Promise<LiteForgePlugin>.
   * The factory is only called in development — Vite's dead-code elimination removes
   * the entire branch (including the dynamic import) from production builds.
   *
   * @example
   * ```ts
   * createApp({ root: App, target: '#app' })
   *   .use(routerPlugin(createAppRouter()))
   *   .useDev(() => import('liteforge/devtools').then(m => m.devtoolsPlugin({
   *     shortcut: 'ctrl+shift+d',
   *     position: 'right',
   *   })))
   *   .mount();
   * ```
   */
  useDev(factory: () => Promise<LiteForgePlugin>): AppBuilder;
  /** Bootstrap and mount the application. Returns the AppInstance. */
  mount(): Promise<AppInstance>;
  /**
   * Thenable — delegates to mount() so `await createApp(...)` still works
   * without an explicit `.mount()` call (backward compat).
   */
  then<TResult1 = AppInstance, TResult2 = never>(
    onfulfilled?: ((value: AppInstance) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2>;
  /** Delegates to mount().catch() for promise-style error handling. */
  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): Promise<AppInstance | TResult>;
}

/**
 * The use() function type for accessing context.
 */
export type UseFn = {
  <K extends keyof PluginRegistry>(key: K): PluginRegistry[K];
  <T = unknown>(key: string): T;
};

/**
 * Context values stored at app/component level.
 */
export type ContextValues = Record<string, unknown>;

/**
 * Context provider function for components.
 */
export type ProviderFn = (ctx: { use: UseFn }) => ContextValues;

// ============================================================================
// Lifecycle Argument Types
// ============================================================================

/**
 * Arguments passed to the setup() function.
 */
export interface SetupArgs<P> {
  props: P;
  use: UseFn;
}

/**
 * Arguments passed to the load() function.
 */
export interface LoadArgs<P, S> {
  props: P;
  setup: S;
  use: UseFn;
}

/**
 * Arguments passed to placeholder component.
 */
export interface PlaceholderArgs<P> {
  props: P;
}

/**
 * Arguments passed to error component.
 */
export interface ErrorArgs<P> {
  props: P;
  error: Error;
  retry: () => void;
}

/**
 * Arguments passed to the main component function.
 */
export interface ComponentArgs<P, D, S> {
  props: P;
  data: D;
  setup: S;
  use: UseFn;
}

/**
 * Arguments passed to the mounted() function.
 */
export interface MountedArgs<P, D, S> {
  el: Element;
  props: P;
  data: D;
  setup: S;
  use: UseFn;
}

/**
 * Arguments passed to the destroyed() function.
 */
export interface DestroyedArgs<P, S> {
  props: P;
  setup: S;
}

// ============================================================================
// Component Definition Types
// ============================================================================

/**
 * Full component definition passed to createComponent().
 */
export interface ComponentDefinition<
  P extends object = Record<string, unknown>,
  D = unknown,
  S = unknown,
> {
  /** Component name for debugging (shown in DevTools) */
  name?: string;

  /** 
   * HMR identifier - injected by vite-plugin during development.
   * Format: "/absolute/path/to/file.tsx::ExportName"
   * @internal
   */
  __hmrId?: string;

  /** Optional prop definitions with types and defaults */
  props?: PropsSchema<P>;

  /** Phase 1: Synchronous setup, create local signals. No DOM access. */
  setup?: (args: SetupArgs<P>) => S;

  /** Phase 2: Async data loading. Component not rendered until resolved. */
  load?: (args: LoadArgs<P, S>) => Promise<D>;

  /** Shown immediately while load() is running */
  placeholder?: (args: PlaceholderArgs<P>) => Node;

  /** Shown if load() rejects */
  error?: (args: ErrorArgs<P>) => Node;

  /** Phase 3: Main component render. Only called when load() resolved. */
  component: (args: ComponentArgs<P, D, S>) => Node;

  /** Phase 4: After component is in DOM. Return cleanup function. */
  mounted?: (args: MountedArgs<P, D, S>) => void | (() => void);

  /** Phase 5: When component is removed from DOM */
  destroyed?: (args: DestroyedArgs<P, S>) => void;

  /** Provide additional context for children */
  provide?: ProviderFn;
}

/**
 * A component factory function returned by createComponent().
 * 
 * @typeParam FullP - The full props type (with all values, including defaults applied)
 * @typeParam InputP - The input props type (what callers must provide)
 * 
 * InputP defaults to FullP for backward compatibility, but createComponent()
 * computes the proper InputP based on which props have defaults.
 */
export interface ComponentFactory<
  FullP extends object = Record<string, unknown>,
  InputP = FullP
> {
  /**
   * Calling a ComponentFactory as a JSX tag produces a Node (JSX.Element = Node).
   * Internally the runtime calls this, detects __liteforge_component, and mounts
   * the ComponentInstance via h() → createComponentNode().
   *
   * Props are optional so that components with no defined props can be called
   * as `MyComponent()` without passing an empty object.
   */
  (props?: InputP): Node;
  /** Internal marker for component detection */
  __liteforge_component: true;
  /** HMR identifier (injected by vite-plugin in dev mode) */
  __hmrId?: string;
  /**
   * Component definition (for HMR to access updated render function).
   * Typed as `unknown` — HMR registry and accessing code casts appropriately.
   * @internal
   */
  __hmrOptions?: unknown;
}

/**
 * @internal — used by h(), app.ts, control-flow.ts to call a ComponentFactory
 * and access the ComponentInstance lifecycle methods. The public ComponentFactory
 * signature returns Node for JSX compat; this type exposes the real return.
 */
export type ComponentFactoryInternal = {
  (props: object): ComponentInstance;
  __liteforge_component: true;
};

/**
 * Internal component instance with lifecycle management.
 */
export interface ComponentInstance {
  /** Mount the component to a parent element */
  mount(parent: Element, before?: Node | null): void;
  /** Unmount and clean up the component */
  unmount(): void;
  /** Get the current root DOM node */
  getNode(): Node | null;
  /** Update props (triggers re-render if needed) */
  updateProps(newProps: object): void;
}

// ============================================================================
// Error Boundary Types
// ============================================================================

/**
 * Category of error captured by the error boundary.
 */
export type ErrorType = 'render' | 'navigation' | 'lazy' | 'unhandled';

/**
 * Contextual information attached to every captured error.
 */
export interface ErrorInfo {
  /** Category of error */
  type: ErrorType;
  /** Full path of the route where the error occurred, if applicable */
  route?: string;
  /** Name of the component that threw, if applicable */
  componentName?: string;
  /** The original error value (may not be an Error instance) */
  originalError: unknown;
}

/**
 * Observer hook called before the error UI is rendered.
 * Use for logging, Sentry, etc.
 */
export type ErrorHandler = (error: unknown, info: ErrorInfo) => void;

/**
 * Renders a fallback UI element when an error is captured.
 * Receives the raw error and its context.
 */
export type ErrorComponent = (error: unknown, info: ErrorInfo) => Element | DocumentFragment;

// ============================================================================
// App Types
// ============================================================================

/**
 * Generic store type for createApp stores array.
 * 
 * This interface defines the minimal contract a store must satisfy
 * to be used with createApp(). It doesn't use an index signature
 * because stores from defineStore() have complex typed properties
 * that would conflict with `[key: string]: unknown`.
 */
export interface AnyStore {
  readonly $name: string;
  $reset: () => void;
  $snapshot: () => Record<string, unknown>;
  $restore: (snapshot: Record<string, unknown>) => void;
  initialize?: () => void | Promise<void>;
}

/**
 * Router interface for createApp.
 * Minimal interface that any router implementation should satisfy.
 */
export interface RouterLike {
  /** Navigate to a path */
  navigate: (path: string) => void;
  /** Current path signal */
  path: () => string;
  /** Start the router (initial navigation) */
  start?: () => void | Promise<void>;
  /** Stop the router */
  stop?: () => void;
}

/**
 * App configuration passed to createApp().
 */
export interface AppConfig {
  /** Root component to render */
  root: ComponentFactory<object> | (() => Node);

  /** Target element or CSS selector */
  target: string | HTMLElement;

  /** Router instance (optional) */
  router?: RouterLike;

  /** Stores to register and initialize */
  stores?: AnyStore[];

  /** Custom context values available via use() */
  context?: ContextValues;

  /** Debug mode: $lf on window, logging (default: auto-detect via import.meta.env?.DEV) */
  debug?: boolean;

  /** Callback when app is successfully mounted */
  onReady?: (app: AppInstance) => void;

  /**
   * Global fallback UI rendered when an unhandled error is caught.
   * Per-route errorComponent (on RouteDefinition) takes priority.
   */
  errorComponent?: ErrorComponent;

  /**
   * Observer hook fired before the error UI renders.
   * Use for Sentry, logging, etc.
   * If omitted, errors are still caught and displayed.
   */
  onError?: ErrorHandler;
}

/**
 * App instance returned by createApp().
 */
export interface AppInstance {
  /** Unmount and clean up the app */
  unmount: () => void;
  
  /** Access context values from outside components */
  use: UseFn;
  
  /** Router instance (if configured) */
  router?: RouterLike;
  
  /** All registered stores by name */
  stores: Record<string, AnyStore>;
}

// ============================================================================
// Control Flow Types
// ============================================================================

/**
 * Falsy values that Show considers "not showing"
 */
export type Falsy = false | 0 | '' | null | undefined;

/**
 * Props for the Show component with generic type inference.
 * 
 * @typeParam T - The type returned by the `when` getter. When truthy,
 *                this value (narrowed to NonNullable<T>) is passed to children.
 * 
 * @example
 * ```ts
 * Show({
 *   when: () => currentUser(),    // () => User | null
 *   children: (user) => (         // user is User, not User | null
 *     <h1>{user.name}</h1>
 *   ),
 * })
 * ```
 */
export interface ShowProps<T> {
  /**
   * Reactive condition. When the returned value is truthy,
   * children is called with that value.
   */
  when: (() => T) | T;

  /**
   * Render function called with the truthy value.
   * The value is guaranteed to be non-null/non-undefined.
   *
   * **Must be a function** — passing static JSX nodes will throw at runtime:
   * ```tsx
   * // ✅ Correct
   * <Show when={() => user()}>{(u) => <Profile user={u} />}</Show>
   *
   * // ❌ Wrong — crashes with "children is not a function"
   * <Show when={() => user()}><Profile /></Show>
   * ```
   */
  children: (value: NonNullable<T>) => Node;

  /** Rendered when the condition is falsy. Must also be a render function. */
  fallback?: () => Node;
}

/**
 * Props for the For component with generic type inference.
 *
 * @typeParam T - The item type, inferred from the `each` array.
 *
 * The Vite plugin automatically transforms `each` into a getter and rewrites
 * item property accesses in the `children` body into reactive getter calls.
 * Write plain code — the compiler handles reactivity.
 *
 * @example
 * ```ts
 * For({
 *   each: users(),             // T[] — plain array, compiler wraps it
 *   key: 'id',
 *   children: (user, index) => (
 *     <li>{user.name}</li>     // user.name — compiler makes it reactive
 *   ),
 * })
 * ```
 */
export interface ForProps<T> {
  /**
   * Array source. Pass a plain array or signal value — the compiler wraps it
   * in a getter for reactive re-rendering automatically.
   */
  each: ReadonlyArray<T> | T[];

  /**
   * Key extractor for reconciliation. Can be:
   * - A property name of T (validated by TypeScript)
   * - A function that extracts a key from an item
   */
  key?: keyof T | ((item: T, index: number) => string | number);

  /**
   * Render function for each item.
   *
   * Write property accesses on `item` and use `index` as a plain number —
   * the Vite plugin transforms them into reactive getter calls automatically.
   * Do NOT call `index()` — `index` is already a `number` in your source code.
   *
   * @param item - The current item (use as `item.name`, not `item().name`)
   * @param index - The current index as a plain `number` (use as `index`, not `index()`)
   */
  children: (item: T, index: number) => Node;

  /** Rendered when the array is empty */
  fallback?: () => Node;
}

/**
 * Props for the Switch component.
 */
export interface SwitchProps {
  /** Fallback rendered when no Match condition is true */
  fallback?: () => Node;
  /** Array of Match case objects */
  children: Array<MatchCase>;
}

/**
 * A single case in a Switch statement.
 */
export interface MatchCase {
  /** Condition - first true match wins */
  when: (() => boolean) | boolean;
  /** Render function for this case */
  render: () => Node;
}

/**
 * Props for the Match helper function.
 */
export interface MatchProps {
  /** Reactive condition */
  when: (() => boolean) | boolean;
  /** Rendered when condition is true */
  children: () => Node;
}

/**
 * Props for the Dynamic component.
 * 
 * @typeParam P - Props type for the dynamic component
 * 
 * The component prop is a getter function that returns either:
 * - RenderFunction: A simple () => Node function
 * - ComponentFactory: A LiteForge component from createComponent()
 * - null: No component to render
 */
export interface DynamicProps<P extends Record<string, unknown> = Record<string, unknown>> {
  /** Reactive getter for the component to render */
  component: () => RenderFunction | ComponentFactory<P> | null;
  /** Props to pass to the component */
  props?: P | (() => P);
}

// ============================================================================
// JSX Support Types
// ============================================================================

/**
 * A simple render function that returns a DOM Node.
 * Distinguished from ComponentFactory by not having __liteforge_component.
 */
export type RenderFunction = () => Node;

/**
 * Child types that can be rendered.
 * Includes functions that return primitives for reactive expressions.
 */
export type Child = Node | string | number | boolean | null | undefined | (() => Child) | Child[];

/**
 * Function component type.
 */
export type FunctionComponent<P = Record<string, unknown>> = (props: P) => Node;

/**
 * Intrinsic element attributes.
 * Properties can be functions (getters) for reactivity.
 */
export type HTMLAttributes = Record<string, unknown> & {
  class?: string | (() => string);
  style?: string | (() => string) | Record<string, string>;
  children?: Child | Child[];
};

// ============================================================================
// Global JSX Namespace (for TypeScript JSX support)
// ============================================================================

declare global {
  namespace JSX {
    /** JSX elements return Node */
    type Element = Node;

    /** Props for elements */
    interface ElementAttributesProperty {
      props: Record<string, unknown>;
    }

    /** Children attribute */
    interface ElementChildrenAttribute {
      children: Child | Child[];
    }

    /** HTML elements with loose typing */
    interface IntrinsicElements {
      [elemName: string]: HTMLAttributes;
    }
  }
}
