// routes/company/contacts/company.contacts.route.tsx
import { data, useNavigate, useSearchParams, useSubmit } from 'react-router';
import { useState } from 'react';
import { Pen } from 'lucide-react';
import { Input } from '~/components/ui/input';
import type { Route } from './+types/company.admin.contacts.route';
import { CompanyUserContactController } from '~/api/generated/base';
import { withAuth } from '~/api/utils/with-auth';
import { Button } from '~/components/ui/button';
import { TableCell, TableRow } from '~/components/ui/table';
import { API_ROUTES_MAP } from '~/lib/route-tree';
import { DeleteConfirmDialog } from '~/components/dialog/delete-confirm-dialog';
import { ServerPaginatedTable } from '~/components/table/server-side-table';
import { ContactFormDialog } from './_components/contact.form-dialog';
import type { ContactDto } from '~/api/generated/base';

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '0');
    const size = parseInt(url.searchParams.get('size') || '5');
    const sort = url.searchParams.get('sort') || 'id';
    const search = url.searchParams.get('search')?.trim() || undefined;

    const response = await withAuth(request, async () => {
      return await CompanyUserContactController.getContacts({
        query: {
          page,
          size,
          sort,
          search,
        },
      });
    });

    return data({
      contacts: response?.data?.data?.content || [],
      pagination: {
        page: response?.data?.data?.page || 0,
        size: response?.data?.data?.size || 20,
        totalElements: response?.data?.data?.totalElements || 0,
        totalPages: response?.data?.data?.totalPages || 0,
      },
    });
  } catch (error: any) {
    console.error(JSON.stringify(error, null, 2));
    return { error: error?.message || 'Kunne ikke hente kontakter' } as any;
  }
}

export default function CompanyContactsRoute({ loaderData }: Route.ComponentProps) {
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get('search') ?? '');
  const navigate = useNavigate();
  const submit = useSubmit();
  const [editingContact, setEditingContact] = useState<ContactDto | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<number | null>(null);

  if ('error' in loaderData) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-red-500">{loaderData.error}</p>
      </div>
    );
  }

  const { contacts, pagination } = loaderData;

  const formatName = (contact: ContactDto) => {
    const parts = [contact.givenName, contact.familyName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '—';
  };

  const openDeleteDialog = (id: number) => {
    setDeletingContactId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!deletingContactId) return;

    const fd = new FormData();
    fd.append('intent', 'delete');
    fd.append('id', String(deletingContactId));

    submit(fd, { method: 'post', action: API_ROUTES_MAP['company.admin.contacts.delete'].url });

    setIsDeleteDialogOpen(false);
    setDeletingContactId(null);
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
      <ServerPaginatedTable<ContactDto>
        items={contacts}
        pagination={pagination}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        getRowKey={(contact) => contact.id?.toString() ?? contact.email ?? ''}
        columns={[
          { header: 'Navn' },
          { header: 'E-post' },
          { header: 'Mobil' },
          { header: 'Handlinger', className: 'text-right' },
        ]}
        headerSlot={
          <>
            <Input
              placeholder="Filtrer på navn, e-post eller mobil…"
              value={filter}
              onChange={(event) => handleFilterChange(event.target.value)}
              className="max-w-sm"
            />
            <ContactFormDialog trigger={<Button>Legg til ny kontakt</Button>} />
          </>
        }
        mobileHeaderSlot={
          <div>
            <ContactFormDialog trigger={<Button size="sm">Legg til ny kontakt</Button>} />
          </div>
        }
        renderRow={(contact) => (
          <TableRow>
            <TableCell className="font-medium">{formatName(contact)}</TableCell>
            <TableCell>{contact.email || '—'}</TableCell>
            <TableCell>{contact.mobileNumber || '—'}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditingContact(contact)}>
                  <Pen className="h-4 w-4" />
                  <span className="sr-only">Rediger</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  disabled={contact.id == null}
                  onClick={() => contact.id && openDeleteDialog(contact.id)}
                >
                  Slett
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )}
      />

      {editingContact && <ContactFormDialog contact={editingContact} />}

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Slett kontakt?"
        description="Er du sikker på at du vil slette denne kontakten? Denne handlingen kan ikke angres."
      />
    </>
  );
}
