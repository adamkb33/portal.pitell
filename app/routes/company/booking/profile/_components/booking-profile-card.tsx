import * as React from 'react';
import type { BookingProfileDto } from '~/api/generated';
import { Button } from '~/ui';

export interface BookingProfileCardProps {
  bookingProfile?: BookingProfileDto | null;
  onEditProfile?: () => void;
}

const DAY_ABBREV: Record<string, string> = {
  MONDAY: 'Mandag',
  TUESDAY: 'Tirsdag',
  WEDNESDAY: 'Onsdag',
  THURSDAY: 'Torsdag',
  FRIDAY: 'Fredag',
  SATURDAY: 'Lørdag',
  SUNDAY: 'Søndag',
};

const DAY_ORDER: Record<string, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
};

export const BookingProfileCard = React.forwardRef<HTMLElement, BookingProfileCardProps>(
  ({ bookingProfile, onEditProfile }, ref) => {
    const profileName =
      bookingProfile?.familyName && bookingProfile?.givenName
        ? `${bookingProfile.familyName} ${bookingProfile.givenName}`
        : null;

    const hasProfileImage = Boolean(bookingProfile?.image);
    const hasDescription = Boolean(bookingProfile?.description?.trim());
    const hasServices = Boolean(bookingProfile?.services && bookingProfile.services.length > 0);
    const hasDailySchedule = Boolean(bookingProfile?.dailySchedule && bookingProfile.dailySchedule.length > 0);

    const sortedDailySchedule = React.useMemo(() => {
      if (!bookingProfile?.dailySchedule) return [];
      return [...bookingProfile.dailySchedule].sort((a, b) => {
        return DAY_ORDER[a.dayOfWeek] - DAY_ORDER[b.dayOfWeek];
      });
    }, [bookingProfile?.dailySchedule]);

    const formatTimeRange = (startTime: string, endTime: string) => {
      return `${startTime.slice(0, 5)}–${endTime.slice(0, 5)}`;
    };

    return (
      <section ref={ref} className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
        <div className="p-4 space-y-4">
          {/* Profile Header */}
          <div className="flex items-center gap-3">
            {hasProfileImage && bookingProfile?.image ? (
              <img
                src={bookingProfile.image.url}
                alt={profileName || 'Profil'}
                className="h-16 w-16 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center border-2 border-primary">
                <span className="text-2xl font-bold text-primary-foreground">{profileName?.charAt(0) || '?'}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-card-text">{profileName || 'Bookingprofil'}</h2>
              {hasDescription && (
                <p className="text-sm text-card-text-muted line-clamp-2 mt-0.5">{bookingProfile?.description}</p>
              )}
            </div>
          </div>

          {/* Schedule - Simple List */}
          {hasDailySchedule && (
            <div>
              <h3 className="text-xs font-semibold text-card-text-muted uppercase tracking-wide mb-2">Din timeplan</h3>
              <div className="bg-content-bg rounded-lg p-3 border border-content-border space-y-1.5 md:w-md">
                {sortedDailySchedule.map((day, idx) => (
                  <div
                    key={day.id}
                    className={`flex items-center justify-between text-xs px-2 py-1.5 rounded ${
                      idx % 2 === 0 ? 'bg-muted/60' : 'bg-transparent'
                    }`}
                  >
                    <span className="text-content-text font-medium">{DAY_ABBREV[day.dayOfWeek]}</span>
                    <span className="text-content-text-muted">{formatTimeRange(day.startTime, day.endTime)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Services - Ultra Condensed */}
          {hasServices && (
            <div>
              <h3 className="text-xs font-semibold text-card-text-muted uppercase tracking-wide mb-2">
                Tjenester ({bookingProfile!.services.reduce((acc, g) => acc + g.services.length, 0)})
              </h3>
              <div className="space-y-2 flex flex-wrap gap-2 bg-content-bg border border-content-border">
                {bookingProfile!.services.map((group) => (
                  <div key={group.id} className="rounded-lg p-3 w-xs h-max">
                    <p className="text-xs font-semibold text-primary mb-2 border-b">{group.name}</p>
                    <div className="space-y-1.5">
                      {group.services.map((service) => (
                        <div key={service.id} className="flex items-center justify-between text-xs">
                          <span className="text-content-text font-medium">{service.name}</span>
                          <span className="text-content-text-muted shrink-0 ml-2">
                            {service.duration}min ·{' '}
                            <span className="font-semibold text-primary">kr {service.price}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State - Only if nothing exists */}
          {!hasDescription && !hasDailySchedule && !hasServices && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4 text-center">
              <p className="text-sm font-medium text-destructive">⚠️ Profilen din er tom</p>
              <p className="text-xs text-destructive/80 mt-1">Fyll ut info for å ta imot bookinger</p>
            </div>
          )}
        </div>

        {/* Action Button - Bottom Fixed on Mobile */}
        <div className="sticky bottom-0 bg-card-footer-bg border-t border-card-header-border p-4 sm:relative">
          <Button type="button" variant="primary" size="lg" onClick={onEditProfile} className="h-12 w-full">
            Rediger profil
          </Button>
        </div>
      </section>
    );
  },
);

BookingProfileCard.displayName = 'BookingProfileCard';
