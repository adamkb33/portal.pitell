// components/table/server-paginated-table.tsx
import * as React from 'react';
import { TableDesktopView } from './table-desktop-view';
import { TableMobileView } from './table-mobile-view';

type Column = {
  header: React.ReactNode;
  className?: string;
};

export type ServerPaginatedTableProps<T> = {
  items: T[];
  columns: Column[];
  renderRow: (item: T, index: number) => React.ReactElement;
  renderMobileCard?: (item: T, index: number) => React.ReactElement;
  getRowKey: (item: T, index: number) => React.Key;

  pagination: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };

  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  emptyMessage?: React.ReactNode;
  pageSizeOptions?: number[];
  headerSlot?: React.ReactNode;
  mobileHeaderSlot?: React.ReactNode;
  className?: string;
};

export function ServerPaginatedTable<T>(props: ServerPaginatedTableProps<T>) {
  return (
    <>
      <TableDesktopView {...props} />
      <TableMobileView {...props} />
    </>
  );
}
