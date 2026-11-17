import { Button } from '~/ui';

/**
 * The one primary button of an auth step. While the step isn't ready it stays disabled and says, in one line,
 * what's missing (ui-rules rule 5).
 */
export function AuthSubmitBar({
  label,
  loadingLabel,
  missing,
  loading,
  disabled,
  name,
  value,
}: {
  label: string;
  loadingLabel?: string;
  /** What the user still has to do; null when the step is ready. */
  missing: string | null;
  loading: boolean;
  disabled?: boolean;
  name?: string;
  value?: string;
}) {
  return (
    <div className="space-y-2">
      {missing ? (
        <p className="text-center text-sm text-text-secondary" aria-live="polite">
          {missing}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        fullWidth
        name={name}
        value={value}
        loading={loading}
        disabled={Boolean(missing) || disabled}
      >
        {loading && loadingLabel ? loadingLabel : label}
      </Button>
    </div>
  );
}
