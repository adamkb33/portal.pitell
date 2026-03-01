import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import type { PublicCompanyUserDto } from '~/api/generated/base';

export type CompanyUserPickerProps = {
  companyUsers: PublicCompanyUserDto[];
  selectedUserId: number | null;
  onChange: (id: number | null) => void;
};

export function CompanyUserPicker({ companyUsers, selectedUserId, onChange }: CompanyUserPickerProps) {
  const toggleUser = (userId: number) => {
    onChange(selectedUserId === userId ? null : userId);
  };

  const selectedUser = selectedUserId ? companyUsers.find((u) => u.userId === selectedUserId) : null;

  return (
    <div className="space-y-4">
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold mb-3">Velg ansatt</h4>
          <div className="flex flex-wrap gap-2">
            {companyUsers.map((user) => {
              const selected = selectedUserId === user.userId;
              return (
                <Button
                  key={user.userId}
                  variant={selected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleUser(user.userId)}
                >
                  {user.email}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedUser && (
        <div className="pt-2">
          <h5 className="text-sm text-muted-foreground mb-2">Valgt ansatt:</h5>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{selectedUser.email}</Badge>
          </div>
        </div>
      )}
    </div>
  );
}
