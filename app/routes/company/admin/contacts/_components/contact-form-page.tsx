import { Form, useNavigation } from 'react-router';
import { CompanyFormPageTemplate, FormField } from '~/ui';
import type { ContactFormData, FieldErrors } from '../_schemas/contact.form.schema';

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

export function ContactFormPage({ mode, values, actionData, returnTo }: ContactFormPageProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const isEdit = mode === 'edit';
  const currentValues = actionData?.values ?? values;
  const fieldErrors = actionData?.fieldErrors ?? {};

  return (
    <CompanyFormPageTemplate
      title={
        isEdit
          ? [currentValues.givenName, currentValues.familyName].filter(Boolean).join(' ') || 'Rediger kontakt'
          : 'Ny kontakt'
      }
      submit={{ form: 'contact-form', loading: isSubmitting }}
    >
      <Form id="contact-form" method="post" className="space-y-3">
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        {currentValues.id ? <input type="hidden" name="id" value={currentValues.id} /> : null}

        <div className="grid gap-3 md:grid-cols-2">
          <FormField
            label="Fornavn"
            name="givenName"
            defaultValue={currentValues.givenName}
            error={fieldErrors.givenName}
            placeholder="Ola"
            autoComplete="given-name"
          />
          <FormField
            label="Etternavn"
            name="familyName"
            defaultValue={currentValues.familyName}
            error={fieldErrors.familyName}
            placeholder="Nordmann"
            autoComplete="family-name"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <FormField
            label="E-post (valgfritt)"
            name="email"
            type="email"
            defaultValue={currentValues.email ?? ''}
            error={fieldErrors.email}
            placeholder="fornavn@firma.no"
            autoComplete="email"
          />
          <FormField
            label="Mobil (valgfritt)"
            name="mobileNumber"
            type="tel"
            defaultValue={currentValues.mobileNumber ?? ''}
            error={fieldErrors.mobileNumber}
            placeholder="+47 412 34 567"
            autoComplete="tel"
          />
        </div>
      </Form>
    </CompanyFormPageTemplate>
  );
}
