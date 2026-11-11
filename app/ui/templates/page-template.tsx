import * as React from 'react';
import { Text } from '../atoms/text';
import { Container, type ContainerSize } from '../layout/container';
import { Stack } from '../layout/stack';
import { Eyebrow } from '../organisms/card';
import { cn } from '../lib/cn';

export interface PageTemplateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  eyebrow?: React.ReactNode;
  label?: string;
  routeLinks?: React.ReactNode;
  actions?: React.ReactNode;
  hero?: React.ReactNode;
  children: React.ReactNode;
  size?: ContainerSize;
  /** Keeps the title for screen readers only, for shells whose breadcrumb already names the page. */
  hideTitle?: boolean;
}

export function PageTemplate({
  title,
  description,
  eyebrow,
  label,
  routeLinks,
  actions,
  hero,
  children,
  size = '2xl',
  hideTitle = false,
  className,
  ...props
}: PageTemplateProps) {
  const eyebrowContent = eyebrow ?? label;

  if (hideTitle) {
    return (
      <Container size={size} gutter="none" className={cn('space-y-4', className)} {...props}>
        {title ? <h1 className="sr-only">{title}</h1> : null}
        {actions || routeLinks ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {routeLinks ? <div className="flex flex-wrap items-center gap-2">{routeLinks}</div> : null}
            {actions ? <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        ) : null}
        {hero ? <div>{hero}</div> : null}
        <Stack space="md">{children}</Stack>
      </Container>
    );
  }

  return (
    <Container size={size} gutter="none" className={cn('space-y-4', className)} {...props}>
      {title || description || eyebrowContent || actions || routeLinks ? (
        <header className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 space-y-2">
              {eyebrowContent ? <Eyebrow>{eyebrowContent}</Eyebrow> : null}
              {title ? (
                <Text as="h1" className="font-display text-2xl font-bold leading-tight tracking-tight md:text-3xl">
                  {title}
                </Text>
              ) : null}
              {description ? (
                <Text as="p" variant="body-sm" className="max-w-3xl text-text-secondary md:text-base">
                  {description}
                </Text>
              ) : null}
            </div>
            {actions ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">{actions}</div>
            ) : null}
          </div>

          {routeLinks ? <div className="flex flex-wrap items-center gap-2">{routeLinks}</div> : null}
        </header>
      ) : null}

      {hero ? <div>{hero}</div> : null}

      <Stack space="md">{children}</Stack>
    </Container>
  );
}
