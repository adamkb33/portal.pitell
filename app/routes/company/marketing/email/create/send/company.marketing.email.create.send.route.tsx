import { useEffect, useState } from 'react';
import { useFetcher, useNavigate } from 'react-router';
import { Eye, Mail, Send } from 'lucide-react';
import { Button, ConfirmDialog, FloatingActionBar, FullScreenSheet, Notice } from '~/ui';
import { getCampaignDetailHref, pluralize } from '../../../_utils/campaigns';
import type { EmailCampaignActionResult } from '../company.marketing.email.create.layout';
import { ChosenRow, EditButton } from '../_components/chosen-row';
import { EmailPreview } from '../_components/email-preview';
import { PreviewColumns } from '../_components/preview-columns';
import { RecipientsCard } from '../_components/recipients-card';
import { useEmailDraft } from '../_utils/email-draft-context';
import { checkDraft, stepHref } from '../_utils/email-flow';

/**
 * Ny e-post, step 3 Send (approved sketch 2026-11-22): who gets it (everyone who said yes, "Ikke send til" leaves
 * someone out), the e-mail as it will be sent beside it on desktop ("Forhåndsvis" on phones), and "Send til n kunder"
 * behind a confirmation.
 */
export default function CompanyMarketingEmailCreateSendRoute() {
  const { draft, update, goTo, preview, customers, recipients, discardDraft } = useEmailDraft();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const sendFetcher = useFetcher<EmailCampaignActionResult>();
  const navigate = useNavigate();
  const { blocks, missing } = checkDraft(draft);
  const result = sendFetcher.data;
  const campaignId = result && 'campaignId' in result ? result.campaignId : null;
  const sendError = result && 'error' in result ? result.error : null;
  const sending = sendFetcher.state !== 'idle' || campaignId !== null;

  const excluded = new Set(draft.excludedUserIds);
  const excludedCount = customers
    .filter((customer) => excluded.has(customer.userId))
    .reduce((sum, customer) => sum + customer.channels.filter((item) => item.channel === 'EMAIL').length, 0);
  const count = Math.max(0, recipients - excludedCount);
  // Nobody to choose from is not the same as nobody chosen.
  const nobody = customers.length === 0;

  // Send needs a finished e-mail (a reload or an old link can land here without one).
  useEffect(() => {
    if (missing) navigate(stepHref('write'), { replace: true });
  }, [missing, navigate]);

  useEffect(() => {
    if (campaignId === null) return;
    discardDraft();
    navigate(getCampaignDetailHref(campaignId), { replace: true });
  }, [campaignId, discardDraft, navigate]);

  const send = () => {
    setConfirmOpen(false);
    sendFetcher.submit(
      {
        intent: 'send',
        subject: draft.subject,
        blocks: JSON.stringify(blocks),
        excludedUserIds: JSON.stringify(draft.excludedUserIds),
      },
      { method: 'post', action: stepHref('template') },
    );
  };

  const editEmail = <EditButton label="Endre e-posten" onClick={() => goTo('write')} disabled={sending} />;

  return (
    <PreviewColumns preview={<EmailPreview {...preview} action={editEmail} />}>
      {sendError ? <Notice tone="emphasis" title="Kunne ikke sende e-posten" message={sendError} /> : null}
      {/* Phones: the e-mail as one row; on desktop the preview stands beside the list. */}
      <div className="lg:hidden">
        <ChosenRow
          label="E-posten"
          lead={
            <span
              aria-hidden
              className="grid size-7 shrink-0 place-items-center rounded-lg bg-marketing-email-soft text-marketing-email"
            >
              <Mail className="size-4" />
            </span>
          }
          value={draft.subject}
        >
          {editEmail}
        </ChosenRow>
      </div>
      {nobody ? null : (
        <RecipientsCard
          customers={customers}
          total={recipients}
          excludedUserIds={draft.excludedUserIds}
          onChange={(excludedUserIds) => update({ excludedUserIds })}
          disabled={sending}
        />
      )}
      <FloatingActionBar
        message={nobody ? 'Ingen har sagt ja til e-post ennå' : count === 0 ? 'Velg minst én mottaker' : null}
        className="lg:mt-0 lg:border-t-0 lg:pt-0"
      >
        {/* One child, so Send gets the width "Send til 27 kunder" needs on a phone and the preview a square button. */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            aria-label="Forhåndsvis"
            className="w-12 shrink-0 px-0 lg:hidden"
            onClick={() => setPreviewOpen(true)}
          >
            <Eye aria-hidden />
          </Button>
          <Button
            type="button"
            size="lg"
            loading={sending}
            disabled={count === 0 || Boolean(missing)}
            onClick={() => setConfirmOpen(true)}
            className="flex-1 lg:h-10 lg:text-sm"
          >
            <Send aria-hidden />
            Send til {pluralize(count, 'kunde', 'kunder')}
          </Button>
        </div>
      </FloatingActionBar>

      <FullScreenSheet open={previewOpen} onOpenChange={setPreviewOpen} title="Forhåndsvisning">
        <EmailPreview {...preview} framed={false} />
      </FullScreenSheet>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Send «${draft.subject}» til ${pluralize(count, 'kunde', 'kunder')}?`}
        description="Dette kan ikke angres."
        cancelAction={
          <Button type="button" variant="outline">
            Tilbake
          </Button>
        }
        confirmAction={
          <Button type="button" disabled={sending} onClick={send}>
            Send nå
          </Button>
        }
      />
    </PreviewColumns>
  );
}
