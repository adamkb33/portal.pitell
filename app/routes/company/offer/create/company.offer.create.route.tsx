import type { FormPageHandle } from '~/lib/routing/create-action';
import { useState } from 'react';
import { Form, data, redirect } from 'react-router';
import { FileText, Mail, PackagePlus, Plus, Trash2, UserRound } from 'lucide-react';
import type { Route } from './+types/company.offer.create.route';
import { Offer, type OfferCatalogItemDto, type OfferTemplateDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { Button, CompanyFormPageTemplate, Input, Notice, Panel, ProgressSteps } from '~/ui';
import { formatOfferCurrency, getCompanyOfferDetailHref } from '../_utils';
import { OfferDatePicker } from './_components/company.offer.date-picker';
import { InfoTile } from './_components/company.offer.info-tile';
import { TemplateFieldInput } from './_components/company.offer.template-field';
import {
  readCreateOfferValues,
  parseInitialLines,
  parseRecipientRows,
  parseTemplateData,
  createDefaultValues,
  calculatePreviewTotal,
  createLineRows,
  createRecipientRows,
  createBlankLineRow,
  createBlankRecipientRow,
  getTemplateFieldName,
  countFilled,
} from './_utils/company.offer.create.utils';

/** A form page: the phone bottom menu hides and the page shows its own Lagre bar (ui-rules, rule 2). */
export const handle: FormPageHandle = { formPage: true };

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const [templatesResponse, catalogItemsResponse] = await withAuth(request, () =>
      Promise.all([Offer.getTemplates(), Offer.getCatalogItems()]),
    );

    return data({
      templates: templatesResponse.data?.data ?? [],
      catalogItems: catalogItemsResponse.data?.data ?? [],
      error: null as string | null,
    });
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke hente tilbudsdata.');
    return data(
      {
        templates: [] as OfferTemplateDto[],
        catalogItems: [] as OfferCatalogItemDto[],
        error: message,
      },
      { status: status ?? 400 },
    );
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const values = readCreateOfferValues(formData);
  const lineResult = parseInitialLines(values);
  const recipients = parseRecipientRows(values);

  if (!/^\d{9}$/.test(values.orgNumber)) {
    return data({ error: 'Organisasjonsnummer må være nøyaktig 9 siffer.', values }, { status: 400 });
  }

  if (!values.templateId) {
    return data({ error: 'Velg en tilbudsmal.', values }, { status: 400 });
  }

  if (lineResult instanceof Error) {
    return data({ error: lineResult.message, values }, { status: 400 });
  }

  if (recipients instanceof Error) {
    return data({ error: recipients.message, values }, { status: 400 });
  }

  try {
    const createdOffer = await withAuth(request, async () => {
      const templateResponse = await Offer.getTemplate({ path: { templateId: values.templateId } });
      const template = templateResponse.data?.data;
      if (!template) {
        throw new Error('Tilbudsmalen finnes ikke.');
      }

      const templateData = parseTemplateData(formData, template);
      if (templateData instanceof Error) {
        throw templateData;
      }

      const customerResponse = await Offer.resolveCustomer({
        body: {
          orgNumber: values.orgNumber,
        },
      });
      const customer = customerResponse.data?.data;

      if (!customer) {
        throw new Error('Kunne ikke opprette eller finne kunde.');
      }

      const offerResponse = await Offer.createOffer({
        body: {
          customerId: customer.id,
          templateId: values.templateId,
          validUntil: values.validUntil || undefined,
          data: templateData,
        },
      });

      const offer = offerResponse.data?.data;
      if (!offer) {
        throw new Error('Kunne ikke opprette tilbud.');
      }

      if (lineResult.length > 0) {
        await Offer.replaceOfferLines({
          path: { offerId: offer.id },
          body: { lines: lineResult },
        });
      }

      if (recipients.length > 0) {
        const createdContacts = await Promise.all(
          recipients.map((recipient) =>
            Offer.createContact({
              path: { customerId: customer.id },
              body: {
                name: recipient.name || undefined,
                email: recipient.email,
                mobileNumber: recipient.mobileNumber || undefined,
              },
            }),
          ),
        );

        const contactIds = createdContacts
          .map((response) => response.data?.data?.id)
          .filter((contactId): contactId is number => typeof contactId === 'number');

        if (contactIds.length > 0) {
          await Offer.setRecipients({
            path: { offerId: offer.id },
            body: { contactIds },
          });
        }
      }

      return offer;
    });

    return redirect(getCompanyOfferDetailHref(createdOffer.id));
  } catch (error) {
    const { message, status } = resolveErrorPayload(error, 'Kunne ikke opprette tilbud.');
    return data({ error: message, values }, { status: status ?? 400 });
  }
}

export default function CompanyOfferCreateRoute({ loaderData, actionData }: Route.ComponentProps) {
  const values = actionData?.values ?? createDefaultValues(loaderData.templates[0]?.id ?? '');
  const [selectedTemplateId, setSelectedTemplateId] = useState(values.templateId || loaderData.templates[0]?.id || '');
  const selectedTemplate =
    loaderData.templates.find((template) => template.id === selectedTemplateId) ?? loaderData.templates[0];
  const previewTotal = calculatePreviewTotal(values);
  const firstCatalogItems = loaderData.catalogItems.slice(0, 4);
  const [lineRows, setLineRows] = useState(() => createLineRows(values));
  const [recipientRows, setRecipientRows] = useState(() => createRecipientRows(values));

  const addLineRow = () => {
    setLineRows((current) => [...current, createBlankLineRow(current.length)]);
  };

  const removeLineRow = (key: string) => {
    setLineRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : current));
  };

  const addRecipientRow = () => {
    setRecipientRows((current) => [...current, createBlankRecipientRow(current.length)]);
  };

  const removeRecipientRow = (key: string) => {
    setRecipientRows((current) => (current.length > 1 ? current.filter((row) => row.key !== key) : current));
  };

  return (
    <CompanyFormPageTemplate
      title="Nytt tilbud"
      notices={
        <>
          {loaderData.error ? (
            <Notice tone="emphasis" title="Kunne ikke hente tilbudsdata" message={loaderData.error} />
          ) : null}
          {actionData?.error ? (
            <Notice tone="emphasis" title="Kunne ikke opprette tilbud" message={actionData.error} />
          ) : null}
        </>
      }
      submit={{
        form: 'create-offer-form',
        label: 'Lagre utkast',
        disabled: loaderData.templates.length === 0,
        message: (
          <>
            Sum: <span className="font-semibold text-text-primary">{formatOfferCurrency(previewTotal)}</span>
          </>
        ),
      }}
    >
      <ProgressSteps
        steps={[
          { id: 'customer', label: 'Kunde', status: 'complete' },
          { id: 'template', label: 'Mal og detaljer', status: selectedTemplate ? 'current' : 'upcoming' },
          { id: 'lines', label: 'Linjer', status: 'upcoming' },
          { id: 'recipients', label: 'Mottakere', status: 'upcoming' },
        ]}
      />

      <Form id="create-offer-form" method="post" className="mt-6 space-y-6">
        <Panel
          title="Kunde"
          description="Kunden opprettes eller hentes fra tilbudstjenesten basert på organisasjonsnummer."
        >
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
            <label className="grid gap-1 text-sm text-text-primary">
              <span className="font-medium">Organisasjonsnummer</span>
              <Input
                name="orgNumber"
                inputMode="numeric"
                pattern="\d{9}"
                defaultValue={values.orgNumber}
                required
                className="w-max max-w-full"
              />
            </label>
            <InfoTile
              icon={<UserRound className="size-4" />}
              label="Kundestatus"
              value={values.orgNumber ? 'Klar for oppslag' : 'Mangler org.nr.'}
            />
          </div>
        </Panel>

        <Panel
          title="Velg mal"
          description="Malene kommer fra backend. Feltlisten under oppdateres basert på valgt mal."
        >
          {loaderData.templates.length === 0 ? (
            <Notice
              tone="emphasis"
              title="Ingen maler"
              message="Backend returnerte ingen tilgjengelige tilbudsmaler."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {loaderData.templates.map((template) => {
                const selected = template.id === selectedTemplate?.id;

                return (
                  <label
                    key={template.id}
                    className={[
                      'flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors',
                      selected ? 'border-interactive bg-surface' : 'border-border bg-background hover:bg-surface',
                    ].join(' ')}
                  >
                    <input
                      type="radio"
                      name="templateId"
                      value={template.id}
                      checked={selected}
                      onChange={() => setSelectedTemplateId(template.id)}
                      className="mt-1"
                      required
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-text-primary">{template.name}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel
          title="Maldetaljer"
          description="Feltene under er generert fra `OfferTemplateDto.fields` og lagres med backendens felt-nøkler."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <OfferDatePicker name="validUntil" label="Gyldig til" defaultValue={values.validUntil} />
          </div>

          {selectedTemplate ? (
            <div className="mt-4 grid gap-4">
              {selectedTemplate.fields.length === 0 ? (
                <p className="text-sm text-text-secondary">Denne malen har ingen egne felt.</p>
              ) : (
                selectedTemplate.fields.map((field) => (
                  <TemplateFieldInput
                    key={`${selectedTemplate.id}-${field.key}`}
                    templateId={selectedTemplate.id}
                    field={field}
                    value={values.templateValues[getTemplateFieldName(selectedTemplate.id, field.key)]}
                  />
                ))
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-text-secondary">Velg en mal for å vise felt.</p>
          )}
        </Panel>

        <Panel title="Linjer" description="Legg inn første versjon av tilbudslinjene. Tomme beskrivelser ignoreres.">
          <div className="grid gap-3">
            {lineRows.map((line, index) => (
              <div
                key={line.key}
                className="grid gap-3 rounded-md border border-border bg-surface p-3 md:grid-cols-[minmax(0,1fr)_7rem_9rem_7rem_auto] md:items-end"
              >
                <label className="grid min-w-0 gap-1 text-xs font-medium text-text-primary">
                  Beskrivelse
                  <Input name="lineDescription" defaultValue={line.description} className="w-full min-w-0" />
                </label>

                <label className="grid min-w-0 gap-1 text-xs font-medium text-text-primary">
                  Antall
                  <Input
                    name="lineQuantity"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={line.quantity}
                    className="w-full min-w-0"
                  />
                </label>

                <label className="grid min-w-0 gap-1 text-xs font-medium text-text-primary">
                  Enhetspris
                  <Input
                    name="lineUnitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={line.unitPrice}
                    className="w-full min-w-0"
                  />
                </label>

                <label className="grid min-w-0 gap-1 text-xs font-medium text-text-primary">
                  MVA %
                  <Input
                    name="lineVatRate"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={line.vatRate}
                    className="w-full min-w-0"
                  />
                </label>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="md:self-end"
                  onClick={() => removeLineRow(line.key)}
                  disabled={lineRows.length === 1}
                  aria-label={`Fjern linje ${index + 1}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <Button type="button" variant="outline" size="sm" onClick={addLineRow}>
              <Plus className="size-4" aria-hidden />
              Legg til linje
            </Button>
          </div>

          {firstCatalogItems.length > 0 ? (
            <div className="mt-4 rounded-md border border-border bg-background p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Katalogreferanse</p>

              <div className="grid gap-2 md:grid-cols-2">
                {firstCatalogItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate text-text-primary">{item.name}</span>
                    <span className="shrink-0 text-text-secondary">{formatOfferCurrency(item.defaultUnitPrice)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </Panel>

        <Panel
          title="Mottakere"
          description="Mottakere opprettes som kundekontakter og knyttes til utkastet. Sending gjøres manuelt etter kontroll."
        >
          <div className="grid gap-3">
            {recipientRows.map((recipient, index) => (
              <div
                key={recipient.key}
                className="grid gap-3 rounded-md border border-border bg-surface p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_12rem_auto] md:items-end"
              >
                <label className="grid min-w-0 gap-1 text-xs font-medium text-text-primary">
                  Navn
                  <Input name="recipientName" defaultValue={recipient.name} className="w-full min-w-0" />
                </label>

                <label className="grid min-w-0 gap-1 text-xs font-medium text-text-primary">
                  E-post
                  <Input name="recipientEmail" type="email" defaultValue={recipient.email} className="w-full min-w-0" />
                </label>

                <label className="grid min-w-0 gap-1 text-xs font-medium text-text-primary">
                  Mobil
                  <Input name="recipientMobile" defaultValue={recipient.mobileNumber} className="w-full min-w-0" />
                </label>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="md:self-end"
                  onClick={() => removeRecipientRow(recipient.key)}
                  disabled={recipientRows.length === 1}
                  aria-label={`Fjern mottaker ${index + 1}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <Button type="button" variant="outline" size="sm" onClick={addRecipientRow}>
              <Plus className="size-4" aria-hidden />
              Legg til mottaker
            </Button>
          </div>
        </Panel>

        <Panel title="Gjennomgang" description="Utkastet opprettes med dataene over. Tilbudet sendes ikke automatisk.">
          <div className="grid gap-3 md:grid-cols-3">
            <InfoTile
              icon={<PackagePlus className="size-4" />}
              label="Linjer"
              value={`${countFilled(values.lineDescriptions)} lagt inn`}
            />
            <InfoTile
              icon={<Mail className="size-4" />}
              label="Mottakere"
              value={`${countFilled(values.recipientEmails)} lagt inn`}
            />
            <InfoTile
              icon={<FileText className="size-4" />}
              label="Forhåndssum"
              value={formatOfferCurrency(previewTotal)}
            />
          </div>
        </Panel>
      </Form>
    </CompanyFormPageTemplate>
  );
}
