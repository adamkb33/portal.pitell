import { useSubmit, useRevalidator } from 'react-router';
import { useState } from 'react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '~/components/ui/select'; // your wrappers
import { Button } from '~/components/ui/button';
import { FormDialog } from '~/components/dialog/form-dialog';
import { toast } from 'sonner';
import { ROUTES_MAP } from '~/lib/route-tree';
import type { ContactDto } from '~/api/generated/identity';

export type ContactPickerProps = {
  contacts: ContactDto[];
  value?: number | null;
  onChange: (id: number | null) => void;
};

type ContactFormData = {
  givenName: string;
  familyName: string;
  email?: string;
  mobileNumber?: string;
};

export function ContactPicker({ value, onChange, contacts }: ContactPickerProps) {
  const submit = useSubmit();
  const revalidator = useRevalidator();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<ContactFormData>({
    givenName: '',
    familyName: '',
    email: '',
    mobileNumber: '',
  });

  const hasContacts = contacts.length > 0;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    const fd = new FormData();
    fd.append('intent', 'create');
    fd.append('givenName', (form.givenName || '').trim());
    fd.append('familyName', (form.familyName || '').trim());
    fd.append('redirectTo', ROUTES_MAP['booking.appointments'].href);
    if (form.email) fd.append('email', form.email.trim());
    if (form.mobileNumber) fd.append('mobileNumber', form.mobileNumber.trim());

    // post to the contacts route action
    submit(fd, { method: 'post', action: ROUTES_MAP['company.contacts'].href });

    setIsDialogOpen(false);
    setForm({ givenName: '', familyName: '', email: '', mobileNumber: '' });

    // pull fresh contacts into this route
    revalidator.revalidate();
    toast.success('Kontakt opprettet');
  };

  return (
    <div className="space-y-2">
      {hasContacts ? (
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <Select value={value ? String(value) : undefined} onValueChange={(val) => onChange(val ? Number(val) : null)}>
            <SelectTrigger className="min-w-[260px]">
              <SelectValue placeholder="Velg kontakt" />
            </SelectTrigger>
            <SelectContent align="start">
              {contacts.map((c: ContactDto) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.givenName} {c.familyName}
                  {c.email ? ` · ${c.email}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button className="w-max" variant="outline" onClick={() => setIsDialogOpen(true)}>
            Ny kontakt
          </Button>
        </div>
      ) : (
        <Button onClick={() => setIsDialogOpen(true)}>Legg til en ny kontakt</Button>
      )}

      {/* Create Contact Modal */}
      <FormDialog<ContactFormData>
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Ny kontakt"
        formData={form}
        onFieldChange={(name, value) => setForm((f) => ({ ...f, [name]: value }))}
        onSubmit={handleCreate}
        fields={[
          { name: 'givenName', label: 'Fornavn', type: 'text', required: true },
          { name: 'familyName', label: 'Etternavn', type: 'text', required: true },
          { name: 'email', label: 'E-post', type: 'email', placeholder: 'fornavn@firma.no' },
          {
            name: 'mobileNumber',
            label: 'Mobil',
            type: 'text',
            placeholder: 'Eks: +4741234567',
            description: 'Valgfritt. Bruk tall, ev. med + og landskode.',
          },
        ]}
        actions={[
          { label: 'Avbryt', variant: 'outline', onClick: () => setIsDialogOpen(false) },
          { label: 'Lagre', type: 'submit', variant: 'default', onClick: () => {} },
        ]}
      />
    </div>
  );
}
