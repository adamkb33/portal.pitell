import { redirect } from 'react-router';
import { AuthController } from '~/api/generated';
import { resolveErrorPayload } from '~/lib/api-error';
import { redirectWithError } from '~/lib/flash-message.server';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { describeSignInCodeError } from './sign-in-code-errors';
import { readSignInFlow, writeSignInFlow } from './sign-in-flow.cookie.server';
import { withoutLogin } from '~/lib/auth-middleware.server';

/** Sends a code to the number or email and moves on to the code step. Also used by "Glemt passord?". */
export async function sendCodeAndContinue(request: Request, identifier: string, returnTo: string | null) {
  const codeHref = ROUTES_MAP['auth.sign-in-code'].href;
  try {
    const sent = (await withoutLogin(() => AuthController.sendSignInCode({ body: { emailOrMobile: identifier } }))).data
      ?.data;
    if (!sent) throw new Error('Missing sign-in code response');
    const cookie = await writeSignInFlow({
      identifier,
      returnTo,
      code: {
        codeId: sent.codeId,
        channel: sent.channel,
        sentTo: sent.sentTo,
        resendAvailableAt: sent.resendAvailableAt,
      },
    });
    return redirect(codeHref, { headers: { 'Set-Cookie': cookie } });
  } catch (error) {
    const payload = resolveErrorPayload(error, 'Kunne ikke sende kode. Prøv igjen.');
    // Back and forth within the wait: the code already sent still works.
    const flow = await readSignInFlow(request);
    if (payload.code === 'CHALLENGE_RESEND_TOO_SOON' && flow?.code && flow.identifier === identifier) {
      return redirect(codeHref);
    }
    return redirectWithError(request, ROUTES_MAP['auth.sign-in'].href, describeSignInCodeError(payload));
  }
}
