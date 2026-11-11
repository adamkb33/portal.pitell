import { Button } from '../atoms/button';
import { Card, CardContent, CardFooter } from '../organisms/card';
import { CompanyPageTemplate, type CompanyPageTemplateProps } from './company-page-template';

/** The form's one primary action (ui-rules, rule 2). */
type FormSubmit = {
  /** id of the <form> the button submits. */
  form: string;
  loading?: boolean;
  disabled?: boolean;
  /** Defaults to "Lagre", for creating and editing alike. */
  label?: string;
  /** One short line that belongs with the button: a running total, or why it's disabled. */
  message?: React.ReactNode;
};

export interface CompanyFormPageTemplateProps
  extends Omit<CompanyPageTemplateProps, 'children' | 'routeLinks' | 'actions' | 'hero'> {
  routeLinks?: React.ReactNode;
  notices?: React.ReactNode;
  children: React.ReactNode;
  /** The Lagre bar: floats at the bottom of the screen below `lg` (the bottom menu is hidden there), inline from `lg`. */
  submit?: FormSubmit;
  /** Older free-form footer; new form pages use `submit`. */
  footer?: React.ReactNode;
}

/**
 * A create/edit page (ui-rules: page type Skjema). The way back is the header (‹ on phones, the breadcrumb on desktop),
 * so there is no back link in the page.
 */
export function CompanyFormPageTemplate({
  routeLinks,
  notices,
  children,
  submit,
  footer,
  ...props
}: CompanyFormPageTemplateProps) {
  return (
    <CompanyPageTemplate {...props} routeLinks={routeLinks}>
      {notices}
      <Card variant="default">
        <CardContent className="space-y-3">{children}</CardContent>
        {submit ? (
          <FormSubmitBar {...submit} />
        ) : footer ? (
          <CardFooter className="flex flex-wrap items-center justify-end gap-2 border-t border-border">
            {footer}
          </CardFooter>
        ) : null}
      </Card>
    </CompanyPageTemplate>
  );
}

/** Same idea as the booking flow's bar: always within thumb reach on phones, an ordinary form footer on desktop. */
function FormSubmitBar({ form, loading = false, disabled = false, label = 'Lagre', message }: FormSubmit) {
  return (
    <div
      data-floating-action-bar
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-md overflow-hidden rounded-[var(--radius-panel)] border border-border bg-background shadow-[var(--shadow-floating)] lg:static lg:mx-0 lg:mt-4 lg:flex lg:max-w-none lg:items-center lg:justify-end lg:gap-3 lg:overflow-visible lg:rounded-none lg:border-0 lg:border-t lg:pt-4 lg:shadow-none"
    >
      {message ? (
        <div className="border-b border-border bg-surface-variant-1 px-3 py-2 text-center text-sm text-text-secondary lg:mr-auto lg:border-0 lg:bg-transparent lg:p-0 lg:text-left">
          {message}
        </div>
      ) : null}
      <div className="p-2 lg:p-0">
        <Button
          type="submit"
          form={form}
          size="lg"
          loading={loading}
          disabled={disabled}
          className="w-full lg:h-10 lg:w-auto lg:text-sm"
        >
          {label}
        </Button>
      </div>
    </div>
  );
}
