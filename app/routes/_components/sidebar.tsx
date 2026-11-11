import * as React from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronsUpDown } from 'lucide-react';
import { cn } from '~/ui';
import { ROUTES_MAP, type RouteBranch } from '~/lib/routing/route-tree';
import { getIcon } from '~/lib/routing/route-icon-map';
import PTLLogo from '~/components/logos/PTL.logo';

export type SidebarWorkspace = {
  name: string;
  subtitle?: string;
  canSwitchCompany: boolean;
};

type SidebarProps = {
  branches: RouteBranch[];
  workspace?: SidebarWorkspace | null;
  onNavigate?: () => void;
  /** Rendered under the company switcher; the phone drawer puts the account here. */
  account?: React.ReactNode;
};

type SidebarSectionModel = {
  id: string;
  label: string;
  overview?: RouteBranch;
  items: RouteBranch[];
};

export function Sidebar({ branches, workspace, onNavigate, account }: SidebarProps) {
  const location = useLocation();
  const sections = React.useMemo(() => buildSections(branches), [branches]);

  if (sections.length === 0) return null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <SidebarBrand onNavigate={onNavigate} />
      {/* The company you're in sits at the top, the account at the bottom (switching ≠ your profile). */}
      {workspace ? <SidebarCompany workspace={workspace} onNavigate={onNavigate} /> : null}

      <nav className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto" aria-label="Hovednavigasjon">
        {sections.map((section) => (
          <SidebarSection key={section.id} section={section} pathname={location.pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      {account ? <div className="pt-3 lg:border-t lg:border-chrome-border">{account}</div> : null}
    </div>
  );
}

function SidebarBrand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      to="/"
      onClick={onNavigate}
      className="flex w-fit items-center rounded-[var(--radius-control)] py-1 pl-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chrome-accent"
    >
      <PTLLogo size="md" onDark />
    </Link>
  );
}

function SidebarSection({
  section,
  pathname,
  onNavigate,
}: {
  section: SidebarSectionModel;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <ul className="flex flex-col gap-0.5" role="list">
        {section.overview ? (
          <li role="listitem">
            <SidebarLeaf branch={section.overview} pathname={pathname} onNavigate={onNavigate} />
          </li>
        ) : null}
        {section.items.map((item) => (
          <li key={item.id} role="listitem">
            <SidebarLeaf branch={item} pathname={pathname} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </div>
  );
}

const navLinkBase =
  'group flex min-h-11 items-center gap-3 rounded-[10px] px-2 py-1.5 text-[15px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-chrome-accent lg:min-h-10';

/**
 * Each top-level section keeps its category color (page-sketch → Color by category): the same teal Booking has on its
 * own page. On navy the tile is the color at low strength with a light icon; the active page gets a stronger tile.
 */
const SECTION_TONES: Record<string, { tile: string; active: string }> = {
  'company.booking': {
    tile: 'bg-category-teal/20 text-[color-mix(in_oklab,var(--color-category-teal)_55%,white)]',
    active: 'bg-category-teal/45 text-chrome-text',
  },
  'company.timesheet': {
    tile: 'bg-category-purple/20 text-[color-mix(in_oklab,var(--color-category-purple)_50%,white)]',
    active: 'bg-category-purple/45 text-chrome-text',
  },
  'company.marketing': {
    tile: 'bg-category-pink/20 text-[color-mix(in_oklab,var(--color-category-pink)_50%,white)]',
    active: 'bg-category-pink/45 text-chrome-text',
  },
  'company.offer': {
    tile: 'bg-category-orange/20 text-[color-mix(in_oklab,var(--color-category-orange)_55%,white)]',
    active: 'bg-category-orange/45 text-chrome-text',
  },
};
const NEUTRAL_TONE = {
  tile: 'bg-chrome-raised/70 text-chrome-text-muted',
  active: 'bg-chrome-raised text-chrome-text',
};

function isActive(href: string, pathname: string) {
  return pathname === href;
}
function inTrail(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLeaf({
  branch,
  pathname,
  onNavigate,
}: {
  branch: RouteBranch;
  pathname: string;
  onNavigate?: () => void;
}) {
  const LucideIcon = getIcon(branch.iconName);
  const active = branch.id.endsWith('.overview') ? isActive(branch.href, pathname) : inTrail(branch.href, pathname);
  const tone = SECTION_TONES[branch.id] ?? NEUTRAL_TONE;

  return (
    <Link
      to={branch.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        navLinkBase,
        active
          ? 'bg-chrome-active font-semibold text-chrome-text'
          : 'text-chrome-text-muted hover:bg-chrome-hover hover:text-chrome-text',
      )}
    >
      <span
        aria-hidden
        className={cn('grid size-[30px] shrink-0 place-items-center rounded-[9px]', active ? tone.active : tone.tile)}
      >
        {LucideIcon ? <LucideIcon className="size-[17px]" strokeWidth={1.75} /> : null}
      </span>
      <span className="min-w-0 flex-1 truncate">{branch.label ?? branch.id}</span>
    </Link>
  );
}

function SidebarCompany({ workspace, onNavigate }: { workspace: SidebarWorkspace; onNavigate?: () => void }) {
  const content = (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute -top-11 -right-6 size-[90px] rounded-full bg-on-brand-decoration"
      />
      <span className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-on-brand text-xs font-bold text-interactive">
        {getInitials(workspace.name)}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate font-display text-sm font-semibold">{workspace.name}</span>
        {workspace.subtitle ? (
          <span className="block truncate text-xs text-on-brand-muted">{workspace.subtitle}</span>
        ) : null}
      </span>
    </>
  );
  const cardClassName =
    'relative flex w-full items-center gap-2.5 overflow-hidden rounded-[14px] bg-interactive p-3 text-left text-on-brand';

  if (!workspace.canSwitchCompany) {
    return <div className={cardClassName}>{content}</div>;
  }

  return (
    <Link
      to={ROUTES_MAP['user.company-context'].href}
      aria-label={`Bytt selskap, nå ${workspace.name}`}
      onClick={onNavigate}
      className={cn(
        cardClassName,
        'transition-colors hover:bg-interactive-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-chrome-accent focus-visible:ring-offset-2 focus-visible:ring-offset-chrome',
      )}
    >
      {content}
      <ChevronsUpDown className="relative size-4 shrink-0 text-on-brand-muted" aria-hidden />
    </Link>
  );
}

function getInitials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

function filterVisibleBranches(branches: RouteBranch[]): RouteBranch[] {
  return branches
    .filter((branch) => !branch.hidden)
    .map((branch) => ({
      ...branch,
      children: branch.children ? filterVisibleBranches(branch.children) : undefined,
    }));
}

export function buildSections(branches: RouteBranch[]): SidebarSectionModel[] {
  const sections: SidebarSectionModel[] = [];

  for (const branch of filterVisibleBranches(branches)) {
    const children =
      branch.id === 'company'
        ? ['company.booking', 'company.offer', 'company.timesheet', 'company.marketing', 'company.admin'].flatMap(
            (id) => (branch.children ?? []).filter((child) => child.id === id),
          )
        : (branch.children ?? []);

    if (children.length === 0) {
      sections.push({
        id: branch.id,
        label: branch.label ?? branch.id,
        items: [branch],
      });
      continue;
    }

    sections.push({
      id: branch.id,
      label: branch.label ?? branch.id,
      overview: {
        ...branch,
        id: `${branch.id}.overview`,
        label: 'Oversikt',
        children: undefined,
      },
      items: children,
    });
  }

  return sections;
}
