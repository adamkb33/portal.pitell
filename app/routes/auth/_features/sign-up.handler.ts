import { AuthController } from '~/api/generated/base';
import { resolveErrorPayload } from '~/lib/api-error';

export type SignUpActionValues = {
  givenName?: string;
  familyName?: string;
  email?: string;
  mobileNumber?: string;
};

export type SignUpHandlerResult =
  | { ok: true; signUp: { userId: number } & Record<string, unknown> }
  | { ok: false; error: string; values: SignUpActionValues; status: number };

export async function handleSignUp(formData: FormData): Promise<SignUpHandlerResult> {
  const givenName = String(formData.get('givenName') || '');
  const familyName = String(formData.get('familyName') || '');
  const email = String(formData.get('email') || '');
  const mobileNumberValue = String(formData.get('mobileNumber') || '').trim();
  const password = String(formData.get('password') || '');
  const password2 = String(formData.get('password2') || '');

  try {
    const response = await AuthController.signUp({
      body: {
        givenName,
        familyName,
        email,
        password,
        password2,
        ...(mobileNumberValue ? { mobileNumber: mobileNumberValue } : {}),
      },
    });

    const signUpPayload = response.data?.data;
    if (!signUpPayload) {
      const message = response.data?.message || 'Kunne ikke opprette konto. Prøv igjen.';
      return {
        ok: false,
        error: message as string,
        values: { givenName, familyName, email, mobileNumber: mobileNumberValue },
        status: 400,
      };
    }

    return { ok: true, signUp: signUpPayload };
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke opprette konto. Prøv igjen.');
    return {
      ok: false,
      error: message,
      values: { givenName, familyName, email, mobileNumber: mobileNumberValue },
      status: status ?? 400,
    };
  }
}
