import * as React from 'react';
import { Form, useNavigation } from 'react-router';
import { Check, CircleAlert, RefreshCw } from 'lucide-react';
import { formatShortWait } from '~/routes/booking/public/appointment/session/contact/verify-mobile/_utils/sms-code-message';
import { Stack, VerificationCodeInput } from '~/ui';
import { AuthSubmitBar } from './auth-submit-bar';

const CODE_LENGTH = 6;

/** What a code step's action answers: a new code is on its way, or what went wrong (with the wait, if any). */
export type CodeActionData = { ok: true; message: string } | { ok: false; error: string; retryAfterSeconds?: number };

/**
 * The 6-digit code, "Send ny kode" and "Bekreft". Shared by sign-in ("Skriv inn koden") and the mobile check after
 * sign-up, so both look and work the same. The form posts `intent` = verify | resend and `code`.
 */
export function CodeStepForm({
  actionData,
  resendInSeconds = 0,
}: {
  actionData: CodeActionData | undefined;
  /** Seconds until a new code may be asked for; 0 when there's no wait. */
  resendInSeconds?: number;
}) {
  const navigation = useNavigation();
  const pendingIntent = navigation.state === 'submitting' ? String(navigation.formData?.get('intent') ?? '') : '';
  const isBusy = navigation.state !== 'idle';
  const [code, setCode] = React.useState('');

  const resendWaitSeconds =
    (actionData && !actionData.ok ? actionData.retryAfterSeconds : undefined) ?? resendInSeconds;
  const secondsLeft = useSecondsLeft(resendWaitSeconds, actionData);

  return (
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
          disabled={isBusy || secondsLeft > 0}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-border bg-background px-4 text-sm font-semibold text-text-primary transition-colors hover:border-text-disabled disabled:cursor-not-allowed disabled:text-text-disabled"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          {pendingIntent === 'resend'
            ? 'Sender ...'
            : secondsLeft > 0
              ? `Send ny kode om ${formatShortWait(secondsLeft)}`
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
      className="flex items-start gap-2 rounded-[var(--radius-control)] bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger-text"
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
