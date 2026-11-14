import { useState } from 'react';
import { Form, useNavigation, useSubmit } from 'react-router';
import { DeleteConfirmDialog } from '~/components/dialog/delete-confirm-dialog';
import { CompanyFormPageTemplate, FormField } from '~/ui';
import { contactMissing, type ContactFormData, type FieldErrors } from '../_schemas/contact.form.schema';

type ContactFormPageProps = {
  mode: 'create' | 'edit';
  values: ContactFormData;
  actionData?: {
    error?: string;
    fieldErrors?: FieldErrors;
    values?: ContactFormData;
  } | null;
  returnTo?: string | null;
};

/**
 * Ny kontakt and Rediger kontakt (approved sketch 2026-11-14): Fornavn, Etternavn, Mobil and E-post in one card.
 * Lagre stays disabled with one line saying what's missing until the form is valid (ui-rules, rule 5). On edit,
 * "Slett kontakt" sits below the card behind a confirm dialog.
 */
export function ContactFormPage({ mode, values, actionData, returnTo }: ContactFormPageProps) {
  const navigation = useNavigation();
  const submit = useSubmit();
  const isEdit = mode === 'edit';
  const start = actionData?.values ?? values;
  const [fields, setFields] = useState({
    givenName: start.givenName ?? '',
    familyName: start.familyName ?? '',
    mobileNumber: start.mobileNumber ?? '',
    email: start.email ?? '',
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fieldErrors = actionData?.fieldErrors ?? {};
  const problem = contactMissing(fields);
  const isDeleting = navigation.formData?.get('intent') === 'delete';
  const name = [values.givenName, values.familyName].filter(Boolean).join(' ');

  const field = (key: keyof typeof fields) => ({
    name: key,
    value: fields[key],
    error: fieldErrors[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setFields((current) => ({ ...current, [key]: event.target.value })),
  });

  return (
    <CompanyFormPageTemplate
      title={isEdit ? name || 'Kontakt' : 'Ny kontakt'}
      submit={{
        form: 'contact-form',
        loading: navigation.state === 'submitting' && !isDeleting,
        disabled: Boolean(problem),
        message: problem,
      }}
      after={
        isEdit && values.id ? (
          <div>
            <button
              type="button"
              disabled={navigation.state === 'submitting'}
              onClick={() => setConfirmOpen(true)}
              className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-danger-text transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-interactive disabled:opacity-50 lg:min-h-10"
            >
              Slett kontakt
            </button>
            <DeleteConfirmDialog
              open={confirmOpen}
              onOpenChange={setConfirmOpen}
              onConfirm={() => {
                setConfirmOpen(false);
                submit(
                  { intent: 'delete', id: String(values.id), ...(returnTo ? { returnTo } : {}) },
                  { method: 'post' },
                );
              }}
              title={`Slett ${name || 'kontakten'}?`}
              description="Dette kan ikke angres."
              confirmText="Slett kontakt"
            />
          </div>
        ) : undefined
      }
    >
      <Form id="contact-form" method="post" className="flex flex-col gap-3">
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

        <div className="grid gap-3 md:grid-cols-2">
          <FormField label="Fornavn" placeholder="Ola" autoComplete="given-name" {...field('givenName')} />
          <FormField label="Etternavn" placeholder="Nordmann" autoComplete="family-name" {...field('familyName')} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <FormField
            label="Mobil (valgfritt)"
            type="tel"
            inputMode="tel"
            placeholder="412 34 567"
            autoComplete="tel"
            {...field('mobileNumber')}
          />
          <FormField
            label="E-post (valgfritt)"
            type="email"
            placeholder="fornavn@gmail.com"
            autoComplete="email"
            {...field('email')}
          />
        </div>
      </Form>
    </CompanyFormPageTemplate>
  );
}
