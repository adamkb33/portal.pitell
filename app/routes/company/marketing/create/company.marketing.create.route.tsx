import { useEffect, useRef, useState } from 'react';
import { Link, data, redirect, useFetcher, useNavigation, useRouteLoaderData, useSubmit } from 'react-router';
import { ArrowLeft, ArrowRight, Mail, MessageSquare, Users } from 'lucide-react';
import type { Route } from './+types/company.marketing.create.route';
import { CompanyUserMarketingCampaignController } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import type { loader as rootLoader } from '~/routes/root.layout';
import { BookingErrorState } from '~/routes/company/booking/_components/booking-error-state';
import { Button, CompanyPageTemplate, ConfirmDialog, FormField, Label, Notice, Text, Textarea, cn } from '~/ui';
import { loader as requireMarketingAdmin } from '../company.marketing.layout';
import { CHANNEL_LABELS, getCampaignDetailHref, pluralize, type CampaignChannel } from '../_utils/campaigns';
import {
  CAMPAIGN_LIMITS,
  campaignCreateSchema,
  parseCampaignForm,
  parsePreviewForm,
} from './_schemas/campaign.create.schema';
import { EmailBlockEditor } from './_components/email-block-editor';
import { MergeFieldChips } from './_components/merge-field-chips';
import { initialBlocks, previewableBlocks, toEmailBlocks, type EditableBlock } from './_utils/email-blocks';
import {
  MERGE_FIELD_ATTRIBUTE,
  fillMergeFields,
  isMergeFieldElement,
  type MergeFieldElement,
} from './_utils/merge-fields';
import { estimateSms } from './_utils/sms';

const PREVIEW_DELAY_MS = 600;
const SMS_UNIT_PRICE_ORE = 120;
const nok = new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' });

export async function loader({ request }: Route.LoaderArgs) {
  await requireMarketingAdmin({ request });
  const unsubscribeBaseUrl = (process.env.pitell_PORTAL_BASE_URL || new URL(request.url).origin).replace(/\/$/, '');

  try {
    const [email, sms] = await withAuth(request, () =>
      Promise.all([
        CompanyUserMarketingCampaignController.audienceCount({ query: { channel: 'EMAIL' } }),
        CompanyUserMarketingCampaignController.audienceCount({ query: { channel: 'SMS' } }),
      ]),
    );
    return {
      audience: {
        EMAIL: email.data?.data?.eligibleCount ?? 0,
        SMS: sms.data?.data?.eligibleCount ?? 0,
      } as Record<CampaignChannel, number> | null,
      unsubscribeBaseUrl,
      error: null as string | null,
    };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente antall mottakere');
    return { audience: null, unsubscribeBaseUrl, error: message };
  }
}

type ActionResult = { intent: 'preview'; previewHtml: string | null } | { intent: 'send' | null; error: string };

export async function action({ request }: Route.ActionArgs) {
  await requireMarketingAdmin({ request });
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'preview') {
    const parsed = parsePreviewForm(formData);
    if (!parsed.success) return data<ActionResult>({ intent: 'preview', previewHtml: null }, { status: 400 });
    try {
      const response = await withAuth(request, () =>
        CompanyUserMarketingCampaignController.preview({ body: parsed.data }),
      );
      return data<ActionResult>({ intent: 'preview', previewHtml: response.data?.data?.html ?? null });
    } catch (error) {
      resolveErrorPayload(error, 'Kunne ikke lage forhåndsvisning');
      return data<ActionResult>({ intent: 'preview', previewHtml: null }, { status: 400 });
    }
  }

  if (intent === 'send') {
    const parsed = parseCampaignForm(formData);
    if (!parsed.success) {
      return data<ActionResult>({ intent: 'send', error: 'Sjekk feltene og prøv igjen.' }, { status: 400 });
    }
    try {
      const response = await withAuth(request, () =>
        CompanyUserMarketingCampaignController.create({ body: parsed.data }),
      );
      const campaignId = response.data?.data?.id;
      return campaignId ? redirect(getCampaignDetailHref(campaignId)) : redirect(ROUTES_MAP['company.marketing'].href);
    } catch (error) {
      const { message } = resolveErrorPayload(error, 'Kunne ikke sende kampanjen.');
      return data<ActionResult>({ intent: 'send', error: message }, { status: 400 });
    }
  }

  return data<ActionResult>({ intent: null, error: 'Ukjent handling.' }, { status: 400 });
}

/** First message per field, keyed like `name`, `subject`, `body`, `blocks` and `blocks.2.url`. */
function fieldErrors(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.');
    errors[key] ??= issue.message;
  }
  return errors;
}

function blockErrors(errors: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(errors)
      .filter(([key]) => key.startsWith('blocks.'))
      .map(([key, message]) => [key.slice('blocks.'.length), message]),
  );
}

export default function CompanyMarketingCreateRoute({ loaderData, actionData }: Route.ComponentProps) {
  const { audience, unsubscribeBaseUrl, error } = loaderData;
  const submit = useSubmit();
  const navigation = useNavigation();
  const previewFetcher = useFetcher<typeof action>();
  const companyName = useRouteLoaderData<typeof rootLoader>('routes/root.layout')?.companyContext?.name || 'Selskapet';

  const [name, setName] = useState('');
  const [channel, setChannel] = useState<CampaignChannel>('EMAIL');
  const [subject, setSubject] = useState('');
  const [blocks, setBlocks] = useState<EditableBlock[]>(initialBlocks);
  const [body, setBody] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const lastMergeField = useRef<MergeFieldElement | null>(null);

  const draft =
    channel === 'EMAIL' ? { name, channel, subject, blocks: toEmailBlocks(blocks) } : { name, channel, body };
  const validation = campaignCreateSchema.safeParse(draft);
  const errors = showErrors && !validation.success ? fieldErrors(validation.error.issues) : {};
  const recipients = audience?.[channel] ?? 0;
  const smsPreview = fillMergeFields(body, { givenName: 'Ola', familyName: 'Nordmann', companyName });
  // The backend appends a URL-safe token made from 16 random bytes (22 characters).
  const smsEstimate = estimateSms(`${smsPreview}\nAvmeld: ${unsubscribeBaseUrl}/u/${'A'.repeat(22)}`);
  const smsEstimatedPrice = nok.format((smsEstimate.units * recipients * SMS_UNIT_PRICE_ORE) / 100);
  const isSending = navigation.state !== 'idle' && navigation.formData?.get('intent') === 'send';
  const sendError = actionData && 'error' in actionData && actionData.intent === 'send' ? actionData.error : null;

  // Live preview: 600 ms after the last edit, with the blocks that are valid so far. A failed preview keeps the last one.
  // `unstable_defaultShouldRevalidate: false` stops every preview from reloading the page's loaders.
  useEffect(() => {
    if (channel !== 'EMAIL') return;
    const ready = previewableBlocks(blocks);
    if (!subject.trim() || ready.length === 0) return;
    const timer = setTimeout(() => {
      previewFetcher.submit(
        { intent: 'preview', subject, blocks: JSON.stringify(ready) },
        { method: 'post', unstable_defaultShouldRevalidate: false },
      );
    }, PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetcher.submit is stable
  }, [channel, subject, blocks]);

  useEffect(() => {
    const result = previewFetcher.data;
    if (result && result.intent === 'preview' && result.previewHtml) setPreviewHtml(result.previewHtml);
  }, [previewFetcher.data]);

  // The chips write into the last merge field that had focus, or the main text field of the channel.
  const mergeTarget = () => {
    if (lastMergeField.current?.isConnected) return lastMergeField.current;
    const first = formRef.current?.querySelector(`[${MERGE_FIELD_ATTRIBUTE}]`) ?? null;
    return isMergeFieldElement(first) ? first : null;
  };

  const requestSend = () => {
    setShowErrors(true);
    if (validation.success && recipients > 0) setConfirmOpen(true);
  };

  const send = () => {
    const formData = new FormData();
    formData.set('intent', 'send');
    formData.set('name', name);
    formData.set('channel', channel);
    if (channel === 'EMAIL') {
      formData.set('subject', subject);
      formData.set('blocks', JSON.stringify(toEmailBlocks(blocks)));
    } else {
      formData.set('body', body);
    }
    setConfirmOpen(false);
    submit(formData, { method: 'post' });
  };

  if (error || !audience) {
    return (
      <CompanyPageTemplate title="Ny kampanje">
        <BookingErrorState className="min-h-[24rem]" />
      </CompanyPageTemplate>
    );
  }

  const customers = pluralize(recipients, 'kunde', 'kunder');

  return (
    <CompanyPageTemplate
      title="Ny kampanje"
      size="xl"
      routeLinks={
        <Button asChild variant="ghost" size="sm">
          <Link to={ROUTES_MAP['company.marketing'].href}>
            <ArrowLeft className="h-4 w-4" /> Markedsføring
          </Link>
        </Button>
      }
    >
      {sendError ? <Notice tone="emphasis" title="Kunne ikke sende kampanjen" message={sendError} /> : null}

      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <fieldset className="flex gap-1 rounded-lg bg-surface p-1">
            <legend className="sr-only">Kanal</legend>
            {(['EMAIL', 'SMS'] as const).map((option) => (
              <label key={option} className="relative cursor-pointer">
                <input
                  type="radio"
                  name="campaign-channel"
                  value={option}
                  checked={channel === option}
                  onChange={() => setChannel(option)}
                  className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                />
                <span
                  className={cn(
                    'flex min-h-10 items-center gap-2 rounded-md px-4 text-sm font-medium text-text-secondary transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-interactive',
                    option === 'EMAIL'
                      ? 'peer-checked:bg-marketing-email-soft peer-checked:text-marketing-email'
                      : 'peer-checked:bg-marketing-sms-soft peer-checked:text-marketing-sms',
                  )}
                >
                  {option === 'EMAIL' ? (
                    <Mail className="h-4 w-4" aria-hidden />
                  ) : (
                    <MessageSquare className="h-4 w-4" aria-hidden />
                  )}
                  {CHANNEL_LABELS[option]}
                </span>
              </label>
            ))}
          </fieldset>
          <p aria-label="Mottakere" className="flex items-center gap-2 text-sm text-text-secondary">
            <Users className="h-4 w-4" aria-hidden />
            {pluralize(recipients, 'mottaker', 'mottakere')}
          </p>
        </div>

        <div className="grid items-stretch lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
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

            {channel === 'EMAIL' ? (
              <>
                <FormField
                  label="Emne"
                  value={subject}
                  maxLength={CAMPAIGN_LIMITS.subject}
                  onChange={(event) => setSubject(event.target.value)}
                  error={errors.subject}
                  data-merge-field=""
                />
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-medium">Innhold</h3>
                    <MergeFieldChips getTarget={mergeTarget} />
                  </div>
                  <EmailBlockEditor blocks={blocks} onChange={setBlocks} errors={blockErrors(errors)} />
                  {errors.blocks ? (
                    <Text as="p" variant="caption" className="text-danger">
                      {errors.blocks}
                    </Text>
                  ) : null}
                </div>
              </>
            ) : (
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
                  aria-invalid={errors.body ? true : undefined}
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
            )}
          </section>

          <aside
            aria-label="Forhåndsvisning"
            className={cn(
              'min-w-0 border-t border-border p-5 sm:p-6 lg:border-t-0 lg:border-l',
              channel === 'EMAIL' ? 'bg-marketing-email-soft/60' : 'bg-marketing-sms-soft/60',
            )}
          >
            <div className="lg:sticky lg:top-[calc(var(--app-header-height)+1.5rem)]">
              <h3 className="mb-5 text-center text-xs font-medium text-text-secondary">Slik ser kunden meldingen</h3>
              {channel === 'EMAIL' ? (
                previewHtml ? (
                  <iframe
                    sandbox=""
                    srcDoc={previewHtml}
                    title="Forhåndsvisning"
                    className="h-[600px] w-full rounded-lg border border-border bg-background"
                  />
                ) : (
                  <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-border bg-background text-text-secondary">
                    <Mail className="h-6 w-6" aria-hidden />
                    <Text as="p" variant="caption">
                      Skriv emne og innhold for å se e-posten.
                    </Text>
                  </div>
                )
              ) : (
                <div className="mx-auto min-h-80 w-full max-w-64 rounded-[2rem] border-[5px] border-border bg-background px-3 pb-8 pt-3 shadow-sm">
                  <div aria-hidden className="mx-auto mb-6 h-1 w-12 rounded-full bg-border" />
                  <p className="mb-6 text-center text-xs font-semibold text-text-primary">{companyName}</p>
                  <p className="whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-marketing-sms-soft px-3 py-3 text-sm leading-relaxed">
                    {smsPreview || <span className="text-text-secondary">Meldingen din vises her.</span>}
                    <span className="mt-3 block break-all text-xs text-text-secondary">
                      Avmeld: {unsubscribeBaseUrl}/u/…
                    </span>
                  </p>
                  <p className="mt-3 text-center text-xs text-text-secondary">Nå</p>
                </div>
              )}
            </div>
          </aside>
        </div>

        <footer className="flex flex-col gap-4 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          {channel === 'SMS' && body.trim() ? (
            <div role="status" aria-label="SMS-estimat" className="min-w-0 space-y-1">
              <p className="text-lg font-semibold tracking-tight text-marketing-sms">
                Estimert pris: {smsEstimatedPrice}{' '}
                <span className="text-xs font-normal text-text-secondary">eks. mva.</span>
              </p>
              <Text as="p" variant="caption" className="text-text-secondary">
                {pluralize(smsEstimate.units, 'SMS-enhet', 'SMS-enheter')} ×{' '}
                {pluralize(recipients, 'mottaker', 'mottakere')} · {nok.format(SMS_UNIT_PRICE_ORE / 100)} per enhet
              </Text>
              <Text as="p" variant="caption" className="text-text-secondary">
                Inkluderer avmeldingslenken. Eksempelnavn er brukt; antall enheter kan variere per kunde.
              </Text>
              {smsEstimate.unicode ? (
                <Text as="p" variant="caption" className="text-text-secondary">
                  Emoji eller spesialtegn gir færre tegn per SMS-enhet.
                </Text>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium">{pluralize(recipients, 'mottaker', 'mottakere')}</p>
              <Text as="p" variant="caption" className="text-text-secondary">
                {recipients ? 'Kun kunder som har gitt samtykke.' : 'Ingen har sagt ja ennå.'}
              </Text>
            </div>
          )}
          <Button
            type="button"
            className="w-full shrink-0 sm:w-auto"
            disabled={recipients === 0 || isSending}
            onClick={requestSend}
          >
            {isSending ? 'Sender…' : 'Se over og send'}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </footer>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Send til ${customers}?`}
        description={
          channel === 'SMS'
            ? `Estimert pris: ${smsEstimatedPrice} eks. mva. Dette kan ikke angres.`
            : 'Dette kan ikke angres.'
        }
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
