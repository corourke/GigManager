import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useCreateAccessRequest } from '../../hooks/useAccessRequests';
import type { RequestableRole } from '../../services/accessRequest.service';

interface RequestAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  organizationName: string;
}

/** Lets a Viewer/Staff member ask an org's Admin (or, if it has none yet, a
 * platform moderator) to grant them Manager or Admin — issue #33's recovery
 * path for an org that's stuck with no one able to manage it. */
export default function RequestAccessDialog({
  open,
  onOpenChange,
  orgId,
  organizationName,
}: RequestAccessDialogProps) {
  const [requestedRole, setRequestedRole] = useState<RequestableRole>('Manager');
  const [message, setMessage] = useState('');
  const createRequest = useCreateAccessRequest(orgId);

  const handleSubmit = async () => {
    try {
      await createRequest.mutateAsync({ requestedRole, message: message.trim() || undefined });
      toast.success('Access request submitted');
      setMessage('');
      setRequestedRole('Manager');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating access request:', error);
      toast.error(error.message || 'Failed to submit access request');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Access</DialogTitle>
          <DialogDescription>
            Ask {organizationName}'s Admin — or, if it doesn't have one yet, a platform moderator — to grant you a higher role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Requested role</Label>
            <RadioGroup value={requestedRole} onValueChange={(v) => setRequestedRole(v as RequestableRole)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Manager" id="request-role-manager" />
                <Label htmlFor="request-role-manager" className="font-normal">Manager</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Admin" id="request-role-admin" />
                <Label htmlFor="request-role-admin" className="font-normal">Admin</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="request-message">Message (optional)</Label>
            <Textarea
              id="request-message"
              placeholder="Why do you need this access?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createRequest.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createRequest.isPending} className="bg-sky-500 hover:bg-sky-600 text-white">
            {createRequest.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
