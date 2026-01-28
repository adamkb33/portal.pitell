import * as React from 'react';
import { cn } from '~/lib/utils';
import { ENV } from '~/api/config/env';
import { GoogleSignInButton } from '../sign-in/_components/google-sign-in-button';

type ProviderButtonsProps = {
  disabled?: boolean;
  showDivider?: boolean;
  dividerLabel?: string;
  className?: string;
  providers?: Array<'google'>;
};

const googleClientId = ENV.GOOGLE_CLIENT_ID;

export function ProviderButtons({
  disabled = false,
  showDivider = true,
  dividerLabel = 'Eller',
  className,
  providers = ['google'],
}: ProviderButtonsProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const hasGoogle = providers.includes('google') && !!googleClientId;
  const hasAnyProvider = hasGoogle;

  if (!hasAnyProvider) return null;

  return (
    <>
      {/* Hidden inputs for provider authentication */}
      <input type="hidden" name="provider" defaultValue="" />
      <input type="hidden" name="idToken" defaultValue="" />
      
      <div ref={containerRef} className={cn('space-y-3', className)}>
        {hasGoogle ? (
          <GoogleSignInButton 
            onCredential={(token) => {
              // Set hidden inputs and submit the closest parent form.
              const form = containerRef.current?.closest('form');
              if (form) {
                const providerInput = form.querySelector<HTMLInputElement>('input[name="provider"]');
                const tokenInput = form.querySelector<HTMLInputElement>('input[name="idToken"]');
                if (providerInput) providerInput.value = 'GOOGLE';
                if (tokenInput) tokenInput.value = token;
                form.requestSubmit();
              }
            }}
            disabled={disabled} 
          />
        ) : null}
        
        {showDivider ? (
          <div className="flex items-center gap-3 py-2">
            <span className="h-px flex-1 bg-form-border" />
            <span className="text-xs font-medium uppercase tracking-wide text-form-text-muted">{dividerLabel}</span>
            <span className="h-px flex-1 bg-form-border" />
          </div>
        ) : null}
      </div>
    </>
  );
}
