/**
 * @liteforge/form Types
 * 
 * Type definitions for the form management system with Zod validation.
 */

import type { z } from 'zod';

// ============================================================================
// Path Type Utilities
// ============================================================================

/**
 * Generate all valid dot-notation paths for a type.
 * e.g., { address: { street: string, city: string } } 
 *       → 'address' | 'address.street' | 'address.city'
 */
export type FieldPaths<T> = T extends (infer U)[]
  ? `${number}` | `${number}.${FieldPaths<U>}`
  : T extends object
    ? {
        [K in keyof T & string]: T[K] extends object
          ? K | `${K}.${FieldPaths<T[K]>}`
          : K;
      }[keyof T & string]
    : never;

/**
 * Get the type at a given path.
 */
export type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : K extends `${number}`
      ? T extends (infer U)[]
        ? PathValue<U, Rest>
        : never
      : never
  : P extends keyof T
    ? T[P]
    : P extends `${number}`
      ? T extends (infer U)[]
        ? U
        : never
      : never;

// ============================================================================
// Validation Modes
// ============================================================================

/**
 * When to validate fields.
 */
export type ValidateOn = 'change' | 'blur' | 'submit';

/**
 * When to revalidate fields after an error.
 */
export type RevalidateOn = 'change' | 'blur';

// ============================================================================
// Form Options
// ============================================================================

/**
 * Options for createForm.
 */
export interface FormOptions<TSchema extends z.ZodObject<z.ZodRawShape>> {
  /** Zod schema for validation */
  schema: TSchema;
  /** Initial values (type-inferred from schema) */
  initial: z.input<TSchema>;
  /** Submit handler - receives validated values */
  onSubmit: (values: z.output<TSchema>) => Promise<void> | void;
  /** When to validate fields (default: 'blur') */
  validateOn?: ValidateOn;
  /** When to revalidate after an error (default: 'change') */
  revalidateOn?: RevalidateOn;
}

// ============================================================================
// Field Types
// ============================================================================

/**
 * Result returned by form.field(path).
 */
export interface FieldResult<T = unknown> {
  /** Current value (Signal) */
  value: () => T;
  /** Validation error message (Signal) */
  error: () => string | undefined;
  /** Has the field been blurred? (Signal) */
  touched: () => boolean;
  /** Is the value different from initial? (Signal) */
  dirty: () => boolean;
  /** Set the field value */
  set: (value: T) => void;
  /** Reset to initial value */
  reset: () => void;
  /** Manually trigger validation */
  validate: () => void;
  /** Mark field as touched (for blur handling) */
  touch: () => void;
}

/**
 * A single item in an array field.
 */
export interface ArrayItemField<T = unknown> {
  /** Access a field within this array item */
  field: (path: string) => FieldResult;
  /** Get the index of this item */
  index: () => number;
  /** Get the full value of this item */
  value: () => T;
}

/**
 * Result returned by form.array(path).
 */
export interface ArrayFieldResult<T = unknown> {
  /** Array of field groups (Signal) */
  fields: () => ArrayItemField<T>[];
  /** Append a new item to the array */
  append: (value: T) => void;
  /** Prepend a new item to the array */
  prepend: (value: T) => void;
  /** Insert an item at a specific index */
  insert: (index: number, value: T) => void;
  /** Remove an item at a specific index */
  remove: (index: number) => void;
  /** Move an item from one index to another */
  move: (from: number, to: number) => void;
  /** Swap two items */
  swap: (indexA: number, indexB: number) => void;
  /** Replace all items */
  replace: (values: T[]) => void;
  /** Get the current array length */
  length: () => number;
  /** Get the validation error for the array itself */
  error: () => string | undefined;
}

// ============================================================================
// Form Result
// ============================================================================

/**
 * Result returned by createForm.
 */
export interface FormResult<TSchema extends z.ZodObject<z.ZodRawShape>> {
  // Field access
  /** Get a field by path (supports dot-notation for nested fields) */
  field: <P extends FieldPaths<z.input<TSchema>> | string>(
    path: P
  ) => FieldResult<PathValue<z.input<TSchema>, P>>;
  
  /** Get an array field by path */
  array: <P extends string>(
    path: P
  ) => ArrayFieldResult<
    PathValue<z.input<TSchema>, P> extends (infer U)[] ? U : never
  >;

  // Form-level state (all signals)
  /** Current form values (Signal) */
  values: () => z.input<TSchema>;
  /** All field errors (Signal) */
  errors: () => Record<string, string | undefined>;
  /** Are all fields valid? (Signal) */
  isValid: () => boolean;
  /** Has any field been modified? (Signal) */
  isDirty: () => boolean;
  /** Is the form currently submitting? (Signal) */
  isSubmitting: () => boolean;
  /** Number of times the form has been submitted (Signal) */
  submitCount: () => number;

  // Actions
  /** Validate all fields and call onSubmit if valid */
  submit: () => Promise<void>;
  /** Reset all fields to initial values */
  reset: () => void;
  /** Set multiple field values at once */
  setValues: (values: Partial<z.input<TSchema>>) => void;
  /** Validate all fields without submitting */
  validate: () => boolean;
  /** Clear all errors */
  clearErrors: () => void;
}

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Internal field state.
 */
export interface InternalFieldState<T = unknown> {
  value: T;
  error: string | undefined;
  touched: boolean;
  initialValue: T;
}

/**
 * Map of path -> field state signals.
 */
export type FieldStateMap = Map<string, {
  valueSignal: () => unknown;
  setValueSignal: (v: unknown) => void;
  errorSignal: () => string | undefined;
  setErrorSignal: (e: string | undefined) => void;
  touchedSignal: () => boolean;
  setTouchedSignal: (t: boolean) => void;
  initialValue: unknown;
}>;
