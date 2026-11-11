import { cn } from '~/ui';

export type NavbarUserProfile = {
  givenName?: string;
  familyName?: string;
  email?: string;
  mobileNumber?: string;
} | null;

// The avatar and the bell share one borderless 44px tap target, so the bar reads as one set of controls.
export const navbarIconButtonClassName =
  'relative grid size-11 shrink-0 place-items-center rounded-full text-text-primary transition-colors hover:bg-surface-variant-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-interactive';

/** An icon button on the blue phone bar (below `lg`); from `lg` it is back on the white header. */
export const navbarOnBrandClassName =
  'text-on-brand hover:bg-on-brand-hover focus-visible:ring-on-brand lg:text-text-primary lg:hover:bg-surface-variant-1 lg:focus-visible:ring-interactive';

export function getUserInitials(userProfile: NavbarUserProfile | undefined): string {
  return (
    [userProfile?.givenName, userProfile?.familyName]
      .filter(Boolean)
      .map((part) => part?.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() ||
    userProfile?.email?.slice(0, 2).toUpperCase() ||
    'K'
  );
}

export function UserAvatar({
  userProfile,
  className,
}: {
  userProfile: NavbarUserProfile | undefined;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-full bg-surface-accent-strong text-xs font-semibold text-interactive',
        className,
      )}
    >
      {getUserInitials(userProfile)}
    </span>
  );
}
