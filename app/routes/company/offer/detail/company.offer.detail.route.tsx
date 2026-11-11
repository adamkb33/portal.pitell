import { Form, Link, data } from 'react-router';
import { MessageSquare, Send, XCircle } from 'lucide-react';
import type { Route } from './+types/company.offer.detail.route';
import {
  Offer,
  type OfferCatalogItemDto,
  type OfferCustomerContactDto,
  type OfferDto,
  type OfferLineDto,
  type OfferMessageDto,
  type OfferRecipientDto,
  type OfferTemplateDto,
} from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import {
  Badge,
  Button,
  CompanyPageTemplate,
  Input,
  Notice,
  Panel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from '~/ui';
import { OfferStatusBadge } from '../_components';
import {
  canCancelOffer,
  canEditOffer,
  canMessageOnOffer,
  canSendOffer,
  createBlankOfferLineRows,
  formatOfferCurrency,
  formatOfferDate,
  formatOfferDateTime,
  OFFER_ACTION_INTENTS,
  parseOfferLineFormData,
  toOfferLineFormRow,
} from '../_utils';

export async function loader({ request, params }: Route.LoaderArgs) {
  const offerId = Number(params.offerId);

  if (!Number.isFinite(offerId)) {
    return data(
      {
        offer: null,
        lines: [],
        recipients: [],
        messages: [],
        templates: [],
        catalogItems: [],
        contacts: [],
        error: 'Ugyldig tilbuds-ID.',
      },
      { status: 400 },
    );
  }

  try {
    const [
      offerResponse,
      linesResponse,
      recipientsResponse,
      messagesResponse,
      templatesResponse,
      catalogItemsResponse,
      contactsResponse,
    ] = await withAuth(request, async () => {
      const loadedOfferResponse = await Offer.getOffer({ path: { offerId } });
      const loadedOffer = loadedOfferResponse.data?.data;

      const [
        loadedLinesResponse,
        loadedRecipientsResponse,
        loadedMessagesResponse,
        loadedTemplatesResponse,
        loadedCatalogItemsResponse,
        loadedContactsResponse,
      ] = await Promise.all([
        Offer.getOfferLines({ path: { offerId } }),
        Offer.getRecipients({ path: { offerId } }),
        Offer.getMessages({ path: { offerId } }),
        Offer.getTemplates(),
        Offer.getCatalogItems(),
        loadedOffer ? Offer.getContacts({ path: { customerId: loadedOffer.customerId } }) : Promise.resolve(null),
      ]);

      return [
        loadedOfferResponse,
        loadedLinesResponse,
        loadedRecipientsResponse,
        loadedMessagesResponse,
        loadedTemplatesResponse,
        loadedCatalogItemsResponse,
        loadedContactsResponse,
      ] as const;
    });

    return data({
      offer: offerResponse.data?.data ?? null,
      lines: linesResponse.data?.data?.lines ?? [],
      recipients: recipientsResponse.data?.data ?? [],
      messages: messagesResponse.data?.data ?? [],
      templates: templatesResponse.data?.data ?? [],
      catalogItems: catalogItemsResponse.data?.data ?? [],
      contacts: contactsResponse?.data?.data ?? [],
      error: null as string | null,
    });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente tilbudet.');
    return data(
      {
        offer: null as OfferDto | null,
        lines: [] as OfferLineDto[],
        recipients: [] as OfferRecipientDto[],
        messages: [] as OfferMessageDto[],
        templates: [] as OfferTemplateDto[],
        catalogItems: [] as OfferCatalogItemDto[],
        contacts: [] as OfferCustomerContactDto[],
        error: message,
      },
      { status: status ?? 400 },
    );
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const offerId = Number(params.offerId);

  if (!Number.isFinite(offerId)) {
    return data({ ok: false, error: 'Ugyldig tilbuds-ID.' }, { status: 400 });
  }

  const formData = await request.formData();
  const intent = String(formData.get('intent') ?? '');

  try {
    await withAuth(request, async () => {
      if (intent === OFFER_ACTION_INTENTS.send) {
        await Offer.sendOffer({ path: { offerId } });
        return;
      }

      if (intent === OFFER_ACTION_INTENTS.resend) {
        await Offer.resendOffer({ path: { offerId } });
        return;
      }

      if (intent === OFFER_ACTION_INTENTS.cancel) {
        await Offer.cancelOffer({ path: { offerId } });
        return;
      }

      if (intent === OFFER_ACTION_INTENTS.message) {
        const body = String(formData.get('body') ?? '').trim();
        if (!body) {
          throw new Error('Skriv en melding før du sender.');
        }

        await Offer.createMessage1({ path: { offerId }, body: { body } });
        return;
      }

      if (intent === OFFER_ACTION_INTENTS.replaceLines) {
        const lines = parseOfferLineFormData(formData);
        await Offer.replaceOfferLines({ path: { offerId }, body: { lines } });
        return;
      }

      if (intent === OFFER_ACTION_INTENTS.setRecipients) {
        const contactIds = formData
          .getAll('contactId')
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value));

        await Offer.setRecipients({ path: { offerId }, body: { contactIds } });
        return;
      }

      if (intent === OFFER_ACTION_INTENTS.createContact) {
        const customerId = Number(formData.get('customerId'));
        const email = String(formData.get('email') ?? '').trim();
        const name = String(formData.get('name') ?? '').trim();
        const mobileNumber = String(formData.get('mobileNumber') ?? '').trim();

        if (!Number.isFinite(customerId)) {
          throw new Error('Ugyldig kunde.');
        }

        if (!email) {
          throw new Error('E-post er påkrevd.');
        }

        await Offer.createContact({
          path: { customerId },
          body: {
            email,
            name: name || undefined,
            mobileNumber: mobileNumber || undefined,
          },
        });
        return;
      }

      if (intent === OFFER_ACTION_INTENTS.revokeRecipient) {
        const recipientId = Number(formData.get('recipientId'));
        if (!Number.isFinite(recipientId)) {
          throw new Error('Ugyldig mottaker.');
        }

        await Offer.revokeRecipient({ path: { offerId, recipientId } });
        return;
      }

      if (intent === OFFER_ACTION_INTENTS.enableRecipient) {
        const recipientId = Number(formData.get('recipientId'));
        if (!Number.isFinite(recipientId)) {
          throw new Error('Ugyldig mottaker.');
        }

        await Offer.enableRecipient({ path: { offerId, recipientId } });
        return;
      }

      throw new Error('Ukjent handling.');
    });

    return data({ ok: true, error: null as string | null });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke utføre handlingen.');
    return data({ ok: false, error: message }, { status: status ?? 400 });
  }
}

export default function CompanyOfferDetailRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { offer, lines, recipients, messages, catalogItems, contacts, error } = loaderData;

  if (!offer) {
    return (
      <CompanyPageTemplate
        title="Tilbud"
        description="Kunne ikke vise tilbudet."
        routeLinks={
          <Button asChild variant="outline" size="sm">
            <Link to={ROUTES_MAP['company.offer'].href}>Tilbake</Link>
          </Button>
        }
      >
        <Notice tone="emphasis" title="Kunne ikke hente tilbud" message={error ?? 'Tilbudet finnes ikke.'} />
      </CompanyPageTemplate>
    );
  }

  const canSend = canSendOffer(offer);
  const canCancel = canCancelOffer(offer);
  const canMessage = canMessageOnOffer(offer);
  const canEdit = canEditOffer(offer);

  return (
    <CompanyPageTemplate
      title={`Tilbud #${offer.id}`}
      description="Detaljvisning for tilbud, mottakere, linjer og meldinger."
      label="Tilbud"
      routeLinks={
        <Button asChild variant="outline" size="sm">
          <Link to={ROUTES_MAP['company.offer'].href}>Tilbake til tilbud</Link>
        </Button>
      }
      actions={
        <div className="flex flex-wrap gap-2">
          <OfferActionButton
            intent={offer.status === 'DRAFT' ? OFFER_ACTION_INTENTS.send : OFFER_ACTION_INTENTS.resend}
            disabled={!canSend}
          >
            <Send className="size-4" aria-hidden />
            {offer.status === 'DRAFT' ? 'Send' : 'Send på nytt'}
          </OfferActionButton>
          <OfferActionButton intent={OFFER_ACTION_INTENTS.cancel} disabled={!canCancel} variant="outline">
            <XCircle className="size-4" aria-hidden />
            Kanseller
          </OfferActionButton>
        </div>
      }
      hero={
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <InfoCard label="Status" value={<OfferStatusBadge status={offer.status} />} />
          <InfoCard label="Kunde" value={offer.customerId.toString()} />
          <InfoCard label="Mal" value={offer.templateId} />
          <InfoCard label="Gyldig til" value={formatOfferDate(offer.validUntil)} />
        </div>
      }
    >
      {actionData?.error ? <Notice tone="emphasis" title="Handlingen feilet" message={actionData.error} /> : null}
      {actionData?.ok ? <Notice title="Oppdatert" message="Tilbudet er oppdatert." /> : null}
      {offer.expired ? (
        <Notice
          tone="emphasis"
          title="Tilbudet er utløpt"
          message="Handlinger er begrenset fordi tilbudet er utløpt."
        />
      ) : null}

      <Panel title="Linjer" description="Redigerer hele linjesettet samlet. Tomme beskrivelser ignoreres.">
        {lines.length === 0 ? (
          <p className="text-sm text-text-secondary">Ingen linjer registrert.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beskrivelse</TableHead>
                <TableHead>Antall</TableHead>
                <TableHead>Pris</TableHead>
                <TableHead>MVA</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>{line.description}</TableCell>
                  <TableCell>{line.quantity}</TableCell>
                  <TableCell>{formatOfferCurrency(line.unitPrice)}</TableCell>
                  <TableCell>{line.vatRate}%</TableCell>
                  <TableCell>{formatOfferCurrency(line.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Form method="post" className="mt-4 space-y-3">
          <input type="hidden" name="intent" value={OFFER_ACTION_INTENTS.replaceLines} />
          <div className="grid gap-3">
            {[...lines.map(toOfferLineFormRow), ...createBlankOfferLineRows(3)].map((line, index) => (
              <div
                key={line.key}
                className="grid gap-2 rounded-md border border-border bg-surface p-3 md:grid-cols-[1fr_7rem_9rem_7rem]"
              >
                <label className="grid gap-1 text-xs font-medium text-text-primary">
                  Beskrivelse
                  <Input name="lineDescription" defaultValue={line.description} disabled={!canEdit} />
                </label>
                <label className="grid gap-1 text-xs font-medium text-text-primary">
                  Antall
                  <Input
                    name="lineQuantity"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={line.quantity}
                    disabled={!canEdit}
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-text-primary">
                  Enhetspris
                  <Input
                    name="lineUnitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={line.unitPrice}
                    disabled={!canEdit}
                  />
                </label>
                <label className="grid gap-1 text-xs font-medium text-text-primary">
                  MVA %
                  <Input
                    name="lineVatRate"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={line.vatRate}
                    disabled={!canEdit}
                  />
                </label>
                <input type="hidden" name="lineCatalogItemId" value={line.catalogItemId} />
                <input type="hidden" name="linePosition" value={index} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-text-secondary">
              {catalogItems.length} katalogelementer er tilgjengelige for manuell kopiering.
            </p>
            <Button type="submit" size="sm" disabled={!canEdit}>
              Lagre linjer
            </Button>
          </div>
        </Form>
      </Panel>

      <Panel title="Mottakere" description="Velg kundekontakter som skal ha tilgang til tilbudet.">
        <Form
          method="post"
          className="mb-4 grid gap-3 rounded-md border border-border bg-surface p-3 md:grid-cols-[1fr_1fr_12rem_auto] md:items-end"
        >
          <input type="hidden" name="intent" value={OFFER_ACTION_INTENTS.createContact} />
          <input type="hidden" name="customerId" value={offer.customerId} />
          <label className="grid gap-1 text-xs font-medium text-text-primary">
            Navn
            <Input name="name" disabled={!canEdit} />
          </label>
          <label className="grid gap-1 text-xs font-medium text-text-primary">
            E-post
            <Input name="email" type="email" disabled={!canEdit} required />
          </label>
          <label className="grid gap-1 text-xs font-medium text-text-primary">
            Mobil
            <Input name="mobileNumber" disabled={!canEdit} />
          </label>
          <Button type="submit" size="sm" disabled={!canEdit}>
            Legg til kontakt
          </Button>
        </Form>

        <Form method="post" className="mb-4 space-y-3">
          <input type="hidden" name="intent" value={OFFER_ACTION_INTENTS.setRecipients} />
          {contacts.length === 0 ? (
            <p className="text-sm text-text-secondary">Ingen kundekontakter ennå.</p>
          ) : (
            <div className="grid gap-2">
              {contacts.map((contact) => (
                <label
                  key={contact.id}
                  className="flex items-start gap-2 rounded-md border border-border bg-surface p-3 text-sm text-text-primary"
                >
                  <input
                    type="checkbox"
                    name="contactId"
                    value={contact.id}
                    defaultChecked={recipients.some(
                      (recipient) => recipient.contactId === contact.id && !recipient.revokedAt,
                    )}
                    disabled={!canEdit}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-semibold">{contact.name ?? contact.email}</span>
                    <span className="block text-xs text-text-secondary">{contact.email}</span>
                  </span>
                </label>
              ))}
            </div>
          )}
          <Button type="submit" size="sm" disabled={!canEdit || contacts.length === 0}>
            Lagre mottakere
          </Button>
        </Form>

        {recipients.length === 0 ? (
          <p className="text-sm text-text-secondary">Ingen mottakere valgt.</p>
        ) : (
          <div className="grid gap-2">
            {recipients.map((recipient) => (
              <div
                key={recipient.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {recipient.nameSnapshot ?? recipient.emailSnapshot}
                  </p>
                  <p className="text-xs text-text-secondary">{recipient.emailSnapshot}</p>
                </div>
                <Badge variant={recipient.revokedAt ? 'danger' : 'success'} size="sm">
                  {recipient.revokedAt ? 'Tilbakekalt' : 'Aktiv'}
                </Badge>
                <div className="flex flex-wrap gap-2">
                  <RecipientActionButton
                    intent={OFFER_ACTION_INTENTS.enableRecipient}
                    recipientId={recipient.id}
                    disabled={!canEdit}
                  >
                    Aktiver token
                  </RecipientActionButton>
                  <RecipientActionButton
                    intent={OFFER_ACTION_INTENTS.revokeRecipient}
                    recipientId={recipient.id}
                    disabled={!canEdit || Boolean(recipient.revokedAt)}
                  >
                    Tilbakekall
                  </RecipientActionButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Meldinger" description="Intern/ekstern dialog knyttet til tilbudet.">
        <div className="space-y-3">
          {messages.length === 0 ? <p className="text-sm text-text-secondary">Ingen meldinger ennå.</p> : null}
          {messages.map((message) => (
            <div key={message.id} className="rounded-md border border-border bg-surface p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-text-secondary">
                <MessageSquare className="size-3" aria-hidden />
                <span>{message.sender}</span>
                <span>{formatOfferDateTime(message.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-text-primary">{message.body}</p>
            </div>
          ))}
          <Form method="post" className="space-y-2">
            <input type="hidden" name="intent" value={OFFER_ACTION_INTENTS.message} />
            <Textarea name="body" rows={4} placeholder="Skriv en melding" disabled={!canMessage} />
            <Button type="submit" disabled={!canMessage} size="sm">
              <MessageSquare className="size-4" aria-hidden />
              Send melding
            </Button>
          </Form>
        </div>
      </Panel>

      <Panel title="Maldata" description="Foreløpig råvisning frem til egne template-komponenter er på plass.">
        <pre className="max-h-80 overflow-auto rounded-md border border-border bg-surface p-4 text-xs text-text-secondary">
          {JSON.stringify(offer.data, null, 2)}
        </pre>
      </Panel>
    </CompanyPageTemplate>
  );
}

function RecipientActionButton({
  intent,
  recipientId,
  disabled,
  children,
}: {
  intent: string;
  recipientId: number;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <Form method="post">
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="recipientId" value={recipientId} />
      <Button type="submit" size="sm" variant="outline" disabled={disabled}>
        {children}
      </Button>
    </Form>
  );
}

function OfferActionButton({
  intent,
  disabled,
  variant,
  children,
}: {
  intent: string;
  disabled: boolean;
  variant?: 'outline';
  children: React.ReactNode;
}) {
  return (
    <Form method="post">
      <input type="hidden" name="intent" value={intent} />
      <Button type="submit" size="sm" variant={variant} disabled={disabled}>
        {children}
      </Button>
    </Form>
  );
}

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <div className="mt-1 text-sm font-semibold text-text-primary">{value}</div>
    </div>
  );
}
