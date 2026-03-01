import { Form, Link, data, isRouteErrorResponse, redirect, useNavigation, useRouteError } from 'react-router';
import type { Route } from './+types/auth.respond-user-invite.route';

import { AuthController, type AcceptUserInviteDto, type UserInviteTokenDto } from '~/api/generated/base';
import { authService } from '~/lib/auth-service';
import { resolveErrorPayload } from '~/lib/api-error';
import { AuthFormButton } from '../_components/auth.form-button';
import { AuthFormContainer } from '../_components/auth.form-container';
import { AuthFormField } from '../_components/auth.form-field';

type InvitePayload = Pick<UserInviteTokenDto, 'userId' | 'email' | 'mobileNumber'>;

type ContactFieldVisibility = {
  showEmail: boolean;
  showMobileNumber: boolean;
};

type FieldErrors = Partial<
  Record<'givenName' | 'familyName' | 'password' | 'password2' | 'email' | 'mobileNumber', string>
>;

type ActionData = {
  formError?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};

const getTrimmedValue = (formData: FormData, key: string): string => {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
};

const getMessageValue = (message: unknown): string | undefined => {
  if (typeof message === 'string' && message) {
    return message;
  }
  if (message && typeof message === 'object') {
    const objectMessage = message as { value?: string; id?: string };
    return objectMessage.value || objectMessage.id;
  }
  return undefined;
};

const getFieldErrorsFromError = (error: unknown): FieldErrors => {
  const responseError = error as {
    response?: {
      data?: {
        errors?: Array<{ field?: string; details?: string; message?: unknown }>;
      };
    };
  };

  const errors = responseError?.response?.data?.errors ?? [];
  const fieldErrors: FieldErrors = {};

  for (const errorItem of errors) {
    const field = errorItem.field;
    if (!field) continue;

    const message = errorItem.details || getMessageValue(errorItem.message) || 'Ugyldig verdi.';
    if (field === 'givenName') fieldErrors.givenName = message;
    if (field === 'familyName') fieldErrors.familyName = message;
    if (field === 'password') fieldErrors.password = message;
    if (field === 'password2') fieldErrors.password2 = message;
    if (field === 'email') fieldErrors.email = message;
    if (field === 'mobileNumber') fieldErrors.mobileNumber = message;
  }

  return fieldErrors;
};

export const getContactFieldVisibility = (invite: InvitePayload): ContactFieldVisibility => {
  const hasEmail = !!invite.email;
  const hasMobileNumber = !!invite.mobileNumber;

  if (hasEmail && hasMobileNumber) return { showEmail: false, showMobileNumber: false };
  if (hasEmail) return { showEmail: false, showMobileNumber: true };
  if (hasMobileNumber) return { showEmail: true, showMobileNumber: false };
  return { showEmail: true, showMobileNumber: true };
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const inviteToken = url.searchParams.get('token')?.trim();

  if (!inviteToken) {
    throw new Response('Missing token', { status: 400 });
  }

  try {
    const response = await AuthController.decodeUserInvite({
      query: { token: inviteToken },
    });

    const invite = response.data?.data;
    if (!invite) {
      return data({
        inviteToken,
        invite: { userId: undefined, email: undefined, mobileNumber: undefined } satisfies InvitePayload,
        invalidInvite: true,
      });
    }

    return data({
      inviteToken,
      invite: {
        userId: invite.userId,
        email: invite.email,
        mobileNumber: invite.mobileNumber,
      } satisfies InvitePayload,
      invalidInvite: false,
    });
  } catch {
    return data({
      inviteToken,
      invite: { userId: undefined, email: undefined, mobileNumber: undefined } satisfies InvitePayload,
      invalidInvite: true,
    });
  }
}

export async function action({ request }: Route.ActionArgs) {
  const url = new URL(request.url);
  const inviteToken = url.searchParams.get('token')?.trim();

  if (!inviteToken) {
    throw new Response('Missing token', { status: 400 });
  }

  const formData = await request.formData();
  const givenName = getTrimmedValue(formData, 'givenName');
  const familyName = getTrimmedValue(formData, 'familyName');
  const password = getTrimmedValue(formData, 'password');
  const password2 = getTrimmedValue(formData, 'password2');
  const email = getTrimmedValue(formData, 'email');
  const mobileNumber = getTrimmedValue(formData, 'mobileNumber');
  const values = { givenName, familyName, email, mobileNumber };

  let invite: InvitePayload;
  try {
    const decodeResponse = await AuthController.decodeUserInvite({
      query: { token: inviteToken },
    });
    const decodedInvite = decodeResponse.data?.data;
    if (!decodedInvite) {
      return data<ActionData>(
        {
          formError: 'Invitasjonen er ikke gyldig. Invitasjonen kan være brukt eller utløpt.',
          values,
        },
        { status: 400 },
      );
    }
    invite = {
      userId: decodedInvite.userId,
      email: decodedInvite.email,
      mobileNumber: decodedInvite.mobileNumber,
    };
  } catch {
    return data<ActionData>(
      {
        formError: 'Invitasjonen er ikke gyldig. Invitasjonen kan være brukt eller utløpt.',
        values,
      },
      { status: 400 },
    );
  }

  const visibility = getContactFieldVisibility(invite);
  const fieldErrors: FieldErrors = {};

  if (!givenName) fieldErrors.givenName = 'Fornavn er obligatorisk.';
  if (!familyName) fieldErrors.familyName = 'Etternavn er obligatorisk.';
  if (!password) fieldErrors.password = 'Passord er obligatorisk.';
  if (!password2) fieldErrors.password2 = 'Bekreft passord er obligatorisk.';
  if (password && password2 && password !== password2) fieldErrors.password2 = 'Passordene må være like.';
  if (visibility.showEmail && !email) fieldErrors.email = 'E-post er obligatorisk.';
  if (visibility.showMobileNumber && !mobileNumber) fieldErrors.mobileNumber = 'Mobilnummer er obligatorisk.';

  if (Object.keys(fieldErrors).length > 0) {
    return data<ActionData>({ fieldErrors, values }, { status: 400 });
  }

  const body: AcceptUserInviteDto = {
    givenName,
    familyName,
    password,
    password2,
    ...(visibility.showEmail && email ? { email } : {}),
    ...(visibility.showMobileNumber && mobileNumber ? { mobileNumber } : {}),
  };

  try {
    const response = await AuthController.respondToUserInvite({
      path: { inviteToken },
      body,
    });
    const authTokens = response.data?.data;

    if (!authTokens) {
      return data<ActionData>({ formError: 'Noe gikk galt. Prøv igjen.', values }, { status: 400 });
    }

    const headers = await authService.setAuthCookies(
      authTokens.accessToken,
      authTokens.refreshToken,
      authTokens.accessTokenExpiresAt,
      authTokens.refreshTokenExpiresAt,
    );

    return redirect('/', { headers });
  } catch (error) {
    const fieldErrorsFromApi = getFieldErrorsFromError(error);
    const { message, status } = resolveErrorPayload(error, 'Noe gikk galt. Prøv igjen.');

    return data<ActionData>(
      {
        formError: message,
        fieldErrors: fieldErrorsFromApi,
        values,
      },
      { status: status ?? 400 },
    );
  }
}

export default function RespondUserInvitePage({ loaderData, actionData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const routeActionData = actionData as ActionData | undefined;
  const inviteData = loaderData!;
  const visibility = getContactFieldVisibility(inviteData.invite);

  if (inviteData.invalidInvite) {
    return (
      <AuthFormContainer
        title="Invitasjonen er ikke gyldig"
        description="Invitasjonen kan være brukt eller utløpt."
        secondaryAction={
          <div className="space-y-2 text-center">
            <p className="text-sm text-muted-foreground">Kontakt virksomheten for ny invitasjon</p>
            <Link to="/" className="inline-block text-sm font-medium text-foreground hover:underline">
              Tilbake til forsiden →
            </Link>
          </div>
        }
      >
        <div className="text-sm text-form-text-muted">
          Vi klarte ikke å validere invitasjonslenken. Be om en ny invitasjon og prøv igjen.
        </div>
      </AuthFormContainer>
    );
  }

  return (
    <AuthFormContainer
      title="Svar på brukerinvitasjon"
      description="Fullfør profilen din for å akseptere invitasjonen."
      error={routeActionData?.formError}
      secondaryAction={
        <Link to="/" className="mt-2 block text-center text-sm font-medium text-muted-foreground hover:underline">
          Tilbake til forsiden →
        </Link>
      }
    >
      <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
        {inviteData.invite.email ? <p>Invitert e-post: {inviteData.invite.email}</p> : null}
        {inviteData.invite.mobileNumber ? <p>Invitert mobilnummer: {inviteData.invite.mobileNumber}</p> : null}
        {!inviteData.invite.email && !inviteData.invite.mobileNumber ? (
          <p>Invitasjonen inneholder ingen kontaktinfo.</p>
        ) : null}
      </div>

      <Form method="post" className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <AuthFormField
              id="givenName"
              name="givenName"
              label="Fornavn"
              autoComplete="given-name"
              defaultValue={routeActionData?.values?.givenName}
              required
              disabled={isSubmitting}
            />
            {routeActionData?.fieldErrors?.givenName ? (
              <p className="text-sm text-destructive">{routeActionData.fieldErrors.givenName}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <AuthFormField
              id="familyName"
              name="familyName"
              label="Etternavn"
              autoComplete="family-name"
              defaultValue={routeActionData?.values?.familyName}
              required
              disabled={isSubmitting}
            />
            {routeActionData?.fieldErrors?.familyName ? (
              <p className="text-sm text-destructive">{routeActionData.fieldErrors.familyName}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <AuthFormField
            id="password"
            name="password"
            label="Passord"
            type="password"
            autoComplete="new-password"
            required
            disabled={isSubmitting}
          />
          {routeActionData?.fieldErrors?.password ? (
            <p className="text-sm text-destructive">{routeActionData.fieldErrors.password}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <AuthFormField
            id="password2"
            name="password2"
            label="Bekreft passord"
            type="password"
            autoComplete="new-password"
            required
            disabled={isSubmitting}
          />
          {routeActionData?.fieldErrors?.password2 ? (
            <p className="text-sm text-destructive">{routeActionData.fieldErrors.password2}</p>
          ) : null}
        </div>

        {visibility.showEmail ? (
          <div className="space-y-2">
            <AuthFormField
              id="email"
              name="email"
              label="E-post"
              type="email"
              autoComplete="email"
              defaultValue={routeActionData?.values?.email}
              required
              disabled={isSubmitting}
            />
            {routeActionData?.fieldErrors?.email ? (
              <p className="text-sm text-destructive">{routeActionData.fieldErrors.email}</p>
            ) : null}
          </div>
        ) : null}

        {visibility.showMobileNumber ? (
          <div className="space-y-2">
            <AuthFormField
              id="mobileNumber"
              name="mobileNumber"
              label="Mobilnummer"
              autoComplete="tel"
              defaultValue={routeActionData?.values?.mobileNumber}
              required
              disabled={isSubmitting}
            />
            {routeActionData?.fieldErrors?.mobileNumber ? (
              <p className="text-sm text-destructive">{routeActionData.fieldErrors.mobileNumber}</p>
            ) : null}
          </div>
        ) : null}

        <AuthFormButton isLoading={isSubmitting} loadingText="Fullfører...">
          Aksepter invitasjon
        </AuthFormButton>
      </Form>
    </AuthFormContainer>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 400) {
    return (
      <AuthFormContainer title="Ugyldig invitasjonslenke" description="Lenken mangler token.">
        <div className="space-y-2">
          <p className="text-sm text-form-text-muted">Sjekk at du bruker hele lenken fra invitasjonen.</p>
          <Link to="/" className="inline-block text-sm font-medium text-foreground hover:underline">
            Tilbake til forsiden →
          </Link>
        </div>
      </AuthFormContainer>
    );
  }

  return (
    <AuthFormContainer title="Noe gikk galt" description="En uventet feil oppstod. Prøv igjen.">
      <div className="space-y-2">
        <Link to="/" className="inline-block text-sm font-medium text-foreground hover:underline">
          Tilbake til forsiden →
        </Link>
      </div>
    </AuthFormContainer>
  );
}
