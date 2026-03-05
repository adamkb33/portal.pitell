import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { type RouteBranch } from '~/lib/route-tree';
import { getIcon } from '~/lib/route-icon-map';
import { onSidebarLinkSelect } from './sidebar-drilldown';

type SidebarProps = {
  branches: RouteBranch[];
};

export function Sidebar({ branches }: SidebarProps) {
  const location = useLocation();
  const activeTrail = findTrail(branches, location.pathname);
  const defaultFocusedSectionId =
    [...activeTrail].reverse().find((entry) => entry.node.children && entry.node.children.length > 0)?.node.id ?? null;
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(defaultFocusedSectionId);

  useEffect(() => {
    setFocusedSectionId(defaultFocusedSectionId);
  }, [defaultFocusedSectionId]);

  if (branches.length === 0) {
    return null;
  }

  const focusedSection = focusedSectionId ? findNodeWithParent(branches, focusedSectionId) : null;
  const shouldShowFocusedSection =
    !!focusedSection &&
    !!focusedSection.node.children &&
    focusedSection.node.children.length > 0;

  return (
    <nav className="w-full bg-sidebar-bg" aria-label="Main navigation">
      {shouldShowFocusedSection ? (
        <>
          <div className="mb-3 flex items-center justify-between rounded-xl border border-sidebar-border/70 bg-sidebar-accent/10 px-2 py-2">
            <button
              type="button"
              onClick={() => setFocusedSectionId(focusedSection.parent?.id ?? null)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-sidebar-text-muted hover:bg-sidebar-accent/10 hover:text-sidebar-text focus:outline-none focus:ring-2 focus:ring-sidebar-ring"
              aria-label={`Tilbake til ${focusedSection.parent?.label || 'hovedmeny'}`}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Tilbake
            </button>
            <span className="truncate px-2 text-sm font-semibold text-sidebar-text">{focusedSection.node.label}</span>
          </div>

          <ul className="space-y-2" role="list">
            {focusedSection.node.children!.map((child) => (
              <SidebarItem
                key={child.id}
                item={child}
                currentPath={location.pathname}
                level={0}
                onEnterSection={(branch) => {
                  if (branch.children && branch.children.length > 0) {
                    setFocusedSectionId(branch.id);
                  }
                }}
              />
            ))}
          </ul>
        </>
      ) : (
        <ul className="space-y-2" role="list">
          {branches.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              currentPath={location.pathname}
              level={0}
              onEnterSection={(branch) => {
                if (branch.children && branch.children.length > 0) {
                  setFocusedSectionId(branch.id);
                }
              }}
            />
          ))}
        </ul>
      )}
    </nav>
  );
}

type SidebarItemProps = {
  item: RouteBranch;
  currentPath: string;
  level: number;
  onEnterSection?: (branch: RouteBranch, level: number) => void;
};

function SidebarItem({ item, currentPath, level, onEnterSection }: SidebarItemProps) {
  const Icon = item.iconName ? getIcon(item.iconName) : undefined;
  const hasChildren = item.children && item.children.length > 0;
  const isActive = currentPath === item.href;
  const isInActiveTrail = currentPath.startsWith(item.href);
  const shouldDefaultOpen = level === 0 || isInActiveTrail;
  const [isExpanded, setIsExpanded] = useState(shouldDefaultOpen);

  useEffect(() => {
    if (isInActiveTrail) {
      setIsExpanded(true);
    }
  }, [isInActiveTrail]);

  const iconVisible = level <= 1 && Icon;
  const showToggle = hasChildren && level >= 1;
  const itemTone = getItemTone({ level, isActive, isInActiveTrail });
  const childContainerClass =
    level === 0
      ? 'mt-2 space-y-1.5'
      : 'mt-1.5 space-y-1 border-l border-sidebar-border/50 pl-2 ml-2.5';

  return (
    <li role="listitem" className={level === 0 ? 'rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/5 p-2' : ''}>
      <div className="relative">
        <div
          className={[
            'group flex items-center gap-2 rounded-xl transition-all duration-200',
            level === 0 ? 'min-h-[52px] bg-sidebar-accent/10 px-2 py-2' : level >= 2 ? 'min-h-[36px]' : 'min-h-[44px]',
            level >= 2 ? 'px-1' : '',
            itemTone.container,
          ].join(' ')}
        >
          <Link
            to={item.href}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => {
              onSidebarLinkSelect({
                item,
                level,
                onEnterSection,
              });
            }}
            className={[
              'flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm leading-tight',
              level >= 2 ? 'gap-2 px-2 py-1.5 text-xs leading-snug' : '',
              'focus:outline-none focus:ring-2 focus:ring-sidebar-ring focus:ring-inset',
              level === 0 ? 'font-semibold' : isActive ? 'font-semibold' : 'font-medium',
              itemTone.link,
            ].join(' ')}
          >
            {iconVisible ? (
              <span
                className={[
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200',
                  itemTone.iconWrap,
                ].join(' ')}
                aria-hidden="true"
              >
                <Icon className={['h-4.5 w-4.5', itemTone.icon].join(' ')} />
              </span>
            ) : (
              level >= 2 && (
                <span className={['mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center', itemTone.bulletWrap].join(' ')} aria-hidden="true">
                  {isExpanded && hasChildren ? (
                    <ChevronDown className={['h-3.5 w-3.5', itemTone.bulletIcon].join(' ')} />
                  ) : hasChildren ? (
                    <ChevronRight className={['h-3.5 w-3.5', itemTone.bulletIcon].join(' ')} />
                  ) : (
                    <span className={['h-px w-2 rounded-full', itemTone.bullet].join(' ')} />
                  )}
                </span>
              )
            )}

            <span className="truncate">{item.label}</span>
          </Link>

          {showToggle && (
            <button
              type="button"
              onClick={() => setIsExpanded((value) => !value)}
              aria-label={isExpanded ? `Skjul ${item.label}` : `Vis ${item.label}`}
              aria-expanded={isExpanded}
              className={[
                'mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-sidebar-ring',
                itemTone.toggle,
              ].join(' ')}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {hasChildren && (level === 0 || isExpanded) && (
        <ul className={childContainerClass} role="list" aria-label={`${item.label} undermeny`}>
          {item.children!.map((child) => (
            <SidebarItem
              key={child.id}
              item={child}
              currentPath={currentPath}
              level={level + 1}
              onEnterSection={onEnterSection}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

type TrailEntry = { node: RouteBranch; level: number };

function findTrail(branches: RouteBranch[], path: string, level = 0, currentTrail: TrailEntry[] = []): TrailEntry[] {
  for (const branch of branches) {
    const nextTrail = [...currentTrail, { node: branch, level }];

    if (path === branch.href) {
      return nextTrail;
    }

    if (branch.children?.length) {
      const childTrail = findTrail(branch.children, path, level + 1, nextTrail);
      if (childTrail.length) {
        return childTrail;
      }
    }
  }

  return [];
}

function findNodeWithParent(
  branches: RouteBranch[],
  targetId: string,
  parent: RouteBranch | null = null,
  level = 0,
): { node: RouteBranch; parent: RouteBranch | null; level: number } | null {
  for (const branch of branches) {
    if (branch.id === targetId) {
      return { node: branch, parent, level };
    }
    if (branch.children?.length) {
      const found = findNodeWithParent(branch.children, targetId, branch, level + 1);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function getItemTone({
  level,
  isActive,
  isInActiveTrail,
}: {
  level: number;
  isActive: boolean;
  isInActiveTrail: boolean;
}) {
  if (isActive) {
    return {
      container: level === 0 ? 'shadow-sm' : '',
      link: 'bg-sidebar-accent text-sidebar-accent-foreground',
      iconWrap: 'border-sidebar-accent/40 bg-sidebar-accent-foreground/10',
      icon: 'text-sidebar-accent-foreground',
      bulletWrap: 'text-sidebar-accent-foreground',
      bulletIcon: 'text-sidebar-accent-foreground',
      bullet: 'bg-sidebar-accent',
      toggle: 'border-sidebar-accent/30 bg-sidebar-accent/20 text-sidebar-accent-foreground hover:bg-sidebar-accent/30',
    };
  }

  if (isInActiveTrail) {
    return {
      container: '',
      link: 'bg-sidebar-accent/10 text-sidebar-text hover:bg-sidebar-accent/15',
      iconWrap: 'border-sidebar-border bg-sidebar-accent/10',
      icon: 'text-sidebar-text',
      bulletWrap: 'text-sidebar-text',
      bulletIcon: 'text-sidebar-text',
      bullet: 'bg-sidebar-text',
      toggle: 'border-sidebar-border bg-sidebar-accent/5 text-sidebar-text hover:bg-sidebar-accent/15',
    };
  }

  return {
    container: '',
    link:
      level >= 2
        ? 'text-sidebar-text-muted hover:bg-transparent hover:text-sidebar-text'
        : 'text-sidebar-text-muted hover:bg-sidebar-accent/10 hover:text-sidebar-text',
    iconWrap: 'border-sidebar-border/70 bg-sidebar-bg',
    icon: 'text-sidebar-text-muted group-hover:text-sidebar-text',
    bulletWrap: 'text-sidebar-text-muted/80',
    bulletIcon: 'text-sidebar-text-muted/80',
    bullet: 'bg-sidebar-text-muted/60',
    toggle:
      level >= 2
        ? 'border-transparent bg-transparent text-sidebar-text-muted hover:bg-sidebar-accent/10 hover:text-sidebar-text'
        : 'border-sidebar-border/70 bg-sidebar-bg text-sidebar-text-muted hover:bg-sidebar-accent/10 hover:text-sidebar-text',
  };
}
