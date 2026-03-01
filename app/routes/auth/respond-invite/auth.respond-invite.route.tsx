// auth.respond-invite.route.tsx (refactored)
import { Form, Link, redirect, data, useNavigation } from 'react-router';
import type { Route } from './+types/auth.respond-invite.route';

import { accessTokenCookie, refreshTokenCookie } from '../_features/auth.cookies.server';
import { toAuthTokens } from '../_utils/token.utils';
import { AuthFormContainer } from '../_components/auth.form-container';
import { AuthFormField } from '../_components/auth.form-field';
import { AuthFormButton } from '../_components/auth.form-button';
import { redirectWithSuccess } from '~/routes/company/_lib/flash-message.server';
import type { CompanySummaryDto } from '~/api/generated/base';
import { AuthController, PublicCompanyController, PublicUserController } from '~/api/generated/base';
import { resolveErrorPayload } from '~/lib/api-error';

const USER_ROLE_LABELS: Record<'SYSTEM_ADMIN' | 'USER' | 'COMPANY_USER', string> = {
  SYSTEM_ADMIN: 'Systemadministrator',
  USER: 'Bruker',
  COMPANY_USER: 'Bedriftsbruker',
};
const COMPANY_ROLE_LABELS: Record<'ADMIN' | 'EMPLOYEE', string> = {
  ADMIN: 'Administrator',
  EMPLOYEE: 'Ansatt',
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const inviteToken = url.searchParams.get('token');

  if (!inviteToken) {
    return redirect('/');
  }

  const returnTo = `${url.pathname}${url.search}`;
  const loginUrl = `/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`;
  const accessToken = await accessTokenCookie.parse(request.headers.get('Cookie'));

  try {
    const inviteResponse = await AuthController.decodeInvite({
      query: { token: inviteToken },
    });
    const invite = inviteResponse.data?.data;

    if (!invite) {
      const message = inviteResponse.data?.message || 'Ugyldig eller utløpt invitasjon.';
      return data({
        inviteToken,
        loginUrl,
        error: message,
        existingUser: false,
        existingUserProfile: null,
        isLoggedIn: !!accessToken,
        inviteEmail: null,
        inviteRoles: [],
        inviteCompanyRoles: [],
        companySummary: null,
      });
    }

    let existingUser = false;
    let existingUserProfile: { givenName: string; familyName: string } | null = null;
    let companySummary: CompanySummaryDto | null = null;

    try {
      const userResponse = await PublicUserController.getUserByEmail({
        query: { email: invite.email },
      });
      const user = userResponse.data?.data;
      if (user) {
        existingUser = true;
        existingUserProfile = { givenName: user.givenName, familyName: user.familyName };
      }
    } catch {
      existingUser = false;
    }

    if (invite.companyId) {
      try {
        const companyResponse = await PublicCompanyController.publicGetCompanyById({
          path: { companyId: invite.companyId },
        });
        companySummary = companyResponse.data?.data ?? null;
      } catch {
        companySummary = null;
      }
    }

    return data({
      inviteToken,
      loginUrl,
      error: null,
      existingUser,
      existingUserProfile,
      isLoggedIn: !!accessToken,
      inviteEmail: invite.email,
      inviteRoles: invite.payload.roles,
      inviteCompanyRoles: invite.payload.companyRoles,
      companySummary,
    });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Ugyldig eller utløpt invitasjon.');
    return data(
      {
        inviteToken,
        loginUrl,
        error: message,
        existingUser: false,
        existingUserProfile: null,
        isLoggedIn: !!accessToken,
        inviteEmail: null,
        inviteRoles: [],
        inviteCompanyRoles: [],
        companySummary: null,
      },
      { status: status ?? 400 },
    );
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const inviteToken = String(formData.get('inviteToken'));
  const respondAction = String(formData.get('respondAction') ?? 'ACCEPT');
  const givenName = formData.get('givenName');
  const familyName = formData.get('familyName');
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  const givenNameValue = typeof givenName === 'string' ? givenName : '';
  const familyNameValue = typeof familyName === 'string' ? familyName : '';
  const passwordValue = typeof password === 'string' ? password : undefined;
  const confirmPasswordValue = typeof confirmPassword === 'string' ? confirmPassword : undefined;

  try {
    const response = await AuthController.respondToInvite({
      path: {
        inviteToken,
      },
      body: {
        action: respondAction === 'DECLINE' ? 'DECLINE' : 'ACCEPT',
        accept:
          respondAction === 'DECLINE'
            ? undefined
            : {
                givenName: givenNameValue,
                familyName: familyNameValue,
                password: passwordValue,
                password2: confirmPasswordValue,
              },
      },
    });
    const tokens = response.data?.data;

    if (respondAction === 'DECLINE') {
      return redirectWithSuccess(request, '/', 'Invitasjonen er avslått.');
    }

    if (!tokens) {
      const message = response.data?.message || 'Noe gikk galt. Prøv igjen.';
      return data(
        {
          error: message,
          values: { givenName: givenNameValue, familyName: familyNameValue },
        },
        { status: 400 },
      );
    }

    const authTokens = toAuthTokens(tokens);

    const accessCookie = await accessTokenCookie.serialize(authTokens.accessToken, {
      expires: new Date(authTokens.accessTokenExpiresAt * 1000),
    });
    const refreshCookie = await refreshTokenCookie.serialize(authTokens.refreshToken, {
      expires: new Date(authTokens.refreshTokenExpiresAt * 1000),
    });

    return redirectWithSuccess(request, '/', 'Invitasjonen er akseptert.', [
      ['Set-Cookie', accessCookie],
      ['Set-Cookie', refreshCookie],
    ]);
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Noe gikk galt. Prøv igjen.');
    return data(
      {
        error: message,
        values: { givenName: givenNameValue, familyName: familyNameValue },
      },
      { status: status ?? 400 },
    );
  }
}

export default function AuthRespondInvite({ loaderData, actionData }: Route.ComponentProps) {
  const {
    inviteToken,
    existingUser,
    existingUserProfile,
    isLoggedIn,
    loginUrl,
    error: loaderError,
    inviteEmail,
    inviteRoles,
    inviteCompanyRoles,
    companySummary,
  } = loaderData;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const errorMessage = actionData?.error ?? loaderError;
  const actionValues = actionData?.values;

  return (
    <AuthFormContainer
      title="Fullfør din konto"
      description={
        existingUser
          ? 'Du har allerede en konto. Logg inn for å aktivere invitasjonen.'
          : 'Opprett profilen din og sett passord for å aktivere tilgangen din.'
      }
      error={errorMessage}
      secondaryAction={
        <Link to="/" className="mt-2 block text-center text-sm font-medium text-foreground hover:underline">
          Tilbake til forsiden →
        </Link>
      }
    >
      <div className="space-y-4 rounded-md border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
        {companySummary ? (
          <div>
            <p className="font-medium text-foreground">{companySummary.name ?? 'Ukjent selskap'}</p>
            <p>Org.nr: {companySummary.orgNumber}</p>
          </div>
        ) : (
          <p>Ingen selskapsinformasjon tilgjengelig.</p>
        )}
        {inviteEmail ? <p>Invitasjonen gjelder: {inviteEmail}</p> : null}
        {inviteRoles.length > 0 ? <p>Roller: {inviteRoles.map((role) => USER_ROLE_LABELS[role]).join(', ')}</p> : null}
        {inviteCompanyRoles.length > 0 ? (
          <p>Bedriftsroller: {inviteCompanyRoles.map((role) => COMPANY_ROLE_LABELS[role]).join(', ')}</p>
        ) : null}
      </div>

      {existingUser ? (
        isLoggedIn ? (
          <Form method="post" className="space-y-6">
            <input type="hidden" name="inviteToken" value={inviteToken} />
            <input type="hidden" name="givenName" value={existingUserProfile?.givenName ?? ''} />
            <input type="hidden" name="familyName" value={existingUserProfile?.familyName ?? ''} />

            <div className="space-y-3">
              <AuthFormButton isLoading={isSubmitting} loadingText="Aktiverer invitasjon…">
                Aksepter invitasjon
              </AuthFormButton>
              <AuthFormButton
                name="respondAction"
                value="DECLINE"
                variant="outline"
                disabled={isSubmitting}
                formNoValidate
              >
                Avslå invitasjon
              </AuthFormButton>
            </div>
          </Form>
        ) : (
          <div className="space-y-4">
            <Link
              to={loginUrl}
              className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Logg inn for å akseptere invitasjon
            </Link>
            <Form method="post">
              <input type="hidden" name="inviteToken" value={inviteToken} />
              <AuthFormButton name="respondAction" value="DECLINE" variant="outline" formNoValidate>
                Avslå invitasjon
              </AuthFormButton>
            </Form>
          </div>
        )
      ) : (
        <Form method="post" className="space-y-6">
          <input type="hidden" name="inviteToken" value={inviteToken} />

          <div className="grid gap-4 sm:grid-cols-2">
            <AuthFormField
              id="givenName"
              name="givenName"
              label="Fornavn"
              type="text"
              autoComplete="given-name"
              defaultValue={actionValues?.givenName}
              required
              disabled={isSubmitting}
            />

            <AuthFormField
              id="familyName"
              name="familyName"
              label="Etternavn"
              type="text"
              autoComplete="family-name"
              defaultValue={actionValues?.familyName}
              required
              disabled={isSubmitting}
            />
          </div>

          <AuthFormField
            id="password"
            name="password"
            label="Passord"
            type="password"
            autoComplete="new-password"
            required
            disabled={isSubmitting}
          />

          <AuthFormField
            id="confirmPassword"
            name="confirmPassword"
            label="Bekreft passord"
            type="password"
            autoComplete="new-password"
            required
            disabled={isSubmitting}
          />

          <div className="space-y-3">
            <AuthFormButton isLoading={isSubmitting} loadingText="Oppretter konto…">
              Opprett konto
            </AuthFormButton>
            <AuthFormButton
              name="respondAction"
              value="DECLINE"
              variant="outline"
              disabled={isSubmitting}
              formNoValidate
            >
              Avslå invitasjon
            </AuthFormButton>
          </div>
        </Form>
      )}
    </AuthFormContainer>
  );
}
