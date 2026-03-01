import { useState, useEffect, useRef } from 'react';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Check, Mail, Phone, User, User2Icon } from 'lucide-react';
import { cn } from '~/lib/utils';
import { ContactFormDialog } from '../../admin/contacts/_components/contact.form-dialog';
import { Label } from '~/components/ui/label';
import type { ContactDto } from '~/api/generated/base';

type ContactSelectorProps = {
  contacts: ContactDto[];
  selectedContactId: number | null;
  onSelectContact: (contact: ContactDto) => void;
  pagination: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  initialSearch?: string;
};

export function ContactSelector({
  contacts,
  selectedContactId,
  onSelectContact,
  pagination,
  onPageChange,
  onSearchChange,
  initialSearch = '',
}: ContactSelectorProps) {
  const [searchFilter, setSearchFilter] = useState(initialSearch);
  const onSearchChangeRef = useRef(onSearchChange);

  useEffect(() => {
    setSearchFilter(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    onSearchChangeRef.current = onSearchChange;
  }, [onSearchChange]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearchChangeRef.current(searchFilter);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchFilter]);

  const formatName = (contact: ContactDto) => {
    const parts = [contact.givenName, contact.familyName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Ukjent';
  };

  const getInitials = (contact: ContactDto) => {
    const first = contact.givenName?.charAt(0)?.toUpperCase() || '';
    const last = contact.familyName?.charAt(0)?.toUpperCase() || '';
    return first + last || 'U';
  };

  const canPreviousPage = pagination.page > 0;
  const canNextPage = pagination.page < pagination.totalPages - 1;

  return (
    <div className="space-y-3 md:space-y-4 p-2">
      <Label htmlFor="date" className="flex items-center gap-2 text-sm font-medium px-1">
        <User2Icon className="h-4 w-4" />
        <span>Velg eller legg til kontakt</span>
      </Label>
      <div className="flex flex-col gap-2">
        <Input
          placeholder="Søk kontakt…"
          value={searchFilter}
          onChange={(e) => {
            setSearchFilter(e.target.value);
          }}
          className="h-11 text-sm md:h-10 md:text-base"
        />
        <ContactFormDialog
          trigger={
            <Button variant="outline" className="w-full">
              Legg til kontakt
            </Button>
          }
        />
      </div>

      <div className="space-y-2 md:space-y-1.5 h-[450px] md:h-[350px] overflow-y-auto p-3 md:p-4 border rounded-lg">
        {contacts.length === 0 ? (
          <div className="py-12 md:py-8 text-center">
            <User className="h-12 w-12 md:h-10 md:w-10 mx-auto text-muted-foreground/50 mb-3 md:mb-2" />
            <p className="text-sm md:text-xs text-muted-foreground">
              {searchFilter ? 'Ingen kontakter funnet' : 'Ingen kontakter'}
            </p>
          </div>
        ) : (
          contacts.map((contact) => {
            const isSelected = contact.id === selectedContactId;
            return (
              <div
                key={contact.id}
                className={cn(
                  'relative group cursor-pointer rounded-lg border p-3 md:p-2 transition-all',
                  'hover:shadow-sm hover:border-primary/50',
                  'active:scale-[0.98]',
                  isSelected && 'border-primary bg-primary/5 shadow-sm',
                )}
                onClick={() => onSelectContact(contact)}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 md:-top-1.5 md:-right-1.5 bg-primary text-primary-foreground rounded-full p-1 md:p-0.5">
                    <Check className="h-3 w-3 md:h-2.5 md:w-2.5" />
                  </div>
                )}

                <div className="flex items-start gap-3 md:gap-2">
                  <div
                    className={cn(
                      'flex-shrink-0 h-10 w-10 md:h-8 md:w-8 rounded-full flex items-center justify-center font-semibold text-sm md:text-xs',
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
                    )}
                  >
                    {getInitials(contact)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1 md:space-y-0.5">
                    <div className="font-semibold text-sm md:text-xs truncate">{formatName(contact)}</div>

                    <div className="space-y-1 md:space-y-0.5">
                      {contact.email && (
                        <div className="flex items-center gap-2 md:gap-1.5 text-xs md:text-[10px] text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 md:h-2.5 md:w-2.5 flex-shrink-0" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                      {contact.mobileNumber && (
                        <div className="flex items-center gap-2 md:gap-1.5 text-xs md:text-[10px] text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 md:h-2.5 md:w-2.5 flex-shrink-0" />
                          <span className="truncate">{contact.mobileNumber}</span>
                        </div>
                      )}
                      {!contact.email && !contact.mobileNumber && (
                        <div className="text-xs md:text-[10px] text-muted-foreground italic">Ingen kontaktinfo</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-xs md:text-[10px] text-muted-foreground pt-3 md:pt-1.5 border-t">
        <div className="font-medium text-center md:text-left">
          Side {pagination.page + 1} av {pagination.totalPages}
          <span className="text-muted-foreground/70 ml-1">({pagination.totalElements} totalt)</span>
        </div>

        <div className="flex items-center gap-2 md:gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={!canPreviousPage}
            className="flex-1 md:flex-none h-11 md:h-auto"
          >
            Forrige
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!canNextPage}
            className="flex-1 md:flex-none h-11 md:h-auto"
          >
            Neste
          </Button>
        </div>
      </div>
    </div>
  );
}
