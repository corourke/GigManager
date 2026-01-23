import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Building2, FileText, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import OrganizationSelector from '../OrganizationSelector';
import { getGig, updateGig } from '../../utils/api';
import type { Organization, OrganizationType } from '../../App';

interface ParticipantData {
  id: string;
  organization_id: string;
  organization_name: string;
  organization?: Organization | null;
  role: string;
  notes: string;
}

const ORGANIZATION_TYPES: OrganizationType[] = [
  'Production',
  'Sound',
  'Lighting',
  'Staging',
  'Rentals',
  'Venue',
  'Act',
  'Agency',
];

interface GigParticipantsSectionProps {
  gigId: string;
  currentOrganizationId: string;
  currentOrganizationName: string;
  currentOrganizationType: OrganizationType;
}

export default function GigParticipantsSection({
  gigId,
  currentOrganizationId,
  currentOrganizationName,
  currentOrganizationType,
}: GigParticipantsSectionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [showParticipantNotes, setShowParticipantNotes] = useState<string | null>(null);
  const [currentParticipantNotes, setCurrentParticipantNotes] = useState('');

  useEffect(() => {
    loadParticipantsData();
  }, [gigId]);

  const loadParticipantsData = async () => {
    setIsLoading(true);
    try {
      const gig = await getGig(gigId);
      
      const loadedParticipants = (gig.participants || []).map((p: any) => ({
        ...p,
        organization: p.organization || (p.organization_id && p.organization_name ? {
          id: p.organization_id,
          name: p.organization_name,
          type: p.role as OrganizationType,
        } : null)
      }));
      
      if (loadedParticipants.length === 0 || !loadedParticipants.some((p: any) => p.organization_id === currentOrganizationId)) {
        setParticipants([
          {
            id: 'current-org',
            organization_id: currentOrganizationId,
            organization_name: currentOrganizationName,
            role: currentOrganizationType,
            notes: '',
          },
          ...loadedParticipants,
        ]);
      } else {
        setParticipants(loadedParticipants);
      }
    } catch (error: any) {
      console.error('Error loading participants:', error);
      toast.error('Failed to load participants');
      setParticipants([
        {
          id: 'current-org',
          organization_id: currentOrganizationId,
          organization_name: currentOrganizationName,
          role: currentOrganizationType,
          notes: '',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddParticipant = () => {
    const newParticipant: ParticipantData = {
      id: Math.random().toString(36).substr(2, 9),
      organization_id: '',
      organization_name: '',
      organization: null,
      role: '',
      notes: '',
    };
    setParticipants([...participants, newParticipant]);
  };

  const handleUpdateParticipant = (id: string, field: keyof ParticipantData, value: string) => {
    setParticipants(participants.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const handleRemoveParticipant = (id: string) => {
    if (id === 'current-org') {
      toast.error('Cannot remove the current organization from participants');
      return;
    }
    setParticipants(participants.filter(p => p.id !== id));
  };

  const handleOpenParticipantNotes = (id: string) => {
    const participant = participants.find(p => p.id === id);
    if (participant) {
      setCurrentParticipantNotes(participant.notes);
      setShowParticipantNotes(id);
    }
  };

  const handleSaveParticipantNotes = () => {
    if (showParticipantNotes) {
      handleUpdateParticipant(showParticipantNotes, 'notes', currentParticipantNotes);
      setShowParticipantNotes(null);
      setCurrentParticipantNotes('');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const participantsData = participants
        .filter(p => p.organization_id && p.organization_id.trim() !== '' && p.role && p.role.trim() !== '')
        .map(p => ({
          id: p.id.startsWith('current-org') || !p.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? undefined : p.id,
          organization_id: p.organization_id,
          role: p.role,
          notes: p.notes || null,
        }));

      await updateGig(gigId, {
        participants: participantsData,
      });
      
      toast.success('Participants saved');
      await loadParticipantsData();
    } catch (error: any) {
      console.error('Error saving participants:', error);
      toast.error('Failed to save participants');
    } finally {
      setIsSaving(false);
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
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddParticipant}
              disabled={isSaving}
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
                    <TableHead className="w-[100px]">Notes</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell>
                        <Select
                          value={participant.role}
                          onValueChange={(value) => handleUpdateParticipant(participant.id, 'role', value)}
                          disabled={isSaving || participant.id === 'current-org'}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ORGANIZATION_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {participant.id === 'current-org' ? (
                          <div className="text-sm text-gray-900 py-2">
                            {participant.organization_name}
                          </div>
                        ) : (
                          <OrganizationSelector
                            onSelect={(org) => {
                              if (org) {
                                setParticipants(participants.map(p => 
                                  p.id === participant.id ? {
                                    ...p,
                                    organization_id: org.id,
                                    organization_name: org.name,
                                    organization: org,
                                  } : p
                                ));
                              } else {
                                setParticipants(participants.map(p => 
                                  p.id === participant.id ? {
                                    ...p,
                                    organization_id: '',
                                    organization_name: '',
                                    organization: null,
                                  } : p
                                ));
                              }
                            }}
                            selectedOrganization={participant.organization || null}
                            organizationType={participant.role ? participant.role as OrganizationType : undefined}
                            placeholder="Search organizations..."
                            disabled={isSaving}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenParticipantNotes(participant.id)}
                          disabled={isSaving}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveParticipant(participant.id)}
                          disabled={isSaving || participant.id === 'current-org'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
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
    </>
  );
}
