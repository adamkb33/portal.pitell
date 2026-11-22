import { useRef, useState } from 'react';
import { Link, useNavigation, useRouteLoaderData, useSubmit } from 'react-router';
import { ArrowLeft, ArrowRight, MessageSquare, Users } from 'lucide-react';
import type { loader as rootLoader } from '~/routes/root.layout';
import {
  Button,
  CompanyPageTemplate,
  ConfirmDialog,
  FormField,
  Label,
  Notice,
  PageNotice,
  Text,
  Textarea,
  cn,
} from '~/ui';
import { channelHref } from '../../_utils/channels';
import { pluralize } from '../../_utils/campaigns';
import { CAMPAIGN_LIMITS, smsCampaignCreateSchema } from './sms-campaign.schema';
import { MergeFieldChips } from './merge-field-chips';
import { MERGE_FIELD_ATTRIBUTE, fillMergeFields, isMergeFieldElement, type MergeFieldElement } from './merge-fields';
import { estimateSms } from './sms';
import type { SmsCampaignCreateActionResult, SmsCampaignCreateLoaderData } from './sms-campaign.server';

const SMS_UNIT_PRICE_ORE = 120;
const nok = new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' });

export function SmsCampaignCreatePage({
  loaderData,
  actionData,
}: {
  loaderData: SmsCampaignCreateLoaderData;
  actionData: SmsCampaignCreateActionResult | undefined;
}) {
  const { recipients: audience, unsubscribeBaseUrl, error } = loaderData;
  const submit = useSubmit();
  const navigation = useNavigation();
  const companyName = useRouteLoaderData<typeof rootLoader>('routes/root.layout')?.companyContext?.name || 'Selskapet';
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const lastMergeField = useRef<MergeFieldElement | null>(null);
  const validation = smsCampaignCreateSchema.safeParse({ name, body });
  const errors: Record<string, string> = {};
  if (showErrors && !validation.success)
    for (const issue of validation.error.issues) errors[issue.path.join('.')] ??= issue.message;
  const recipients = audience ?? 0;
  const preview = fillMergeFields(body, { givenName: 'Ola', familyName: 'Nordmann', companyName });
  const estimate = estimateSms(`${preview}\nAvmeld: ${unsubscribeBaseUrl}/u/${'A'.repeat(22)}`);
  const price = nok.format((estimate.units * recipients * SMS_UNIT_PRICE_ORE) / 100);
  const isSending = navigation.state !== 'idle' && navigation.formData?.get('intent') === 'send';
  const mergeTarget = () => {
    if (lastMergeField.current?.isConnected) return lastMergeField.current;
    const first = formRef.current?.querySelector(`[${MERGE_FIELD_ATTRIBUTE}]`) ?? null;
    return isMergeFieldElement(first) ? first : null;
  };
  const send = () => {
    setConfirmOpen(false);
    submit({ intent: 'send', name, body }, { method: 'post' });
  };
  if (error || audience === null)
    return (
      <CompanyPageTemplate title="Ny SMS">
        <PageNotice title="Kunne ikke hente mottakere" />
      </CompanyPageTemplate>
    );
  return (
    <CompanyPageTemplate
      title="Ny SMS"
      size="xl"
      routeLinks={
        <Button asChild variant="ghost" size="sm">
          <Link to={channelHref('SMS', 'campaigns')}>
            <ArrowLeft className="h-4 w-4" /> SMS
          </Link>
        </Button>
      }
    >
      {actionData?.error ? (
        <Notice tone="emphasis" title="Kunne ikke sende kampanjen" message={actionData.error} />
      ) : null}
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <p className="flex min-h-10 items-center gap-2 text-sm font-semibold text-marketing-sms">
            <MessageSquare className="h-4 w-4" aria-hidden />
            SMS
          </p>
          <p aria-label="Mottakere" className="flex items-center gap-2 text-sm text-text-secondary">
            <Users className="h-4 w-4" aria-hidden />
            {pluralize(recipients, 'mottaker', 'mottakere')}
          </p>
        </div>
        <div className="grid items-stretch lg:grid-cols-2">
          <section
            ref={formRef}
            aria-label="Kampanje"
            className="grid min-w-0 content-start gap-6 p-5 sm:p-6"
            onFocus={(event) => {
              if (isMergeFieldElement(event.target)) lastMergeField.current = event.target;
            }}
          >
            <FormField
              label="Kampanjenavn"
              helperText="Bare synlig for deg."
              value={name}
              maxLength={CAMPAIGN_LIMITS.name}
              onChange={(event) => setName(event.target.value)}
              error={errors.name}
            />
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="campaign-sms-body">Melding</Label>
                <MergeFieldChips getTarget={mergeTarget} />
              </div>
              <Textarea
                id="campaign-sms-body"
                rows={7}
                value={body}
                placeholder="Skriv en liten hilsen til kundene dine…"
                maxLength={CAMPAIGN_LIMITS.smsBody}
                onChange={(event) => setBody(event.target.value)}
                aria-invalid={Boolean(errors.body)}
                aria-describedby={errors.body ? 'campaign-sms-error' : 'campaign-sms-hint'}
                className={cn('min-h-52 text-sm leading-relaxed', errors.body && 'border-danger')}
                data-merge-field=""
              />
              <div className="flex items-start justify-between gap-4">
                <Text as="p" id="campaign-sms-hint" variant="caption" className="text-text-secondary">
                  Avmeldingslenke legges til automatisk.
                </Text>
                <Text as="span" variant="caption" className="shrink-0 tabular-nums text-text-secondary">
                  {body.length} / {CAMPAIGN_LIMITS.smsBody}
                </Text>
              </div>
              {errors.body ? (
                <Text as="p" id="campaign-sms-error" variant="caption" className="text-danger">
                  {errors.body}
                </Text>
              ) : null}
            </div>
          </section>
          <aside
            aria-label="Forhåndsvisning"
            className="min-w-0 border-t border-border bg-marketing-sms-soft/60 p-5 sm:p-6 lg:border-t-0 lg:border-l"
          >
            <h3 className="mb-5 text-center text-xs font-medium text-text-secondary">Slik ser kunden meldingen</h3>
            <div className="mx-auto min-h-80 w-full max-w-64 rounded-3xl border-4 border-border bg-background px-3 pb-8 pt-3 shadow-sm">
              <div aria-hidden className="mx-auto mb-6 h-1 w-12 rounded-full bg-border" />
              <p className="mb-6 text-center text-xs font-semibold text-text-primary">{companyName}</p>
              <p className="whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-marketing-sms-soft px-3 py-3 text-sm leading-relaxed">
                {preview || <span className="text-text-secondary">Meldingen din vises her.</span>}
                <span className="mt-3 block break-all text-xs text-text-secondary">
                  Avmeld: {unsubscribeBaseUrl}/u/…
                </span>
              </p>
              <p className="mt-3 text-center text-xs text-text-secondary">Nå</p>
            </div>
          </aside>
        </div>
        <footer className="flex flex-col gap-4 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          {body.trim() ? (
            <div role="status" aria-label="SMS-estimat" className="min-w-0 space-y-1">
              <p className="text-lg font-semibold tracking-tight text-marketing-sms">
                Estimert pris: {price} <span className="text-xs font-normal text-text-secondary">eks. mva.</span>
              </p>
              <Text as="p" variant="caption" className="text-text-secondary">
                {pluralize(estimate.units, 'SMS-enhet', 'SMS-enheter')} ×{' '}
                {pluralize(recipients, 'mottaker', 'mottakere')} · {nok.format(SMS_UNIT_PRICE_ORE / 100)} per enhet
              </Text>
              <Text as="p" variant="caption" className="text-text-secondary">
                Inkluderer avmeldingslenken. Eksempelnavn er brukt; antall enheter kan variere per kunde.
              </Text>
              {estimate.unicode ? (
                <Text as="p" variant="caption" className="text-text-secondary">
                  Emoji eller spesialtegn gir færre tegn per SMS-enhet.
                </Text>
              ) : null}
            </div>
          ) : (
            <Text variant="caption">
              {recipients ? 'Kun kunder som har gitt samtykke.' : 'Ingen har sagt ja ennå.'}
            </Text>
          )}
          <Button
            type="button"
            className="w-full shrink-0 sm:w-auto"
            disabled={recipients === 0 || isSending}
            onClick={() => {
              setShowErrors(true);
              if (validation.success && recipients > 0) setConfirmOpen(true);
            }}
          >
            {isSending ? 'Sender…' : 'Se over og send'}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </footer>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Send til ${pluralize(recipients, 'kunde', 'kunder')}?`}
        description={`Estimert pris: ${price} eks. mva. Dette kan ikke angres.`}
        cancelAction={
          <Button type="button" variant="outline">
            Avbryt
          </Button>
        }
        confirmAction={
          <Button type="button" onClick={send}>
            Send
          </Button>
        }
      />
    </CompanyPageTemplate>
  );
}
