import { useOutletContext } from 'react-router';
import type { MarketingRecipientDto } from '~/api/generated';
import type { EmailDraft } from './email-blocks';
import type { EmailStep } from './email-flow';

/** What the Ny e-post layout shares with its three steps: the unfinished e-mail, its preview and the audience. */
export type EmailDraftContext = {
  draft: EmailDraft;
  update: (changes: Partial<EmailDraft>) => void;
  goTo: (step: EmailStep) => void;
  /** The e-mail as the backend renders it (null until the current text is rendered). */
  preview: { subject: string; html: string | null; pending: boolean };
  /** Every customer who said yes to e-post, so some can be left out. */
  customers: MarketingRecipientDto[];
  recipients: number;
  /** After sending: forget the unfinished e-mail in this browser. */
  discardDraft: () => void;
};

export const useEmailDraft = () => useOutletContext<EmailDraftContext>();
