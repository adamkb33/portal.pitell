import { useEffect, useState } from 'react';
import { Link, data, useFetcher, useRevalidator } from 'react-router';
import { ArrowLeft, ChevronDown, Mail, MessageSquare, Users } from 'lucide-react';
import type { Route } from './+types/company.marketing.detail.route';
import {
  CompanyUserMarketingCampaignController,
  type CampaignDetailDto,
  type MarketingMessageDto,
} from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { BookingErrorState } from '~/routes/company/booking/_components/booking-error-state';
import { Button, CompanyPageTemplate, ConfirmDialog, Notice, cn } from '~/ui';
import { loader as requireMarketingAdmin } from '../company.marketing.layout';
import { ListFooter } from '../_components/list-footer';
import { StatusChip } from '../_components/status-chip';
import {
  CHANNEL_LABELS,
  MESSAGE_STATUS_LABELS,
  SKIP_REASON_LABELS,
  STATUS_LABELS,
  formatCampaignDay,
  formatCampaignTime,
  formatRecipientAddress,
  parseMessageStatus,
  parsePage,
  pluralize,
  type MessageStatus,
} from '../_utils/campaigns';

const PAGE_SIZE = 10;
const REFRESH_MS = 1000;

const parseCampaignId = (value: string | undefined) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const emptyResult = {
  campaign: null as CampaignDetailDto | null,
  messages: [] as MarketingMessageDto[],
  pagination: { page: 0, totalElements: 0, totalPages: 1 },
  status: null as MessageStatus | null,
  previewHtml: null as string | null,
  notFound: false,
  error: null as string | null,
};

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireMarketingAdmin({ request });

  const campaignId = parseCampaignId(params.campaignId);
  if (!campaignId) return { ...emptyResult, notFound: true };

  const url = new URL(request.url);
  const status = parseMessageStatus(url.searchParams.get('status'));
  const page = parsePage(url.searchParams.get('page'));

  try {
    const [campaignResponse, messagesResponse] = await withAuth(request, () =>
      Promise.all([
        CompanyUserMarketingCampaignController.get1({ path: { id: campaignId } }),
        CompanyUserMarketingCampaignController.messages({
          path: { id: campaignId },
          query: { page, size: PAGE_SIZE, ...(status ? { status } : {}) },
        }),
      ]),
    );
    const campaign = campaignResponse.data?.data;
    if (!campaign) return { ...emptyResult, notFound: true };

    // The email as the backend renders it (with the sample name "Ola"). Without it the page still works.
    let previewHtml: string | null = null;
    if (campaign.channel === 'EMAIL' && campaign.subject && campaign.blocks?.length) {
      const { subject, blocks } = campaign;
      try {
        const preview = await withAuth(request, () =>
          CompanyUserMarketingCampaignController.preview({ body: { subject, blocks } }),
        );
        previewHtml = preview.data?.data?.html ?? null;
      } catch (error) {
        resolveErrorPayload(error, 'Kunne ikke vise innholdet');
      }
    }

    const pagination = messagesResponse.data?.meta?.pagination;
    return {
      ...emptyResult,
      campaign,
      messages: messagesResponse.data?.data ?? [],
      pagination: {
        page: pagination?.page ?? page,
        totalElements: pagination?.totalElements ?? 0,
        totalPages: Math.max(1, pagination?.totalPages ?? 1),
      },
      status,
      previewHtml,
    };
  } catch (error) {
    const { message, status: httpStatus } = resolveErrorPayload(error, 'Kunne ikke hente kampanjen');
    return httpStatus === 404 ? { ...emptyResult, notFound: true } : { ...emptyResult, error: message };
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireMarketingAdmin({ request });
  const campaignId = parseCampaignId(params.campaignId);
  const formData = await request.formData();

  if (!campaignId || formData.get('intent') !== 'cancel') {
    return data({ error: 'Ukjent handling.' as string | null }, { status: 400 });
  }

  try {
    await withAuth(request, () => CompanyUserMarketingCampaignController.cancel({ path: { id: campaignId } }));
    return data({ error: null as string | null });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke avbryte kampanjen.');
    return data({ error: message as string | null }, { status: 400 });
  }
}

const campaignChip = {
  SENDING: <StatusChip tone="active">{STATUS_LABELS.SENDING}</StatusChip>,
  COMPLETED: <StatusChip tone="quiet">{STATUS_LABELS.COMPLETED}</StatusChip>,
  CANCELLED: <StatusChip tone="muted">{STATUS_LABELS.CANCELLED}</StatusChip>,
} as const;

/** The right-hand side of a recipient row: when it was sent, or why it was not. */
function RecipientOutcome({ message }: { message: MarketingMessageDto }) {
  switch (message.status) {
    case 'SENT':
      return message.sentAt ? (
        <time dateTime={message.sentAt} className="text-sm tabular-nums text-text-secondary">
          {formatCampaignTime(message.sentAt)}
        </time>
      ) : null;
    case 'FAILED':
      return <StatusChip tone="danger">{MESSAGE_STATUS_LABELS.FAILED}</StatusChip>;
    case 'SKIPPED':
      return (
        <StatusChip tone="muted">
          {message.skipReason ? SKIP_REASON_LABELS[message.skipReason] : MESSAGE_STATUS_LABELS.SKIPPED}
        </StatusChip>
      );
    default:
      return <StatusChip tone="quiet">{MESSAGE_STATUS_LABELS.QUEUED}</StatusChip>;
  }
}

export default function CompanyMarketingDetailRoute({ loaderData }: Route.ComponentProps) {
  const { campaign, messages, pagination, status, previewHtml, notFound, error } = loaderData;
  const cancelFetcher = useFetcher<typeof action>();
  const { revalidate, state: revalidationState } = useRevalidator();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recipientsOpen, setRecipientsOpen] = useState(status !== null || pagination.page > 0);
  const sending = campaign?.status === 'SENDING';
  const cancelling = cancelFetcher.state !== 'idle';

  // Refresh while sending, waiting for each request to finish before polling again.
  useEffect(() => {
    if (!sending || revalidationState !== 'idle') return;
    const timer = setInterval(() => revalidate(), REFRESH_MS);
    return () => clearInterval(timer);
  }, [sending, revalidate, revalidationState]);

  const backLink = (
    <Button asChild variant="ghost" size="sm">
      <Link to={ROUTES_MAP['company.marketing'].href}>
        <ArrowLeft className="h-4 w-4" /> Markedsføring
      </Link>
    </Button>
  );

  if (notFound || error || !campaign) {
    return (
      <CompanyPageTemplate title="Kampanje" routeLinks={backLink}>
        {notFound ? (
          <Notice tone="emphasis" title="Fant ikke kampanjen" message={null} />
        ) : (
          <BookingErrorState className="min-h-[24rem]" />
        )}
      </CompanyPageTemplate>
    );
  }

  const { counts } = campaign;
  const done = counts.sent + counts.failed + counts.skipped;
  const stats = [
    { label: 'Sendt', value: counts.sent, show: true },
    { label: 'I kø', value: counts.queued, show: sending || counts.queued > 0 },
    { label: 'Feilet', value: counts.failed, show: counts.failed > 0 },
    { label: 'Hoppet over', value: counts.skipped, show: counts.skipped > 0 },
    { label: 'Meldt av', value: counts.unsubscribed, show: counts.unsubscribed > 0 },
  ].filter((stat) => stat.show);
  const countByStatus: Record<MessageStatus, number> = {
    SENT: counts.sent,
    QUEUED: counts.queued,
    FAILED: counts.failed,
    SKIPPED: counts.skipped,
  };
  const filters = [
    null,
    ...(['FAILED', 'QUEUED', 'SKIPPED', 'SENT'] as const).filter(
      (option) => countByStatus[option] > 0 || option === status,
    ),
  ];
  const cancelError = cancelFetcher.data?.error;

  return (
    <CompanyPageTemplate title={campaign.name} size="xl" className="max-w-[70rem]" routeLinks={backLink}>
      {cancelError ? <Notice tone="emphasis" title="Kunne ikke avbryte kampanjen" message={cancelError} /> : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.5fr)]">
        <div className="min-w-0 space-y-4">
          <section aria-label="Status" className="rounded-xl border border-border bg-background p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span
                className={cn(
                  'inline-flex items-center gap-2 text-xs font-medium',
                  campaign.channel === 'EMAIL' ? 'text-marketing-email' : 'text-marketing-sms',
                )}
              >
                {campaign.channel === 'EMAIL' ? (
                  <Mail className="size-4" aria-hidden />
                ) : (
                  <MessageSquare className="size-4" aria-hidden />
                )}
                {CHANNEL_LABELS[campaign.channel]}
              </span>
              {campaignChip[campaign.status]}
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <p className="break-words text-xl font-semibold text-text-primary">{campaign.name}</p>
                <p className="text-sm text-text-secondary">
                  Startet {formatCampaignDay(campaign.startedAt)} {formatCampaignTime(campaign.startedAt)}
                </p>
              </div>
              {sending ? (
                <Button variant="outline-danger" size="sm" disabled={cancelling} onClick={() => setConfirmOpen(true)}>
                  {cancelling ? 'Avbryter…' : 'Avbryt kampanje'}
                </Button>
              ) : null}
            </div>

            {sending ? (
              <div
                role="progressbar"
                aria-label="Fremdrift"
                aria-valuemin={0}
                aria-valuemax={campaign.eligibleCount}
                aria-valuenow={done}
                className="mt-5 h-1.5 overflow-hidden rounded-full bg-surface-variant-2"
              >
                <div
                  className="h-full rounded-full bg-interactive transition-[width] duration-500"
                  style={{
                    width: `${campaign.eligibleCount ? Math.round((done / campaign.eligibleCount) * 100) : 0}%`,
                  }}
                />
              </div>
            ) : null}

            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-3 border-t border-border pt-4">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col-reverse">
                  <dt className="text-xs text-text-secondary">{stat.label}</dt>
                  <dd className="text-lg font-semibold tabular-nums text-text-primary">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section
            aria-label="Mottakere"
            className="min-w-0 overflow-hidden rounded-xl border border-border bg-background"
          >
            <details
              className="group"
              open={recipientsOpen}
              onToggle={(event) => setRecipientsOpen(event.currentTarget.open)}
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-semibold text-text-primary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive sm:px-5 [&::-webkit-details-marker]:hidden">
                <Users className="size-4 text-text-secondary" aria-hidden />
                <span>Mottakere ({campaign.eligibleCount})</span>
                <ChevronDown
                  className="ml-auto size-4 text-text-secondary transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <nav aria-label="Filtrer mottakere" className="flex flex-wrap gap-1 border-y border-border p-3 sm:px-4">
                {filters.map((option) => {
                  const active = option === status;
                  return (
                    <Link
                      key={option ?? 'ALL'}
                      to={option ? `?status=${option}` : '?'}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'whitespace-nowrap rounded-full px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-interactive',
                        active
                          ? 'bg-surface-variant-2 font-semibold text-text-primary'
                          : 'text-text-secondary hover:bg-surface-variant-1',
                      )}
                    >
                      {option ? MESSAGE_STATUS_LABELS[option] : 'Alle'} (
                      {option ? countByStatus[option] : campaign.eligibleCount})
                    </Link>
                  );
                })}
              </nav>

              {messages.length ? (
                <ul className="divide-y divide-border">
                  {messages.map((message) => (
                    <li key={message.id} className="flex min-h-[3.25rem] items-center gap-3 px-4 py-2 sm:px-5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-text-primary">
                          {message.recipientName.trim() || 'Ukjent mottaker'}
                        </span>
                        <span className="block truncate text-sm text-text-secondary">
                          {formatRecipientAddress(message.recipientAddress)}
                        </span>
                      </span>
                      <span className="shrink-0">
                        <RecipientOutcome message={message} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-10 text-center text-sm text-text-secondary">Ingen mottakere</p>
              )}

              <ListFooter
                total={pluralize(pagination.totalElements, 'mottaker', 'mottakere')}
                page={pagination.page}
                totalPages={pagination.totalPages}
              />
            </details>
          </section>
        </div>
        <aside aria-label="Innhold" className="min-w-0 overflow-hidden rounded-xl border border-border bg-background">
          <div
            className={cn(
              'flex items-center gap-3 border-b border-border px-5 py-4',
              campaign.channel === 'EMAIL' ? 'bg-marketing-email-soft' : 'bg-marketing-sms-soft',
            )}
          >
            {campaign.channel === 'EMAIL' ? (
              <Mail className="size-4 shrink-0 text-marketing-email" aria-hidden />
            ) : (
              <MessageSquare className="size-4 shrink-0 text-marketing-sms" aria-hidden />
            )}
            <h2 className="min-w-0 break-words text-sm font-semibold">
              {campaign.channel === 'EMAIL' ? campaign.subject : 'SMS'}
            </h2>
          </div>
          {campaign.channel === 'EMAIL' ? (
            <>
              {previewHtml ? (
                <iframe
                  sandbox=""
                  srcDoc={previewHtml}
                  title="Innhold"
                  className="block h-[380px] w-full border-0 sm:h-[440px]"
                />
              ) : (
                <div className="flex h-48 items-center justify-center rounded border border-dashed border-border text-text-secondary">
                  <Mail className="h-6 w-6" aria-hidden />
                </div>
              )}
            </>
          ) : (
            <p className="m-5 whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-marketing-sms-soft px-4 py-3 text-sm leading-relaxed">
              {campaign.body}
            </p>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Avbryt kampanjen?"
        description={`${pluralize(counts.queued, 'melding', 'meldinger')} blir ikke sendt.`}
        cancelAction={
          <Button type="button" variant="outline">
            Fortsett
          </Button>
        }
        confirmAction={
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setConfirmOpen(false);
              cancelFetcher.submit({ intent: 'cancel' }, { method: 'post' });
            }}
          >
            Avbryt kampanje
          </Button>
        }
      />
    </CompanyPageTemplate>
  );
}
