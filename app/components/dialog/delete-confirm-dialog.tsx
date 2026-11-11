import { Button, ConfirmDialog } from '~/ui';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  cancelText?: string;
  confirmText?: string;
  confirmDisabled?: boolean;
  children?: React.ReactNode;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Er du sikker?',
  description = 'Denne handlingen kan ikke angres.',
  // Outcome labels (NN/g): the safe choice says what it keeps.
  cancelText = 'Behold',
  confirmText = 'Slett',
  confirmDisabled = false,
  children,
}: DeleteConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      cancelAction={
        <Button type="button" variant="outline">
          {cancelText}
        </Button>
      }
      confirmAction={
        <Button type="button" variant="destructive" onClick={onConfirm} disabled={confirmDisabled}>
          {confirmText}
        </Button>
      }
    >
      {children}
    </ConfirmDialog>
  );
}
