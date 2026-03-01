// routes/company/admin/employees/tables/employees.table.tsx
import { useState } from 'react';
import { useSubmit, useNavigate, useSearchParams } from 'react-router';
import { Button } from '~/components/ui/button';
import { TableCell, TableRow } from '~/components/ui/table';
import { Pen } from 'lucide-react';
import { API_ROUTES_MAP } from '~/lib/route-tree';
import { DeleteConfirmDialog } from '~/components/dialog/delete-confirm-dialog';
import { EditEmployeeForm } from '../forms/edit-employee.form-dialog';
import { ServerPaginatedTable } from '~/components/table/server-side-table';
import type { CompanyUserDto } from '~/api/generated/base';
import { InviteEmployeeForm } from '../forms/invite-employee.form-dialog';
import { COMPANY_ROLE_LABELS } from '~/lib/constants';
import { Input } from '~/components/ui/input';

type EmployeesTableProps = {
  users: CompanyUserDto[];
  pagination: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
};

export function EmployeesTable({ users, pagination }: EmployeesTableProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const submit = useSubmit();
  const [filter, setFilter] = useState(searchParams.get('search') ?? '');
  const [editingUser, setEditingUser] = useState<CompanyUserDto | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<number | null>(null);

  const formatRoles = (roles: Array<'ADMIN' | 'EMPLOYEE'>) => roles.map((role) => COMPANY_ROLE_LABELS[role]).join(', ');

  const formatName = (user: CompanyUserDto) => {
    const parts = [user.givenName, user.familyName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '—';
  };

  const openDeleteDialog = (userId: number) => {
    setDeletingEmployeeId(userId);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deletingEmployeeId) return;

    const formData = new FormData();
    formData.append('userId', deletingEmployeeId.toString());

    submit(formData, {
      method: 'post',
      action: API_ROUTES_MAP['company.admin.employees.delete'].url,
    });

    setIsDeleteDialogOpen(false);
    setDeletingEmployeeId(null);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    navigate(`?${params.toString()}`, { replace: true });
  };

  const handlePageSizeChange = (newSize: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('size', newSize.toString());
    params.set('page', '0');
    navigate(`?${params.toString()}`, { replace: true });
  };

  const handleFilterChange = (value: string) => {
    setFilter(value);
    const params = new URLSearchParams(searchParams);
    if (value.trim()) {
      params.set('search', value.trim());
    } else {
      params.delete('search');
    }
    params.set('page', '0');
    navigate(`?${params.toString()}`, { replace: true });
  };

  return (
    <>
      <ServerPaginatedTable<CompanyUserDto>
        items={users}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        getRowKey={(user) => user.userId?.toString() ?? user.email}
        columns={[
          { header: 'Navn' },
          { header: 'E-post' },
          { header: 'Roller' },
          { header: 'Handlinger', className: 'text-right' },
        ]}
        headerSlot={
          <>
            <Input
              placeholder="Filtrer på navn eller e-post…"
              value={filter}
              onChange={(event) => handleFilterChange(event.target.value)}
              className="max-w-sm"
            />
            <InviteEmployeeForm trigger={<Button>Inviter en ny ansatt</Button>} />
          </>
        }
        mobileHeaderSlot={
          <div>
            <InviteEmployeeForm trigger={<Button size={'sm'}>Inviter en ny ansatt</Button>} />
          </div>
        }
        renderRow={(user) => (
          <TableRow>
            <TableCell className="font-medium">{formatName(user)}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{formatRoles(user.companyRoles)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>
                  <Pen className="h-4 w-4" />
                  <span className="sr-only">Rediger</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => openDeleteDialog(user.userId!)}
                >
                  Slett
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )}
      />

      <EditEmployeeForm user={editingUser} />

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Fjern ansatt?"
        description="Er du sikker på at du vil fjerne denne ansatten fra selskapet? Denne handlingen kan ikke angres."
      />
    </>
  );
}
