import { Link } from 'react-router';
import { CalendarCheck, Ellipsis, LogOut } from 'lucide-react';
import { getIcon } from '~/lib/routing/route-icon-map';
import { BrachCategory, type RouteBranch } from '~/lib/routing/route-tree';
import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/ui';
import { getUserInitials, type NavbarUserProfile } from '~/components/layout/navbar-controls';

/** The account at the bottom of the sidebar and phone menu. */
type AccountProps = {
  userProfile?: NavbarUserProfile;
  /** The flat account links (profile, my bookings, sign out) from the navigation tree. */
  navigationBranches: RouteBranch[];
};

function accountLinks(navigationBranches: RouteBranch[]) {
  const profile = navigationBranches.find((branch) => branch.id === 'user.profile');
  // "Mine selskap" is left out: the company card at the top goes to the same page.
  const userLinks = navigationBranches.filter(
    (branch) =>
      branch.category === BrachCategory.USER && branch.id !== 'user.profile' && branch.id !== 'user.company-context',
  );
  const authLinks = navigationBranches.filter((branch) => branch.category === BrachCategory.AUTH);
  return { profile, userLinks, authLinks };
}

function fullName(userProfile?: NavbarUserProfile) {
  return [userProfile?.givenName, userProfile?.familyName].filter(Boolean).join(' ');
}

function ChromeAvatar({ userProfile }: { userProfile?: NavbarUserProfile }) {
  return (
    <span
      aria-hidden
      className="grid size-[30px] shrink-0 place-items-center rounded-full bg-chrome-raised text-xs font-bold text-chrome-accent"
    >
      {getUserInitials(userProfile)}
    </span>
  );
}

const rowClassName =
  'flex min-h-11 items-center gap-3 rounded-[10px] px-2 py-1.5 text-sm font-medium text-chrome-text-muted transition-colors hover:bg-chrome-hover hover:text-chrome-text focus:outline-none focus-visible:ring-2 focus-visible:ring-chrome-accent';

/** Phone menu: the account as rows, since there is no header menu on phones. */
export function DrawerAccount({
  userProfile,
  navigationBranches,
  onNavigate,
}: AccountProps & { onNavigate: () => void }) {
  const { profile, userLinks, authLinks } = accountLinks(navigationBranches);
  if (!profile && userLinks.length === 0 && authLinks.length === 0) return null;

  return (
    <ul className="flex flex-col gap-0.5" role="list">
      {profile ? (
        <li>
          <Link to={profile.href} onClick={onNavigate} className={cn(rowClassName, 'font-semibold text-chrome-text')}>
            <ChromeAvatar userProfile={userProfile} />
            <span className="min-w-0 flex-1 truncate">{fullName(userProfile) || profile.label}</span>
          </Link>
        </li>
      ) : null}
      {[...userLinks, ...authLinks].map((branch) => {
        const isSignOut = branch.id === 'auth.sign-out';
        // "Mine bookinger" has no route icon, so it gets one here to keep the rows aligned.
        const Icon = isSignOut ? LogOut : (getIcon(branch.iconName) ?? CalendarCheck);
        return (
          <li key={branch.id}>
            <Link to={branch.href} onClick={onNavigate} className={rowClassName}>
              <span className="grid size-[30px] shrink-0 place-items-center">
                {Icon ? <Icon className="size-[17px]" strokeWidth={1.75} aria-hidden /> : null}
              </span>
              <span className="min-w-0 flex-1 truncate">{branch.label ?? branch.id}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Desktop sidebar: name and avatar; ⋯ opens the account menu (it used to sit in the header). */
export function SidebarAccountMenu({ userProfile, navigationBranches }: AccountProps) {
  const { profile, userLinks, authLinks } = accountLinks(navigationBranches);
  const name = fullName(userProfile) || 'Din konto';
  if (!profile && userLinks.length === 0 && authLinks.length === 0) return null;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Konto: ${name}`}
          className={cn(rowClassName, 'w-full text-left text-chrome-text')}
        >
          <ChromeAvatar userProfile={userProfile} />
          <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
          <Ellipsis className="size-4 shrink-0 text-chrome-text-muted" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="min-w-[220px]">
        {profile ? (
          <DropdownMenuItem asChild>
            <Link to={profile.href} className="cursor-pointer">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{name}</span>
                {userProfile?.email ? (
                  <span className="block truncate text-xs text-text-secondary">{userProfile.email}</span>
                ) : null}
              </span>
            </Link>
          </DropdownMenuItem>
        ) : null}
        {userLinks.length > 0 ? <DropdownMenuSeparator /> : null}
        {userLinks.map((branch) => (
          <DropdownMenuItem key={branch.id} asChild>
            <Link to={branch.href} className="cursor-pointer">
              {branch.label}
            </Link>
          </DropdownMenuItem>
        ))}
        {authLinks.length > 0 ? <DropdownMenuSeparator /> : null}
        {authLinks.map((branch) => (
          <DropdownMenuItem key={branch.id} asChild>
            <Link to={branch.href} className="cursor-pointer text-text-secondary">
              {branch.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
