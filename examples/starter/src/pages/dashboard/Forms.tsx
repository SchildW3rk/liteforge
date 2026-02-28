/**
 * Forms Page - Demonstrates @liteforge/form usage
 * 
 * Features:
 * - createForm with Zod validation
 * - Field-level error display
 * - Array fields (invoice items)
 * - Computed totals
 * - Form submission handling
 */

import { createComponent, Show, For } from '@liteforge/runtime';
import { signal, computed } from '@liteforge/core';
import { createForm } from '@liteforge/form';
import { z } from 'zod';

// =============================================================================
// Contact Form Schema
// =============================================================================

const contactSchema = z.object({
  name: z.string().min(2, 'Name muss mindestens 2 Zeichen haben'),
  email: z.string().email('Ungültige E-Mail-Adresse'),
  message: z.string().min(10, 'Nachricht muss mindestens 10 Zeichen haben'),
});

// =============================================================================
// Invoice Form Schema
// =============================================================================

const invoiceSchema = z.object({
  customer: z.string().min(1, 'Kunde ist erforderlich'),
  items: z.array(z.object({
    description: z.string().min(1, 'Beschreibung ist erforderlich'),
    quantity: z.number().min(1, 'Mindestens 1'),
    price: z.number().min(0, 'Preis muss positiv sein'),
  })).min(1, 'Mindestens ein Posten erforderlich'),
});

// =============================================================================
// Forms Page Component
// =============================================================================

export const FormsPage = createComponent({
  name: 'FormsPage',

  setup() {
    // Success messages
    const contactSuccess = signal(false);
    const invoiceSuccess = signal(false);

    // Contact Form
    const contactForm = createForm({
      schema: contactSchema,
      initial: {
        name: '',
        email: '',
        message: '',
      },
      validateOn: 'blur',
      revalidateOn: 'change',
      onSubmit: async (values) => {
        console.log('Contact form submitted:', values);
        // Simulate API call
        await new Promise(r => setTimeout(r, 500));
        contactSuccess.set(true);
        setTimeout(() => contactSuccess.set(false), 3000);
        contactForm.reset();
      },
    });

    // Invoice Form
    const invoiceForm = createForm({
      schema: invoiceSchema,
      initial: {
        customer: '',
        items: [{ description: '', quantity: 1, price: 0 }],
      },
      validateOn: 'blur',
      revalidateOn: 'change',
      onSubmit: async (values) => {
        console.log('Invoice submitted:', values);
        await new Promise(r => setTimeout(r, 500));
        invoiceSuccess.set(true);
        setTimeout(() => invoiceSuccess.set(false), 3000);
        invoiceForm.reset();
      },
    });

    // Computed total for invoice
    const invoiceTotal = computed(() => {
      const items = invoiceForm.array('items').fields();
      return items.reduce((sum, item) => {
        const qty = item.field('quantity').value() as number;
        const price = item.field('price').value() as number;
        return sum + (qty * price);
      }, 0);
    });

    return { 
      contactForm, 
      contactSuccess, 
      invoiceForm, 
      invoiceSuccess, 
      invoiceTotal 
    };
  },

  component({ setup }) {
    const { 
      contactForm, 
      contactSuccess, 
      invoiceForm, 
      invoiceSuccess, 
      invoiceTotal 
    } = setup;

    const items = invoiceForm.array('items');

    return (
      <div class="forms-page">
        <header class="page-header">
          <h1>Forms</h1>
          <p class="subtitle">Formular-Management mit @liteforge/form und Zod-Validierung</p>
        </header>

        <div class="forms-grid">
          {/* Contact Form */}
          <section class="form-section">
            <h2>Kontaktformular</h2>
            <p class="form-description">Einfaches Formular mit Blur-Validierung</p>

            {Show({
              when: contactSuccess,
              children: () => (
                <div class="success-message">
                  Nachricht erfolgreich gesendet!
                </div>
              ),
            })}

            <form 
              class="form" 
              onSubmit={(e: Event) => {
                e.preventDefault();
                contactForm.submit();
              }}
            >
              {/* Name Field */}
              <div class="form-field">
                <label for="contact-name">Name</label>
                <input
                  id="contact-name"
                  type="text"
                  value={contactForm.field('name').value()}
                  onInput={(e: Event) => contactForm.field('name').set((e.target as HTMLInputElement).value)}
                  onBlur={() => contactForm.field('name').touch()}
                  class={() => contactForm.field('name').error() ? 'error' : ''}
                />
                {Show({
                  when: () => !!contactForm.field('name').error(),
                  children: () => (
                    <span class="field-error">{() => contactForm.field('name').error()}</span>
                  ),
                })}
              </div>

              {/* Email Field */}
              <div class="form-field">
                <label for="contact-email">E-Mail</label>
                <input
                  id="contact-email"
                  type="email"
                  value={contactForm.field('email').value()}
                  onInput={(e: Event) => contactForm.field('email').set((e.target as HTMLInputElement).value)}
                  onBlur={() => contactForm.field('email').touch()}
                  class={() => contactForm.field('email').error() ? 'error' : ''}
                />
                {Show({
                  when: () => !!contactForm.field('email').error(),
                  children: () => (
                    <span class="field-error">{() => contactForm.field('email').error()}</span>
                  ),
                })}
              </div>

              {/* Message Field */}
              <div class="form-field">
                <label for="contact-message">Nachricht</label>
                <textarea
                  id="contact-message"
                  value={contactForm.field('message').value()}
                  onInput={(e: Event) => contactForm.field('message').set((e.target as HTMLTextAreaElement).value)}
                  onBlur={() => contactForm.field('message').touch()}
                  class={() => contactForm.field('message').error() ? 'error' : ''}
                />
                {Show({
                  when: () => !!contactForm.field('message').error(),
                  children: () => (
                    <span class="field-error">{() => contactForm.field('message').error()}</span>
                  ),
                })}
              </div>

              {/* Form Actions */}
              <div class="form-actions">
                <button 
                  type="submit" 
                  class="btn btn-primary"
                  disabled={() => contactForm.isSubmitting() || !contactForm.isValid()}
                >
                  {() => contactForm.isSubmitting() ? 'Senden...' : 'Absenden'}
                </button>
                <button 
                  type="button" 
                  class="btn btn-secondary"
                  onClick={() => contactForm.reset()}
                >
                  Zurücksetzen
                </button>
              </div>

              {/* Form Status */}
              <div class="form-status">
                <span>Dirty: {() => contactForm.isDirty() ? 'Ja' : 'Nein'}</span>
                <span>Valid: {() => contactForm.isValid() ? 'Ja' : 'Nein'}</span>
                <span>Submits: {() => contactForm.submitCount()}</span>
              </div>
            </form>
          </section>

          {/* Invoice Form */}
          <section class="form-section">
            <h2>Rechnungsformular</h2>
            <p class="form-description">Formular mit Array-Feldern und berechneter Summe</p>

            {Show({
              when: invoiceSuccess,
              children: () => (
                <div class="success-message">
                  Rechnung erfolgreich erstellt!
                </div>
              ),
            })}

            <form 
              class="form" 
              onSubmit={(e: Event) => {
                e.preventDefault();
                invoiceForm.submit();
              }}
            >
              {/* Customer Field */}
              <div class="form-field">
                <label for="invoice-customer">Kunde</label>
                <input
                  id="invoice-customer"
                  type="text"
                  value={invoiceForm.field('customer').value()}
                  onInput={(e: Event) => invoiceForm.field('customer').set((e.target as HTMLInputElement).value)}
                  onBlur={() => invoiceForm.field('customer').touch()}
                  class={() => invoiceForm.field('customer').error() ? 'error' : ''}
                />
                {Show({
                  when: () => !!invoiceForm.field('customer').error(),
                  children: () => (
                    <span class="field-error">{() => invoiceForm.field('customer').error()}</span>
                  ),
                })}
              </div>

              {/* Items Array */}
              <div class="form-field">
                <span class="field-label">Posten</span>
                {Show({
                  when: () => !!items.error(),
                  children: () => (
                    <span class="field-error">{() => items.error()}</span>
                  ),
                })}
                
                <div class="items-list">
                  {For({
                    each: items.fields,
                    children: (item, index) => (
                      <div class="item-row">
                        <div class="item-field">
                          <input
                            type="text"
                            placeholder="Beschreibung"
                            value={item.field('description').value()}
                            onInput={(e: Event) => item.field('description').set((e.target as HTMLInputElement).value)}
                            onBlur={() => item.field('description').touch()}
                            class={() => item.field('description').error() ? 'error' : ''}
                          />
                          {Show({
                            when: () => !!item.field('description').error(),
                            children: () => (
                              <span class="field-error small">{() => item.field('description').error()}</span>
                            ),
                          })}
                        </div>
                        <div class="item-field small">
                          <input
                            type="number"
                            placeholder="Menge"
                            min="1"
                            value={item.field('quantity').value()}
                            onInput={(e: Event) => item.field('quantity').set(Number((e.target as HTMLInputElement).value) || 0)}
                            onBlur={() => item.field('quantity').touch()}
                            class={() => item.field('quantity').error() ? 'error' : ''}
                          />
                        </div>
                        <div class="item-field small">
                          <input
                            type="number"
                            placeholder="Preis"
                            min="0"
                            step="0.01"
                            value={item.field('price').value()}
                            onInput={(e: Event) => item.field('price').set(Number((e.target as HTMLInputElement).value) || 0)}
                            onBlur={() => item.field('price').touch()}
                            class={() => item.field('price').error() ? 'error' : ''}
                          />
                        </div>
                        <button 
                          type="button" 
                          class="btn btn-remove"
                          onClick={() => items.remove(index)}
                          disabled={() => items.length() <= 1}
                        >
                          ×
                        </button>
                      </div>
                    ),
                  })}
                </div>

                <button 
                  type="button" 
                  class="btn btn-add"
                  onClick={() => items.append({ description: '', quantity: 1, price: 0 })}
                >
                  + Posten hinzufügen
                </button>
              </div>

              {/* Total */}
              <div class="invoice-total">
                <strong>Gesamt:</strong>
                <span class="total-amount">{() => `€${invoiceTotal().toFixed(2)}`}</span>
              </div>

              {/* Form Actions */}
              <div class="form-actions">
                <button 
                  type="submit" 
                  class="btn btn-primary"
                  disabled={() => invoiceForm.isSubmitting()}
                >
                  {() => invoiceForm.isSubmitting() ? 'Erstellen...' : 'Rechnung erstellen'}
                </button>
                <button 
                  type="button" 
                  class="btn btn-secondary"
                  onClick={() => invoiceForm.reset()}
                >
                  Zurücksetzen
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Styles */}
        <style>{`
          .forms-page { padding: 20px; max-width: 1200px; }
          .page-header { margin-bottom: 30px; }
          .page-header h1 { margin: 0 0 5px; }
          .subtitle { color: #666; margin: 0; }
          
          .forms-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 30px; }
          
          .form-section { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; }
          .form-section h2 { margin: 0 0 5px; font-size: 18px; }
          .form-description { color: #666; font-size: 14px; margin: 0 0 20px; }
          
          .form { display: flex; flex-direction: column; gap: 15px; }
          .form-field { display: flex; flex-direction: column; gap: 5px; }
          .form-field label, .form-field .field-label { font-size: 14px; font-weight: 500; color: #333; display: block; }
          .form-field input, .form-field textarea { 
            padding: 10px; 
            border: 1px solid #ddd; 
            border-radius: 4px; 
            font-size: 14px; 
            font-family: inherit;
          }
          .form-field input.error, .form-field textarea.error { border-color: #d32f2f; }
          .form-field textarea { min-height: 100px; resize: vertical; }
          .field-error { color: #d32f2f; font-size: 12px; }
          .field-error.small { font-size: 11px; }
          
          .success-message { 
            background: #e8f5e9; 
            color: #2e7d32; 
            padding: 12px; 
            border-radius: 4px; 
            margin-bottom: 15px;
            font-size: 14px;
          }
          
          .form-actions { display: flex; gap: 10px; margin-top: 10px; }
          .form-status { 
            display: flex; 
            gap: 15px; 
            font-size: 12px; 
            color: #888; 
            margin-top: 10px; 
            padding-top: 10px;
            border-top: 1px solid #eee;
          }
          
          .btn { 
            padding: 10px 16px; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer; 
            font-size: 14px; 
            transition: opacity 0.2s;
          }
          .btn:disabled { opacity: 0.6; cursor: not-allowed; }
          .btn-primary { background: #1976d2; color: white; }
          .btn-secondary { background: #e0e0e0; color: #333; }
          .btn-add { background: #f5f5f5; color: #333; border: 1px dashed #ccc; width: 100%; margin-top: 10px; }
          .btn-remove { background: #ffebee; color: #c62828; padding: 8px 12px; }
          
          .items-list { display: flex; flex-direction: column; gap: 10px; }
          .item-row { display: flex; gap: 10px; align-items: flex-start; }
          .item-field { flex: 1; display: flex; flex-direction: column; gap: 3px; }
          .item-field.small { flex: 0 0 80px; }
          .item-field input { padding: 8px; }
          
          .invoice-total { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 4px;
            margin-top: 10px;
          }
          .total-amount { font-size: 20px; font-weight: bold; color: #1976d2; }
        `}</style>
      </div>
    );
  },
});
