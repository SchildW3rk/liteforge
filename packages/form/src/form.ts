/**
 * @liteforge/form - createForm
 * 
 * Signals-based form management with Zod validation.
 */

import { signal, computed, batch } from '@liteforge/core';
import type { z } from 'zod';
import type {
  FormOptions,
  FormResult,
  FieldResult,
  ArrayFieldResult,
  ArrayItemField,
} from './types.js';

// ============================================================================
// Utilities
// ============================================================================

/**
 * Deep clone a value.
 */
function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(item => deepClone(item)) as T;
  }
  const result: Record<string, unknown> = {};
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      result[key] = deepClone((value as Record<string, unknown>)[key]);
    }
  }
  return result as T;
}

/**
 * Get a value at a path (dot-notation).
 */
function getPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Set a value at a path (dot-notation), returns a new object.
 */
function setPath<T>(obj: T, path: string, value: unknown): T {
  const parts = path.split('.');
  const result = deepClone(obj);
  
  let current: Record<string, unknown> = result as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part === undefined) continue;
    
    if (current[part] === undefined || current[part] === null) {
      // Check if next part is a number (array index)
      const nextPart = parts[i + 1];
      current[part] = nextPart !== undefined && /^\d+$/.test(nextPart) ? [] : {};
    } else {
      current[part] = deepClone(current[part]);
    }
    current = current[part] as Record<string, unknown>;
  }
  
  const lastPart = parts[parts.length - 1];
  if (lastPart !== undefined) {
    current[lastPart] = value;
  }
  
  return result;
}

/**
 * Check if two values are deeply equal.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  
  if (Array.isArray(a) || Array.isArray(b)) return false;
  
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => 
    deepEqual(
      (a as Record<string, unknown>)[key], 
      (b as Record<string, unknown>)[key]
    )
  );
}

/**
 * Convert Zod issue path to dot-notation string.
 */
function pathToString(path: (string | number)[]): string {
  return path.join('.');
}

// ============================================================================
// createForm Implementation
// ============================================================================

/**
 * Create a reactive form with Zod validation.
 * 
 * @param options - Form options including schema, initial values, and submit handler
 * @returns Form result with field access and form-level state
 * 
 * @example
 * ```ts
 * const loginForm = createForm({
 *   schema: z.object({
 *     email: z.string().email(),
 *     password: z.string().min(8),
 *   }),
 *   initial: { email: '', password: '' },
 *   onSubmit: async (values) => {
 *     await api.login(values);
 *   },
 * });
 * ```
 */
export function createForm<TSchema extends z.ZodObject<z.ZodRawShape>>(
  options: FormOptions<TSchema>
): FormResult<TSchema> {
  type FormValues = z.input<TSchema>;
  type FormOutput = z.output<TSchema>;

  const { schema, initial, onSubmit, validateOn = 'blur', revalidateOn = 'change' } = options;

  // Store initial values for reset
  const initialValues = deepClone(initial);

  // Form-level signals
  const valuesSignal = signal<FormValues>(deepClone(initial));
  const errorsSignal = signal<Record<string, string | undefined>>({});
  const touchedSignal = signal<Record<string, boolean>>({});
  const isSubmittingSignal = signal(false);
  const submitCountSignal = signal(0);

  // Track which fields have had errors (for revalidation)
  const hasHadErrorSignal = signal<Record<string, boolean>>({});

  // Computed signals
  const isValidSignal = computed(() => {
    const errors = errorsSignal();
    return Object.values(errors).every(e => e === undefined);
  });

  const isDirtySignal = computed(() => {
    return !deepEqual(valuesSignal(), initialValues);
  });

  // ========================================================================
  // Validation
  // ========================================================================

  /**
   * Validate the entire form and return errors.
   */
  function validateAll(): Record<string, string | undefined> {
    const result = schema.safeParse(valuesSignal());
    const errors: Record<string, string | undefined> = {};
    
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = pathToString(issue.path);
        // Only set first error for each path
        if (errors[path] === undefined) {
          errors[path] = issue.message;
        }
      }
    }
    
    return errors;
  }

  /**
   * Validate a specific field path.
   */
  function validateField(path: string): string | undefined {
    const result = schema.safeParse(valuesSignal());
    
    if (result.success) {
      return undefined;
    }
    
    // Find error for this specific path
    for (const issue of result.error.issues) {
      const issuePath = pathToString(issue.path);
      if (issuePath === path) {
        return issue.message;
      }
    }
    
    return undefined;
  }

  /**
   * Set error for a field and track that it has had an error.
   */
  function setFieldError(path: string, error: string | undefined): void {
    const currentErrors = errorsSignal();
    if (currentErrors[path] !== error) {
      errorsSignal.set({ ...currentErrors, [path]: error });
    }
    
    if (error !== undefined) {
      const hasHadError = hasHadErrorSignal();
      if (!hasHadError[path]) {
        hasHadErrorSignal.set({ ...hasHadError, [path]: true });
      }
    }
  }

  /**
   * Should we validate this field right now?
   */
  function shouldValidateOnChange(path: string): boolean {
    if (validateOn === 'change') return true;
    if (validateOn === 'submit') return false;
    
    // validateOn === 'blur'
    // Revalidate if field has had an error and revalidateOn is 'change'
    const hasHadError = hasHadErrorSignal()[path];
    
    if (hasHadError && revalidateOn === 'change') return true;
    
    return false;
  }

  /**
   * Should we validate this field on blur?
   */
  function shouldValidateOnBlur(): boolean {
    if (validateOn === 'blur') return true;
    if (validateOn === 'submit') return false;
    return false;
  }

  // ========================================================================
  // Field Access
  // ========================================================================

  /**
   * Get a field by path.
   */
  function field<P extends string>(path: P): FieldResult {
    // Create computed signals for this field
    const valueSignal = computed(() => getPath(valuesSignal(), path));
    const errorSignal = computed(() => errorsSignal()[path]);
    const touchedFieldSignal = computed(() => touchedSignal()[path] ?? false);
    const dirtySignal = computed(() => {
      const current = getPath(valuesSignal(), path);
      const initial = getPath(initialValues, path);
      return !deepEqual(current, initial);
    });

    function set(value: unknown): void {
      const newValues = setPath(valuesSignal(), path, value);
      valuesSignal.set(newValues as FormValues);
      
      // Maybe validate on change
      if (shouldValidateOnChange(path)) {
        const error = validateField(path);
        setFieldError(path, error);
      }
    }

    function reset(): void {
      const initialValue = getPath(initialValues, path);
      const newValues = setPath(valuesSignal(), path, initialValue);
      valuesSignal.set(newValues as FormValues);
      
      // Clear touched and error
      const currentTouched = touchedSignal();
      if (currentTouched[path]) {
        touchedSignal.set({ ...currentTouched, [path]: false });
      }
      
      const currentErrors = errorsSignal();
      if (currentErrors[path] !== undefined) {
        errorsSignal.set({ ...currentErrors, [path]: undefined });
      }
      
      const hasHadError = hasHadErrorSignal();
      if (hasHadError[path]) {
        hasHadErrorSignal.set({ ...hasHadError, [path]: false });
      }
    }

    function validate(): void {
      const error = validateField(path);
      setFieldError(path, error);
    }

    function touch(): void {
      const currentTouched = touchedSignal();
      if (!currentTouched[path]) {
        touchedSignal.set({ ...currentTouched, [path]: true });
      }
      
      // Maybe validate on blur
      if (shouldValidateOnBlur()) {
        validate();
      }
    }

    return {
      value: valueSignal as () => unknown,
      error: errorSignal,
      touched: touchedFieldSignal,
      dirty: dirtySignal,
      set,
      reset,
      validate,
      touch,
    };
  }

  // ========================================================================
  // Array Field Access
  // ========================================================================

  /**
   * Get an array field by path.
   */
  function array<P extends string>(path: P): ArrayFieldResult {
    const arrayValueSignal = computed(() => {
      const value = getPath(valuesSignal(), path);
      return Array.isArray(value) ? value : [];
    });

    const errorSignal = computed(() => errorsSignal()[path]);

    const lengthSignal = computed(() => arrayValueSignal().length);

    /**
     * Create field accessors for an array item.
     */
    function createItemField(index: number): ArrayItemField {
      return {
        field: <SubP extends string>(subPath: SubP) => {
          const fullPath = `${path}.${index}.${subPath}`;
          return field(fullPath);
        },
        index: () => index,
        value: () => arrayValueSignal()[index],
      };
    }

    const fieldsSignal = computed(() => {
      const arr = arrayValueSignal();
      return arr.map((_, index) => createItemField(index));
    });

    function append(value: unknown): void {
      const arr = [...arrayValueSignal(), value];
      const newValues = setPath(valuesSignal(), path, arr);
      valuesSignal.set(newValues as FormValues);
    }

    function prepend(value: unknown): void {
      const arr = [value, ...arrayValueSignal()];
      const newValues = setPath(valuesSignal(), path, arr);
      valuesSignal.set(newValues as FormValues);
    }

    function insert(index: number, value: unknown): void {
      const arr = [...arrayValueSignal()];
      arr.splice(index, 0, value);
      const newValues = setPath(valuesSignal(), path, arr);
      valuesSignal.set(newValues as FormValues);
    }

    function remove(index: number): void {
      const arr = [...arrayValueSignal()];
      arr.splice(index, 1);
      const newValues = setPath(valuesSignal(), path, arr);
      valuesSignal.set(newValues as FormValues);
      
      // Clean up errors for removed and shifted indices
      const currentErrors = { ...errorsSignal() };
      const currentTouched = { ...touchedSignal() };
      const currentHasHadError = { ...hasHadErrorSignal() };
      
      // Remove errors for the deleted index and shift higher indices
      const prefix = `${path}.${index}`;
      for (const key of Object.keys(currentErrors)) {
        if (key.startsWith(prefix + '.') || key === prefix) {
          delete currentErrors[key];
          delete currentTouched[key];
          delete currentHasHadError[key];
        }
      }
      
      errorsSignal.set(currentErrors);
      touchedSignal.set(currentTouched);
      hasHadErrorSignal.set(currentHasHadError);
    }

    function move(from: number, to: number): void {
      const arr = [...arrayValueSignal()];
      const [item] = arr.splice(from, 1);
      if (item !== undefined) {
        arr.splice(to, 0, item);
      }
      const newValues = setPath(valuesSignal(), path, arr);
      valuesSignal.set(newValues as FormValues);
    }

    function swap(indexA: number, indexB: number): void {
      const arr = [...arrayValueSignal()];
      const temp = arr[indexA];
      arr[indexA] = arr[indexB];
      arr[indexB] = temp;
      const newValues = setPath(valuesSignal(), path, arr);
      valuesSignal.set(newValues as FormValues);
    }

    function replace(values: unknown[]): void {
      const newValues = setPath(valuesSignal(), path, [...values]);
      valuesSignal.set(newValues as FormValues);
    }

    return {
      fields: fieldsSignal,
      append,
      prepend,
      insert,
      remove,
      move,
      swap,
      replace,
      length: lengthSignal,
      error: errorSignal,
    };
  }

  // ========================================================================
  // Form-Level Actions
  // ========================================================================

  /**
   * Validate all fields.
   */
  function validate(): boolean {
    const errors = validateAll();
    errorsSignal.set(errors);
    
    // Mark all fields with errors as having had errors
    const hasHadError: Record<string, boolean> = {};
    for (const path of Object.keys(errors)) {
      if (errors[path] !== undefined) {
        hasHadError[path] = true;
      }
    }
    hasHadErrorSignal.set({ ...hasHadErrorSignal(), ...hasHadError });
    
    return Object.values(errors).every(e => e === undefined);
  }

  /**
   * Submit the form.
   */
  async function submit(): Promise<void> {
    // Increment submit count
    submitCountSignal.set(submitCountSignal() + 1);
    
    // Validate all fields
    const isValid = validate();
    
    if (!isValid) {
      return;
    }
    
    // Call onSubmit
    isSubmittingSignal.set(true);
    
    try {
      const result = schema.parse(valuesSignal()) as FormOutput;
      await onSubmit(result);
    } finally {
      isSubmittingSignal.set(false);
    }
  }

  /**
   * Reset the form to initial values.
   */
  function reset(): void {
    batch(() => {
      valuesSignal.set(deepClone(initialValues) as FormValues);
      errorsSignal.set({});
      touchedSignal.set({});
      hasHadErrorSignal.set({});
    });
  }

  /**
   * Set multiple values at once.
   */
  function setValues(values: Partial<FormValues>): void {
    const current = valuesSignal();
    const merged = { ...current };
    
    // Deep merge
    function mergeDeep(target: Record<string, unknown>, source: Record<string, unknown>): void {
      for (const key of Object.keys(source)) {
        const sourceValue = source[key];
        if (sourceValue !== undefined) {
          if (
            typeof sourceValue === 'object' && 
            sourceValue !== null && 
            !Array.isArray(sourceValue) &&
            typeof target[key] === 'object' &&
            target[key] !== null &&
            !Array.isArray(target[key])
          ) {
            mergeDeep(target[key] as Record<string, unknown>, sourceValue as Record<string, unknown>);
          } else {
            target[key] = sourceValue;
          }
        }
      }
    }
    
    mergeDeep(merged as Record<string, unknown>, values as Record<string, unknown>);
    valuesSignal.set(merged as FormValues);
    
    // Revalidate fields that have had errors
    const hasHadError = hasHadErrorSignal();
    const currentErrors = { ...errorsSignal() };
    let hasChanges = false;
    
    for (const path of Object.keys(hasHadError)) {
      if (hasHadError[path] && revalidateOn === 'change') {
        const error = validateField(path);
        if (currentErrors[path] !== error) {
          currentErrors[path] = error;
          hasChanges = true;
        }
      }
    }
    
    if (hasChanges) {
      errorsSignal.set(currentErrors);
    }
  }

  /**
   * Clear all errors.
   */
  function clearErrors(): void {
    errorsSignal.set({});
    hasHadErrorSignal.set({});
  }

  // ========================================================================
  // Return Form Result
  // ========================================================================

  return {
    field,
    array,
    values: valuesSignal,
    errors: errorsSignal,
    isValid: isValidSignal,
    isDirty: isDirtySignal,
    isSubmitting: isSubmittingSignal,
    submitCount: submitCountSignal,
    submit,
    reset,
    setValues,
    validate,
    clearErrors,
  } as FormResult<TSchema>;
}
