import { useState } from 'react';
import { data, useNavigation, useSubmit } from 'react-router';
import { Mail } from 'lucide-react';
import { AdminCompanyController, AdminCompanyUserController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { COMPANY_ROLE_LABELS } from '~/lib/constants';
import { redirectWithError, redirectWithInfo, redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { DeleteConfirmDialog } from '~/components/dialog/delete-confirm-dialog';
import { Badge, CompanyPageTemplate, PageNotice } from '~/ui';
import type { Route } from './+types/company.admin.employees.invitation.route';

const EMPLOYEES = ROUTES_MAP['company.admin.employees'].href;

export async function loader({ request }: Route.LoaderArgs) {
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return redirectWithInfo(request, EMPLOYEES, 'Fant ikke invitasjonen.');
  }

  try {
    // There is no call for one invitation; the company has a handful, so pick it from the list.
    const response = await withAuth(request, () => AdminCompanyUserController.getInvitations());
    const invite = (response.data?.data ?? []).find((item) => item.id === id);
    if (!invite) {
      return redirectWithInfo(request, EMPLOYEES, 'Invitasjonen er ikke lenger aktiv.');
    }
    return data({ invite, error: null as string | null });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente invitasjonen');
    return data({ invite: null, error: message });
  }
}

export async function action({ request }: Route.ActionArgs) {
  const id = Number((await request.formData()).get('id'));
  if (!Number.isInteger(id) || id <= 0) {
    return redirectWithError(request, EMPLOYEES, 'Fant ikke invitasjonen.');
  }

  try {
    await withAuth(request, () => AdminCompanyController.cancelCompanyUserInvite({ path: { inviteTokenId: id } }));
    return redirectWithSuccess(request, EMPLOYEES, 'Invitasjon trukket tilbake');
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke trekke tilbake invitasjonen. Prøv igjen.');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

/**
 * A pending invitation (approved sketch 2026-11-14): the e-mail, "Venter på svar" and the role, and "Trekk tilbake
 * invitasjonen" below the card behind a confirm dialog. Nothing to save, so no primary button.
 */
export default function CompanyAdminEmployeesInvitation({ loaderData }: Route.ComponentProps) {
  const { invite } = loaderData;
  const navigation = useNavigation();
  const submit = useSubmit();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!invite) {
    return (
      <CompanyPageTemplate title="Invitasjon">
        <PageNotice title="Kunne ikke hente invitasjonen" />
      </CompanyPageTemplate>
    );
  }

  const roles = invite.payload.companyRoles.map((role) => COMPANY_ROLE_LABELS[role]).join(', ');

  return (
    <CompanyPageTemplate title="Invitasjon">
      <div className="flex max-w-150 flex-col gap-4">
        <section aria-label="Invitasjon" className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
            <span
              aria-hidden
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface-variant-1 text-text-secondary"
            >
              <Mail className="size-5.5" strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[17px] font-semibold text-text-primary">{invite.email}</span>
              <Badge variant="warning" size="sm" className="mt-1">
                Venter på svar
              </Badge>
            </span>
          </div>
          <dl className="border-t border-border px-4 py-3 sm:px-5">
            <dt className="text-xs text-text-secondary">Rolle</dt>
            <dd className="text-text-primary">{roles}</dd>
          </dl>
        </section>

        <div>
          <button
            type="button"
            disabled={navigation.state === 'submitting'}
            onClick={() => setConfirmOpen(true)}
            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-danger-text transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-interactive disabled:opacity-50 lg:min-h-10"
          >
            Trekk tilbake invitasjonen
          </button>
        </div>
      </div>

      <DeleteConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => {
          setConfirmOpen(false);
          submit({ id: String(invite.id) }, { method: 'post' });
        }}
        title="Trekk tilbake invitasjonen?"
        description="Lenken i e-posten slutter å virke. Dette kan ikke angres."
        confirmText="Trekk tilbake"
      />
    </CompanyPageTemplate>
  );
}
