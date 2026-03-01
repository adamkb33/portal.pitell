// routes/company/contacts/forms/contact.form-dialog.tsx
import { useState, useEffect } from 'react';
import { useSubmit } from 'react-router';
import { FormDialog } from '~/components/dialog/form-dialog';
import { API_ROUTES_MAP } from '~/lib/route-tree';
import { ContactFormSchema, type ContactFormData, type FieldErrors } from '../_schemas/contact.form.schema';
import type { ContactDto } from '~/api/generated/base';

type ContactFormDialogProps = {
  trigger?: React.ReactNode;
  contact?: ContactDto | null;
};

export function ContactFormDialog({ trigger, contact }: ContactFormDialogProps) {
  const submit = useSubmit();
  const [isOpen, setIsOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formData, setFormData] = useState<ContactFormData>({
    givenName: '',
    familyName: '',
    email: '',
    mobileNumber: '',
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        id: contact.id,
        givenName: contact.givenName ?? '',
        familyName: contact.familyName ?? '',
        email: contact.email ?? '',
        mobileNumber: contact.mobileNumber ?? '',
      });
      setIsOpen(true);
    }
  }, [contact]);

  const handleFieldChange = (name: keyof ContactFormData, value: any) => {
    setFormData({ ...formData, [name]: value });
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateClient = (values: ContactFormData): FieldErrors => {
    const parsed = ContactFormSchema.safeParse(values);
    if (parsed.success) return {};
    const fieldErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0] as keyof ContactFormData | undefined;
      if (path) fieldErrors[path] = issue.message;
    }
    return fieldErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors = validateClient(formData);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const fd = new FormData();
    if (formData.id) fd.append('id', String(formData.id));
    fd.append('givenName', (formData.givenName || '').trim());
    fd.append('familyName', (formData.familyName || '').trim());
    if (formData.email) fd.append('email', formData.email.trim());
    if (formData.mobileNumber) fd.append('mobileNumber', formData.mobileNumber.trim());

    const action = formData.id
      ? API_ROUTES_MAP['company.admin.contacts.update'].url
      : API_ROUTES_MAP['company.admin.contacts.create'].url;

    submit(fd, { method: 'post', action });

    setIsOpen(false);
    setFormData({ givenName: '', familyName: '', email: '', mobileNumber: '' });
    setErrors({});
  };

  const handleCancel = () => {
    setIsOpen(false);
    setFormData({ givenName: '', familyName: '', email: '', mobileNumber: '' });
    setErrors({});
  };

  return (
    <>
      {trigger && <div onClick={() => setIsOpen(true)}>{trigger}</div>}
      <FormDialog<ContactFormData>
        open={isOpen}
        onOpenChange={setIsOpen}
        title={formData.id ? 'Rediger kontakt' : 'Ny kontakt'}
        formData={formData}
        onFieldChange={handleFieldChange}
        onSubmit={handleSubmit}
        errors={errors}
        fields={[
          {
            name: 'givenName',
            label: 'Fornavn',
            type: 'text',
            placeholder: 'Skriv inn fornavn',
            required: true,
            autoComplete: 'given-name',
            inputMode: 'text',
          },
          {
            name: 'familyName',
            label: 'Etternavn',
            type: 'text',
            placeholder: 'Skriv inn etternavn',
            required: true,
            autoComplete: 'family-name',
            inputMode: 'text',
          },
          {
            name: 'email',
            label: 'E‑post',
            type: 'email',
            placeholder: 'fornavn@firma.no',
            autoComplete: 'email',
            inputMode: 'email',
          },
          {
            name: 'mobileNumber',
            label: 'Mobil',
            type: 'tel',
            placeholder: '+47 412 34 567',
            description: 'Valgfritt. Inkluder +47 for norske nummer.',
            autoComplete: 'tel-national',
            inputMode: 'tel',
          },
        ]}
        actions={[
          {
            label: 'Avbryt',
            variant: 'outline',
            onClick: handleCancel,
          },
          {
            label: 'Lagre',
            type: 'submit',
            variant: 'default',
          },
        ]}
      />
    </>
  );
}
