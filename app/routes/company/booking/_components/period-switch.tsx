import { useLocation, useSearchParams } from 'react-router';
import { SegmentedLinks } from '~/ui';
import { PERIOD_PARAM } from '../_utils/periods';

/** Kommende | Tidligere for lists of planned time. Lives in the URL (`?periode=tidligere`), like every list filter. */
export function PeriodSwitch({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const past = searchParams.get(PERIOD_PARAM) === 'tidligere';

  return (
    <SegmentedLinks
      label="Periode"
      className={className}
      items={[
        { key: 'kommende', label: 'Kommende', to: pathname, active: !past },
        { key: 'tidligere', label: 'Tidligere', to: `${pathname}?${PERIOD_PARAM}=tidligere`, active: past },
      ]}
    />
  );
}
