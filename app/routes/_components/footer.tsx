import { Link } from 'react-router';

export function Footer() {
  return (
    <div
      id="page-footer"
      className="mx-auto flex h-full w-full max-w-[var(--container-xl)] items-center justify-between gap-4 px-[var(--app-shell-inline-padding)] text-xs text-text-secondary"
    >
      <span>© {new Date().getFullYear()} Pitell</span>
      <nav aria-label="Juridisk" className="flex items-center gap-4">
        <Link to="/vilkar" className="inline-flex min-h-11 items-center hover:text-text-primary hover:underline">
          Vilkår
        </Link>
        <Link to="/personvern" className="inline-flex min-h-11 items-center hover:text-text-primary hover:underline">
          Personvern
        </Link>
      </nav>
    </div>
  );
}
