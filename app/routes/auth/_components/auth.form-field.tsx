// components/auth/auth-form-field.tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AuthFormFieldProps {
  id: string;
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password';
  autoComplete?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
}

export function AuthFormField({
  id,
  name,
  label,
  type = 'text',
  autoComplete,
  placeholder,
  defaultValue,
  required = false,
  disabled = false,
}: AuthFormFieldProps) {
  return (
    <div className="space-y-3">
      <Label htmlFor={id} className="text-xs font-medium uppercase tracking-[0.12em] text-form-text">
        {label}
      </Label>
      <Input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
      />
    </div>
  );
}
