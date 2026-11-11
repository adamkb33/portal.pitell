import { useState } from 'react';
import { Form, useNavigation, useSubmit } from 'react-router';
import { CompanyFormPageTemplate, FormField } from '~/ui';
import { DeleteConfirmDialog } from '~/components/dialog/delete-confirm-dialog';
import { API_ROUTES_MAP, ROUTES_MAP } from '~/lib/routing/route-tree';

export type ServiceGroupFormValues = {
  id?: number;
  name: string;
};

type ServiceGroupFormPageProps = {
  mode: 'create' | 'edit';
  values: ServiceGroupFormValues;
  /** Services in the group; deleting the group deletes them too, so the confirm dialog says how many. */
  serviceCount?: number;
  actionData?: {
    error?: string;
    values?: ServiceGroupFormValues;
  } | null;
};

export function ServiceGroupFormPage({ mode, values, serviceCount = 0, actionData }: ServiceGroupFormPageProps) {
  const navigation = useNavigation();
  const submit = useSubmit();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const isEdit = mode === 'edit';
  const currentValues = actionData?.values ?? values;
  const isSaving = navigation.state === 'submitting' && navigation.formData?.has('name') === true;
  const isDeleting =
    navigation.state !== 'idle' &&
    navigation.formAction === API_ROUTES_MAP['company.booking.admin.service-groups.delete'].url;

  const handleDeleteConfirm = () => {
    if (!currentValues.id) return;
    const formData = new FormData();
    formData.append('id', String(currentValues.id));
    submit(formData, { method: 'post', action: API_ROUTES_MAP['company.booking.admin.service-groups.delete'].url });
    setIsDeleteDialogOpen(false);
  };

  return (
    <CompanyFormPageTemplate
      title={isEdit ? currentValues.name || 'Rediger gruppe' : 'Ny gruppe'}
      submit={{ form: 'service-group-form', loading: isSaving }}
    >
      <Form id="service-group-form" method="post" className="space-y-3">
        {currentValues.id ? <input type="hidden" name="id" value={currentValues.id} /> : null}
        <FormField label="Navn" name="name" defaultValue={currentValues.name} placeholder="F.eks. Barn" required />
      </Form>

      {/* Delete lives here, not in the list: rare and destructive, so a quiet red text button at the bottom. */}
      {isEdit && currentValues.id ? (
        <div className="flex justify-end border-t border-border pt-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => setIsDeleteDialogOpen(true)}
            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-danger-text transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-interactive disabled:opacity-50 lg:min-h-10"
          >
            Slett gruppe
          </button>
        </div>
      ) : null}

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title={`Slett ${currentValues.name || 'gruppen'}?`}
        description={
          serviceCount > 0
            ? `${serviceCount === 1 ? 'Tjenesten' : `De ${serviceCount} tjenestene`} i gruppen slettes også. Dette kan ikke angres.`
            : 'Dette kan ikke angres.'
        }
        confirmText="Slett gruppe"
      />
    </CompanyFormPageTemplate>
  );
}
