import { useLocation } from 'react-router';
import { ROUTES_MAP } from '~/lib/routing/route-tree';

/**
 * Quiet shapes behind a page, one look per area. Each area's layout renders its own;
 * the root layout's page area is `relative isolate`, so they sit behind the content.
 */
function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {children}
    </div>
  );
}

export type SectionCategory = 'teal' | 'orange' | 'purple' | 'pink';

// From the route map, so a renamed URL can't silently drop a domain's colour (they once drifted: /company/offers).
const SECTION_CATEGORIES: Array<[prefix: string, category: SectionCategory]> = [
  [ROUTES_MAP['company.booking'].href, 'teal'],
  [ROUTES_MAP['company.offer'].href, 'orange'],
  [ROUTES_MAP['company.timesheet'].href, 'purple'],
  [ROUTES_MAP['company.marketing'].href, 'pink'],
];

/** The category colour of the domain (section) the page belongs to, or null outside a domain (Oversikt, Administrasjon). */
export function sectionCategory(pathname: string): SectionCategory | null {
  return SECTION_CATEGORIES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? null;
}

export function sectionColor(pathname: string): string {
  const category = sectionCategory(pathname);
  return category ? `var(--color-category-${category})` : 'var(--color-interactive)';
}

const companyTopRightPaths = [
  'M0 486.7C-61.6 479.1 -123.1 471.4 -186.3 449.7C-249.4 428 -314.1 392.1 -337.3 337.3C-360.5 282.5 -342.3 208.6 -360.3 149.2C-378.3 89.9 -432.5 44.9 -486.7 0L0 0Z',
  'M0 425.9C-53.9 419.2 -107.8 412.5 -163 393.5C-218.2 374.5 -274.8 343.1 -295.1 295.1C-315.5 247.2 -299.5 182.5 -315.3 130.6C-331 78.6 -378.5 39.3 -425.9 0L0 0Z',
  'M0 365.1C-46.2 359.3 -92.4 353.6 -139.7 337.3C-187 321 -235.5 294.1 -253 253C-270.4 211.8 -256.7 156.5 -270.2 111.9C-283.7 67.4 -324.4 33.7 -365.1 0L0 0Z',
  'M0 304.2C-38.5 299.4 -77 294.7 -116.4 281.1C-155.9 267.5 -196.3 245.1 -210.8 210.8C-225.3 176.5 -213.9 130.4 -225.2 93.3C-236.4 56.2 -270.3 28.1 -304.2 0L0 0Z',
  'M0 243.4C-30.8 239.5 -61.6 235.7 -93.1 224.8C-124.7 214 -157 196.1 -168.6 168.6C-180.3 141.2 -171.2 104.3 -180.2 74.6C-189.2 44.9 -216.3 22.5 -243.4 0L0 0Z',
  'M0 182.5C-23.1 179.7 -46.2 176.8 -69.9 168.6C-93.5 160.5 -117.8 147 -126.5 126.5C-135.2 105.9 -128.4 78.2 -135.1 56C-141.9 33.7 -162.2 16.8 -182.5 0L0 0Z',
  'M0 121.7C-15.4 119.8 -30.8 117.9 -46.6 112.4C-62.3 107 -78.5 98 -84.3 84.3C-90.1 70.6 -85.6 52.2 -90.1 37.3C-94.6 22.5 -108.1 11.2 -121.7 0L0 0Z',
  'M0 60.8C-7.7 59.9 -15.4 58.9 -23.3 56.2C-31.2 53.5 -39.3 49 -42.2 42.2C-45.1 35.3 -42.8 26.1 -45 18.7C-47.3 11.2 -54.1 5.6 -60.8 0L0 0Z',
];

const companyBottomLeftPaths = [
  'M0 -486.7C43.5 -435.5 87.1 -384.2 153.1 -369.6C219.1 -354.9 307.6 -376.9 344.2 -344.2C380.8 -311.5 365.5 -224.1 380.6 -157.7C395.8 -91.2 441.3 -45.6 486.7 0L0 0Z',
  'M0 -425.9C38.1 -381 76.2 -336.2 133.9 -323.4C191.7 -310.5 269.1 -329.8 301.2 -301.2C333.2 -272.6 319.8 -196.1 333.1 -138C346.3 -79.8 386.1 -39.9 425.9 0L0 0Z',
  'M0 -365.1C32.6 -326.6 65.3 -288.2 114.8 -277.2C164.3 -266.2 230.7 -282.7 258.1 -258.1C285.6 -233.6 274.1 -168.1 285.5 -118.2C296.8 -68.4 330.9 -34.2 365.1 0L0 0Z',
  'M0 -304.2C27.2 -272.2 54.4 -240.1 95.7 -231C136.9 -221.8 192.2 -235.5 215.1 -215.1C238 -194.7 228.5 -140.1 237.9 -98.5C247.3 -57 275.8 -28.5 304.2 0L0 0Z',
  'M0 -243.4C21.8 -217.7 43.5 -192.1 76.5 -184.8C109.5 -177.5 153.8 -188.4 172.1 -172.1C190.4 -155.7 182.8 -112.1 190.3 -78.8C197.9 -45.6 220.6 -22.8 243.4 0L0 0Z',
  'M0 -182.5C16.3 -163.3 32.6 -144.1 57.4 -138.6C82.2 -133.1 115.3 -141.3 129.1 -129.1C142.8 -116.8 137.1 -84.1 142.7 -59.1C148.4 -34.2 165.5 -17.1 182.5 0L0 0Z',
  'M0 -121.7C10.9 -108.9 21.8 -96.1 38.3 -92.4C54.8 -88.7 76.9 -94.2 86 -86C95.2 -77.9 91.4 -56 95.2 -39.4C98.9 -22.8 110.3 -11.4 121.7 0L0 0Z',
  'M0 -60.8C5.4 -54.4 10.9 -48 19.1 -46.2C27.4 -44.4 38.4 -47.1 43 -43C47.6 -38.9 45.7 -28 47.6 -19.7C49.5 -11.4 55.2 -5.7 60.8 0L0 0Z',
];

/** Company background adapted from the Haikei blob scene. */
export function CompanyBackground() {
  const { pathname } = useLocation();
  const color = sectionColor(pathname);

  return (
    <Backdrop>
      <svg className="absolute top-0 right-0 w-[68%] max-w-96 lg:w-[44%]" viewBox="-487 0 487 487">
        {companyTopRightPaths.map((path, index) => (
          <path
            key={path}
            d={path}
            fill={`color-mix(in oklab, ${color} ${(index + 1) * 7.5}%, var(--color-surface))`}
          />
        ))}
      </svg>
      <svg
        className="absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-0 w-[68%] max-w-96 lg:bottom-0 lg:w-[44%]"
        viewBox="0 -487 487 487"
      >
        {companyBottomLeftPaths.map((path, index) => (
          <path
            key={path}
            d={path}
            fill={`color-mix(in oklab, ${color} ${(index + 1) * 7.5}%, var(--color-surface))`}
          />
        ))}
      </svg>
    </Backdrop>
  );
}

/** Customer booking: low-poly facets that fade into the page, tinted with the salon's colour. */
export function BookingBackground() {
  return (
    <Backdrop>
      <svg
        className="absolute inset-x-0 bottom-0 h-72 w-full text-booking-action [mask-image:linear-gradient(to_top,black_30%,transparent)] lg:h-96"
        viewBox="0 0 1200 360"
        preserveAspectRatio="xMidYMax slice"
        fill="currentColor"
      >
        <path fillOpacity=".12" d="M0 0 190 175 0 120Z M440 0 365 245 190 175Z M920 0 795 250 610 120Z" />
        <path fillOpacity=".20" d="M0 0H440L190 175Z M440 0H920L610 120Z M1200 0V155L1010 160Z" />
        <path fillOpacity=".08" d="M440 0 610 120 365 245Z M920 0 1010 160 795 250Z M920 0H1200L1010 160Z" />
        <path fillOpacity=".29" d="M0 120 190 175 0 360Z M610 120 795 250 650 360Z M1010 160 1200 155 1200 360Z" />
        <path fillOpacity=".14" d="M190 175 365 245 285 360Z M365 245 610 120 650 360Z M795 250 1010 160 915 360Z" />
        <path fillOpacity=".23" d="M190 175 285 360H0Z M365 245 650 360H285Z M795 250 915 360H650Z" />
        <path fillOpacity=".36" d="M1010 160 1200 360H915Z" />
      </svg>
    </Backdrop>
  );
}

/** Sign-in and account pages: one soft circle behind the form, which sits in the right half from lg. */
export function AuthBackground() {
  return (
    <Backdrop>
      <div className="absolute -top-28 left-1/2 size-105 -translate-x-1/2 rounded-full bg-purple/10 sm:-top-40 sm:size-160 lg:left-3/4" />
    </Backdrop>
  );
}
