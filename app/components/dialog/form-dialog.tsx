import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '../ui/textarea';
import * as React from 'react';

export interface FormFieldRenderProps<T> {
  value: any;
  onChange: (value: any) => void;
  field: FormField<T>;
  error?: string;
}

export interface FormField<T> {
  name: keyof T;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'password' | 'number' | 'time' | 'date' | 'select' | 'textarea' | 'file';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { label: string; value: string | number }[];
  className?: string;
  error?: string;
  description?: string;

  // Mobile optimization
  inputMode?: 'text' | 'email' | 'tel' | 'numeric' | 'decimal' | 'search' | 'url';
  autoComplete?: string;

  // File-specific
  accept?: string;
  multiple?: boolean;

  // Custom renderer
  render?: (props: FormFieldRenderProps<T>) => React.ReactNode;
}

export interface DialogAction {
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  type?: 'button' | 'submit';
  className?: string;
}

interface FormDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FormField<T>[];
  formData: T;
  onFieldChange: (name: keyof T, value: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  actions?: DialogAction[];
  errors?: Partial<Record<keyof T, string>>;
}

export function FormDialog<T>({
  open,
  onOpenChange,
  title,
  fields,
  formData,
  onFieldChange,
  onSubmit,
  actions,
  errors,
}: FormDialogProps<T>) {
  const renderField = (field: FormField<T>) => {
    const value = (formData as any)[field.name];
    const fieldId = String(field.name);
    const fieldError = field.error ?? errors?.[field.name];
    const ariaInvalid = Boolean(fieldError) ? true : undefined;
    const describedById = fieldError || field.description ? `${fieldId}-desc` : undefined;

    const handleValueChange = (val: any) => {
      onFieldChange(field.name, val);
    };

    // Custom renderer
    if (field.render) {
      return (
        <div>
          {field.render({
            value,
            onChange: handleValueChange,
            field,
            error: fieldError,
          })}
          {field.description && (
            <p id={`${fieldId}-desc`} className="mt-1.5 text-xs text-form-text-muted sm:text-sm">
              {field.description}
            </p>
          )}
          {fieldError && (
            <p className="mt-1.5 text-xs text-form-invalid sm:text-sm" role="alert">
              {fieldError}
            </p>
          )}
        </div>
      );
    }

    // Select
    if (field.type === 'select' && field.options) {
      return (
        <div>
          <Select
            value={value != null ? String(value) : ''}
            onValueChange={(val) => handleValueChange(val)}
            disabled={field.disabled}
          >
            <SelectTrigger
              id={fieldId}
              aria-invalid={ariaInvalid}
              aria-describedby={describedById}
              className="h-11 text-base bg-form-bg border-form-border text-form-text"
            >
              <SelectValue placeholder={field.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.description && (
            <p id={`${fieldId}-desc`} className="mt-1.5 text-xs text-form-text-muted sm:text-sm">
              {field.description}
            </p>
          )}
          {fieldError && (
            <p className="mt-1.5 text-xs text-form-invalid sm:text-sm" role="alert">
              {fieldError}
            </p>
          )}
        </div>
      );
    }

    // Textarea
    if (field.type === 'textarea') {
      return (
        <div>
          <Textarea
            id={fieldId}
            aria-invalid={ariaInvalid}
            aria-describedby={describedById}
            value={String(value ?? '')}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            disabled={field.disabled}
            className={`min-h-24 px-3 py-3 text-sm bg-form-bg border-form-border text-form-text ${field.className || ''}`}
          />
          {field.description && (
            <p id={`${fieldId}-desc`} className="mt-1.5 text-xs text-form-text-muted sm:text-sm">
              {field.description}
            </p>
          )}
          {fieldError && (
            <p className="mt-1.5 text-xs text-form-invalid sm:text-sm" role="alert">
              {fieldError}
            </p>
          )}
        </div>
      );
    }

    // File
    if (field.type === 'file') {
      return (
        <div>
          <Input
            id={fieldId}
            type="file"
            aria-invalid={ariaInvalid}
            aria-describedby={describedById}
            required={field.required}
            disabled={field.disabled}
            accept={field.accept}
            multiple={field.multiple}
            className={`h-11 text-sm bg-form-bg border-form-border ${field.className || ''}`}
            onChange={(e) => {
              const files = e.target.files;
              if (!files) {
                handleValueChange(field.multiple ? [] : null);
                return;
              }
              handleValueChange(field.multiple ? Array.from(files) : (files[0] ?? null));
            }}
          />
          {field.description && (
            <p id={`${fieldId}-desc`} className="mt-1.5 text-xs text-form-text-muted sm:text-sm">
              {field.description}
            </p>
          )}
          {fieldError && (
            <p className="mt-1.5 text-xs text-form-invalid sm:text-sm" role="alert">
              {fieldError}
            </p>
          )}
        </div>
      );
    }

    // Default input
    return (
      <div>
        <Input
          id={fieldId}
          aria-invalid={ariaInvalid}
          aria-describedby={describedById}
          type={field.type || 'text'}
          inputMode={field.inputMode}
          autoComplete={field.autoComplete}
          value={String(value ?? '')}
          onChange={(e) => handleValueChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          disabled={field.disabled}
          className={`h-11 px-3 text-sm bg-form-bg border-form-border text-form-text ${field.className || ''}`}
        />
        {field.description && (
          <p id={`${fieldId}-desc`} className="mt-1.5 text-xs text-form-text-muted sm:text-sm">
            {field.description}
          </p>
        )}
        {fieldError && (
          <p className="mt-1.5 text-xs text-form-invalid sm:text-sm" role="alert">
            {fieldError}
          </p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-full flex-col gap-0 p-0 sm:max-w-2xl"
        onInteractOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest('[data-time-picker-panel]')) {
            event.preventDefault();
          }
        }}
        onPointerDownOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest('[data-time-picker-panel]')) {
            event.preventDefault();
          }
        }}
        onFocusOutside={(event) => {
          const target = event.target as HTMLElement | null;
          if (target?.closest('[data-time-picker-panel]')) {
            event.preventDefault();
          }
        }}
      >
        {/* Fixed Header */}
        <DialogHeader className="flex-shrink-0 border-b border-card-border bg-card-bg px-4 py-3 sm:px-6 sm:py-4">
          <DialogTitle className="text-lg font-semibold text-card-text sm:text-xl">{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col" encType="multipart/form-data">
          {/* Scrollable content area */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <div className="space-y-4 sm:space-y-5">
              {fields.map((field) => (
                <div key={String(field.name)} className="space-y-1.5">
                  <Label htmlFor={String(field.name)} className="text-sm font-medium text-form-text">
                    {field.label}
                    {field.required && <span className="ml-1 text-form-invalid">*</span>}
                  </Label>
                  {renderField(field)}
                </div>
              ))}
            </div>
          </div>

          {/* Fixed footer */}
          {actions && actions.length > 0 && (
            <div className="flex-shrink-0 border-t border-card-border bg-card-footer-bg px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    type={action.type || 'button'}
                    variant={action.variant || 'outline'}
                    onClick={action.onClick}
                    className={`min-h-[44px] w-full text-sm sm:w-auto sm:min-h-[40px] sm:px-6 ${action.className || ''}`}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
