import type { AdminEmployeeTimesheetEntriesDto, TimesheetDayEntryDto } from '~/api/generated/timesheet/types.gen';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { Badge } from '~/components/ui/badge';
import { Card } from '~/components/ui/card';
import { SubmissionStatusSection } from './submission-status-section';

type SubmissionGroupCardProps = {
  group: AdminEmployeeTimesheetEntriesDto;
  index: number;
};

export function SubmissionGroupCard({ group, index }: SubmissionGroupCardProps) {
  const fullName = [group.user.givenName, group.user.familyName].filter(Boolean).join(' ').trim();
  const displayName = fullName || group.user.email || `Bruker #${group.user.id}`;
  const initials = getInitials(group.user.givenName, group.user.familyName, group.user.email);
  const entryCount = group.entries?.length ?? 0;
  const submittedEntryIds = (group.entries ?? [])
    .filter((entry) => entry.status === 'SUBMITTED' && typeof entry.id === 'number')
    .map((entry) => entry.id as number);

  const entriesByStatus = (group.entries ?? []).reduce(
    (acc, entry) => {
      acc[entry.status].push(entry);
      return acc;
    },
    {
      SUBMITTED: [] as TimesheetDayEntryDto[],
      ACCEPTED: [] as TimesheetDayEntryDto[],
      DECLINED: [] as TimesheetDayEntryDto[],
    },
  );

  const userKey = `${group.user.id ?? index}`;

  return (
    <AccordionItem key={group.user.id ?? index} value={`user-${userKey}`} className="bg-accordion-bg">
      <Card variant="bordered">
        <AccordionTrigger>
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                {initials}
              </div>
              <div className="min-w-0 text-left">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{group.user.email || 'Ingen e-post registrert'}</p>
              </div>
            </div>
            <Badge variant="outline" className="shrink-0 text-[10px]">
              {entryCount} stk
            </Badge>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <Accordion type="multiple" className="space-y-2">
            <SubmissionStatusSection
              userKey={userKey}
              status="SUBMITTED"
              entries={entriesByStatus.SUBMITTED}
              submittedEntryIds={submittedEntryIds}
            />
            <SubmissionStatusSection userKey={userKey} status="ACCEPTED" entries={entriesByStatus.ACCEPTED} />
            <SubmissionStatusSection userKey={userKey} status="DECLINED" entries={entriesByStatus.DECLINED} />
          </Accordion>
        </AccordionContent>
      </Card>
    </AccordionItem>
  );
}

function getInitials(givenName?: string | null, familyName?: string | null, email?: string | null) {
  const parts = [givenName, familyName].filter(Boolean) as string[];
  if (parts.length > 0) {
    return parts
      .map((part) => part.trim()[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  if (email) {
    return email.trim()[0]?.toUpperCase() ?? 'U';
  }

  return 'U';
}
