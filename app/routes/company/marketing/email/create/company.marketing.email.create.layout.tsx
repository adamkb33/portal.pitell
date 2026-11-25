import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Outlet,
  data,
  useFetcher,
  useLocation,
  useNavigate,
  useRouteLoaderData,
  type ShouldRevalidateFunctionArgs,
} from 'react-router';
import type { Route } from './+types/company.marketing.email.create.layout';
import {
  CompanyUserEmailCampaignController,
  CompanyUserMarketingCampaignController,
  CompanyUserMarketingRecipientController,
  type MarketingRecipientDto,
} from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import type { FormPageHandle } from '~/lib/routing/create-action';
import type { loader as rootLoader } from '~/routes/root.layout';
import { CompanyPageTemplate, Notice, PageNotice, cn } from '~/ui';
import { loader as requireMarketingAdmin } from '../../company.marketing.layout';
import { defaultEmailDraft, draftEmailBlocks, type EmailDraft } from './_utils/email-blocks';
import { parseEmailCampaignForm, parseEmailPreviewForm } from './_utils/email-campaign.schema';
import type { EmailDraftContext } from './_utils/email-draft-context';
import {
  EMAIL_STEPS,
  previewBlocks,
  readDraft,
  startStep,
  stepAt,
  stepHref,
  type EmailStep,
} from './_utils/email-flow';

/**
 * Ny e-post (approved sketch 2026-11-19) in three steps, one route each: Mal (the index), Skriv and Send. This layout
 * holds what they share: the e-post audience, the e-post endpoints, the unfinished e-mail (kept in this browser until
 * it is sent) and its preview. Form page: no bottom menu; each step has its own floating bar.
 */
export const handle = { formPage: true } satisfies FormPageHandle;

const PREVIEW_DELAY_MS = 600;

export async function loader({ request }: Route.LoaderArgs) {
  const channel = 'EMAIL' as const;
  await requireMarketingAdmin({ request });

  try {
    const response = await withAuth(request, () =>
      CompanyUserMarketingCampaignController.audienceCount({ query: { channel } }),
    );
    const customers: MarketingRecipientDto[] = [];
    let page = 0;
    let totalPages = 1;
    do {
      const recipients = await withAuth(request, () =>
        CompanyUserMarketingRecipientController.recipients({ query: { channel, page, size: 100 } }),
      );
      customers.push(...(recipients.data?.data ?? []));
      totalPages = recipients.data?.meta?.pagination?.totalPages ?? 1;
      page += 1;
    } while (page < totalPages);
    return { customers, recipients: (response.data?.data?.eligibleCount ?? 0) as number | null, error: null };
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente antall mottakere');
    return { customers: [] as MarketingRecipientDto[], recipients: null, error: message };
  }
}

// Moving between the steps keeps the audience already loaded (it pages through every customer); sending reloads it.
export function shouldRevalidate({ formMethod, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  return formMethod ? defaultShouldRevalidate : false;
}

export type EmailCampaignActionResult =
  | { intent: 'preview'; previewHtml: string | null; signature?: string }
  | { intent: 'send' | null; error: string }
  | { intent: 'send'; campaignId: number };

export async function action({ request }: Route.ActionArgs) {
  await requireMarketingAdmin({ request });
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'preview') {
    const parsed = parseEmailPreviewForm(formData);
    if (!parsed.success) {
      return data<EmailCampaignActionResult>({ intent: 'preview', previewHtml: null }, { status: 400 });
    }
    try {
      const response = await withAuth(request, () =>
        CompanyUserEmailCampaignController.previewEmailCampaign({ body: parsed.data }),
      );
      return data<EmailCampaignActionResult>({
        intent: 'preview',
        previewHtml: response.data?.data?.html ?? null,
        signature: String(formData.get('signature') ?? ''),
      });
    } catch (error) {
      resolveErrorPayload(error, 'Kunne ikke lage forhåndsvisning');
      return data<EmailCampaignActionResult>({ intent: 'preview', previewHtml: null }, { status: 400 });
    }
  }

  if (intent === 'send') {
    const parsed = parseEmailCampaignForm(formData);
    if (!parsed.success) {
      return data<EmailCampaignActionResult>(
        { intent: 'send', error: 'Sjekk feltene og prøv igjen.' },
        { status: 400 },
      );
    }
    try {
      const response = await withAuth(request, () =>
        CompanyUserEmailCampaignController.createEmailCampaign({ body: parsed.data }),
      );
      const campaignId = response.data?.data?.id;
      if (!campaignId) throw new Error('Kunne ikke bekrefte sendingen.');
      return data<EmailCampaignActionResult>({ intent: 'send', campaignId });
    } catch (error) {
      const { message } = resolveErrorPayload(error, 'Kunne ikke sende kampanjen.');
      return data<EmailCampaignActionResult>({ intent: 'send', error: message }, { status: 400 });
    }
  }

  return data<EmailCampaignActionResult>({ intent: null, error: 'Ukjent handling.' }, { status: 400 });
}

export default function CompanyMarketingEmailCreateLayout({ loaderData }: Route.ComponentProps) {
  const company = useRouteLoaderData<typeof rootLoader>('routes/root.layout')?.companyContext;
  const storageKey = `pitell:marketing:email-draft:${company?.id}`;
  const [draft, setDraft] = useState<EmailDraft>(() => defaultEmailDraft());
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);
  const discarded = useRef(false);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const previewFetcher = useFetcher<EmailCampaignActionResult>();
  const navigate = useNavigate();
  const location = useLocation();
  const step = stepAt(location.pathname);
  const stepIndex = EMAIL_STEPS.findIndex((item) => item.id === step);
  const ready = readyKey === storageKey;

  // The preview leaves out what isn't finished yet (an unfinished button), instead of hiding the whole e-mail.
  const shownBlocks = previewBlocks(draftEmailBlocks(draft));
  const signature = JSON.stringify({ subject: draft.subject, blocks: shownBlocks });
  const previewResult = previewFetcher.data;
  const previewHtml =
    previewResult?.intent === 'preview' && previewResult.signature === signature ? previewResult.previewHtml : null;

  // Restore the unfinished e-mail, and open it where the writing is.
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(storageKey);
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    const restored = readDraft(raw);
    setDraft(restored);
    setReadyKey(storageKey);
    discarded.current = false;
    if (stepAt(window.location.pathname) === 'template' && startStep(restored) === 'write') {
      navigate(stepHref('write'), { replace: true, preventScrollReset: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per company, when the flow opens.
  }, [storageKey]);

  // Each step starts at the top, with focus on its heading so a screen reader hears where it is.
  const shownStep = useRef(step);
  useEffect(() => {
    if (shownStep.current === step) return;
    shownStep.current = step;
    window.scrollTo({ top: 0 });
    stepHeading.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (!ready || discarded.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [draft, ready, storageKey]);

  // The backend renders the preview, a moment after the last change.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!draft.subject.trim() || shownBlocks.length === 0) return;
      previewFetcher.submit(
        { intent: 'preview', subject: draft.subject, blocks: JSON.stringify(shownBlocks), signature },
        { method: 'post', action: stepHref('template'), defaultShouldRevalidate: false },
      );
    }, PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signature contains every preview input.
  }, [signature]);

  const discardDraft = useCallback(() => {
    discarded.current = true;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* Sending succeeded even if browser storage is unavailable. */
    }
  }, [storageKey]);

  // Forward is a new history entry; going back to the step we came from is a real "back", so the history never
  // loops (Skriv → Send → Endre → Skriv → back would otherwise land on Send again).
  const goTo = (next: EmailStep) => {
    if ((location.state as { from?: EmailStep } | null)?.from === next) navigate(-1);
    else navigate(stepHref(next), { state: { from: step } });
  };

  if (loaderData.error || loaderData.recipients === null)
    return (
      <CompanyPageTemplate title="Ny e-post">
        <PageNotice title="Kunne ikke hente mottakere" />
      </CompanyPageTemplate>
    );

  const context: EmailDraftContext = {
    draft,
    update: (changes) => setDraft((current) => ({ ...current, ...changes })),
    goTo,
    preview: { subject: draft.subject, html: previewHtml, pending: previewFetcher.state !== 'idle' },
    customers: loaderData.customers,
    recipients: loaderData.recipients,
    discardDraft,
  };

  return (
    <CompanyPageTemplate title="Ny e-post">
      <div className="flex items-center gap-3">
        <ol aria-label="Steg" className="grid max-w-sm flex-1 grid-cols-3 gap-1">
          {EMAIL_STEPS.map((item, index) => (
            <li
              key={item.id}
              aria-current={index === stepIndex ? 'step' : undefined}
              className={cn('h-1 rounded-full', index <= stepIndex ? 'bg-interactive' : 'bg-border')}
            >
              <span className="sr-only">{item.label}</span>
            </li>
          ))}
        </ol>
        <span className="shrink-0 text-sm text-text-secondary">
          {stepIndex + 1} av {EMAIL_STEPS.length}
        </span>
      </div>
      <h2 ref={stepHeading} tabIndex={-1} className="sr-only">
        {EMAIL_STEPS[stepIndex].label}
      </h2>

      {storageError ? (
        <Notice
          tone="emphasis"
          title="Utkastet kan ikke lagres i denne nettleseren"
          message="Hold siden åpen til du har sendt e-posten."
        />
      ) : null}

      {/* Mal shows at once; Skriv and Send wait for the saved e-mail, so they never flash an empty one. */}
      {ready || step === 'template' ? <Outlet context={context} /> : null}
    </CompanyPageTemplate>
  );
}
