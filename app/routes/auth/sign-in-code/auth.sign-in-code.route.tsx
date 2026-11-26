import { data, redirect } from 'react-router';
import { AuthController } from '~/api/generated';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { readRetryAfterSeconds } from '~/routes/booking/public/appointment/session/contact/verify-mobile/_utils/sms-code-message';
import { AuthPageTemplate } from '~/ui';
import { CodeStepForm, type CodeActionData } from '../_components/code-step-form';
import { describeSignInCodeError } from '../_utils/sign-in-code-errors';
import { readSignInFlow, writeSignInFlow } from '../_utils/sign-in-flow.cookie.server';
import type { Route } from './+types/auth.sign-in-code.route';
import { withoutLogin } from '~/lib/auth-middleware.server';

function secondsUntil(iso: string): number {
  return Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 1000));
}

export async function loader({ request }: Route.LoaderArgs) {
  const flow = await readSignInFlow(request);
  if (!flow?.code) return redirect(ROUTES_MAP['auth.sign-in'].href);
  return {
    channel: flow.code.channel,
    sentTo: flow.code.sentTo,
    resendInSeconds: secondsUntil(flow.code.resendAvailableAt),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const flow = await readSignInFlow(request);
  if (!flow?.code) return redirect(ROUTES_MAP['auth.sign-in'].href);
  const formData = await request.formData();

  if (formData.get('intent') === 'resend') {
    try {
      const sent = (
        await withoutLogin(() => AuthController.sendSignInCode({ body: { emailOrMobile: flow.identifier } }))
      ).data?.data;
      if (!sent) throw new Error('Missing sign-in code response');
      const cookie = await writeSignInFlow({
        ...flow,
        code: {
          codeId: sent.codeId,
          channel: sent.channel,
          sentTo: sent.sentTo,
          resendAvailableAt: sent.resendAvailableAt,
        },
      });
      return data<CodeActionData>({ ok: true, message: 'Ny kode sendt.' }, { headers: { 'Set-Cookie': cookie } });
    } catch (error) {
      const payload = resolveErrorPayload(error, 'Kunne ikke sende ny kode. Prøv igjen.');
      return data<CodeActionData>(
        { ok: false, error: describeSignInCodeError(payload), retryAfterSeconds: readRetryAfterSeconds(payload) },
        { status: 400 },
      );
    }
  }

  const code = String(formData.get('code') ?? '').trim();
  const codeId = flow.code.codeId;
  try {
    const verified = (await withoutLogin(() => AuthController.verifySignInCode({ body: { codeId, code } }))).data?.data;
    if (!verified) throw new Error('Missing verify response');
    const cookie = await writeSignInFlow({
      identifier: flow.identifier,
      returnTo: flow.returnTo,
      resetPasswordToken: verified.resetPasswordToken,
    });
    return redirect(ROUTES_MAP['auth.sign-in-new-password'].href, { headers: { 'Set-Cookie': cookie } });
  } catch (error) {
    const payload = resolveErrorPayload(error, 'Kunne ikke bekrefte koden. Prøv igjen.');
    return data<CodeActionData>({ ok: false, error: describeSignInCodeError(payload) }, { status: 400 });
  }
}

/** Step two for accounts without a password, and for "Glemt passord?". */
export default function AuthSignInCode({ loaderData, actionData }: Route.ComponentProps) {
  const sentLine =
    loaderData.channel === 'SMS' ? `Sendt på SMS til ${loaderData.sentTo}` : `Sendt til ${loaderData.sentTo}`;

  return (
    <AuthPageTemplate title="Skriv inn koden" description={sentLine}>
      <CodeStepForm actionData={actionData} resendInSeconds={loaderData.resendInSeconds} />
    </AuthPageTemplate>
  );
}
