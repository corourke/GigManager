import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { createClient } from '../../utils/supabase/client';
import { FileText, Loader2, Plus, Save, Trash2, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import UserSelector from '../UserSelector';
import { getGig, updateGigStaffSlots } from '../../utils/api';
import { useAutoSave } from '../../utils/hooks/useAutoSave';
import SaveStateIndicator from './SaveStateIndicator';

interface StaffAssignmentData {
  id: string;
  user_id: string;
  user_name: string;
  status: 'Requested' | 'Confirmed' | 'Declined';
  compensation_type: 'rate' | 'fee';
  amount: string;
  notes: string;
}

interface StaffSlotData {
  id: string;
  organization_id?: string;
  role: string;
  count: number;
  notes: string;
  assignments: StaffAssignmentData[];
}

interface GigStaffSlotsSectionProps {
  gigId: string;
  currentOrganizationId: string;
  participantOrganizationIds: string[];
}

export default function GigStaffSlotsSection({
  gigId,
  currentOrganizationId,
  participantOrganizationIds,
}: GigStaffSlotsSectionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [staffSlots, setStaffSlots] = useState<StaffSlotData[]>([]);
  const [staffRoles, setStaffRoles] = useState<string[]>([]);
  const [showSlotNotes, setShowSlotNotes] = useState<string | null>(null);
  const [currentSlotNotes, setCurrentSlotNotes] = useState('');
  const [showAssignmentNotes, setShowAssignmentNotes] = useState<{ slotId: string; assignmentId: string } | null>(null);
  const [currentAssignmentNotes, setCurrentAssignmentNotes] = useState('');

  const { saveState, triggerSave } = useAutoSave<StaffSlotData[]>({
    gigId,
    onSave: async (data) => {
      const slotsData = data
        .filter(s => s.role && s.role.trim() !== '')
        .map(s => ({
          id: s.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? s.id : undefined,
          organization_id: currentOrganizationId,
          role: s.role,
          count: s.count,
          notes: s.notes || null,
          assignments: (s.assignments || [])
            .filter(a => a.user_id && a.user_id.trim() !== '')
            .map(a => ({
              id: a.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? a.id : undefined,
              user_id: a.user_id,
              status: a.status,
              rate: a.compensation_type === 'rate' ? (a.amount ? parseFloat(a.amount) : null) : null,
              fee: a.compensation_type === 'fee' ? (a.amount ? parseFloat(a.amount) : null) : null,
              notes: a.notes || null,
            })),
        }));

      await updateGigStaffSlots(gigId, slotsData);
    }
  });

  const updateStaffSlotsAndSave = useCallback((newSlots: StaffSlotData[]) => {
    setStaffSlots(newSlots);
    triggerSave(newSlots);
  }, [triggerSave]);

  useEffect(() => {
    loadStaffRoles();
    loadStaffSlotsData();
  }, [gigId]);

  const loadStaffRoles = async () => {
    setIsLoadingRoles(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setIsLoadingRoles(false);
        return;
      }

      const { data, error } = await supabase
        .from('staff_roles')
        .select('name')
        .order('name');

      if (error) throw error;
      setStaffRoles(data?.map(r => r.name) || []);
    } catch (error: any) {
      console.error('Error loading staff roles:', error);
      toast.error('Failed to load staff roles');
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const loadStaffSlotsData = async () => {
    setIsLoading(true);
    try {
      const gig = await getGig(gigId);
      const loadedSlots = gig.staff_slots || [];
      
      const organizationSlots = loadedSlots.filter(
        (slot: any) => slot.organization_id === currentOrganizationId
      );
      
      const formattedSlots = organizationSlots.map((slot: any) => ({
        id: slot.id,
        organization_id: slot.organization_id,
        role: slot.role,
        count: slot.count || 1,
        notes: slot.notes || '',
        assignments: (slot.staff_assignments || []).map((assignment: any) => ({
          id: assignment.id,
          user_id: assignment.user_id,
          user_name: `${assignment.user?.first_name || ''} ${assignment.user?.last_name || ''}`.trim(),
          status: assignment.status || 'Requested',
          compensation_type: assignment.rate !== null ? 'rate' : 'fee',
          amount: assignment.rate !== null ? assignment.rate.toString() : (assignment.fee !== null ? assignment.fee.toString() : ''),
          notes: assignment.notes || '',
        })),
      }));
      
      setStaffSlots(formattedSlots);
    } catch (error: any) {
      console.error('Error loading staff slots:', error);
      toast.error('Failed to load staff slots');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStaffSlot = () => {
    const newSlot: StaffSlotData = {
      id: Math.random().toString(36).substr(2, 9),
      role: '',
      count: 1,
      notes: '',
      assignments: [],
    };
    updateStaffSlotsAndSave([...staffSlots, newSlot]);
  };

  const handleUpdateStaffSlot = (id: string, field: keyof Omit<StaffSlotData, 'assignments'>, value: string | number) => {
    updateStaffSlotsAndSave(staffSlots.map(s => {
      if (s.id === id) {
        const updatedSlot = { ...s, [field]: value };
        
        if (field === 'count' && typeof value === 'number') {
          const currentCount = s.assignments.length;
          if (value > currentCount) {
            const newAssignments = [...s.assignments];
            for (let i = currentCount; i < value; i++) {
              newAssignments.push({
                id: Math.random().toString(36).substr(2, 9),
                user_id: '',
                user_name: '',
                status: 'Requested',
                compensation_type: 'rate',
                amount: '',
                notes: '',
              });
            }
            updatedSlot.assignments = newAssignments;
          } else if (value < currentCount) {
            updatedSlot.assignments = s.assignments.slice(0, value);
          }
        }
        
        return updatedSlot;
      }
      return s;
    }));
  };

  const handleRemoveStaffSlot = (id: string) => {
    updateStaffSlotsAndSave(staffSlots.filter(s => s.id !== id));
  };

  const handleOpenSlotNotes = (id: string) => {
    const slot = staffSlots.find(s => s.id === id);
    if (slot) {
      setCurrentSlotNotes(slot.notes);
      setShowSlotNotes(id);
    }
  };

  const handleSaveSlotNotes = () => {
    if (showSlotNotes) {
      handleUpdateStaffSlot(showSlotNotes, 'notes', currentSlotNotes);
      setShowSlotNotes(null);
      setCurrentSlotNotes('');
    }
  };

  const handleUpdateStaffAssignment = (slotId: string, assignmentId: string, field: keyof StaffAssignmentData, value: string) => {
    updateStaffSlotsAndSave(staffSlots.map(slot => 
      slot.id === slotId
        ? {
            ...slot,
            assignments: slot.assignments.map(a => 
              a.id === assignmentId ? { ...a, [field]: value } : a
            )
          }
        : slot
    ));
  };

  const handleOpenAssignmentNotes = (slotId: string, assignmentId: string) => {
    const slot = staffSlots.find(s => s.id === slotId);
    const assignment = slot?.assignments.find(a => a.id === assignmentId);
    if (assignment) {
      setCurrentAssignmentNotes(assignment.notes);
      setShowAssignmentNotes({ slotId, assignmentId });
    }
  };

  const handleSaveAssignmentNotes = () => {
    if (showAssignmentNotes) {
      handleUpdateStaffAssignment(showAssignmentNotes.slotId, showAssignmentNotes.assignmentId, 'notes', currentAssignmentNotes);
      setShowAssignmentNotes(null);
      setCurrentAssignmentNotes('');
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
              <Users className="w-5 h-5 text-gray-600" />
              <CardTitle>Staff Assignments</CardTitle>
              <SaveStateIndicator state={saveState} />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddStaffSlot}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Staff Slot
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {staffSlots.map((slot) => (
              <div key={slot.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Select
                      value={slot.role}
                      onValueChange={(value) => handleUpdateStaffSlot(slot.id, 'role', value)}
                      disabled={isLoadingRoles}
                    >
                      <SelectTrigger className="max-w-xs bg-white">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffRoles.length > 0 ? (
                          staffRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>
                            {isLoadingRoles ? 'Loading roles...' : 'No roles available'}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-gray-600">Required:</Label>
                      <Input
                        type="number"
                        min="1"
                        value={slot.count}
                        onChange={(e) => handleUpdateStaffSlot(slot.id, 'count', parseInt(e.target.value) || 1)}
                        className="w-16 bg-white"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenSlotNotes(slot.id)}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Notes
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveStaffSlot(slot.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="p-4">
                  <div className="space-y-2">
                    {slot.assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
                      >
                        <div className="flex-1">
                          <UserSelector
                            onSelect={(selectedUser) => {
                              const fullName = `${selectedUser.first_name} ${selectedUser.last_name}`.trim();
                              handleUpdateStaffAssignment(slot.id, assignment.id, 'user_id', selectedUser.id);
                              handleUpdateStaffAssignment(slot.id, assignment.id, 'user_name', fullName);
                            }}
                            placeholder="Search for user..."
                            value={assignment.user_name}
                            organizationIds={participantOrganizationIds}
                          />
                        </div>
                        <Select
                          value={assignment.status}
                          onValueChange={(value) => handleUpdateStaffAssignment(slot.id, assignment.id, 'status', value)}
                        >
                          <SelectTrigger className="w-32 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Requested">Requested</SelectItem>
                            <SelectItem value="Confirmed">Confirmed</SelectItem>
                            <SelectItem value="Declined">Declined</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={assignment.compensation_type}
                          onValueChange={(value) => handleUpdateStaffAssignment(slot.id, assignment.id, 'compensation_type', value)}
                        >
                          <SelectTrigger className="w-24 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rate">Rate</SelectItem>
                            <SelectItem value="fee">Fee</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="relative w-24">
                          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                            $
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={assignment.amount}
                            onChange={(e) => handleUpdateStaffAssignment(slot.id, assignment.id, 'amount', e.target.value)}
                            placeholder="0.00"
                            className="pl-5 bg-white"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAssignmentNotes(slot.id, assignment.id)}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
        </div>
        </CardContent>
      </Card>

      <Dialog open={showSlotNotes !== null} onOpenChange={(open) => {
        if (!open) {
          setShowSlotNotes(null);
          setCurrentSlotNotes('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Staff Slot Notes</DialogTitle>
            <DialogDescription>
              Add notes about this staff slot.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={currentSlotNotes}
            onChange={(e) => setCurrentSlotNotes(e.target.value)}
            placeholder="Enter notes..."
            rows={6}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowSlotNotes(null);
              setCurrentSlotNotes('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveSlotNotes}>
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignmentNotes !== null} onOpenChange={(open) => {
        if (!open) {
          setShowAssignmentNotes(null);
          setCurrentAssignmentNotes('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assignment Notes</DialogTitle>
            <DialogDescription>
              Add notes about this staff assignment.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={currentAssignmentNotes}
            onChange={(e) => setCurrentAssignmentNotes(e.target.value)}
            placeholder="Enter notes..."
            rows={6}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAssignmentNotes(null);
              setCurrentAssignmentNotes('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveAssignmentNotes}>
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
