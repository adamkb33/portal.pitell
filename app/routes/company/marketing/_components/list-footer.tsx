import { Link, useSearchParams } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '~/ui';

type ListFooterProps = {
  /** "12 kampanjer", "600 mottakere" … */
  total: string;
  page: number;
  totalPages: number;
};

/** Count on the left, "Side x av y" with previous/next on the right (only with more than one page). */
export function ListFooter({ total, page, totalPages }: ListFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-text-secondary sm:px-5">
      <span>{total}</span>
      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <span>
            Side {page + 1} av {totalPages}
          </span>
          <PageButton page={page - 1} enabled={page > 0} label="Forrige side">
            <ChevronLeft className="h-4 w-4" />
          </PageButton>
          <PageButton page={page + 1} enabled={page + 1 < totalPages} label="Neste side">
            <ChevronRight className="h-4 w-4" />
          </PageButton>
        </div>
      ) : null}
    </div>
  );
}

/** A link that keeps the other query parameters, so paging works without JavaScript; a disabled button at either end. */
function PageButton({
  page,
  enabled,
  label,
  children,
}: {
  page: number;
  enabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const [searchParams] = useSearchParams();

  if (!enabled) {
    return (
      <Button variant="outline" size="icon" aria-label={label} disabled>
        {children}
      </Button>
    );
  }

  const params = new URLSearchParams(searchParams);
  if (page > 0) params.set('page', String(page));
  else params.delete('page');

  return (
    <Button asChild variant="outline" size="icon">
      <Link to={`?${params.toString()}`} aria-label={label}>
        {children}
      </Link>
    </Button>
  );
}
