import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { signInFormSchema, type SignInFormSchema } from '~/routes/auth/sign-in/_schemas/sign-in.form.schema';

export interface SignInFormProps {
  onSubmit: (values: SignInFormSchema) => void;
  isSubmitting?: boolean;
  initialValues?: Partial<SignInFormSchema>;
}

export function SignInForm({ onSubmit, isSubmitting = false, initialValues }: SignInFormProps) {
  const form = useForm<SignInFormSchema>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: {
      email: '',
      password: '',
      ...initialValues,
    },
  });

  React.useEffect(() => {
    if (initialValues) {
      form.reset({
        email: initialValues.email ?? '',
        password: initialValues.password ?? '',
      });
    }
  }, [initialValues, form]);

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <FormField
          name="email"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-post</FormLabel>
              <FormControl>
                <Input {...field} type="email" autoComplete="email" placeholder="e-post" data-testid="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="password"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Passord</FormLabel>
              <FormControl>
                <Input {...field} type="password" autoComplete="current-password" data-testid="password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Logger inn…' : 'Logg inn'}
        </Button>
      </form>
    </Form>
  );
}

export { signInFormSchema as signInSchema };
export type { SignInFormSchema as SignInInput };
