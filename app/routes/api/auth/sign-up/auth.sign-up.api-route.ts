import { data } from 'react-router';
import type { Route } from './+types/auth.sign-up.api-route';
import { AuthController } from '~/api/generated/base';
import { resolveErrorPayload } from '~/lib/api-error';
import { verificationSessionToken } from '~/lib/auth.server';

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const givenName = String(formData.get('givenName') || '');
  const familyName = String(formData.get('familyName') || '');
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const password2 = String(formData.get('password2') || '');
  const mobileNumber = String(formData.get('mobileNumber') || '');
  const redirectUrl = String(formData.get('redirectUrl') || '');

  try {
    const response = await AuthController.signUp({
      query: {
        redirectUrl: redirectUrl || undefined,
      },
      body: {
        givenName,
        familyName,
        email,
        password,
        password2,
        mobileNumber,
      },
    });

    if (response.data?.data?.verificationToken) {
      const cookie = await verificationSessionToken.serialize(response.data?.data?.verificationToken.value, {
        expires: new Date(response.data?.data?.verificationToken.expiresAt),
      });
      const headers = new Headers();
      headers.append('Set-Cookie', cookie);
      return data(response.data?.data, { headers });
    }

    return data(response.data?.data);
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke opprette konto. Prøv igjen.');
    return data({ error: message }, { status: status ?? 400 });
  }
}
