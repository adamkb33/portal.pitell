import { BadgePercent, Heart, Megaphone, type LucideIcon } from 'lucide-react';
import { cn } from '~/ui';
import type { EmailTemplate } from '../_utils/email-blocks';

/** The three templates in order: the template's own colour and icon, and one line about what it is for. */
export const TEMPLATE_CHOICES: Array<{ key: EmailTemplate; icon: LucideIcon; tone: string; line: string }> = [
  {
    key: 'announcement',
    icon: Megaphone,
    tone: 'bg-category-purple-tint text-category-purple-ink',
    line: 'Nyheter og endringer',
  },
  {
    key: 'promotion',
    icon: BadgePercent,
    tone: 'bg-category-orange-tint text-category-orange-ink',
    line: 'Rabatt eller kampanje',
  },
  { key: 'personal', icon: Heart, tone: 'bg-category-pink-tint text-category-pink-ink', line: 'En hilsen til kundene' },
];

export function TemplateTile({ template, small = false }: { template: EmailTemplate; small?: boolean }) {
  const choice = TEMPLATE_CHOICES.find((item) => item.key === template)!;
  const Icon = choice.icon;
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center',
        small ? 'size-7 rounded-lg' : 'size-9 rounded-[10px]',
        choice.tone,
      )}
    >
      <Icon className={small ? 'size-4' : 'size-5'} strokeWidth={1.8} />
    </span>
  );
}
