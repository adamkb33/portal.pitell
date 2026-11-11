import { Form, data, useNavigation } from 'react-router';
import { Check, CloudOff, Link2Off, MailX, MessageSquareOff } from 'lucide-react';
import type { Route } from './+types/marketing.public.route';
import { PublicUnsubscribeController, type UnsubscribeInfoDto } from '~/api/generated';
import { resolveErrorPayload } from '~/lib/api-error';
import { Button, cn } from '~/ui';

// The unsubscribe link from a marketing email or SMS. No login: the token in the link is the only key.
// Opening the page never changes anything (mail scanners open links on their own); only the button's POST unsubscribes.

type Channel = UnsubscribeInfoDto['channel'];
type UnsubscribeView =
  | { state: 'ask' | 'already' | 'done'; companyName: string; channel: Channel }
  | { state: 'invalid' | 'error' };

// The generated client is shared by every request on the server and keeps the last signed-in user's token,
// so public calls clear it explicitly.
const withoutLogin = { headers: { Authorization: null } };

function failure(error: unknown) {
  const { status } = resolveErrorPayload(error, 'Kunne ikke behandle avmeldingen');
  return status === 404
    ? data<UnsubscribeView>({ state: 'invalid' }, { status: 404 })
    : data<UnsubscribeView>({ state: 'error' }, { status: 502 });
}

export async function loader({ params }: Route.LoaderArgs) {
  const token = params.token?.trim();
  if (!token) return data<UnsubscribeView>({ state: 'invalid' }, { status: 404 });

  try {
    const response = await PublicUnsubscribeController.get({ path: { token }, ...withoutLogin });
    const info = response.data?.data;
    if (!info) return data<UnsubscribeView>({ state: 'invalid' }, { status: 404 });
    return data<UnsubscribeView>({
      state: info.alreadyUnsubscribed ? 'already' : 'ask',
      companyName: info.companyName,
      channel: info.channel,
    });
  } catch (error) {
    return failure(error);
  }
}

export async function action({ params }: Route.ActionArgs) {
  const token = params.token?.trim();
  if (!token) return data<UnsubscribeView>({ state: 'invalid' }, { status: 404 });

  try {
    const response = await PublicUnsubscribeController.unsubscribe({ path: { token }, ...withoutLogin });
    const info = response.data?.data;
    if (!info) return data<UnsubscribeView>({ state: 'invalid' }, { status: 404 });
    return data<UnsubscribeView>({ state: 'done', companyName: info.companyName, channel: info.channel });
  } catch (error) {
    return failure(error);
  }
}

// The link holds the token: keep it out of search engines and out of the Referer header.
export function headers() {
  return { 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' };
}

const CHANNEL_TEXT: Record<Channel, string> = { EMAIL: 'e-post', SMS: 'SMS' };

export default function MarketingPublicRoute({ loaderData, actionData }: Route.ComponentProps) {
  const view: UnsubscribeView = actionData ?? loaderData;
  const navigation = useNavigation();
  const submitting = navigation.state !== 'idle';

  const icon =
    view.state === 'ask' ? (
      view.channel === 'SMS' ? (
        <MessageSquareOff className="h-6 w-6" aria-hidden />
      ) : (
        <MailX className="h-6 w-6" aria-hidden />
      )
    ) : view.state === 'invalid' ? (
      <Link2Off className="h-6 w-6" aria-hidden />
    ) : view.state === 'error' ? (
      <CloudOff className="h-6 w-6" aria-hidden />
    ) : (
      <Check className="h-6 w-6" aria-hidden />
    );

  const text = {
    ask: view.state === 'ask' ? `Vil du ikke lenger motta markedsføring på ${CHANNEL_TEXT[view.channel]}?` : '',
    done: 'Du er meldt av og vil ikke få flere meldinger.',
    already: 'Du er meldt av.',
    invalid: 'Lenken er ugyldig eller utløpt.',
    error: 'Noe gikk galt. Prøv igjen om litt.',
  }[view.state];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface px-4 py-10">
      <section className="w-full max-w-sm rounded-xl border border-border bg-background p-6 text-center">
        <span
          className={cn(
            'mx-auto flex h-12 w-12 items-center justify-center rounded-full',
            view.state === 'ask' && 'bg-blue-50 text-interactive',
            (view.state === 'done' || view.state === 'already') && 'bg-success-soft text-success',
            (view.state === 'invalid' || view.state === 'error') && 'bg-surface-variant-2 text-text-secondary',
          )}
        >
          {icon}
        </span>
        {'companyName' in view ? <p className="mt-4 text-sm text-text-secondary">{view.companyName}</p> : null}
        <h1
          className={cn(
            'text-lg font-semibold leading-snug text-text-primary',
            'companyName' in view ? 'mt-1' : 'mt-4',
          )}
          aria-live="polite"
        >
          {text}
        </h1>
        {view.state === 'ask' ? (
          <Form method="post" className="mt-6">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Melder av…' : 'Meld meg av'}
            </Button>
          </Form>
        ) : null}
      </section>
      <p className="text-xs font-semibold tracking-wide text-text-secondary">Pitell</p>
    </main>
  );
}
