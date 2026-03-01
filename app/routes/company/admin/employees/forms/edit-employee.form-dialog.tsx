// routes/company/admin/employees/forms/edit-employee.form-dialog.tsx
import { useEffect, useState } from 'react';
import { useSubmit } from 'react-router';
import type { CompanyUserDto } from '~/api/generated/base';
import { FormDialog } from '~/components/dialog/form-dialog';
import { API_ROUTES_MAP } from '~/lib/route-tree';
import { RoleCheckboxes } from '~/routes/company/_components/role-checkboxes';

type EditEmployeeFormData = {
  userId: number;
  email: string;
  roles: Array<'ADMIN' | 'EMPLOYEE'>;
};

type EditEmployeeFormProps = {
  user: CompanyUserDto | null;
};

export function EditEmployeeForm({ user }: EditEmployeeFormProps) {
  const submit = useSubmit();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<EditEmployeeFormData | null>(null);

  useEffect(() => {
    if (user?.userId) {
      setFormData({
        userId: user.userId,
        email: user.email,
        roles: user.companyRoles,
      });
      setIsOpen(true);
    }
  }, [user]);

  if (!formData) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = new FormData();
    data.append('userId', formData.userId.toString());
    data.append('roles', formData.roles.join(','));

    submit(data, {
      method: 'post',
      action: API_ROUTES_MAP['company.admin.employees.edit'].url,
    });

    setIsOpen(false);
    setFormData(null);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setFormData(null);
  };

  return (
    <FormDialog<EditEmployeeFormData>
      open={isOpen}
      onOpenChange={setIsOpen}
      title="Rediger Ansatt"
      formData={formData}
      onFieldChange={(name, value) => setFormData({ ...formData, [name]: value })}
      onSubmit={handleSubmit}
      fields={[
        {
          name: 'email',
          label: 'E-post',
          type: 'text',
          disabled: true,
          render: ({ value }) => (
            <div className="rounded-md border px-3 py-2 bg-muted text-muted-foreground">{value}</div>
          ),
        },
        {
          name: 'roles',
          label: 'Roller',
          render: ({ value, onChange }) => <RoleCheckboxes value={value} onChange={onChange} />,
        },
      ]}
      actions={[
        {
          label: 'Avbryt',
          variant: 'outline',
          onClick: handleCancel,
        },
        {
          label: 'Lagre endringer',
          type: 'submit',
          variant: 'default',
          onClick: () => {},
        },
      ]}
    />
  );
}
