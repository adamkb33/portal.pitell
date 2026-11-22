import { Check, ChevronRight } from 'lucide-react';
import { TEMPLATE_CHOICES, TemplateTile } from './_components/template-tile';
import { EMAIL_TEMPLATES, type EmailTemplate } from './_utils/email-blocks';
import { useEmailDraft } from './_utils/email-draft-context';
import { hasOwnText, switchTemplate } from './_utils/email-flow';

/** Ny e-post, step 1 Mal: tap a template. Once the user has written something, ✓ marks the one in use. */
export default function CompanyMarketingEmailCreateRoute() {
  const { draft, update, goTo } = useEmailDraft();
  const markCurrent = hasOwnText(draft);

  // Changing template keeps the user's text (switchTemplate), so it needs no question.
  const choose = (template: EmailTemplate) => {
    update(switchTemplate(draft, template));
    goTo('write');
  };

  return (
    <ul
      aria-label="Maler"
      className="max-w-140 divide-y divide-border overflow-hidden rounded-xl border border-border bg-background"
    >
      {TEMPLATE_CHOICES.map((choice) => {
        const current = markCurrent && choice.key === draft.template;
        return (
          <li key={choice.key}>
            <button
              type="button"
              aria-current={current ? 'true' : undefined}
              onClick={() => choose(choice.key)}
              className="flex min-h-16 w-full items-center gap-3 px-4 text-left transition-colors hover:bg-surface-variant-1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-interactive sm:px-5"
            >
              <TemplateTile template={choice.key} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-text-primary">
                  {EMAIL_TEMPLATES[choice.key].label}
                </span>
                <span className="block truncate text-[13px] text-text-secondary">{choice.line}</span>
              </span>
              {current ? (
                <Check className="size-5 shrink-0 text-interactive" aria-label="I bruk" />
              ) : (
                <ChevronRight className="size-4 shrink-0 text-text-secondary" aria-hidden />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
