import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '~/ui';

/**
 * The e-mail as the customer gets it: the subject first (what they see in the inbox), then the e-mail at its own
 * height, so a short e-mail has no empty space under it and a long one is read by scrolling the page or sheet.
 */
export function EmailPreview({
  subject,
  html,
  pending = false,
  action,
  framed = true,
}: {
  subject: string;
  html: string | null;
  pending?: boolean;
  /** At the end of the subject row, e.g. "Endre". */
  action?: ReactNode;
  /** A card of its own; off inside a sheet, which is already a surface. */
  framed?: boolean;
}) {
  // The subject as the customer sees it (merge fields filled in), from the rendered e-mail's <title>.
  const shownSubject = useMemo(() => (html && renderedTitle(html)) || subject.trim(), [html, subject]);

  return (
    <div className={cn('bg-background', framed && 'overflow-hidden rounded-xl border border-border')}>
      <div className="flex min-h-12 items-center gap-2 border-b border-border px-4 py-1.5">
        <span className="text-[13px] text-text-secondary">Emne</span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-text-primary">
          {shownSubject || '–'}
        </span>
        {action}
      </div>
      {html ? (
        <AutoHeightFrame html={html} />
      ) : (
        <div className="grid min-h-48 place-items-center bg-gray-100 px-6 text-center text-sm text-text-secondary">
          {pending ? 'Oppdaterer …' : 'Skriv emne og melding for å se e-posten'}
        </div>
      )}
    </div>
  );
}

function renderedTitle(html: string): string {
  if (typeof DOMParser === 'undefined') return '';
  return new DOMParser().parseFromString(html, 'text/html').title.trim();
}

/**
 * The backend's e-mail HTML in a sandboxed frame: no scripts, but the same origin, so the page can read how tall the
 * e-mail is and show all of it.
 */
function AutoHeightFrame({ html }: { html: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(360);

  const measure = useCallback(() => {
    // The body, not the document: a document is never shorter than its frame, so it could only grow.
    const body = frame.current?.contentDocument?.body;
    if (body) setHeight(Math.ceil(body.scrollHeight));
  }, []);

  // The width changes how the text wraps (phone, sheet, desktop column): measure again when it does.
  useEffect(() => {
    const element = frame.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <iframe
      ref={frame}
      title="Forhåndsvisning"
      sandbox="allow-same-origin"
      srcDoc={html}
      onLoad={measure}
      style={{ height }}
      className="block w-full border-0 bg-gray-100"
    />
  );
}
