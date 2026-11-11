import { Form, data } from 'react-router';
import { CheckCircle2, FileText, MessageSquare, XCircle } from 'lucide-react';
import type { Route } from './+types/offer.public.route';
import { Offer, type PublicOfferPageDto } from '~/api/generated';
import { resolveErrorPayload } from '~/lib/api-error';
import { Badge, Button, Notice, Panel, Textarea } from '~/ui';

export async function loader({ params }: Route.LoaderArgs) {
  const token = params.token;

  if (!token) {
    return data({ offer: null as PublicOfferPageDto | null, error: 'Ugyldig tilbudslenke.' }, { status: 400 });
  }

  try {
    const response = await Offer.getOffer1({ path: { token } });
    return data({ offer: response.data?.data ?? null, error: null as string | null });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente tilbudet.');
    return data({ offer: null as PublicOfferPageDto | null, error: message }, { status: status ?? 400 });
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const token = params.token;

  if (!token) {
    return data({ ok: false, error: 'Ugyldig tilbudslenke.' }, { status: 400 });
  }

  const formData = await request.formData();
  const intent = formData.get('intent');

  try {
    if (intent === 'accept') {
      await Offer.acceptOffer({ path: { token } });
      return data({ ok: true, error: null as string | null });
    }

    if (intent === 'decline') {
      const reason = String(formData.get('reason') ?? '').trim();
      if (!reason) {
        return data({ ok: false, error: 'Skriv inn en årsak for avslag.' }, { status: 400 });
      }

      await Offer.declineOffer({ path: { token }, body: { reason } });
      return data({ ok: true, error: null as string | null });
    }

    if (intent === 'message') {
      const body = String(formData.get('body') ?? '').trim();
      if (!body) {
        return data({ ok: false, error: 'Skriv en melding før du sender.' }, { status: 400 });
      }

      await Offer.createMessage({ path: { token }, body: { body } });
      return data({ ok: true, error: null as string | null });
    }

    return data({ ok: false, error: 'Ukjent handling.' }, { status: 400 });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke utføre handlingen.');
    return data({ ok: false, error: message }, { status: status ?? 400 });
  }
}

export default function PublicOfferRoute({ loaderData, actionData }: Route.ComponentProps) {
  const offer = loaderData.offer;

  return (
    <main className="min-h-screen bg-surface px-4 py-8 text-text-primary">
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <header className="space-y-3">
          <div className="inline-flex size-11 items-center justify-center rounded-lg border border-border bg-background">
            <FileText className="size-5 text-text-secondary" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-disabled">Tilbud</p>
            <h1 className="text-3xl font-bold tracking-tight text-text-primary">Gjennomgå tilbud</h1>
            <p className="max-w-2xl text-sm text-text-secondary">
              Se gjennom tilbudet og svar når du er klar. Handlinger er bare tilgjengelige så lenge tilbudet er åpent.
            </p>
          </div>
        </header>

        {loaderData.error ? (
          <Notice tone="emphasis" title="Kunne ikke hente tilbudet" message={loaderData.error} />
        ) : null}
        {actionData?.error ? <Notice tone="emphasis" title="Handlingen feilet" message={actionData.error} /> : null}
        {actionData?.ok ? <Notice title="Oppdatert" message="Tilbudet er oppdatert." /> : null}

        {offer ? <PublicOfferContent offer={offer} /> : null}
      </div>
    </main>
  );
}

function PublicOfferContent({ offer }: { offer: PublicOfferPageDto }) {
  const isOpen = offer.openForAction;

  return (
    <>
      <Panel title={`Tilbud #${offer.offerId}`} description={`Sendt til ${offer.recipient.email}`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem label="Status" value={<PublicOfferStatusBadge status={offer.status} />} />
          <InfoItem label="Mal" value={offer.templateId} />
          <InfoItem label="Gyldig til" value={formatDate(offer.validUntil)} />
          <InfoItem label="Revisjon" value={offer.revision.toString()} />
        </div>
      </Panel>

      <Panel title="Innhold" description="Dette er øyeblikksbildet som ble sendt med tilbudet.">
        <pre className="max-h-[32rem] overflow-auto rounded-md border border-border bg-surface p-4 text-xs leading-5 text-text-secondary">
          {JSON.stringify(offer.snapshot, null, 2)}
        </pre>
      </Panel>

      {offer.declineReason ? <Notice tone="emphasis" title="Avslagsårsak" message={offer.declineReason} /> : null}

      <Panel
        title={isOpen ? 'Svar på tilbudet' : 'Tilbudet er lukket'}
        description={isOpen ? 'Aksepter, avslå eller send en melding.' : 'Tilbudet kan ikke lenger besvares.'}
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <Form method="post">
              <input type="hidden" name="intent" value="accept" />
              <Button type="submit" disabled={!isOpen} className="w-full">
                <CheckCircle2 className="size-4" aria-hidden />
                Aksepter tilbud
              </Button>
            </Form>

            <Form method="post" className="space-y-2">
              <input type="hidden" name="intent" value="decline" />
              <Textarea name="reason" placeholder="Årsak til avslag" disabled={!isOpen} rows={4} />
              <Button type="submit" variant="outline" disabled={!isOpen} className="w-full">
                <XCircle className="size-4" aria-hidden />
                Avslå tilbud
              </Button>
            </Form>
          </div>

          <Form method="post" className="space-y-2">
            <input type="hidden" name="intent" value="message" />
            <Textarea name="body" placeholder="Skriv en melding" disabled={!isOpen} rows={7} />
            <Button type="submit" variant="outline" disabled={!isOpen} className="w-full">
              <MessageSquare className="size-4" aria-hidden />
              Send melding
            </Button>
          </Form>
        </div>
      </Panel>
    </>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <div className="mt-1 text-sm font-semibold text-text-primary">{value}</div>
    </div>
  );
}

function PublicOfferStatusBadge({ status }: { status: PublicOfferPageDto['status'] }) {
  const variant =
    status === 'ACCEPTED'
      ? 'success'
      : status === 'DECLINED' || status === 'CANCELLED'
        ? 'danger'
        : status === 'SENT'
          ? 'warning'
          : 'info';

  return (
    <Badge variant={variant} size="sm" dot>
      {status}
    </Badge>
  );
}

function formatDate(value?: string) {
  if (!value) return 'Ingen frist';

  return new Intl.DateTimeFormat('nb-NO', {
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00`));
}
