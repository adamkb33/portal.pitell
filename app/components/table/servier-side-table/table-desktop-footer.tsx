// components/table/table-desktop-footer.tsx
import { Button } from '@/components/ui/button';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

type TableDesktopFooterProps = {
  pagination: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
};

export function TableDesktopFooter({ pagination, onPageChange }: TableDesktopFooterProps) {
  const { page, totalPages } = pagination;
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div className="bg-card-footer-bg border-t border-card-header-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Page indicator with highlight */}
        <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
          <span className="text-xs font-semibold text-muted-foreground">Side</span>
          <span className="text-sm font-bold text-primary">{page + 1}</span>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-sm font-semibold text-foreground">{totalPages || 1}</span>
        </div>

        {/* Navigation buttons with icons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(0)}
            disabled={!canPrev}
            className="gap-1.5 hover:bg-muted"
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Første</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrev}
            className="gap-1.5 hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Forrige</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={!canNext}
            className="gap-1.5 hover:bg-muted"
          >
            <span className="hidden sm:inline">Neste</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages - 1)}
            disabled={!canNext}
            className="gap-1.5 hover:bg-muted"
          >
            <span className="hidden sm:inline">Siste</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
