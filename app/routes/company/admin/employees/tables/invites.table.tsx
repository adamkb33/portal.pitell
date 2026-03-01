// routes/company/admin/employees/components/invites-table.tsx
import { useState } from 'react';
import { useSubmit } from 'react-router';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { API_ROUTES_MAP } from '~/lib/route-tree';
import { DeleteConfirmDialog } from '~/components/dialog/delete-confirm-dialog';
import type { InviteTokenDto } from '~/api/generated/base';
import { COMPANY_ROLE_LABELS } from '~/lib/constants';

type InvitesTableProps = {
  invites: InviteTokenDto[];
};

export function InvitesTable({ invites }: InvitesTableProps) {
  const submit = useSubmit();
  const [isCancelInviteDialogOpen, setIsCancelInviteDialogOpen] = useState(false);
  const [cancelingInviteId, setCancelingInviteId] = useState<number | null>(null);

  const formatRoles = (roles: Array<'ADMIN' | 'EMPLOYEE'>) => roles.map((role) => COMPANY_ROLE_LABELS[role]).join(', ');

  const openCancelInviteDialog = (inviteId: number) => {
    setCancelingInviteId(inviteId);
    setIsCancelInviteDialogOpen(true);
  };

  const handleCancelInviteConfirm = () => {
    if (!cancelingInviteId) return;

    const formData = new FormData();
    formData.append('id', cancelingInviteId.toString());

    submit(formData, {
      method: 'post',
      action: API_ROUTES_MAP['company.admin.employees.cancel-invite'].url,
    });

    setIsCancelInviteDialogOpen(false);
    setCancelingInviteId(null);
    toast.success('Invitasjon trukket tilbake');
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>E-post</TableHead>
            <TableHead>Roller</TableHead>
            <TableHead className="text-right">Handlinger</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invites.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                Ingen aktive invitasjoner
              </TableCell>
            </TableRow>
          ) : (
            invites.map((invite) => (
              <TableRow key={invite.email}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <span>{invite.email}</span>
                    <span className="border border-border bg-muted px-2.5 py-0.5 text-[0.7rem] font-medium rounded-none">
                      Venter
                    </span>
                  </div>
                </TableCell>
                <TableCell>{formatRoles(invite.payload.companyRoles)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => openCancelInviteDialog(invite.id)}
                  >
                    Trekk tilbake
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <DeleteConfirmDialog
        open={isCancelInviteDialogOpen}
        onOpenChange={setIsCancelInviteDialogOpen}
        onConfirm={handleCancelInviteConfirm}
        title="Trekk tilbake invitasjon?"
        description="Er du sikker på at du vil trekke tilbake denne invitasjonen? Denne handlingen kan ikke angres."
      />
    </>
  );
}
