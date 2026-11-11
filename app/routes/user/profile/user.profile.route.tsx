import * as React from 'react';
import { Form, data, useMatches } from 'react-router';
import { AuthController } from '~/api/generated';
import type { UserDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { authService } from '~/lib/auth-service';
import type { FlashMessage } from '~/lib/flash-message.server';
import { redirectWithError, redirectWithSuccess } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { Button, FormField, PageTemplate, Panel, Text } from '~/ui';
import type { Route } from './+types/user.profile.route';

const PASSWORD_UPDATED_MESSAGE = 'Passordet ble oppdatert.';

type RootFlashLoaderData = {
  flashMessage?: FlashMessage | null;
};

const getFlashMessageFromMatches = (matches: ReturnType<typeof useMatches>): FlashMessage | null => {
  for (const match of matches) {
    const data = match.data as RootFlashLoaderData | undefined;
    if (data?.flashMessage) {
      return data.flashMessage;
    }
  }

  return null;
};

export async function loader({ request }: Route.LoaderArgs) {
  await authService.requireAuth(request);
  const session = await authService.getUserSession(request);
  const fallbackUser: UserDto = {
    id: session.user.id,
    email: session.user.email,
    emailVerified: false,
    mobileVerified: false,
    hasPassword: true,
    accountStatus: 'FULL',
  };

  const userContextResponse = await withAuth(
    request,
    async () => AuthController.getUserContext(),
    session.accessToken,
  ).catch(() => null);
  const user = userContextResponse?.data?.data?.user ?? fallbackUser;

  return data({
    user,
  });
}

export async function action({ request }: Route.ActionArgs) {
  await authService.requireAuth(request);
  const formData = await request.formData();
  const currentPassword = String(formData.get('currentPassword') ?? '');
  const newPassword = String(formData.get('newPassword') ?? '');
  const newPassword2 = String(formData.get('newPassword2') ?? '');

  if (!currentPassword || !newPassword || !newPassword2) {
    return redirectWithError(request, ROUTES_MAP['user.profile'].href, 'Alle passordfeltene må fylles ut.');
  }

  try {
    await withAuth(request, async () =>
      AuthController.changePassword({
        body: {
          currentPassword,
          newPassword,
          newPassword2,
        },
      }),
    );

    return redirectWithSuccess(request, ROUTES_MAP['user.profile'].href, PASSWORD_UPDATED_MESSAGE);
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke oppdatere passord.');
    return redirectWithError(request, ROUTES_MAP['user.profile'].href, message);
  }
}

export default function Profile({ loaderData }: Route.ComponentProps) {
  const matches = useMatches();
  const formRef = React.useRef<HTMLFormElement>(null);
  const flashMessage = getFlashMessageFromMatches(matches);
  const user = loaderData.user;
  const fullName = [user.givenName, user.familyName].filter(Boolean).join(' ').trim();

  React.useEffect(() => {
    if (flashMessage?.type === 'success' && flashMessage.text === PASSWORD_UPDATED_MESSAGE) {
      formRef.current?.reset();
    }
  }, [flashMessage]);

  return (
    <PageTemplate
      title="Min profil"
      description="Profilinformasjon og passordhåndtering."
      label="Bruker"
      hero={
        <Panel title="Brukerinfo">
          <div className="grid gap-2">
            <Text as="p" variant="body-sm">
              Navn: {fullName || 'Ikke registrert'}
            </Text>
            <Text as="p" variant="body-sm">
              E-post: {user.email || 'Ikke registrert'}
            </Text>
            <Text as="p" variant="body-sm">
              Mobil: {user.mobileNumber || 'Ikke registrert'}
            </Text>
          </div>
        </Panel>
      }
    >
      <Panel title="Oppdater passord">
        <Form ref={formRef} method="post" className="space-y-3">
          <FormField
            label="Nåværende passord"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
          <FormField label="Nytt passord" name="newPassword" type="password" autoComplete="new-password" required />
          <FormField
            label="Gjenta nytt passord"
            name="newPassword2"
            type="password"
            autoComplete="new-password"
            required
          />
          <Button type="submit">Oppdater passord</Button>
        </Form>
      </Panel>
    </PageTemplate>
  );
}
