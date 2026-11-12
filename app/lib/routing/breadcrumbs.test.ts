import { describe, expect, it } from 'vitest';
import { buildCrumbs, upCrumb, withTitle, withUpOverride } from './breadcrumbs';
import { crumbHref, rememberSearch, resolveTitleOverride, resolveUpOverride, withLastSearch } from './up-link';
import { BrachCategory, type RouteBranch } from './route-tree';

const branch = (id: string, href: string, label: string, children?: RouteBranch[], hidden = false): RouteBranch => ({
  id,
  href,
  label,
  children,
  hidden,
  category: BrachCategory.COMPANY,
});

const tree = [
  branch('company', '/company', 'Mitt selskap', [
    branch('appointments', '/company/appointments', 'Timebestillinger', [
      branch('detail', '/company/appointments/:appointmentId', 'Timebestilling', undefined, true),
      branch('create', '/company/appointments/create', 'Ny time', undefined, true),
    ]),
  ]),
];

describe('buildCrumbs', () => {
  it('links a crumb to crumbTo when its own page is not meant to be opened (Bruker → Min profil)', () => {
    const userTree = [
      {
        ...branch('user', '/user', 'Bruker', [
          branch('user.profile', '/user/profile', 'Min profil', [
            branch('user.profile.password', '/user/profile/passord', 'Endre passord', undefined, true),
          ]),
        ]),
        crumbTo: '/user/profile',
      },
    ];
    const crumbs = buildCrumbs(userTree, '/user/profile/passord');
    expect(crumbs.map((crumb) => crumb.href)).toEqual(['/user/profile', '/user/profile', '/user/profile/passord']);
    expect(upCrumb(crumbs)?.label).toBe('Min profil');
    expect(upCrumb(buildCrumbs(userTree, '/user/profile'))).toBeNull();
  });

  it('names hidden pages, preferring a static route over a param route', () => {
    expect(buildCrumbs(tree, '/company/appointments/create').map((crumb) => crumb.label)).toEqual([
      'Mitt selskap',
      'Timebestillinger',
      'Ny time',
    ]);
  });

  it('does not treat a param child as matching its parent page', () => {
    expect(buildCrumbs(tree, '/company/appointments').at(-1)?.label).toBe('Timebestillinger');
  });

  it('still matches param routes', () => {
    expect(buildCrumbs(tree, '/company/appointments/42').at(-1)?.label).toBe('Timebestilling');
  });
});

describe('buildCrumbs with `up` (the domain map, not the URL, decides the parent)', () => {
  const up = (b: RouteBranch, upId: string): RouteBranch => ({ ...b, up: upId });
  const booking = [
    branch('company', '/company', 'Mitt selskap', [
      branch('booking', '/company/booking', 'Booking', [
        branch('schedule', '/company/booking/schedule', 'Kalender', [
          up(
            branch('availabilities', '/company/booking/schedule/availabilities', 'Bookbar tid', undefined, true),
            'booking',
          ),
          up(
            branch(
              'availabilities.create',
              '/company/booking/schedule/availabilities/create',
              'Ny bookbar tid',
              undefined,
              true,
            ),
            'availabilities',
          ),
        ]),
        branch('absence', '/company/booking/absence', 'Fravær'),
      ]),
    ]),
  ];
  const labels = (pathname: string) => buildCrumbs(booking, pathname).map((crumb) => crumb.label);

  it('hangs a page under its `up` instead of its URL parent', () => {
    expect(labels('/company/booking/schedule/availabilities')).toEqual(['Mitt selskap', 'Booking', 'Bookbar tid']);
  });

  it('follows `up` all the way, so a form under Bookbar tid skips Kalender too', () => {
    expect(labels('/company/booking/schedule/availabilities/create')).toEqual([
      'Mitt selskap',
      'Booking',
      'Bookbar tid',
      'Ny bookbar tid',
    ]);
  });

  it('leaves pages without `up` on their URL trail', () => {
    expect(labels('/company/booking/schedule')).toEqual(['Mitt selskap', 'Booking', 'Kalender']);
  });

  it('gives the page one level up for the ‹ arrow, but not on a top page', () => {
    expect(upCrumb(buildCrumbs(booking, '/company/booking/absence'))).toEqual({
      label: 'Booking',
      href: '/company/booking',
    });
    expect(upCrumb(buildCrumbs(booking, '/company/booking'))).toBeNull();
    expect(upCrumb(buildCrumbs(booking, '/company'))).toBeNull();
  });
});

describe('a page that belongs to one record', () => {
  const appointment = { label: 'Timebestilling', href: '/company/appointments/7' };
  const crumbs = buildCrumbs(tree, '/company/appointments/create');

  it('puts the record before the current page, so ‹ goes to it', () => {
    const withRecord = withUpOverride(crumbs, appointment);
    expect(withRecord.map((crumb) => crumb.label)).toEqual([
      'Mitt selskap',
      'Timebestillinger',
      'Timebestilling',
      'Ny time',
    ]);
    expect(upCrumb(withRecord)).toEqual(appointment);
  });

  it('leaves the trail alone without a record', () => {
    expect(withUpOverride(crumbs, null)).toEqual(crumbs);
  });

  it('gives a page already in the trail the search the current page names', () => {
    const month = { label: 'Timebestillinger', href: '/company/appointments', search: '?maned=2026-10' };
    const withMonth = withUpOverride(crumbs, month);
    expect(withMonth.map((crumb) => crumb.label)).toEqual(crumbs.map((crumb) => crumb.label));
    expect(crumbHref(upCrumb(withMonth)!)).toBe('/company/appointments?maned=2026-10');

    rememberSearch('/company/appointments', '?maned=2026-09');
    expect(crumbHref(upCrumb(withUpOverride(crumbs, { ...month, search: '' }))!)).toBe('/company/appointments');
    expect(crumbHref(upCrumb(crumbs)!)).toBe('/company/appointments?maned=2026-09');
    rememberSearch('/company/appointments', '');
  });

  it('reads the record from the deepest route handle', () => {
    const matches = [
      { handle: { up: () => ({ label: 'Outer', href: '/outer' }) } },
      {
        handle: {
          up: (data: unknown) => ({
            label: 'Timebestilling',
            href: `/company/appointments/${(data as { id: number }).id}`,
          }),
        },
        loaderData: { id: 7 },
      },
    ];
    expect(resolveUpOverride(matches)).toEqual(appointment);
    expect(resolveUpOverride([{ handle: {} }])).toBeNull();
  });
});

describe('going up', () => {
  it('returns to a list as you left it', () => {
    rememberSearch('/company/appointments', '?search=Kari&page=1');
    expect(withLastSearch('/company/appointments')).toBe('/company/appointments?search=Kari&page=1');
    rememberSearch('/company/appointments', '');
    expect(withLastSearch('/company/appointments')).toBe('/company/appointments');
    expect(withLastSearch('/company/never-visited')).toBe('/company/never-visited');
  });
});

describe('a page that names a different parent', () => {
  it('replaces the tree parent instead of adding a crumb', () => {
    const crumbs = [
      { label: 'Mitt selskap', href: '/company' },
      { label: 'Timebestillinger', href: '/company/appointments' },
      { label: 'Ny time', href: '/company/appointments/create' },
    ];
    const kalender = { label: 'Kalender', href: '/company/schedule', replacesParent: true };
    expect(withUpOverride(crumbs, kalender).map((crumb) => crumb.label)).toEqual([
      'Mitt selskap',
      'Kalender',
      'Ny time',
    ]);
    expect(upCrumb(withUpOverride(crumbs, kalender))?.href).toBe('/company/schedule');
  });
});

describe('a page that names itself (`handle.title`)', () => {
  const crumbs = [
    { label: 'Mitt selskap', href: '/company' },
    { label: 'Varsler', href: '/company/notifications' },
    { label: 'Vis varsel', href: '/company/notifications/7' },
  ];
  const handle = { title: (data: unknown) => (data as { subject: string }).subject };

  it('renames the current page and keeps the way up', () => {
    const titled = withTitle(crumbs, 'Ny timebestilling');
    expect(titled.map((crumb) => crumb.label)).toEqual(['Mitt selskap', 'Varsler', 'Ny timebestilling']);
    expect(upCrumb(titled)?.href).toBe('/company/notifications');
    expect(withTitle(crumbs, null)).toBe(crumbs);
  });

  it("reads the title from the page's own loader data only", () => {
    expect(resolveTitleOverride([{}, { handle, loaderData: { subject: 'Ny timebestilling' } }])).toBe(
      'Ny timebestilling',
    );
    expect(resolveTitleOverride([{ handle, loaderData: { subject: 'Ny timebestilling' } }, {}])).toBeNull();
    expect(resolveTitleOverride([{ handle, loaderData: { subject: '  ' } }])).toBeNull();
  });
});
