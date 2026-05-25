import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Building2, FileText, Loader2, Plus, Trash2, AlertCircle, Eye, Pencil } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import OrganizationSelector from '../OrganizationSelector';
import { getGig, updateGigParticipants } from '../../services/gig.service';
import { createClient } from '../../utils/supabase/client';
import { 
  Organization, 
  OrganizationRole 
} from '../../utils/supabase/types';
import { ORG_ROLE_CONFIG } from '../../utils/supabase/constants';
import { useAutoSave } from '../../utils/hooks/useAutoSave';
import SaveStateIndicator from './SaveStateIndicator';

const participantSchema = z.object({
  id: z.string(),
  organization_id: z.string().min(1, 'Organization is required'),
  organization_name: z.string(),
  role: z.string().min(1, 'Role is required'),
  notes: z.string().optional(),
  organization: z.any().optional(), // For the selector
});

const participantsFormSchema = z.object({
  participants: z.array(participantSchema),
});

type ParticipantsFormData = z.infer<typeof participantsFormSchema>;

interface ParticipantData {
  id: string;
  organization_id: string;
  organization_name: string;
  organization?: Organization | null;
  role: string;
  notes: string;
}

interface GigParticipantsSectionProps {
  gigId: string;
  currentOrganizationId: string;
  currentOrganizationName: string;
  currentOrganizationRole: OrganizationRole;
  currentOrganizationRoles?: OrganizationRole[];
  userRole?: string;
  onEditOrganization?: (org: Organization) => void;
}

export default function GigParticipantsSection({
  gigId,
  currentOrganizationId,
  currentOrganizationName,
  currentOrganizationRole,
  currentOrganizationRoles,
  userRole,
  onEditOrganization,
}: GigParticipantsSectionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showParticipantNotes, setShowParticipantNotes] = useState<number | null>(null);
  const [currentParticipantNotes, setCurrentParticipantNotes] = useState('');
  const [viewingOrganization, setViewingOrganization] = useState<Organization | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  const { control, handleSubmit, formState: { errors, isDirty }, watch, reset, setValue } = useForm<ParticipantsFormData>({
    resolver: zodResolver(participantsFormSchema),
    mode: 'onChange',
    defaultValues: {
      participants: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'participants',
  });

  const handleSave = useCallback(async (data: ParticipantsFormData) => {
    const participantsData = data.participants
      .filter(p => p.organization_id && p.organization_id.trim() !== '' && p.role && p.role.trim() !== '')
      .map(p => ({
        id: p.id.startsWith('temp-') || p.id === 'current-org' || !p.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? undefined : p.id,
        organization_id: p.organization_id,
        role: p.role,
        notes: p.notes || null,
      }));

    await updateGigParticipants(gigId, participantsData);
  }, [gigId]);

  const handleSaveSuccess = useCallback((data: ParticipantsFormData) => {
    reset(data, { keepDirty: false, keepValues: true });
  }, [reset]);

  const { saveState, triggerSave } = useAutoSave<ParticipantsFormData>({
    gigId,
    onSave: handleSave,
    onSuccess: handleSaveSuccess,
    debounceMs: 1000
  });

  const formValues = watch();

  useEffect(() => {
    if (isDirty) {
      const isValid = Object.keys(errors).length === 0;
      if (isValid) {
        triggerSave(formValues);
      }
    }
  }, [formValues, isDirty, errors, triggerSave]);

  useEffect(() => {
    loadParticipantsData();
  }, [gigId]);

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) return;
      const { data } = await supabase.rpc('user_is_admin', { user_uuid: session.user.id });
      setIsUserAdmin(!!data);
    };
    checkAdmin();
  }, []);

  const loadParticipantsData = async () => {
    setIsLoading(true);
    try {
      const gig = await getGig(gigId);
      
      const loadedParticipants = (gig.participants || []).map((p: any) => ({
        id: p.id,
        organization_id: p.organization_id,
        organization_name: p.organization_name,
        role: p.role,
        notes: p.notes || '',
        organization: p.organization || (p.organization_id && p.organization_name ? {
          id: p.organization_id,
          name: p.organization_name,
          roles: [p.role] as OrganizationRole[],
        } : null)
      }));
      
      const allCurrentOrgRoles = currentOrganizationRoles && currentOrganizationRoles.length > 0
        ? currentOrganizationRoles
        : [currentOrganizationRole];

      let initialParticipants = [...loadedParticipants];
      if (initialParticipants.length === 0 || !initialParticipants.some((p: any) => p.organization_id === currentOrganizationId)) {
        initialParticipants = [
          {
            id: 'current-org',
            organization_id: currentOrganizationId,
            organization_name: currentOrganizationName,
            role: currentOrganizationRole,
            notes: '',
            organization: {
              id: currentOrganizationId,
              name: currentOrganizationName,
              roles: allCurrentOrgRoles,
            }
          },
          ...initialParticipants,
        ];
      }
      
      reset({ participants: initialParticipants });
    } catch (error: any) {
      console.error('Error loading participants:', error);
      toast.error('Failed to load participants');
      const allCurrentOrgRoles = currentOrganizationRoles && currentOrganizationRoles.length > 0
        ? currentOrganizationRoles
        : [currentOrganizationRole];
      reset({
        participants: [
          {
            id: 'current-org',
            organization_id: currentOrganizationId,
            organization_name: currentOrganizationName,
            role: currentOrganizationRole,
            notes: '',
            organization: {
              id: currentOrganizationId,
              name: currentOrganizationName,
              roles: allCurrentOrgRoles,
            }
          },
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddParticipant = () => {
    append({
      id: `temp-${Math.random().toString(36).substr(2, 9)}`,
      organization_id: '',
      organization_name: '',
      organization: null,
      role: '',
      notes: '',
    });
  };

  const handleRemoveParticipant = (index: number) => {
    const participant = fields[index];
    if (participant.id === 'current-org' || participant.organization_id === currentOrganizationId) {
      toast.error('Cannot remove the current organization from participants');
      return;
    }
    remove(index);
  };

  const handleOpenParticipantNotes = (index: number) => {
    const participant = fields[index];
    setCurrentParticipantNotes(participant.notes || '');
    setShowParticipantNotes(index);
  };

  const handleSaveParticipantNotes = () => {
    if (showParticipantNotes !== null) {
      setValue(`participants.${showParticipantNotes}.notes`, currentParticipantNotes, { shouldDirty: true });
      setShowParticipantNotes(null);
      setCurrentParticipantNotes('');
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-sky-500 mb-2" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-600" />
            <CardTitle>Participants</CardTitle>
            <SaveStateIndicator state={saveState} />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddParticipant}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Participant
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead className="w-[140px]">Actions</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <Controller
                        name={`participants.${index}.role`}
                        control={control}
                        render={({ field: selectField }) => (
                          <Select
                            value={selectField.value}
                            onValueChange={selectField.onChange}
                            disabled={field.id === 'current-org'}
                          >
                            <SelectTrigger className={errors.participants?.[index]?.role ? 'border-red-500' : ''}>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
  {Object.keys(ORG_ROLE_CONFIG).map((type) => (
    <SelectItem key={type} value={type}>
      {type}
    </SelectItem>
  ))}
</SelectContent>
                          </Select>
                        )}
                      />
                      {errors.participants?.[index]?.role && (
                        <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.participants[index]?.role?.message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {field.id === 'current-org' ? (
                        <div className="text-sm text-gray-900 py-2">
                          {field.organization_name}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Controller
                            name={`participants.${index}.organization`}
                            control={control}
                            render={({ field: orgField }) => (
                              <OrganizationSelector
                                onSelect={(org) => {
                                  orgField.onChange(org);
                                  if (org) {
                                    setValue(`participants.${index}.organization_id`, org.id, { shouldDirty: true });
                                    setValue(`participants.${index}.organization_name`, org.name, { shouldDirty: true });
                                  } else {
                                    setValue(`participants.${index}.organization_id`, '', { shouldDirty: true });
                                    setValue(`participants.${index}.organization_name`, '', { shouldDirty: true });
                                  }
                                }}
                                selectedOrganization={orgField.value || null}
                                organizationRole={watch(`participants.${index}.role`) as OrganizationRole || undefined}
                                placeholder="Search organizations..."
                                className={errors.participants?.[index]?.organization_id ? 'border-red-500' : ''}
                              />
                            )}
                          />
                          {errors.participants?.[index]?.organization_id && (
                            <p className="text-[10px] text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {errors.participants[index]?.organization_id?.message}
                            </p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenParticipantNotes(index)}
                          title="Notes"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        {field.organization && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingOrganization(field.organization as Organization)}
                              title="View Organization"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {isUserAdmin && onEditOrganization && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onEditOrganization!(field.organization as Organization)}
                                title="Edit Organization"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveParticipant(index)}
                        disabled={field.id === 'current-org'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>

      <Dialog open={showParticipantNotes !== null} onOpenChange={(open) => {
        if (!open) {
          setShowParticipantNotes(null);
          setCurrentParticipantNotes('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Participant Notes</DialogTitle>
            <DialogDescription>
              Add notes about this participant's role in the gig.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={currentParticipantNotes}
            onChange={(e) => setCurrentParticipantNotes(e.target.value)}
            placeholder="Enter notes..."
            rows={6}
            onFocus={(e) => {
              const len = e.target.value.length;
              e.target.setSelectionRange(len, len);
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowParticipantNotes(null);
              setCurrentParticipantNotes('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveParticipantNotes}>
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewingOrganization !== null} onOpenChange={(open) => {
        if (!open) setViewingOrganization(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Organization Details</DialogTitle>
          </DialogHeader>
          {viewingOrganization && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Name</p>
                <p className="text-sm text-gray-900">{viewingOrganization.name}</p>
              </div>
              {viewingOrganization.roles && viewingOrganization.roles.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Roles</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {viewingOrganization.roles.map(role => (
                      <Badge key={role} variant="outline" className="text-[10px]">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {viewingOrganization.phone_number && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Phone</p>
                  <p className="text-sm text-gray-900">{viewingOrganization.phone_number}</p>
                </div>
              )}
              {viewingOrganization.address_line1 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Address</p>
                  <p className="text-sm text-gray-900">
                    {[
                      viewingOrganization.address_line1,
                      viewingOrganization.address_line2,
                      viewingOrganization.city,
                      viewingOrganization.state,
                      viewingOrganization.postal_code,
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
              {!viewingOrganization.address_line1 && (viewingOrganization.city || viewingOrganization.state) && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Location</p>
                  <p className="text-sm text-gray-900">
                    {[viewingOrganization.city, viewingOrganization.state].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
              {viewingOrganization.url && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Website</p>
                  <a href={viewingOrganization.url} target="_blank" rel="noopener noreferrer" className="text-sm text-sky-600 hover:underline">
                    {viewingOrganization.url}
                  </a>
                </div>
              )}
              {viewingOrganization.description && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Description</p>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{viewingOrganization.description}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewingOrganization(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
