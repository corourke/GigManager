import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { ORG_ROLE_CONFIG } from '../utils/supabase/constants';
import { Organization, OrganizationRole } from '../utils/supabase/types';
import { createOrganization } from '../services/organization.service';

interface QuickCreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialName?: string;
  initialRoles?: OrganizationRole[];
  onCreated: (org: Organization) => void;
}

/**
 * Minimal Name + Roles create flow, reachable inline from OrganizationSelector
 * so adding a new org (venue, client, vendor) doesn't require leaving the gig.
 * Full editing (address, description, allowed domains, Google Places lookup)
 * stays on OrganizationScreen, reachable the same way it is today.
 */
export default function QuickCreateOrganizationDialog({
  open,
  onOpenChange,
  initialName = '',
  initialRoles = [],
  onCreated,
}: QuickCreateOrganizationDialogProps) {
  const [name, setName] = useState(initialName);
  const [roles, setRoles] = useState<OrganizationRole[]>(initialRoles);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setRoles(initialRoles);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialName]);

  const toggleRole = (role: OrganizationRole) => {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (roles.length === 0) {
      toast.error('Select at least one role');
      return;
    }
    setIsSubmitting(true);
    try {
      // autoJoin: false — this dialog is almost always used to reference
      // someone else's organization (a venue, client, vendor), not your own,
      // so the creator should not become an Admin of it. Mirrors
      // OrganizationScreen's "Create without Joining" option.
      const org = await createOrganization({ name: name.trim(), roles, autoJoin: false });
      toast.success(`${org.name} created`);
      onCreated(org);
      onOpenChange(false);
      setName('');
      setRoles([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Quickly add a new organization. You can fill in address, description, and other
            details later from its full profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick_org_name">Name *</Label>
            <Input
              id="quick_org_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Organization name"
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label>Roles *</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(ORG_ROLE_CONFIG) as OrganizationRole[]).map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={roles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                    disabled={isSubmitting}
                  />
                  {ORG_ROLE_CONFIG[role].label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isSubmitting}
            className="bg-sky-500 hover:bg-sky-600 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Organization'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
