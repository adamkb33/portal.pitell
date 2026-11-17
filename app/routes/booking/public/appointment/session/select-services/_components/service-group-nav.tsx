import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { List } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger, cn } from '~/ui';
import { serviceGroupTitleId } from './use-service-group-scroll';

export type ServiceGroupNavItem = {
  id: number;
  name: string;
  serviceCount: number;
  /** How many services the customer has chosen in the group (quantities included). */
  selectedCount: number;
};

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-booking-action-text focus-visible:ring-offset-1';

const chipClass =
  'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border-[length:var(--border-booking-control)] px-4 text-sm font-medium transition-colors';

function chipStateClass(active: boolean) {
  return active
    ? 'border-booking-action bg-booking-action text-booking-action-contrast'
    : 'border-booking-border-strong bg-booking-surface-raised text-booking-text hover:bg-booking-action-muted';
}

/** The number of chosen services in a group: action colour on a plain chip or row, inverted on a filled chip. */
function SelectedCount({ count, inverted = false }: { count: number; inverted?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className={cn(
        'rounded-full px-1.5 text-xs font-semibold tabular-nums',
        inverted ? 'bg-booking-action-contrast text-booking-action' : 'bg-booking-action text-booking-action-contrast',
      )}
    >
      <span className="sr-only">, </span>
      {count}
      <span className="sr-only"> valgt</span>
    </span>
  );
}

type ServiceGroupChipsProps = {
  groups: ServiceGroupNavItem[];
  activeId: number | null;
  stuck: boolean;
  onSelect: (groupId: number) => void;
  barRef: RefObject<HTMLDivElement | null>;
  scrollBehavior: () => ScrollBehavior;
};

/**
 * Phones and tablets: one chip per group, stuck under the app header; tapping one jumps to the group and the group in
 * view is filled. When the chips don't fit on one line, "Grupper" comes first and opens a sheet with every group.
 */
export function ServiceGroupChips({
  groups,
  activeId,
  stuck,
  onSelect,
  barRef,
  scrollBehavior,
}: ServiceGroupChipsProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const pendingGroup = useRef<number | null>(null);

  // Measured against the whole row, so showing "Grupper" (which narrows the chips' room) can't flip the answer back.
  useLayoutEffect(() => {
    const row = rowRef.current;
    const chips = chipsRef.current;
    if (!row || !chips) return;
    const update = () => setOverflows(chips.offsetWidth > row.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(row);
    observer.observe(chips);
    return () => observer.disconnect();
  }, [groups]);

  // Keep the active chip in sight when the page scrolls to another group.
  useEffect(() => {
    const scroller = scrollerRef.current;
    const chip = scroller?.querySelector<HTMLElement>(`[data-group-id="${activeId}"]`);
    if (!scroller || !chip) return;
    const hiddenLeft = chip.offsetLeft < scroller.scrollLeft;
    const hiddenRight = chip.offsetLeft + chip.offsetWidth > scroller.scrollLeft + scroller.clientWidth;
    if (hiddenLeft || hiddenRight) {
      scroller.scrollTo({ left: chip.offsetLeft - 12, behavior: scrollBehavior() });
    }
  }, [activeId, overflows, scrollBehavior]);

  return (
    <div
      ref={barRef}
      className={cn(
        'sticky top-[var(--app-header-height)] z-[5] -mx-3 border-b px-3 py-2 transition-colors sm:-mx-4 sm:px-4 lg:hidden',
        stuck
          ? 'border-booking-border bg-booking-surface-raised/95 backdrop-blur-sm'
          : 'border-transparent bg-transparent',
      )}
    >
      <nav aria-label="Grupper">
        {/* "Grupper" stays put at the left; only the group chips scroll sideways. */}
        <div ref={rowRef} className="flex gap-2">
          {overflows ? (
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <button type="button" className={cn(chipClass, chipStateClass(false), focusRing)}>
                  <List className="size-4" aria-hidden />
                  Grupper
                </button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                showCloseButton={false}
                className="max-h-[85vh] gap-0 overflow-y-auto rounded-t-2xl border-booking-border bg-booking-surface-raised p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-booking-text"
                onCloseAutoFocus={(event) => {
                  const groupId = pendingGroup.current;
                  if (groupId === null) return;
                  pendingGroup.current = null;
                  // Focus the group's heading instead of the trigger, then scroll once the sheet has let go of the page.
                  event.preventDefault();
                  document.getElementById(serviceGroupTitleId(groupId))?.focus({ preventScroll: true });
                  window.setTimeout(() => onSelect(groupId), 0);
                }}
              >
                <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-booking-border" aria-hidden />
                <SheetTitle className="mb-2 text-lg font-semibold text-booking-text">Grupper</SheetTitle>
                <SheetDescription className="sr-only">Gå til en gruppe med tjenester</SheetDescription>
                <ul className="divide-y divide-booking-border">
                  {groups.map((group) => (
                    <li key={group.id}>
                      <GroupRow
                        group={group}
                        active={group.id === activeId}
                        onClick={() => {
                          pendingGroup.current = group.id;
                          setSheetOpen(false);
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </SheetContent>
            </Sheet>
          ) : null}

          <div
            ref={scrollerRef}
            className="relative min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div ref={chipsRef} className="flex w-max shrink-0 gap-2">
              {groups.map((group) => {
                const active = group.id === activeId;
                return (
                  <button
                    key={group.id}
                    type="button"
                    data-group-id={group.id}
                    aria-current={active ? 'true' : undefined}
                    onClick={() => onSelect(group.id)}
                    className={cn(chipClass, chipStateClass(active), focusRing)}
                  >
                    {group.name}
                    <SelectedCount count={group.selectedCount} inverted={active} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}

function GroupRow({ group, active, onClick }: { group: ServiceGroupNavItem; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-current={active ? 'true' : undefined}
      onClick={onClick}
      className={cn(
        'flex min-h-12 w-full items-center gap-2 px-3 text-left text-booking-text transition-colors hover:bg-booking-action-muted',
        active ? 'bg-booking-action-muted font-semibold' : 'font-medium',
        focusRing,
      )}
    >
      <span className="min-w-0 truncate">{group.name}</span>
      <SelectedCount count={group.selectedCount} />
      <span className="ml-auto text-sm font-normal tabular-nums text-booking-text-muted">
        <span className="sr-only">, </span>
        {group.serviceCount}
        <span className="sr-only">{group.serviceCount === 1 ? ' tjeneste' : ' tjenester'}</span>
      </span>
    </button>
  );
}

/** Desktop: every group in a card that stays in view on the left while the services scroll. */
export function ServiceGroupList({
  groups,
  activeId,
  onSelect,
}: {
  groups: ServiceGroupNavItem[];
  activeId: number | null;
  onSelect: (groupId: number) => void;
}) {
  return (
    <nav
      aria-label="Grupper"
      className="sticky top-[calc(var(--app-header-height)+1.5rem)] hidden overflow-hidden rounded-[var(--radius-booking-panel)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-surface-raised lg:block"
    >
      <ul className="divide-y divide-booking-border">
        {groups.map((group) => (
          <li key={group.id}>
            <GroupRow group={group} active={group.id === activeId} onClick={() => onSelect(group.id)} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
