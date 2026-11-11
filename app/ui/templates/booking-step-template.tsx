import { Container, type ContainerSize } from '../layout/container';
import { cn } from '../lib/cn';
import { PageHeader } from '../organisms/page-header';
import { StickyFooterPageTemplate } from './sticky-footer-page-template';

export interface BookingStepTemplateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  label?: string;
  headerMeta?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: ContainerSize;
  contentClassName?: string;
}

export function BookingStepTemplate({
  title,
  description,
  label,
  headerMeta,
  footer,
  children,
  size = 'lg',
  className,
  contentClassName,
  ...props
}: BookingStepTemplateProps) {
  return (
    <StickyFooterPageTemplate footer={footer} size={size} className={className} {...props}>
      {/* Compact: the app shell's <main> already pads the sides, so no gutter of our own; 16px (24px on desktop)
          between the title and the content, and no padding or divider under the title. */}
      <Container size={size} gutter="none" data-booking-step-container>
        <div
          data-booking-step-content
          className={cn('flex min-h-[var(--booking-step-min-height)] flex-col gap-4 md:gap-6', contentClassName)}
        >
          <PageHeader
            label={label}
            title={title}
            description={description}
            meta={headerMeta}
            className="pb-0 md:border-b-0 md:pb-0"
          />
          {children}
        </div>
      </Container>
    </StickyFooterPageTemplate>
  );
}
