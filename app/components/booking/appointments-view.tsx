import { useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router';
import { BookingScrollHint } from '~/routes/booking/public/appointment/_components/booking-layout';

export function AppointmentsView() {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [offsetFromTop, setOffsetFromTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateMeasurements = () => {
      setViewportHeight(window.innerHeight);

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const offsetTop = rect.top + scrollTop;

        setOffsetFromTop(offsetTop);
      }
    };

    updateMeasurements();
    window.addEventListener('resize', updateMeasurements);
    window.addEventListener('scroll', updateMeasurements);

    return () => {
      window.removeEventListener('resize', updateMeasurements);
      window.removeEventListener('scroll', updateMeasurements);
    };
  }, []);

  const componentHeight = Math.max(0, viewportHeight - offsetFromTop);

  return (
    <div
      ref={containerRef}
      className="relative flex h-screen flex-col overflow-hidden bg-background"
      style={componentHeight ? { height: `${componentHeight}px` } : undefined}
    >
      <main ref={scrollRef} className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <BookingScrollHint containerRef={scrollRef} className="md:hidden" />
      <div id="booking-mobile-footer" ref={footerRef} className="flex-shrink-0" />
    </div>
  );
}
