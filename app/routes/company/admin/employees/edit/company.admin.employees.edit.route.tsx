import type { FormPageHandle } from '~/lib/routing/create-action';
import type { TitleHandle } from '~/lib/routing/up-link';
import { useEffect, useState } from 'react';
import { data, Form, useNavigation, useSubmit } from 'react-router';
import type { Route } from './+types/company.admin.employees.edit.route';
import { CompanyRole } from '~/api/clients/types';
import { AdminCompanyController, AdminCompanyUserController, type CompanyUserDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { redirectWithError, redirectWithInfo, redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';
import { DeleteConfirmDialog } from '~/components/dialog/delete-confirm-dialog';
import { RoleCheckboxes } from '~/routes/company/_components/role-checkboxes';
import { CompanyFormPageTemplate, PageNotice, categoryTone, cn } from '~/ui';

/**
 * A form page: the phone bottom menu hides and the page shows its own Lagre bar (ui-rules, rule 5). The header and
 * breadcrumb name the person, not "Rediger ansatt".
 */
export const handle: FormPageHandle & TitleHandle = {
  formPage: true,
  title: (loaderData) => {
    const user = (loaderData as { user?: CompanyUserDto | null } | undefined)?.user;
    return user ? fullName(user) : null;
  },
};

const EMPLOYEES = ROUTES_MAP['company.admin.employees'].href;

export async function loader({ request }: Route.LoaderArgs) {
  const userId = Number(new URL(request.url).searchParams.get('userId'));

  if (!Number.isFinite(userId) || userId <= 0) {
    return redirectWithInfo(request, EMPLOYEES, 'Velg en ansatt som skal redigeres.');
  }

  try {
    const response = await withAuth(request, () =>
      AdminCompanyUserController.getCompanyUsers({ query: { page: 0, size: 1000, includeDeleted: false } }),
    );
    const user = (response.data?.data?.content ?? []).find((item: CompanyUserDto) => item.userId === userId) ?? null;

    if (!user) {
      return redirectWithInfo(request, EMPLOYEES, 'Fant ikke den ansatte.');
    }

    return data({ user, error: null as string | null });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente ansatt');
    return data({ user: null, error: message });
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const userId = Number(formData.get('userId'));

  if (!Number.isFinite(userId) || userId <= 0) {
    return redirectWithError(request, EMPLOYEES, 'Fant ikke den ansatte.');
  }

  if (formData.get('intent') === 'delete') {
    try {
      await withAuth(request, () => AdminCompanyUserController.deleteCompanyUser({ path: { userId } }));
      return redirectWithSuccess(request, EMPLOYEES, 'Ansatt fjernet');
    } catch (error) {
      const { message } = resolveErrorPayload(error, 'Kunne ikke fjerne den ansatte. Prøv igjen.');
      const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
      return data({ error: message, roles: null }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
    }
  }

  let roles: CompanyRole[] = [];
  try {
    roles = JSON.parse(String(formData.get('roles') ?? '[]')) as CompanyRole[];
  } catch {
    roles = [];
  }

  // The page keeps Lagre disabled without a role; this guards against a request made around it.
  if (roles.length === 0) {
    const flashCookie = await setFlashMessage(request, { type: 'error', text: 'Velg minst én rolle' });
    return data({ error: 'Velg minst én rolle', roles }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }

  try {
    await withAuth(request, () => AdminCompanyController.editCompanyUser({ query: { userId }, body: { roles } }));
    return redirectWithSuccess(request, EMPLOYEES, 'Ansatt lagret');
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke lagre. Prøv igjen.');
    const flashCookie = await setFlashMessage(request, { type: 'error', text: message });
    return data({ error: message, roles }, { status: 400, headers: { 'Set-Cookie': flashCookie } });
  }
}

/**
 * Rediger ansatt (Skjema, approved sketch 2026-11-14): the person on top (the e-mail can't change), the roles as
 * selection rows, Lagre, and "Fjern fra selskapet" below the card behind a confirm dialog.
 */
export default function CompanyAdminEmployeesEditPage({ loaderData, actionData }: Route.ComponentProps) {
  const { user } = loaderData;
  const navigation = useNavigation();
  const submit = useSubmit();
  const intent = navigation.formData?.get('intent');
  const [roles, setRoles] = useState<CompanyRole[]>((user?.companyRoles as CompanyRole[]) ?? []);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (actionData?.roles) setRoles(actionData.roles);
  }, [actionData?.roles]);

  if (!user) {
    return (
      <CompanyFormPageTemplate title="Ansatt">
        <PageNotice title="Kunne ikke hente ansatt" />
      </CompanyFormPageTemplate>
    );
  }

  const name = fullName(user);
  const tone = categoryTone(user.userId);
  // Disabled until valid (ui-rules, rule 5): the one thing this form can miss.
  const problem = roles.length === 0 ? 'Velg minst én rolle' : null;

  return (
    <CompanyFormPageTemplate
      title={name}
      submit={{
        form: 'employee-form',
        loading: navigation.state === 'submitting' && intent !== 'delete',
        disabled: Boolean(problem),
        message: problem,
      }}
      after={
        <div>
          <button
            type="button"
            disabled={navigation.state === 'submitting'}
            onClick={() => setConfirmOpen(true)}
            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-danger-text transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-interactive disabled:opacity-50 lg:min-h-10"
          >
            Fjern fra selskapet
          </button>
          <DeleteConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            onConfirm={() => {
              setConfirmOpen(false);
              submit({ intent: 'delete', userId: String(user.userId) }, { method: 'post' });
            }}
            title={`Fjern ${name}?`}
            description="Tilgangen til selskapet forsvinner. Dette kan ikke angres."
            confirmText="Fjern ansatt"
          />
        </div>
      }
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-full text-[15px] font-bold',
            tone.tint,
            tone.ink,
          )}
        >
          {initials(user)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[17px] font-semibold text-text-primary">{name}</span>
          <span className="block truncate text-sm text-text-secondary">{user.email}</span>
        </span>
      </div>

      <Form id="employee-form" method="post" className="flex flex-col gap-2 border-t border-border pt-4">
        <input type="hidden" name="userId" value={user.userId} />
        <input type="hidden" name="roles" value={JSON.stringify(roles)} />
        <span className="text-sm font-medium text-text-primary">Rolle</span>
        <RoleCheckboxes value={roles} onChange={setRoles} />
      </Form>
    </CompanyFormPageTemplate>
  );
}

const fullName = (user: CompanyUserDto) => [user.givenName, user.familyName].filter(Boolean).join(' ') || user.email;

const initials = (user: CompanyUserDto) =>
  [user.givenName, user.familyName]
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .join('')
    .slice(0, 2) ||
  user.email[0]?.toUpperCase() ||
  '?';
