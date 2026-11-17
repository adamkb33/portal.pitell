import { data, redirect } from 'react-router';
import { AuthController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { getAccessTokenFromRequest } from '~/lib/auth.utils';
import { setFlashMessage } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { describeMissingContact, type CollectContactKind } from '../_components/collect-contact-step';
import { resolveAuthPostRedirect } from './auth-flow.server';
import { readSignInFlow, writeSignInFlow } from './sign-in-flow.cookie.server';

/**
 * The missing email or mobile number belongs to the signed-in account: the sign-in that asked for it has already set
 * the auth cookies. Without them there is nothing to complete.
 */
export async function loadCollectContact(request: Request) {
  if (!(await getAccessTokenFromRequest(request))) return redirect(ROUTES_MAP['auth.sign-in'].href);
  return null;
}

/**
 * Saves the email or mobile number on the signed-in account and goes on to its next step. A new mobile number goes
 * to the code step, which shows the number it was sent to.
 */
export async function saveCollectContact(request: Request, kind: CollectContactKind) {
  const formData = await request.formData();
  const fieldName = kind === 'email' ? 'email' : 'mobileNumber';
  const value = String(formData.get(fieldName) ?? '').trim();
  const stayWithError = async (text: string) =>
    data(null, { status: 400, headers: { 'Set-Cookie': await setFlashMessage(request, { type: 'error', text }) } });

  if (!(await getAccessTokenFromRequest(request))) return redirect(ROUTES_MAP['auth.sign-in'].href);
  const missing = describeMissingContact(kind, value);
  if (missing) return stayWithError(`${missing}.`);

  try {
    const response = await withAuth(request, () =>
      AuthController.providerCompleteProfile({
        body: kind === 'email' ? { email: value } : { mobileNumber: value },
      }),
    );
    const { nextStepHref, verificationCookieHeader } = await resolveAuthPostRedirect(response.data?.data ?? null);
    const headers = new Headers();
    if (verificationCookieHeader) headers.append('Set-Cookie', verificationCookieHeader);
    if (kind === 'mobile') {
      const flow = await readSignInFlow(request);
      headers.append('Set-Cookie', await writeSignInFlow({ identifier: value, returnTo: flow?.returnTo ?? null }));
    }
    return redirect(nextStepHref ?? ROUTES_MAP['auth.sign-in'].href, { headers });
  } catch (error) {
    const fallback =
      kind === 'email' ? 'Kunne ikke lagre e-post. Prøv igjen.' : 'Kunne ikke lagre mobilnummer. Prøv igjen.';
    return stayWithError(resolveErrorPayload(error, fallback).message);
  }
}
