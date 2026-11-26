import { Text } from '../atoms/text';
import { cn } from '../lib/cn';
import { Card, CardContent, CardHead, type CardVariant } from './card';

type NoticeTone = 'default' | 'emphasis' | 'muted';
type NoticeVariant = 'default' | 'booking';

export interface NoticeProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: React.ReactNode;
  tone?: NoticeTone;
  variant?: NoticeVariant;
  action?: React.ReactNode;
}

const toneClasses: Record<NoticeTone, CardVariant> = {
  default: 'subtle',
  emphasis: 'emphasis',
  muted: 'subtle',
};

const bookingToneClasses: Record<NoticeTone, string> = {
  default:
    'border-booking-border bg-booking-surface-raised text-booking-text shadow-[var(--shadow-booking-card)] [&>div:first-child]:border-booking-border [&_h4]:text-booking-text',
  emphasis:
    'border-booking-action bg-booking-action-muted text-booking-text shadow-[var(--shadow-booking-card)] [&>div:first-child]:border-booking-action/40 [&_h4]:text-booking-text',
  muted:
    'border-booking-border bg-booking-surface-muted text-booking-text shadow-none [&>div:first-child]:border-booking-border [&_h4]:text-booking-text',
};

const messageClasses: Record<NoticeVariant, string> = {
  default: 'text-text-secondary',
  booking: 'text-booking-text-muted',
};

export function Notice({
  title,
  message,
  tone = 'default',
  variant = 'default',
  action,
  className,
  ...props
}: NoticeProps) {
  return (
    <Card
      variant={toneClasses[tone]}
      size="sm"
      className={cn(variant === 'booking' && bookingToneClasses[tone], className)}
      {...props}
    >
      {title ? <CardHead heading={title} headingAs="h4" className="mb-3" /> : null}
      <CardContent>
        <Text as="p" variant="body-sm" className={messageClasses[variant]}>
          {message}
        </Text>
        {action ? <div className="pt-2">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
