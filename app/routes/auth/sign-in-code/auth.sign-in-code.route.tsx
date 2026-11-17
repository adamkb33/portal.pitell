import * as React from 'react';
import { Form, data, redirect, useNavigation } from 'react-router';
import { Check, CircleAlert, RefreshCw } from 'lucide-react';
import { AuthController } from '~/api/generated';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import {
  formatShortWait,
  readRetryAfterSeconds,
} from '~/routes/booking/public/appointment/session/contact/verify-mobile/_utils/sms-code-message';
import { AuthPageTemplate, Stack, VerificationCodeInput } from '~/ui';
import { AuthSubmitBar } from '../_components/auth-submit-bar';
import { describeSignInCodeError } from '../_utils/sign-in-code-errors';
import { readSignInFlow, writeSignInFlow } from '../_utils/sign-in-flow.cookie.server';
import type { Route } from './+types/auth.sign-in-code.route';

const CODE_LENGTH = 6;

type CodeActionData = { ok: true; message: string } | { ok: false; error: string; retryAfterSeconds?: number };

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
      const sent = (await AuthController.sendSignInCode({ body: { emailOrMobile: flow.identifier } })).data?.data;
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
  try {
    const verified = (await AuthController.verifySignInCode({ body: { codeId: flow.code.codeId, code } })).data?.data;
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
  const navigation = useNavigation();
  const pendingIntent = navigation.state === 'submitting' ? String(navigation.formData?.get('intent') ?? '') : '';
  const isBusy = navigation.state !== 'idle';
  const [code, setCode] = React.useState('');

  const resendWaitSeconds =
    (actionData && !actionData.ok ? actionData.retryAfterSeconds : undefined) ?? loaderData.resendInSeconds;
  const resendInSeconds = useSecondsLeft(resendWaitSeconds, actionData ?? loaderData);
  const sentLine =
    loaderData.channel === 'SMS' ? `Sendt på SMS til ${loaderData.sentTo}` : `Sendt til ${loaderData.sentTo}`;

  return (
    <AuthPageTemplate title="Skriv inn koden" description={sentLine}>
      <Form method="post" aria-busy={isBusy}>
        {/* Enter verifies: the first submit button in the form is the default one, so it must be "verify". */}
        <button type="submit" name="intent" value="verify" tabIndex={-1} aria-hidden="true" className="sr-only" />
        <Stack space="md">
          <VerificationCodeInput
            name="code"
            aria-label="Kode"
            value={code}
            onChange={setCode}
            length={CODE_LENGTH}
            autoFocus
            aria-invalid={actionData?.ok === false}
            aria-describedby={actionData?.ok === false ? 'code-error' : undefined}
            disabled={isBusy}
          />

          {actionData ? <CodeMessage result={actionData} /> : null}

          <button
            type="submit"
            name="intent"
            value="resend"
            disabled={isBusy || resendInSeconds > 0}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-border bg-background px-4 text-sm font-semibold text-text-primary transition-colors hover:border-text-disabled disabled:cursor-not-allowed disabled:text-text-disabled"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            {pendingIntent === 'resend'
              ? 'Sender ...'
              : resendInSeconds > 0
                ? `Send ny kode om ${formatShortWait(resendInSeconds)}`
                : 'Send ny kode'}
          </button>

          <AuthSubmitBar
            label="Bekreft"
            loadingLabel="Bekrefter ..."
            name="intent"
            value="verify"
            missing={code.length === CODE_LENGTH ? null : 'Skriv inn hele koden'}
            loading={pendingIntent === 'verify'}
            disabled={isBusy}
          />
        </Stack>
      </Form>
    </AuthPageTemplate>
  );
}

/** What went wrong and what to do, or that a new code is on its way. */
function CodeMessage({ result }: { result: CodeActionData }) {
  if (result.ok) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-text-secondary">
        <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
        {result.message}
      </p>
    );
  }
  return (
    <p
      id="code-error"
      role="alert"
      className="flex items-start gap-2 rounded-[var(--radius-control)] bg-danger-soft px-3 py-2.5 text-sm font-medium text-red-700"
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {result.error}
    </p>
  );
}

/** Counts [seconds] down to zero, starting over whenever the server sends a new wait. */
function useSecondsLeft(seconds: number, restartKey: unknown) {
  const [secondsLeft, setSecondsLeft] = React.useState(seconds);

  React.useEffect(() => {
    const deadline = Date.now() + seconds * 1000;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick();
    if (seconds <= 0) return;
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [seconds, restartKey]);

  return secondsLeft;
}
