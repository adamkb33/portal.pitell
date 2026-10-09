// components/table/table-mobile-view.tsx
import * as React from 'react';
import { Database } from 'lucide-react';
import { TableMobilePagination } from './table-mobile-pagination';
import type { ServerPaginatedTableProps } from './server-paginated-table';
import { Card, CardContent, Text } from '~/ui';

function DefaultMobileCard<T>({
  item,
  index,
  renderRow,
  columns,
}: {
  item: T;
  index: number;
  renderRow: (item: T, index: number) => React.ReactElement;
  columns: { header: React.ReactNode; className?: string }[];
}) {
  const row = renderRow(item, index);
  const rowElement = row as React.ReactElement<{ children: React.ReactNode }>;
  const cells = React.Children.toArray(rowElement.props.children);

  // Split cells into main content and actions
  const mainCells = cells.slice(0, -1);
  const actionsCell = cells[cells.length - 1] as any;

  return (
    <Card variant="interactive" size="sm" className="border-border bg-background shadow-sm">
      <CardContent className="p-4">
        {/* Index badge */}
        <div className="mb-3 flex items-center gap-2 border-b border-border-soft pb-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50">
            <span className="text-xs font-bold text-text-primary">#{index + 1}</span>
          </div>
        </div>

        {/* Main content - 2 column grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-3">
          {mainCells.map((cell: any, cellIndex: number) => {
            const columnHeader = columns[cellIndex]?.header;
            const cellContent = cell.props?.children;

            return (
              <div key={cellIndex} className="flex min-w-0 flex-col gap-1">
                <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-disabled">
                  {columnHeader}
                </dt>
                <dd className="break-words text-sm font-medium text-text-primary [&_[data-slot=badge]]:rounded-full">
                  {cellContent}
                </dd>
              </div>
            );
          })}
        </div>

        {/* Actions footer */}
        {actionsCell && (
          <div className="border-t border-border-soft pt-3">
            <div className="flex items-center justify-end gap-2">{actionsCell.props?.children}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TableMobileView<T>({
  items,
  renderMobileCard,
  renderRow,
  columns,
  getRowKey,
  pagination,
  onPageChange,
  emptyMessage = 'Ingen resultater.',
  mobileHeaderSlot,
  mobilePrimaryAction,
  scrollable = true,
}: ServerPaginatedTableProps<T>) {
  return (
    <div className="space-y-3 md:hidden">
      {(mobileHeaderSlot || mobilePrimaryAction) && (
        <div className="rounded-lg border border-border bg-background p-3 shadow-sm">
          <div className="flex flex-col gap-2">
            {mobileHeaderSlot ? <div>{mobileHeaderSlot}</div> : null}
            {mobilePrimaryAction ? <div>{mobilePrimaryAction}</div> : null}
          </div>
        </div>
      )}

      {/* Scrollable container */}
      <div className={scrollable ? 'max-h-[600px] space-y-2 overflow-y-auto pr-0.5' : 'space-y-2'}>
        {items.length > 0 ? (
          items.map((item, index) => (
            <React.Fragment key={getRowKey(item, index)}>
              {renderMobileCard ? (
                renderMobileCard(item, index)
              ) : (
                <DefaultMobileCard item={item} index={index} renderRow={renderRow} columns={columns} />
              )}
            </React.Fragment>
          ))
        ) : (
          <Card variant="default" size="sm" className="border-border bg-background">
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface">
                  <Database className="h-7 w-7 text-text-secondary" />
                </div>
                <Text as="p" variant="body-sm" className="text-center text-text-secondary">
                  {emptyMessage}
                </Text>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {items.length > 0 && <TableMobilePagination pagination={pagination} onPageChange={onPageChange} />}
    </div>
  );
}
