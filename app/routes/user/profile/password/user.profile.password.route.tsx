import { Form, data, useNavigation } from 'react-router';
import { AuthController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { authService } from '~/lib/auth-service';
import { redirectWithSuccess, setFlashMessage } from '~/lib/flash-message.server';
import type { FormPageHandle } from '~/lib/routing/create-action';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { CompanyFormPageTemplate, FormField } from '~/ui';
import type { Route } from './+types/user.profile.password.route';

export const handle: FormPageHandle = { formPage: true };

const FORM_ID = 'change-password';

type FieldErrors = Partial<Record<'currentPassword' | 'newPassword' | 'newPassword2', string>>;

export async function loader({ request }: Route.LoaderArgs) {
  await authService.requireAuth(request);
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  await authService.requireAuth(request);
  const formData = await request.formData();
  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  const newPassword2 = String(formData.get('newPassword2') ?? '');

  const errors: FieldErrors = {};
  if (!currentPassword) errors.currentPassword = 'Skriv inn nåværende passord';
  if (!newPassword) errors.newPassword = 'Skriv inn et nytt passord';
  if (!newPassword2) errors.newPassword2 = 'Gjenta det nye passordet';
  else if (newPassword && newPassword !== newPassword2) errors.newPassword2 = 'Passordene er ikke like';
  if (Object.keys(errors).length > 0) {
    return data({ errors }, { status: 400 });
  }

  try {
    await withAuth(request, async () =>
      AuthController.changePassword({ body: { currentPassword, newPassword, newPassword2 } }),
    );
    return redirectWithSuccess(request, ROUTES_MAP['user.profile'].href, 'Passord endret');
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke endre passordet. Prøv igjen.');
    return data(
      { errors: {} as FieldErrors },
      // 200, not 4xx: the root loader only re-reads the flash cookie (the toast) after a successful action.
      { headers: { 'Set-Cookie': await setFlashMessage(request, { type: 'error', text: message }) } },
    );
  }
}

/** Endre passord (page type Skjema, approved sketch 2026-11-12). Up is the header's ‹ / breadcrumb to Min profil. */
export default function ChangePasswordPage({ actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const saving = navigation.state === 'submitting';
  const errors = actionData?.errors ?? {};

  return (
    <CompanyFormPageTemplate title="Endre passord" submit={{ form: FORM_ID, loading: saving }}>
      <Form id={FORM_ID} method="post" className="grid gap-4" noValidate>
        <FormField
          label="Nåværende passord"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword}
        />
        <FormField
          label="Nytt passord"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword}
        />
        <FormField
          label="Gjenta nytt passord"
          name="newPassword2"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword2}
        />
      </Form>
    </CompanyFormPageTemplate>
  );
}
