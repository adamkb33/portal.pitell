import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../primitives/alert-dialog';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmAction: React.ReactNode;
  cancelAction?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Asks before something that can't be undone. Built on the alert-dialog pattern (WAI-ARIA `alertdialog`): screen
 * readers announce it as an alert, focus starts on the safe button (cancel), and clicking outside doesn't close it.
 * Escape still does. Name each button by its outcome ("Slett tjeneste" / "Behold"), not "OK"/"Avbryt".
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmAction,
  cancelAction,
  children,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-text-secondary">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children ? <div>{children}</div> : null}
        <AlertDialogFooter>
          {cancelAction ? <AlertDialogCancel asChild>{cancelAction}</AlertDialogCancel> : null}
          {confirmAction}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
