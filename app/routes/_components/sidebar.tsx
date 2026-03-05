import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { type RouteBranch } from '~/lib/route-tree';
import { getIcon } from '~/lib/route-icon-map';

type SidebarProps = {
  branches: RouteBranch[];
};

export function Sidebar({ branches }: SidebarProps) {
  const location = useLocation();

  if (branches.length === 0) {
    return null;
  }

  return (
    <nav className="w-full bg-sidebar-bg" aria-label="Main navigation">
      <ul className="space-y-2" role="list">
        {branches.map((item) => (
          <SidebarItem key={item.id} item={item} currentPath={location.pathname} level={0} />
        ))}
      </ul>
    </nav>
  );
}

type SidebarItemProps = {
  item: RouteBranch;
  currentPath: string;
  level: number;
};

function SidebarItem({ item, currentPath, level }: SidebarItemProps) {
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
      : 'mt-1.5 space-y-1 border-l border-sidebar-border/50 pl-3 ml-4';

  return (
    <li role="listitem" className={level === 0 ? 'rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/5 p-2' : ''}>
      <div className="relative">
        <div
          className={[
            'group flex items-center gap-2 rounded-xl transition-all duration-200',
            level === 0 ? 'min-h-[52px] bg-sidebar-accent/10 px-2 py-2' : 'min-h-[44px]',
            level >= 2 ? 'px-1' : '',
            itemTone.container,
          ].join(' ')}
        >
          <Link
            to={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={[
              'flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-sm leading-tight',
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
                    <span className={['h-2 w-2 rounded-full', itemTone.bullet].join(' ')} />
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
            <SidebarItem key={child.id} item={child} currentPath={currentPath} level={level + 1} />
          ))}
        </ul>
      )}
    </li>
  );
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
