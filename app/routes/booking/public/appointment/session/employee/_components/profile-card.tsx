import { Form } from 'react-router';
import type { BookingProfileDto } from '~/api/generated';
import { formatEstimatedDuration, formatEstimatedPrice } from '~/routes/booking/public/_utils/booking-price';
import { OVERVIEW_RETURN_VALUE } from '~/routes/booking/public/_utils/booking-return-to';
import { Button, Card, CardContent, CardFooter, Popover, PopoverContent, PopoverTrigger, Text, cn } from '~/ui';

type ProfileCardProps = {
  profile: BookingProfileDto;
  isSelected: boolean;
  isSubmitting: boolean;
  isSubmittingProfile: boolean;
  returnToOverview: boolean;
};

export function ProfileCard({
  profile,
  isSelected,
  isSubmitting,
  isSubmittingProfile,
  returnToOverview,
}: ProfileCardProps) {
  return (
    <Card
      variant="default"
      className={cn(
        'group flex h-full flex-col border-booking-border bg-booking-surface-subtle shadow-[var(--shadow-booking-card)] transition-colors focus-within:ring-[length:var(--border-booking-focus-ring)] focus-within:ring-booking-action-text',
        isSelected
          ? 'border-booking-action bg-booking-action-muted ring-[length:var(--border-booking-focus-ring)] ring-booking-action/35'
          : 'hover:border-booking-action/20 hover:bg-booking-surface-muted',
        isSubmittingProfile && 'opacity-80',
      )}
    >
      <div className="mb-4 space-y-2">
        {isSelected ? (
          <Text as="p" variant="overline" className="text-booking-action-text">
            Valgt behandler
          </Text>
        ) : null}
        <div className="flex min-h-20 items-start gap-3 rounded-[var(--radius-booking-card)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-surface-strong p-3">
          {profile.image ? (
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[var(--radius-booking-field)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-surface-raised">
              <img
                src={profile.image.url}
                alt={`${profile.givenName} ${profile.familyName}`}
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <Text as="h3" variant="heading-sm" className="text-booking-text">
              {profile.givenName} {profile.familyName}
            </Text>
            {profile.description ? <Text className="mt-1 text-booking-text-muted">{profile.description}</Text> : null}
          </div>
        </div>
      </div>

      <CardContent className="flex-1">
        {profile.services.length > 0 && (
          <div className="rounded-[var(--radius-booking-card)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-surface-subtle p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <Text as="p" variant="caption" className="uppercase tracking-wide text-booking-text-muted">
                Tjenester
              </Text>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="booking-ghost"
                    size="sm"
                    disabled={isSubmitting}
                    className="h-8 px-2 text-xs hover:bg-booking-surface-raised"
                  >
                    Vis alle
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 border-booking-border bg-booking-surface-muted p-4">
                  <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
                    {profile.services.map((group) => (
                      <div
                        key={group.id}
                        className="space-y-2 rounded-[var(--radius-booking-card)] border-[length:var(--border-booking-card)] border-booking-border bg-booking-surface-subtle p-3"
                      >
                        <div className="text-xs font-semibold uppercase tracking-wide text-booking-text-muted">
                          {group.name}
                        </div>
                        <div className="space-y-2">
                          {group.services.map((service) => (
                            <div
                              key={service.id}
                              className="flex items-baseline justify-between gap-2 rounded-[var(--radius-booking-field)] bg-booking-surface-strong px-2 py-1.5"
                            >
                              <span className="text-sm text-booking-text">{service.name}</span>
                              <div className="flex flex-shrink-0 items-baseline gap-2">
                                <span className="text-xs text-booking-text-muted">
                                  {formatEstimatedDuration(service.duration)}
                                </span>
                                <span className="text-sm font-medium text-booking-text">
                                  {formatEstimatedPrice(service.price)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <Text as="p" variant="body-sm" className="text-booking-text-muted">
              {profile.services.reduce((sum, group) => sum + group.services.length, 0)} tjenester tilgjengelig
            </Text>
          </div>
        )}
      </CardContent>

      <CardFooter className="mt-auto border-t border-booking-border bg-booking-surface-strong p-3">
        {isSelected ? (
          <Button
            type="button"
            variant="booking-secondary"
            fullWidth
            disabled
            className="gap-2 border-booking-action/40 bg-booking-surface-raised text-booking-text"
          >
            Valgt
          </Button>
        ) : (
          <Form method="post">
            <input type="hidden" name="selectedProfileId" value={profile.id} />
            {returnToOverview ? <input type="hidden" name="returnTo" value={OVERVIEW_RETURN_VALUE} /> : null}
            <Button
              type="submit"
              variant="booking-primary"
              fullWidth
              loading={isSubmittingProfile}
              disabled={isSubmitting}
              className="gap-2"
            >
              Velg {profile.givenName}
            </Button>
          </Form>
        )}
      </CardFooter>
    </Card>
  );
}
