import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { type RouteBranch } from '~/lib/route-tree';
import { getIcon } from '~/lib/route-icon-map';

type MobileSidebarProps = {
  branches: RouteBranch[];
  isOpen: boolean;
  onClose: () => void;
};

export function MobileSidebar({ branches, isOpen, onClose }: MobileSidebarProps) {
  const location = useLocation();

  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (branches.length === 0 || !isOpen) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className="fixed inset-y-0 left-0 w-[85vw] max-w-sm border-r border-sidebar-border bg-sidebar-bg z-50 lg:hidden shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3 bg-sidebar-accent/20">
          <span className="text-sm font-semibold text-sidebar-text-muted">Meny</span>

          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded border border-sidebar-border text-sidebar-text hover:bg-sidebar-accent hover:text-sidebar-text active:scale-95 focus:outline-none focus:ring-2 focus:ring-sidebar-ring transition-all duration-200"
            aria-label="Lukk meny"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="overflow-y-auto h-[calc(100vh-3.75rem)] overscroll-contain">
          <ul className="p-3 space-y-2" role="list">
            {branches.map((item) => (
              <MobileSidebarItem
                key={item.id}
                item={item}
                currentPath={location.pathname}
                onNavigate={onClose}
                level={0}
              />
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}

type MobileSidebarItemProps = {
  item: RouteBranch;
  currentPath: string;
  level: number;
  onNavigate: () => void;
};

function MobileSidebarItem({ item, currentPath, level, onNavigate }: MobileSidebarItemProps) {
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
      <div
        className={[
          'group flex items-center gap-2 rounded-xl transition-all duration-200',
          level === 0 ? 'min-h-[54px] bg-sidebar-accent/10 px-2 py-2' : level >= 2 ? 'min-h-[40px]' : 'min-h-[48px]',
          level >= 2 ? 'px-1' : '',
          itemTone.container,
        ].join(' ')}
      >
        <Link
          to={item.href}
          onClick={onNavigate}
          aria-current={isActive ? 'page' : undefined}
          className={[
            'flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-3 text-sm leading-tight',
            level >= 2 ? 'gap-2 px-2 py-2 text-xs leading-snug' : '',
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
              'mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-sidebar-ring',
              itemTone.toggle,
            ].join(' ')}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
      </div>

      {hasChildren && (level === 0 || isExpanded) && (
        <ul className={childContainerClass} role="list" aria-label={`${item.label} undermeny`}>
          {item.children!.map((child) => (
            <MobileSidebarItem
              key={child.id}
              item={child}
              currentPath={currentPath}
              level={level + 1}
              onNavigate={onNavigate}
            />
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
