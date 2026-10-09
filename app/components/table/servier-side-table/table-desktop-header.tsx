// components/table/table-desktop-header.tsx
import * as React from 'react';
import { Rows3 } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '~/ui';

type TableDesktopHeaderProps = {
  pagination: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions: number[];
  headerSlot?: React.ReactNode;
  primaryAction?: React.ReactNode;
};

export function TableDesktopHeader({
  pagination,
  onPageSizeChange,
  pageSizeOptions,
  headerSlot,
  primaryAction,
}: TableDesktopHeaderProps) {
  const { page, size, totalElements } = pagination;
  const startIndex = page * size + 1;
  const endIndex = Math.min((page + 1) * size, totalElements);

  return (
    <div className="border-b border-border-soft bg-background p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-border bg-surface">
            <Rows3 className="h-4 w-4 text-text-secondary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {totalElements ? startIndex : 0}–{endIndex} av {totalElements}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-disabled">Viser resultater</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4 md:flex-1">
          {headerSlot ? (
            <div className="flex w-full items-center gap-2 md:flex-1">{headerSlot}</div>
          ) : (
            <div className="md:flex-1" />
          )}
          {primaryAction ? <div className="flex items-center md:shrink-0">{primaryAction}</div> : null}

          {onPageSizeChange ? (
            <div className="flex items-center gap-3 md:shrink-0">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-text-disabled">
                Rader per side
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="min-w-[100px] justify-between">
                    {size} rader
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup
                    value={String(size)}
                    onValueChange={(value) => onPageSizeChange(Number(value))}
                  >
                    {pageSizeOptions.map((opt) => (
                      <DropdownMenuRadioItem key={opt} value={String(opt)}>
                        {opt} rader
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
