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
  /** Omit to hide the rows-per-page menu and keep a fixed page size. */
  onPageSizeChange?: (size: number) => void;

  emptyMessage?: React.ReactNode;
  pageSizeOptions?: number[];
  headerSlot?: React.ReactNode;
  primaryAction?: React.ReactNode;
  mobileHeaderSlot?: React.ReactNode;
  mobilePrimaryAction?: React.ReactNode;
  /** When false, rows grow with the page instead of scrolling inside a fixed-height box. */
  scrollable?: boolean;
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
