import * as React from 'react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, type LinksFunction, type MetaFunction } from 'react-router';
import { getRouteMetadata } from './lib/route-meta';
import './app.css';

export const meta: MetaFunction = ({ location }) => {
  const metadata = getRouteMetadata(location.pathname);

  return [
    { title: metadata.title },
    { name: 'description', content: metadata.description },
    { property: 'og:title', content: metadata.title },
    { property: 'og:description', content: metadata.description },
    { name: 'twitter:title', content: metadata.title },
    { name: 'twitter:description', content: metadata.description },
  ];
};

export const links: LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Inter+Tight:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
  },
  { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  { rel: 'apple-touch-icon-precomposed', href: '/apple-touch-icon-precomposed.png' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb" className="bg-foreground">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}

// Errors thrown by the root layout's middleware bubble to this route, so it shows the same problems page.
export { ErrorBoundary } from './routes/root.layout';
