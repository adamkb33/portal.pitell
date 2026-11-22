import type { ComponentType } from 'react';
import { useLocation } from 'react-router';
import { ROUTES_MAP } from '~/lib/routing/route-tree';
import { SegmentedLinks } from '~/ui';

export type AreaPage = {
  routeId: string;
  label: string;
  icon?: ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>;
};

/**
 * The switch between the two pages of one area (ui-rules → Areas, switches and colors), e.g. Kalender |
 * Timebestillinger. Every area in every domain uses this, so they look and behave the same.
 */
export function AreaSwitch({ label, pages, className }: { label: string; pages: AreaPage[]; className?: string }) {
  const { pathname } = useLocation();
  const matches = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  // When one page's address holds the other's (E-post and E-post/mottakere), the closest match is the one shown.
  const activeHref = pages
    .map(({ routeId }) => ROUTES_MAP[routeId].href)
    .filter(matches)
    .sort((a, b) => b.length - a.length)[0];

  return (
    <SegmentedLinks
      label={label}
      className={className}
      items={pages.map(({ routeId, label: pageLabel, icon }) => {
        const href = ROUTES_MAP[routeId].href;
        return {
          key: routeId,
          label: pageLabel,
          to: href,
          icon,
          active: href === activeHref,
        };
      })}
    />
  );
}
