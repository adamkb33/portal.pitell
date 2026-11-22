import { useState } from 'react';
import { useRouteLoaderData } from 'react-router';
import { Check, Eye } from 'lucide-react';
import type { loader as rootLoader } from '~/routes/root.layout';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  FloatingActionBar,
  FormField,
  FullScreenSheet,
  Label,
  Switch,
  Textarea,
} from '~/ui';
import { ChosenRow, EditButton } from '../_components/chosen-row';
import { EmailPreview } from '../_components/email-preview';
import { PreviewColumns } from '../_components/preview-columns';
import { TEMPLATE_CHOICES, TemplateTile } from '../_components/template-tile';
import { EMAIL_TEMPLATES } from '../_utils/email-blocks';
import { CAMPAIGN_LIMITS } from '../_utils/email-campaign.schema';
import { useEmailDraft } from '../_utils/email-draft-context';
import { checkDraft, normalizeLink, switchTemplate } from '../_utils/email-flow';

/**
 * Ny e-post, step 2 Skriv: the template (changed in place from a menu, keeping the text), subject, heading, message and
 * an optional button. The preview stands beside the form on desktop and opens full screen on phones.
 */
export default function CompanyMarketingEmailCreateWriteRoute() {
  const company = useRouteLoaderData<typeof rootLoader>('routes/root.layout')?.companyContext;
  const { draft, update, goTo, preview } = useEmailDraft();
  const [previewOpen, setPreviewOpen] = useState(false);
  const { missing } = checkDraft(draft);
  const template = EMAIL_TEMPLATES[draft.template];

  return (
    <PreviewColumns preview={<EmailPreview {...preview} />}>
      <ChosenRow lead={<TemplateTile template={draft.template} small />} value={template.label}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <EditButton label="Endre mal" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-64 p-1">
            {TEMPLATE_CHOICES.map((choice) => (
              <DropdownMenuItem
                key={choice.key}
                onSelect={() => update(switchTemplate(draft, choice.key))}
                className="min-h-12 gap-3 px-2"
              >
                <TemplateTile template={choice.key} small />
                <span className="flex-1 text-[15px] font-semibold text-text-primary">
                  {EMAIL_TEMPLATES[choice.key].label}
                </span>
                {choice.key === draft.template ? (
                  <Check className="size-4 text-interactive" aria-label="I bruk" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </ChosenRow>

      <fieldset className="grid gap-4 rounded-xl border border-border bg-background p-4 sm:p-5">
        <legend className="sr-only">E-posten</legend>
        <FormField
          label="Emne"
          placeholder={template.subject.replace('selskapet', company?.name || 'selskapet')}
          value={draft.subject}
          maxLength={CAMPAIGN_LIMITS.subject}
          onChange={(event) => update({ subject: event.target.value })}
        />
        {draft.template !== 'personal' ? (
          <FormField
            label="Overskrift"
            value={draft.heading}
            maxLength={CAMPAIGN_LIMITS.heading}
            onChange={(event) => update({ heading: event.target.value })}
          />
        ) : null}
        <div className="grid gap-2">
          <Label htmlFor="email-message">Melding</Label>
          <Textarea
            id="email-message"
            rows={6}
            placeholder={template.message}
            value={draft.message}
            maxLength={CAMPAIGN_LIMITS.paragraph}
            onChange={(event) => update({ message: event.target.value })}
            className="text-base leading-relaxed"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label id="email-button-label">Knapp</Label>
          <Switch
            aria-labelledby="email-button-label"
            checked={draft.buttonEnabled}
            onCheckedChange={(checked) => update({ buttonEnabled: checked })}
          />
        </div>
        {draft.buttonEnabled ? (
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Knappetekst"
              value={draft.buttonLabel}
              maxLength={CAMPAIGN_LIMITS.buttonLabel}
              onChange={(event) => update({ buttonLabel: event.target.value })}
            />
            <FormField
              label="Lenke"
              type="url"
              inputMode="url"
              placeholder="https://"
              value={draft.buttonUrl}
              maxLength={CAMPAIGN_LIMITS.buttonUrl}
              onChange={(event) => update({ buttonUrl: event.target.value })}
              onBlur={(event) => update({ buttonUrl: normalizeLink(event.target.value) })}
            />
          </div>
        ) : null}
        <FloatingActionBar message={missing}>
          <Button type="button" variant="outline" size="lg" className="lg:hidden" onClick={() => setPreviewOpen(true)}>
            <Eye aria-hidden />
            Forhåndsvis
          </Button>
          <Button
            type="button"
            size="lg"
            disabled={Boolean(missing)}
            onClick={() => goTo('send')}
            className="lg:h-10 lg:text-sm"
          >
            Velg mottakere
          </Button>
        </FloatingActionBar>
      </fieldset>

      <FullScreenSheet open={previewOpen} onOpenChange={setPreviewOpen} title="Forhåndsvisning">
        <EmailPreview {...preview} framed={false} />
      </FullScreenSheet>
    </PreviewColumns>
  );
}
