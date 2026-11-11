import { Form, useNavigation } from 'react-router';
import { useEffect, useState } from 'react';
import { CompanyRole } from '~/api/clients/types';
import { RoleCheckboxes } from '~/routes/company/_components/role-checkboxes';
import { CompanyFormPageTemplate, FormField, Label } from '~/ui';
import { ROUTES_MAP } from '~/lib/routing/route-tree';

export type EmployeeFormValues = {
  userId?: number;
  email: string;
  roles: CompanyRole[];
};

type EmployeeFormPageProps = {
  mode: 'invite' | 'edit';
  values: EmployeeFormValues;
  actionData?: {
    error?: string;
    values?: EmployeeFormValues;
  } | null;
};

export function EmployeeFormPage({ mode, values, actionData }: EmployeeFormPageProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const isEdit = mode === 'edit';
  const currentValues = actionData?.values ?? values;
  const [roles, setRoles] = useState<CompanyRole[]>(currentValues.roles);

  useEffect(() => {
    setRoles(currentValues.roles);
  }, [currentValues.roles]);

  return (
    <CompanyFormPageTemplate
      title={isEdit ? 'Rediger ansatt' : 'Inviter ansatt'}
      // Inviting sends an e-mail, so it says what it does instead of "Lagre".
      submit={{ form: 'employee-form', loading: isSubmitting, label: isEdit ? 'Lagre' : 'Send invitasjon' }}
    >
      <Form id="employee-form" method="post" className="space-y-3">
        {currentValues.userId ? <input type="hidden" name="userId" value={currentValues.userId} /> : null}
        <input type="hidden" name="roles" value={JSON.stringify(roles)} />

        <FormField
          label="E-postadresse"
          name="email"
          type="email"
          defaultValue={currentValues.email}
          placeholder="fornavn@firma.no"
          autoComplete="email"
          disabled={isEdit}
        />

        <div className="space-y-3">
          <Label>Roller</Label>
          <RoleCheckboxes value={roles} onChange={setRoles} />
        </div>
      </Form>
    </CompanyFormPageTemplate>
  );
}
