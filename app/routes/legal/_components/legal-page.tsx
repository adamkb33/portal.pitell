import type { ReactNode } from 'react';

// Shared layout for the public legal pages (/personvern, /vilkar): one card, a title, the date and titled sections.

export type LegalSection = { title: string; body: ReactNode };

// The company that runs Pitell (Brønnøysundregistrene).
export const OPERATOR_NAME = 'Baser IT Consulting';
export const OPERATOR_ORG_NUMBER = '931 863 037';
export const OPERATOR_ADDRESS = 'Bramers vei 41, 1613 Fredrikstad';
export const CONTACT_EMAIL = 'post@pitell.no';

export function MailLink({ email = CONTACT_EMAIL }: { email?: string }) {
  return (
    <a href={`mailto:${email}`} className="font-medium text-interactive underline">
      {email}
    </a>
  );
}

export function LegalPage({
  title,
  lastUpdated,
  sections,
}: {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}) {
  return (
    <main className="bg-surface px-4 py-8 md:py-12">
      <article className="mx-auto w-full max-w-2xl rounded-xl border border-border bg-background p-5 md:p-8">
        <header>
          <h1 className="text-2xl font-semibold text-text-primary">{title}</h1>
          <p className="mt-1 text-sm text-text-secondary">Sist oppdatert {lastUpdated}</p>
        </header>
        {sections.map((section) => (
          <section key={section.title} className="mt-8">
            <h2 className="text-base font-semibold text-text-primary">{section.title}</h2>
            <div className="mt-2 space-y-3 text-sm leading-relaxed text-text-primary [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
              {section.body}
            </div>
          </section>
        ))}
      </article>
    </main>
  );
}
