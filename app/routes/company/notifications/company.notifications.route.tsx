import { useState, type ReactNode } from 'react';
import { data, Link, useLocation } from 'react-router';
import { BellOff, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Route } from './+types/company.notifications.route';
import { CompanyUserInAppNotificationController, type InAppNotificationDto } from '~/api/generated';
import { withAuth } from '~/api/utils/with-auth';
import { resolveErrorPayload } from '~/lib/api-error';
import { serializeQueryParams } from '~/lib/query';
import { Button, CompanyPageTemplate, Notice, SegmentedLinks } from '~/ui';
import { NotificationRow } from './_components/notification-row';
import { groupNotificationsByDay, notificationClock } from './_utils/notification-display';
import {
  parseNotificationListRequest,
  SHOW_PARAM,
  SHOW_UNREAD,
  UNREAD_COUNT_REQUEST,
  type NotificationListFilters,
} from './_utils/query';

export async function loader({ request }: Route.LoaderArgs) {
  const { filters, requestPayload } = parseNotificationListRequest(new URL(request.url));

  try {
    const [listResponse, unreadResponse] = await withAuth(request, () =>
      Promise.all([
        CompanyUserInAppNotificationController.getInAppNotifications({
          query: { request: requestPayload },
          paramsSerializer: (params) => serializeQueryParams(params.request),
        }),
        CompanyUserInAppNotificationController.getInAppNotifications({
          query: { request: UNREAD_COUNT_REQUEST },
          paramsSerializer: (params) => serializeQueryParams(params.request),
        }),
      ]),
    );
    const pageData = listResponse.data?.data;

    return data({
      notifications: pageData?.content ?? [],
      pagination: {
        page: pageData?.page ?? filters.page,
        totalElements: pageData?.totalElements ?? 0,
        totalPages: pageData?.totalPages ?? 1,
      },
      unreadCount: unreadResponse.data?.data?.totalElements ?? 0,
      filters,
      error: null as string | null,
    });
  } catch (error) {
    const { message } = resolveErrorPayload(error, 'Kunne ikke hente varsler');
    return data({
      notifications: [] as InAppNotificationDto[],
      pagination: { page: filters.page, totalElements: 0, totalPages: 1 },
      unreadCount: 0,
      filters,
      error: message,
    });
  }
}

/**
 * Varsler (Liste): Alle | Uleste, the notifications grouped by the day they arrived, a count and paging. Every row
 * opens the notification's own page. Nothing to create here, so no create button (approved sketch 2026-11-10).
 */
export default function CompanyNotificationsRoute({ loaderData }: Route.ComponentProps) {
  const { notifications, pagination, unreadCount, filters, error } = loaderData;
  const [now] = useState(() => new Date());
  const groups = groupNotificationsByDay(notifications, now);

  return (
    <CompanyPageTemplate title="Varsler">
      {error ? (
        <Notice tone="emphasis" title="Kunne ikke hente varsler" message={error} />
      ) : (
        <section
          aria-label="Varsler"
          className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-background"
        >
          <div className="border-b border-border p-4 sm:p-5">
            <ShowSwitch unreadOnly={filters.unreadOnly} unreadCount={unreadCount} />
          </div>

          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h3 className="flex items-center justify-between gap-3 border-b border-border bg-slate-100 px-4 py-1.5 text-xs font-semibold text-text-primary sm:px-5">
                <span className="first-letter:uppercase">{group.label}</span>
                <span className="font-normal text-text-secondary">
                  {group.items.length} {group.items.length === 1 ? 'varsel' : 'varsler'}
                </span>
              </h3>
              <ul className="divide-y divide-border border-b border-border">
                {group.items.map((notification) => (
                  <li key={notification.id}>
                    <NotificationRow notification={notification} time={notificationClock(notification.createdAt)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {notifications.length === 0 ? <EmptyState unreadOnly={filters.unreadOnly} /> : null}

          {pagination.totalElements > 0 ? (
            <Footer
              filters={filters}
              page={pagination.page}
              total={pagination.totalElements}
              pages={pagination.totalPages}
            />
          ) : null}
        </section>
      )}
    </CompanyPageTemplate>
  );
}

function ShowSwitch({ unreadOnly, unreadCount }: { unreadOnly: boolean; unreadCount: number }) {
  const { pathname } = useLocation();
  return (
    <SegmentedLinks
      label="Vis varsler"
      items={[
        { key: 'alle', label: 'Alle', to: pathname, active: !unreadOnly },
        {
          key: SHOW_UNREAD,
          label: 'Uleste',
          to: `${pathname}?${SHOW_PARAM}=${SHOW_UNREAD}`,
          active: unreadOnly,
          count: unreadCount,
        },
      ]}
    />
  );
}

function EmptyState({ unreadOnly }: { unreadOnly: boolean }) {
  const { pathname } = useLocation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-blue-50 text-interactive">
        <BellOff className="size-7" aria-hidden />
      </span>
      <p className="text-base font-semibold text-text-primary">
        {unreadOnly ? 'Ingen uleste varsler' : 'Ingen varsler'}
      </p>
      {unreadOnly ? (
        <Button asChild variant="outline">
          <Link to={pathname}>Vis alle</Link>
        </Button>
      ) : null}
    </div>
  );
}

function Footer({
  filters,
  page,
  total,
  pages,
}: {
  filters: NotificationListFilters;
  page: number;
  total: number;
  pages: number;
}) {
  const { pathname } = useLocation();
  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    if (filters.unreadOnly) params.set(SHOW_PARAM, SHOW_UNREAD);
    if (target > 0) params.set('page', String(target));
    const search = params.toString();
    return search ? `${pathname}?${search}` : pathname;
  };
  const hasPrevious = page > 0;
  const hasNext = page + 1 < pages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-text-secondary sm:px-5">
      <span>
        {total.toLocaleString('nb-NO')} {total === 1 ? 'varsel' : 'varsler'}
      </span>
      {pages > 1 ? (
        <div className="flex items-center gap-2">
          <span>
            Side {page + 1} av {pages}
          </span>
          <PageLink to={hasPrevious ? pageHref(page - 1) : null} label="Forrige side">
            <ChevronLeft className="size-4" />
          </PageLink>
          <PageLink to={hasNext ? pageHref(page + 1) : null} label="Neste side">
            <ChevronRight className="size-4" />
          </PageLink>
        </div>
      ) : null}
    </div>
  );
}

function PageLink({ to, label, children }: { to: string | null; label: string; children: ReactNode }) {
  if (!to) {
    return (
      <Button variant="outline" size="icon" aria-label={label} disabled>
        {children}
      </Button>
    );
  }
  return (
    <Button asChild variant="outline" size="icon">
      <Link to={to} aria-label={label} preventScrollReset>
        {children}
      </Link>
    </Button>
  );
}
