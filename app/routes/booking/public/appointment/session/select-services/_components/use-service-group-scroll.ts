import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export const serviceGroupSectionId = (groupId: number) => `service-group-${groupId}`;
export const serviceGroupTitleId = (groupId: number) => `service-group-${groupId}-title`;

/** The app header's height in px (`--app-header-height`), which sticky things sit under. */
function appHeaderHeight() {
  const root = document.documentElement;
  const value = getComputedStyle(root).getPropertyValue('--app-header-height').trim();
  const rootFontSize = parseFloat(getComputedStyle(root).fontSize) || 16;
  return value.endsWith('rem') ? parseFloat(value) * rootFontSize : parseFloat(value) || 0;
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/**
 * Which service group is in view, for the group chips (phones) and the group list (desktop).
 * `chipsRef` is the sticky chip bar: groups count as "in view" once they reach its bottom edge (or the app header
 * when the chips are hidden), and it tells whether the bar is stuck under the header.
 */
export function useServiceGroupScroll(groupIds: number[], chipsRef: RefObject<HTMLElement | null>) {
  const [activeId, setActiveId] = useState<number | null>(groupIds[0] ?? null);
  const [stuck, setStuck] = useState(false);
  // After a jump, keep the chosen group active while the smooth scroll passes the groups in between.
  const lockedUntil = useRef(0);
  const groupKey = groupIds.join(',');

  useEffect(() => {
    const ids = groupKey ? groupKey.split(',').map(Number) : [];
    setActiveId(ids[0] ?? null);
    if (ids.length < 2) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const headerHeight = appHeaderHeight();
      const chips = chipsRef.current;
      const chipsShown = Boolean(chips && chips.offsetParent !== null);
      setStuck(chipsShown && window.scrollY > 0 && chips!.getBoundingClientRect().top <= headerHeight + 1);

      if (Date.now() < lockedUntil.current) return;

      const line = (chipsShown ? chips!.getBoundingClientRect().bottom : headerHeight) + 24;
      let current = ids[0];
      for (const id of ids) {
        const section = document.getElementById(serviceGroupSectionId(id));
        if (section && section.getBoundingClientRect().top <= line) current = id;
      }
      // The last groups may be too short to ever reach the line; at the bottom of the page the last one is in view.
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (window.scrollY > 0 && atBottom) current = ids[ids.length - 1];
      setActiveId(current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [groupKey, chipsRef]);

  /** Scrolls the group to the top (under the sticky chips) and marks it active right away. */
  const goToGroup = useCallback((groupId: number) => {
    const section = document.getElementById(serviceGroupSectionId(groupId));
    if (!section) return;
    lockedUntil.current = Date.now() + 1000;
    setActiveId(groupId);
    section.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
  }, []);

  return { activeId, stuck, goToGroup, scrollBehavior };
}
