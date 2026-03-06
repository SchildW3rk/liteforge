import { effect, signal } from '@liteforge/core';
import { h, use } from '@liteforge/runtime';
import type { Router } from '@liteforge/router';
import type { Client, ListResponse } from '@liteforge/client';
import type { ResourceDefinition, FormFieldConfig } from '../types.js';
import { useRecord } from '../hooks/useRecord.js';
import { useResource } from '../hooks/useResource.js';

function evalPerm<T>(
  perm: boolean | ((record: T) => boolean) | undefined,
  record: T,
): boolean {
  if (perm === undefined) return true;
  if (typeof perm === 'boolean') return perm;
  return perm(record);
}

export interface ResourceFormProps {
  resource: ResourceDefinition<unknown>;
  client: Client;
  mode: 'create' | 'edit';
  basePath: string;
}

function buildFieldNode(
  fieldCfg: FormFieldConfig,
  getValue: () => unknown,
  setValue: (v: unknown) => void,
  getError: () => string | null,
  client?: Client,
): Node {
  const wrapperClass = 'lf-admin-form__field' +
    (fieldCfg.span === 'full' ? ' lf-admin-form__field--full' : '');

  const labelClass = 'lf-admin-form__label' +
    (fieldCfg.required ? ' lf-admin-form__label--required' : '');

  const labelEl = h('label', { class: labelClass }, fieldCfg.label);

  // Error span
  const errorEl = h('span', { class: 'lf-admin-form__error', style: 'display:none' });
  effect(() => {
    const err = getError();
    (errorEl as HTMLElement).style.display = err ? 'block' : 'none';
    if (err) errorEl.textContent = err;
  });

  // Custom renderer
  if (fieldCfg.renderForm) {
    return h('div', { class: wrapperClass },
      labelEl,
      fieldCfg.renderForm(getValue, setValue),
      errorEl,
    );
  }

  let inputEl: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | Node;

  switch (fieldCfg.type) {
    case 'textarea': {
      const ta = h('textarea', { class: 'lf-admin-form__textarea' }) as HTMLTextAreaElement;
      ta.value = String(getValue() ?? '');
      ta.addEventListener('input', () => setValue(ta.value));
      effect(() => { ta.value = String(getValue() ?? ''); });
      inputEl = ta;
      break;
    }

    case 'boolean': {
      const cb = h('input', { type: 'checkbox' }) as HTMLInputElement;
      cb.checked = Boolean(getValue());
      cb.addEventListener('change', () => setValue(cb.checked));
      effect(() => { cb.checked = Boolean(getValue()); });
      inputEl = h('div', { style: 'display:flex;align-items:center;gap:8px' },
        cb,
        h('span', null, fieldCfg.label),
      );
      break;
    }

    case 'select': {
      const opts = fieldCfg.options ?? [];
      const sel = h('select', { class: 'lf-admin-form__select' },
        h('option', { value: '' }, `Select ${fieldCfg.label}...`),
        ...opts.map(opt => h('option', { value: opt.value }, opt.label)),
      ) as HTMLSelectElement;
      sel.value = String(getValue() ?? '');
      sel.addEventListener('change', () => setValue(sel.value));
      effect(() => { sel.value = String(getValue() ?? ''); });
      inputEl = sel;
      break;
    }

    case 'number': {
      const inp = h('input', { type: 'number', class: 'lf-admin-form__input' }) as HTMLInputElement;
      inp.value = String(getValue() ?? '');
      inp.addEventListener('input', () =>
        setValue(inp.value === '' ? null : Number(inp.value)));
      effect(() => { inp.value = getValue() != null ? String(getValue()) : ''; });
      inputEl = inp;
      break;
    }

    case 'date': {
      const inp = h('input', { type: 'date', class: 'lf-admin-form__input' }) as HTMLInputElement;
      const toDateStr = (v: unknown): string => {
        if (!v) return '';
        try { return new Date(v as string).toISOString().split('T')[0] ?? ''; }
        catch { return ''; }
      };
      inp.value = toDateStr(getValue());
      inp.addEventListener('input', () => setValue(inp.value));
      effect(() => { inp.value = toDateStr(getValue()); });
      inputEl = inp;
      break;
    }

    case 'relation': {
      const relationCfg = fieldCfg.relation;
      if (!relationCfg || !client) {
        // Fallback: plain text input if no config or client
        const inp = h('input', { type: 'text', class: 'lf-admin-form__input' }) as HTMLInputElement;
        inp.value = String(getValue() ?? '');
        inp.addEventListener('input', () => setValue(inp.value));
        effect(() => { inp.value = String(getValue() ?? ''); });
        inputEl = inp;
        break;
      }

      const labelField = relationCfg.labelField;
      const relEndpoint = relationCfg.resource;

      const displayValue = signal('');
      const dropdownItems = signal<Record<string, unknown>[]>([]);
      const dropdownOpen = signal(false);

      // Init display from current value
      const currentId = getValue();
      if (currentId != null && currentId !== '') {
        void client.resource<Record<string, unknown>>(relEndpoint)
          .getOne(currentId as string | number)
          .then(rec => { displayValue.set(String(rec[labelField] ?? '')); })
          .catch(() => {});
      }

      const inp = h('input', {
        type: 'text',
        class: 'lf-admin-form__input',
        autocomplete: 'off',
      }) as HTMLInputElement;

      effect(() => { inp.value = displayValue(); });

      const dropdown = h('ul', { class: 'lf-admin-relation__dropdown', style: 'display:none' }) as HTMLElement;

      effect(() => {
        const items = dropdownItems();
        const open = dropdownOpen();
        dropdown.style.display = open && items.length > 0 ? 'block' : 'none';
        dropdown.innerHTML = '';
        if (items.length === 0 && open) {
          dropdown.appendChild(h('li', { class: 'lf-admin-relation__empty' }, 'No results'));
          dropdown.style.display = 'block';
        }
        for (const item of items) {
          const li = h('li', { class: 'lf-admin-relation__option' }, String(item[labelField] ?? ''));
          li.addEventListener('mousedown', (e) => {
            e.preventDefault();
            setValue(item['id']);
            displayValue.set(String(item[labelField] ?? ''));
            dropdownOpen.set(false);
            dropdownItems.set([]);
          });
          dropdown.appendChild(li);
        }
      });

      let searchTimer: ReturnType<typeof setTimeout> | null = null;
      inp.addEventListener('input', () => {
        const v = inp.value;
        displayValue.set(v);
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          void client.resource<Record<string, unknown>>(relEndpoint)
            .getList({ search: v, pageSize: 10 })
            .then((res: ListResponse<Record<string, unknown>>) => {
              dropdownItems.set(res.data);
              dropdownOpen.set(true);
            })
            .catch(() => {});
        }, 300);
      });

      inp.addEventListener('focus', () => {
        if (dropdownItems().length > 0) dropdownOpen.set(true);
      });

      inp.addEventListener('blur', () => {
        // Slight delay so mousedown on li fires first
        setTimeout(() => dropdownOpen.set(false), 150);
      });

      inputEl = h('div', { class: 'lf-admin-relation' }, inp, dropdown);
      break;
    }

    default: {
      const inp = h('input', {
        type: fieldCfg.type === 'image' ? 'url' : 'text',
        class: 'lf-admin-form__input',
      }) as HTMLInputElement;
      inp.value = String(getValue() ?? '');
      inp.addEventListener('input', () => setValue(inp.value));
      effect(() => { inp.value = String(getValue() ?? ''); });
      inputEl = inp;
      break;
    }
  }

  return h('div', { class: wrapperClass }, labelEl, inputEl, errorEl);
}

export function ResourceForm(props: ResourceFormProps): Node {
  const { resource, client, mode, basePath } = props;

  let router: Router | undefined;
  try {
    router = use<Router>('router');
  } catch { /* no-op */ }

  const getId = (): string => router?.params()['id'] ?? '';

  const res = useResource({ resource, client });
  const formFields = resource.form?.fields ?? [];
  const layout = resource.form?.layout ?? 'single';

  const buildInitialValues = (record?: Record<string, unknown>): Record<string, unknown> => {
    const init: Record<string, unknown> = {};
    for (const f of formFields) init[f.field] = record?.[f.field] ?? '';
    return init;
  };

  const fieldValues = signal<Record<string, unknown>>(buildInitialValues());
  const fieldErrors = signal<Record<string, string | null>>({});
  const isSubmitting = signal<boolean>(false);
  const formError = signal<string | null>(null);
  const recordLoaded = signal<boolean>(mode === 'create');

  // Permission denied placeholder
  const permDenied = signal<string | null>(null);

  // In create mode — check canCreate immediately
  if (mode === 'create') {
    const canCreate = evalPerm(resource.permissions?.canCreate as boolean | (() => boolean) | undefined, {} as Record<string, unknown>);
    if (!canCreate) {
      permDenied.set(`No permission to create ${resource.label}.`);
    }
  }

  // In edit mode, load existing record before showing form
  if (mode === 'edit') {
    const { record, loading } = useRecord<Record<string, unknown>>(() =>
      client.resource<Record<string, unknown>>(resource.endpoint).getOne(getId()),
    );
    effect(() => {
      const rec = record();
      const isLoading = loading();
      if (!isLoading && rec) {
        if (!evalPerm(resource.permissions?.canEdit, rec)) {
          permDenied.set(`No permission to edit ${resource.label}.`);
        }
        fieldValues.set(buildInitialValues(rec));
        recordLoaded.set(true);
      }
    });
  }

  // ── Header ───────────────────────────────────────────────────────────────────

  const formHeader = h('div', { class: 'lf-admin-form__header' },
    h('button', {
      class: 'lf-admin-btn lf-admin-btn--ghost',
      onclick: () => router?.back(),
    }, '← Back'),
    h('h2', { class: 'lf-admin-form__title' },
      mode === 'create' ? `New ${resource.label}` : `Edit ${resource.label}`,
    ),
  );

  // ── Form error ───────────────────────────────────────────────────────────────

  const formErrorEl = h('div', { class: 'lf-admin-error', style: 'display:none' });
  effect(() => {
    const err = formError();
    (formErrorEl as HTMLElement).style.display = err ? 'block' : 'none';
    if (err) formErrorEl.textContent = err;
  });

  // ── Loading placeholder (edit mode) ──────────────────────────────────────────

  const loadingEl = h('div', { class: 'lf-admin-loading' }, 'Loading...');

  // ── Field grid ───────────────────────────────────────────────────────────────

  const gridClass = 'lf-admin-form__grid' +
    (layout === 'two-column' ? ' lf-admin-form__grid--two-column' : '');

  const fieldNodes = formFields.map(fieldCfg =>
    buildFieldNode(
      fieldCfg,
      () => fieldValues()[fieldCfg.field],
      (v: unknown) => {
        fieldValues.update((vals: Record<string, unknown>) => ({ ...vals, [fieldCfg.field]: v }));
        fieldErrors.update((errs: Record<string, string | null>) => ({ ...errs, [fieldCfg.field]: null }));
      },
      () => fieldErrors()[fieldCfg.field] ?? null,
      client,
    ),
  );

  const grid = h('div', { class: gridClass }, ...fieldNodes);

  // ── Submit button ─────────────────────────────────────────────────────────────

  const submitBtn = h('button', {
    class: 'lf-admin-btn lf-admin-btn--primary',
    type: 'button',
  }, mode === 'create' ? 'Create' : 'Save') as HTMLButtonElement;

  effect(() => {
    const sub = isSubmitting();
    submitBtn.disabled = sub;
    submitBtn.textContent = sub ? '...' : (mode === 'create' ? 'Create' : 'Save');
  });

  const actionsEl = h('div', { class: 'lf-admin-form__actions' },
    h('button', {
      class: 'lf-admin-btn lf-admin-btn--ghost',
      type: 'button',
      onclick: () => router?.back(),
    }, 'Cancel'),
    submitBtn,
  );

  // Loading/form visibility in edit mode
  effect(() => {
    if (mode === 'edit') {
      const loaded = recordLoaded();
      const denied = permDenied();
      (loadingEl as HTMLElement).style.display = !loaded && !denied ? 'block' : 'none';
      (grid as HTMLElement).style.display = loaded && !denied ? 'grid' : 'none';
      (actionsEl as HTMLElement).style.display = loaded && !denied ? 'flex' : 'none';
    }
  });

  // ── Validation ───────────────────────────────────────────────────────────────

  function validate(): boolean {
    const errs: Record<string, string | null> = {};
    let valid = true;

    for (const f of formFields) {
      const val = fieldValues()[f.field];
      if (f.required && (val === '' || val === null || val === undefined)) {
        errs[f.field] = `${f.label} is required`;
        valid = false;
      } else {
        errs[f.field] = null;
      }
    }

    if (resource.schema) {
      const result = resource.schema.safeParse(fieldValues());
      if (!result.success) {
        valid = false;
        for (const issue of result.error.issues) {
          const path = issue.path.join('.');
          if (path) errs[path] = issue.message;
        }
      }
    }

    fieldErrors.set(errs);
    return valid;
  }

  submitBtn.addEventListener('click', async () => {
    formError.set(null);
    if (!validate()) return;

    isSubmitting.set(true);
    try {
      const data = fieldValues();
      if (mode === 'create') {
        await res.create(data);
      } else {
        await res.update(getId(), data);
      }
      if (router) void router.navigate(`${basePath}/${resource.name}`);
    } catch (err) {
      formError.set(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      isSubmitting.set(false);
    }
  });

  // Permission denied message (shown instead of form)
  const permDeniedEl = h('div', { class: 'lf-admin-error', style: 'display:none' }) as HTMLElement;
  effect(() => {
    const msg = permDenied();
    permDeniedEl.style.display = msg ? 'block' : 'none';
    if (msg) permDeniedEl.textContent = msg;
    // For create mode hide form when denied (edit mode handled by its own effect)
    if (mode === 'create') {
      (grid as HTMLElement).style.display = msg ? 'none' : 'grid';
      (actionsEl as HTMLElement).style.display = msg ? 'none' : 'flex';
    }
  });

  return h('div', { class: 'lf-admin-form' },
    formHeader,
    permDeniedEl,
    formErrorEl,
    ...(mode === 'edit' ? [loadingEl] : []),
    grid,
    actionsEl,
  );
}
