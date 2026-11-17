import { useState } from 'react';
import { Form, Link, data, redirect, useNavigation } from 'react-router';
import { Lock, Mail, Phone, User } from 'lucide-react';
import type { Route } from './+types/auth.sign-up.route';
import { AuthController } from '~/api/generated';
import { resolveErrorPayload } from '~/lib/api-error';
import { authService } from '~/lib/auth-service';
import { setFlashMessage } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { getSafeReturnTo } from '~/utils';
import { AuthPageTemplate, FormField, Stack } from '~/ui';
import { AuthSubmitBar } from '../_components/auth-submit-bar';
import { resolveAuthPostRedirect } from '../_utils/auth-flow.server';
import { finishSignIn } from '../_utils/finish-sign-in.server';
import { readSignInFlow, writeSignInFlow } from '../_utils/sign-in-flow.cookie.server';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SignUpFields = { givenName: string; familyName: string; mobileNumber: string; email: string; password: string };

/** The first thing still missing, in the order the fields appear; null when the form can be sent. */
function describeMissingSignUpField(fields: SignUpFields): string | null {
  if (!fields.givenName.trim()) return 'Skriv inn fornavn';
  if (!fields.familyName.trim()) return 'Skriv inn etternavn';
  if (fields.mobileNumber.replace(/\D/g, '').length < 8) return 'Skriv inn mobilnummer';
  if (fields.email.trim() && !EMAIL_PATTERN.test(fields.email.trim())) return 'Skriv inn en gyldig e-postadresse';
  if (fields.password.length < MIN_PASSWORD_LENGTH) return `Passordet må ha minst ${MIN_PASSWORD_LENGTH} tegn`;
  return null;
}

/** Someone whose number or email had no account arrives from sign-in with it filled in, and keeps where they were going. */
export async function loader({ request }: Route.LoaderArgs) {
  const flow = await readSignInFlow(request);
  const identifier = flow?.identifier ?? '';
  const isEmail = identifier.includes('@');
  return {
    email: isEmail ? identifier : '',
    mobileNumber: isEmail ? '' : identifier,
    returnTo: getSafeReturnTo(new URL(request.url).searchParams.get('returnTo')) ?? flow?.returnTo ?? null,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const fields: SignUpFields = {
    givenName: String(formData.get('givenName') ?? '').trim(),
    familyName: String(formData.get('familyName') ?? '').trim(),
    mobileNumber: String(formData.get('mobileNumber') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
  };
  const returnTo = getSafeReturnTo(String(formData.get('returnTo') ?? '')) ?? null;

  const stayWithError = async (text: string) =>
    data(null, { status: 400, headers: { 'Set-Cookie': await setFlashMessage(request, { type: 'error', text }) } });

  const missing = describeMissingSignUpField(fields);
  if (missing) return stayWithError(`${missing}.`);

  try {
    const response = await AuthController.signUp({
      body: {
        givenName: fields.givenName,
        familyName: fields.familyName,
        mobileNumber: fields.mobileNumber,
        email: fields.email || undefined,
        password: fields.password,
        password2: fields.password,
      },
    });
    const payload = response.data?.data ?? null;
    // The code step shows the number the SMS went to and sends them on to where they were going.
    const flowCookie = await writeSignInFlow({ identifier: fields.mobileNumber, returnTo });

    if (payload?.nextStep === 'DONE' && payload.authTokens) {
      const { href, headers } = await finishSignIn(payload.authTokens, returnTo);
      return redirect(href, { headers });
    }

    const { nextStepHref, verificationCookieHeader } = await resolveAuthPostRedirect(payload);
    const headers = new Headers();
    if (payload?.authTokens) {
      const authCookieHeaders = await authService.setAuthCookies(
        payload.authTokens.accessToken,
        payload.authTokens.refreshToken,
        payload.authTokens.accessTokenExpiresAt,
        payload.authTokens.refreshTokenExpiresAt,
      );
      for (const [key, value] of new Headers(authCookieHeaders).entries()) headers.append(key, value);
    }
    if (verificationCookieHeader) headers.append('Set-Cookie', verificationCookieHeader);
    headers.append('Set-Cookie', flowCookie);
    return redirect(nextStepHref ?? ROUTES_MAP['auth.sign-in'].href, { headers });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke opprette konto. Prøv igjen.');
    return stayWithError(message);
  }
}

export default function AuthSignUp({ loaderData }: Route.ComponentProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';
  const [fields, setFields] = useState<SignUpFields>({
    givenName: '',
    familyName: '',
    mobileNumber: loaderData.mobileNumber,
    email: loaderData.email,
    password: '',
  });
  const set = (key: keyof SignUpFields) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setFields((current) => ({ ...current, [key]: event.target.value }));

  return (
    <AuthPageTemplate title="Opprett konto" bottom={<TermsLine />}>
      <Form method="post" aria-busy={isSubmitting}>
        <input type="hidden" name="returnTo" value={loaderData.returnTo ?? ''} />
        <Stack space="md">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="givenName"
              name="givenName"
              label="Fornavn"
              autoComplete="given-name"
              placeholder="Ola"
              startIcon={<User />}
              value={fields.givenName}
              onChange={set('givenName')}
              autoFocus
              disabled={isSubmitting}
            />
            <FormField
              id="familyName"
              name="familyName"
              label="Etternavn"
              autoComplete="family-name"
              placeholder="Nordmann"
              startIcon={<User />}
              value={fields.familyName}
              onChange={set('familyName')}
              disabled={isSubmitting}
            />
          </div>

          <FormField
            id="mobileNumber"
            name="mobileNumber"
            label="Mobilnummer"
            type="tel"
            autoComplete="tel"
            startIcon={<Phone />}
            value={fields.mobileNumber}
            onChange={set('mobileNumber')}
            disabled={isSubmitting}
          />

          <FormField
            id="email"
            name="email"
            label="E-post (valgfritt)"
            type="email"
            autoComplete="email"
            placeholder="deg@eksempel.no"
            startIcon={<Mail />}
            value={fields.email}
            onChange={set('email')}
            disabled={isSubmitting}
          />

          <FormField
            id="password"
            name="password"
            label="Passord"
            type="password"
            autoComplete="new-password"
            startIcon={<Lock />}
            value={fields.password}
            onChange={set('password')}
            disabled={isSubmitting}
          />

          <AuthSubmitBar
            label="Opprett konto"
            loadingLabel="Oppretter konto ..."
            missing={describeMissingSignUpField(fields)}
            loading={isSubmitting}
          />

          <p className="text-center text-sm text-text-secondary">
            Har du konto?{' '}
            <Link
              to={ROUTES_MAP['auth.sign-in'].href}
              className="inline-flex min-h-11 items-center font-semibold text-interactive hover:text-interactive-hover"
            >
              Logg inn
            </Link>
          </p>
        </Stack>
      </Form>
    </AuthPageTemplate>
  );
}

function TermsLine() {
  return (
    <span>
      Ved å opprette konto godtar du{' '}
      <Link to="/vilkar" className="underline">
        vilkårene
      </Link>{' '}
      og har lest{' '}
      <Link to="/personvern" className="underline">
        personvernerklæringen
      </Link>
      .
    </span>
  );
}
