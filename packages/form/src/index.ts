/**
 * @liteforge/form
 * 
 * Signals-based form management with Zod validation for LiteForge.
 */

// Core function
export { createForm } from './form.js';

// Composable helpers
export { useField } from './helpers.js';

// Field-bound input components
export { Input, Textarea } from './components.js';
export type { InputProps, TextareaProps } from './components.js';

// Types
export type {
  // Form options and result
  FormOptions,
  FormResult,
  
  // Field types
  FieldResult,
  ArrayFieldResult,
  ArrayItemField,
  
  // Validation modes
  ValidateOn,
  RevalidateOn,
  
  // Path utilities
  FieldPaths,
  PathValue,
} from './types.js';
