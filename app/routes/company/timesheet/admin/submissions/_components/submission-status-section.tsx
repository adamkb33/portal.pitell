import { useState } from 'react';
import { Form } from 'react-router';
import type { TimesheetDayEntryDto } from '~/api/generated/timesheet/types.gen';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog';
import { AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { Textarea } from '~/components/ui/textarea';
import {
  formatDisplayDate,
  formatDuration,
  TIMESHEET_MODE_LABELS,
  TIMESHEET_SUBMITTED_STATUS_LABELS,
  TIMESHEET_SUBMITTED_STATUS_VARIANTS,
} from '../../../_utils';

type SubmissionStatusSectionProps = {
  userKey: string;
  status: TimesheetDayEntryDto['status'];
  entries: TimesheetDayEntryDto[];
  submittedEntryIds?: number[];
};

export function SubmissionStatusSection({
  userKey,
  status,
  entries,
  submittedEntryIds = [],
}: SubmissionStatusSectionProps) {
  if (entries.length === 0) {
    return null;
  }

  const isSubmittedSection = status === 'SUBMITTED';
  const hasSubmittedEntries = submittedEntryIds.length > 0;

  return (
    <AccordionItem
      value={`${status.toLowerCase()}-${userKey}`}
      className="border border-border/60 last:border-b last:border-border/60"
    >
      <AccordionTrigger className="px-3 py-2">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant={TIMESHEET_SUBMITTED_STATUS_VARIANTS[status]} className="text-[10px]">
              {TIMESHEET_SUBMITTED_STATUS_LABELS[status]}
            </Badge>
            <span className="text-xs text-muted-foreground">{entries.length} stk</span>
          </div>
          {isSubmittedSection && hasSubmittedEntries && (
            <SubmissionSectionActions submittedEntryIds={submittedEntryIds} />
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-8 px-3 text-xs">Dato</TableHead>
                <TableHead className="h-8 px-3 text-xs">Type</TableHead>
                <TableHead className="h-8 px-3 text-xs">Varighet</TableHead>
                <TableHead className="h-8 px-3 text-xs">Status</TableHead>
                <TableHead className="h-8 px-3 text-xs">Notat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, rowIndex) => (
                <TableRow key={entry.id ?? `${userKey}-${status.toLowerCase()}-${rowIndex}`}>
                  <TableCell className="px-3 py-2 text-xs">{formatDisplayDate(entry.date)}</TableCell>
                  <TableCell className="px-3 py-2 text-xs">{TIMESHEET_MODE_LABELS[entry.entryMode]}</TableCell>
                  <TableCell className="px-3 py-2 text-xs">{formatDuration(entry.durationMinutes)}</TableCell>
                  <TableCell className="px-3 py-2 text-xs">
                    <Badge variant={TIMESHEET_SUBMITTED_STATUS_VARIANTS[entry.status]} className="text-[10px]">
                      {TIMESHEET_SUBMITTED_STATUS_LABELS[entry.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate px-3 py-2 text-xs">
                    {entry.note?.trim() || 'Ingen notat'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

type SubmissionSectionActionsProps = {
  submittedEntryIds: number[];
};

function SubmissionSectionActions({ submittedEntryIds }: SubmissionSectionActionsProps) {
  return (
    <div className="flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="outline" className="border-primary text-primary">
            Godkjenn
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Godkjenne valgte innsendinger?</AlertDialogTitle>
            <AlertDialogDescription>
              Dette godkjenner alle innleverte registreringer i denne statusgruppen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <Form method="post">
              <input type="hidden" name="intent" value="accept-selected-users" />
              {submittedEntryIds.map((id) => (
                <input key={id} type="hidden" name="selectedEntryIds" value={id} />
              ))}
              <Button type="submit">Godkjenn</Button>
            </Form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeclineEntriesDialog submittedEntryIds={submittedEntryIds} />
    </div>
  );
}

type DeclineEntriesDialogProps = {
  submittedEntryIds: number[];
};

function DeclineEntriesDialog({ submittedEntryIds }: DeclineEntriesDialogProps) {
  const [declineReason, setDeclineReason] = useState('');
  const isReasonEmpty = declineReason.trim().length === 0;

  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!open) {
          setDeclineReason('');
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-destructive text-destructive">
          Avvis
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Avvise valgte innsendinger?</AlertDialogTitle>
          <AlertDialogDescription>
            Dette avviser alle innleverte registreringer i denne statusgruppen. Begrunnelse er påkrevd.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Form method="post" className="space-y-3">
          <input type="hidden" name="intent" value="decline-selected-users" />
          {submittedEntryIds.map((id) => (
            <input key={id} type="hidden" name="selectedEntryIds" value={id} />
          ))}
          <Textarea
            name="reason"
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value)}
            required
            className="min-h-24 border"
            placeholder="Skriv begrunnelse for avvisning"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            {isReasonEmpty ? (
              <Popover>
                <PopoverTrigger asChild>
                  <span tabIndex={0} className="inline-flex">
                    <Button type="submit" variant="destructive" disabled>
                      Avvis
                    </Button>
                  </span>
                </PopoverTrigger>
                <PopoverContent className="w-auto px-3 py-2 text-xs" align="end">
                  Begrunnelse er påkrevd
                </PopoverContent>
              </Popover>
            ) : (
              <Button type="submit" variant="destructive">
                Avvis
              </Button>
            )}
          </AlertDialogFooter>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
