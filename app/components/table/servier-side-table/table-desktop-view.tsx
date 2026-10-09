// components/table/table-desktop-view.tsx
import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Database } from 'lucide-react';
import { CELL_HEIGHT, TOTAL_VISIBLE_ROWS } from '../constants';
import { TableDesktopHeader } from './table-desktop-header';
import { TableDesktopFooter } from './table-desktop-footer';
import type { ServerPaginatedTableProps } from './server-paginated-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/ui';

const VISIBLE_DATA_ROWS = TOTAL_VISIBLE_ROWS - 1;

export function TableDesktopView<T>({
  items,
  columns,
  renderRow,
  getRowKey,
  pagination,
  onPageChange,
  onPageSizeChange,
  emptyMessage = 'Ingen resultater.',
  pageSizeOptions = [5, 10, 20, 50],
  headerSlot,
  primaryAction,
  scrollable = true,
  className,
}: ServerPaginatedTableProps<T>) {
  const [showScrollHint, setShowScrollHint] = React.useState(true);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const hasScrollableContent = scrollable && items.length > VISIBLE_DATA_ROWS;

  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !hasScrollableContent) return;

    const handleScroll = () => {
      const scrolledToBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 10;
      setShowScrollHint(!scrolledToBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasScrollableContent]);

  const columnWidth = `${100 / columns.length}%`;

  return (
    <div
      className={cn(
        'hidden overflow-hidden rounded-lg border border-border bg-background shadow-card md:block',
        className,
      )}
    >
      <TableDesktopHeader
        pagination={pagination}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={pageSizeOptions}
        headerSlot={headerSlot}
        primaryAction={primaryAction}
      />

      <div className="relative">
        <div
          ref={scrollContainerRef}
          className={scrollable ? 'overflow-y-auto overflow-x-auto' : 'overflow-x-auto'}
          style={scrollable ? { height: `${CELL_HEIGHT * TOTAL_VISIBLE_ROWS}px` } : undefined}
        >
          <Table className="w-full table-fixed">
            <TableHeader>
              <TableRow style={{ height: `${CELL_HEIGHT}px` }}>
                {columns.map((c, i) => (
                  <TableHead key={i} className="sticky top-0 z-10 bg-surface-variant-1" style={{ width: columnWidth }}>
                    {c.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length ? (
                items.map((item, index) => React.cloneElement(renderRow(item, index), { key: getRowKey(item, index) }))
              ) : (
                <TableRow style={{ height: `${CELL_HEIGHT * 3}px` }}>
                  <TableCell colSpan={columns.length} className="text-center">
                    <div className="flex flex-col items-center justify-center gap-3 py-8">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
                        <Database className="h-6 w-6 text-text-secondary" />
                      </div>
                      <p className="text-sm text-text-secondary">{emptyMessage}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Scroll hint with gradient */}
        {showScrollHint && hasScrollableContent && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex h-16 items-end justify-center bg-gradient-to-t from-background via-background/95 to-transparent pb-3">
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 shadow-sm">
              <ChevronDown className="h-4 w-4 animate-bounce text-text-secondary" />
              <span className="text-xs font-medium text-text-secondary">Scroll for mer</span>
            </div>
          </div>
        )}
      </div>

      <TableDesktopFooter pagination={pagination} onPageChange={onPageChange} />
    </div>
  );
}
