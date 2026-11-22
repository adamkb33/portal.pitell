import { useEffect, useState } from 'react';
import { useFetcher, useNavigate } from 'react-router';
import { Send, Users } from 'lucide-react';
import { Button, ConfirmDialog, FloatingActionBar, Notice } from '~/ui';
import { getCampaignDetailHref, pluralize } from '../../../_utils/campaigns';
import type { EmailCampaignActionResult } from '../company.marketing.email.create.layout';
import { ChosenRow, EditButton } from '../_components/chosen-row';
import { EmailPreview } from '../_components/email-preview';
import { PreviewColumns } from '../_components/preview-columns';
import { RecipientsSheet } from '../_components/recipients-sheet';
import { useEmailDraft } from '../_utils/email-draft-context';
import { checkDraft, stepHref } from '../_utils/email-flow';

/**
 * Ny e-post, step 3 Send: who gets it (all who said yes, "Endre" leaves some out), the e-mail as it will be sent, and
 * "Send til n kunder" behind a confirmation.
 */
export default function CompanyMarketingEmailCreateSendRoute() {
  const { draft, update, goTo, preview, customers, recipients, discardDraft } = useEmailDraft();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recipientsOpen, setRecipientsOpen] = useState(false);
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

  return (
    <PreviewColumns
      previewOnPhone
      preview={
        <EmailPreview
          {...preview}
          action={<EditButton label="Endre e-posten" onClick={() => goTo('write')} disabled={sending} />}
        />
      }
    >
      {sendError ? <Notice tone="emphasis" title="Kunne ikke sende e-posten" message={sendError} /> : null}
      <ChosenRow
        label="Mottakere"
        lead={
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-lg bg-category-sky-tint text-category-sky-ink"
          >
            <Users className="size-4" />
          </span>
        }
        value={`${excludedCount ? 'Valgte kunder' : 'Alle påmeldte kunder'} · ${count}`}
      >
        <EditButton label="Endre mottakere" onClick={() => setRecipientsOpen(true)} disabled={sending || nobody} />
      </ChosenRow>
      <FloatingActionBar
        message={nobody ? 'Ingen har sagt ja til e-post ennå' : count === 0 ? 'Velg minst én mottaker' : null}
        className="lg:mt-0 lg:border-t-0 lg:pt-0"
      >
        <Button
          type="button"
          size="lg"
          loading={sending}
          disabled={count === 0 || Boolean(missing)}
          onClick={() => setConfirmOpen(true)}
          className="lg:h-10 lg:text-sm"
        >
          <Send aria-hidden />
          Send til {pluralize(count, 'kunde', 'kunder')}
        </Button>
      </FloatingActionBar>

      <RecipientsSheet
        open={recipientsOpen}
        onOpenChange={setRecipientsOpen}
        customers={customers}
        excludedUserIds={draft.excludedUserIds}
        onApply={(excludedUserIds) => update({ excludedUserIds })}
      />
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
