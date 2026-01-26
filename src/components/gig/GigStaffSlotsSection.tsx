import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createClient } from '../../utils/supabase/client';
import { FileText, Loader2, Plus, Trash2, Users, AlertCircle } from 'lucide-react';
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

const staffAssignmentSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  user_name: z.string(),
  status: z.enum(['Requested', 'Confirmed', 'Declined']),
  compensation_type: z.enum(['rate', 'fee']),
  amount: z.string().refine((val) => {
    if (!val.trim()) return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Amount must be a positive number'),
  notes: z.string().optional(),
});

const staffSlotSchema = z.object({
  id: z.string(),
  organization_id: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  count: z.number().min(1, 'Count must be at least 1'),
  notes: z.string().optional(),
  assignments: z.array(staffAssignmentSchema),
});

const staffSlotsFormSchema = z.object({
  slots: z.array(staffSlotSchema),
});

type StaffSlotsFormData = z.infer<typeof staffSlotsFormSchema>;

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
  const [staffRoles, setStaffRoles] = useState<string[]>([]);
  const [showSlotNotes, setShowSlotNotes] = useState<number | null>(null);
  const [currentSlotNotes, setCurrentSlotNotes] = useState('');
  const [showAssignmentNotes, setShowAssignmentNotes] = useState<{ slotIndex: number; assignmentIndex: number } | null>(null);
  const [currentAssignmentNotes, setCurrentAssignmentNotes] = useState('');

  const { control, handleSubmit, formState: { errors, isDirty }, watch, reset, setValue, getValues } = useForm<StaffSlotsFormData>({
    resolver: zodResolver(staffSlotsFormSchema),
    mode: 'onChange',
    defaultValues: {
      slots: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'slots',
  });

  const handleSave = useCallback(async (data: StaffSlotsFormData) => {
    const slotsData = data.slots
      .filter(s => s.role && s.role.trim() !== '')
      .map(s => ({
        id: s.id.startsWith('temp-') || !s.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? undefined : s.id,
        organization_id: currentOrganizationId,
        role: s.role,
        count: s.count,
        notes: s.notes || null,
        assignments: (s.assignments || [])
          .filter(a => a.user_id && a.user_id.trim() !== '')
          .map(a => ({
            id: a.id.startsWith('temp-') || !a.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ? undefined : a.id,
            user_id: a.user_id,
            status: a.status,
            rate: a.compensation_type === 'rate' ? (a.amount ? parseFloat(a.amount) : null) : null,
            fee: a.compensation_type === 'fee' ? (a.amount ? parseFloat(a.amount) : null) : null,
            notes: a.notes || null,
          })),
      }));

    await updateGigStaffSlots(gigId, slotsData);
  }, [gigId, currentOrganizationId]);

  const handleSaveSuccess = useCallback((data: StaffSlotsFormData) => {
    reset(data, { keepDirty: false, keepValues: true });
  }, [reset]);

  const { saveState, triggerSave } = useAutoSave<StaffSlotsFormData>({
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
      
      const formattedSlots = organizationSlots.map((slot: any) => {
        const assignments = (slot.staff_assignments || []).map((assignment: any) => ({
          id: assignment.id,
          user_id: assignment.user_id,
          user_name: `${assignment.user?.first_name || ''} ${assignment.user?.last_name || ''}`.trim(),
          status: assignment.status || 'Requested',
          compensation_type: assignment.rate !== null ? 'rate' : 'fee',
          amount: assignment.rate !== null ? assignment.rate.toString() : (assignment.fee !== null ? assignment.fee.toString() : ''),
          notes: assignment.notes || '',
        }));

        // Pad with empty assignments if count is greater than current assignments
        const count = slot.count || 1;
        while (assignments.length < count) {
          assignments.push({
            id: `temp-${Math.random().toString(36).substr(2, 9)}`,
            user_id: '',
            user_name: '',
            status: 'Requested',
            compensation_type: 'rate',
            amount: '',
            notes: '',
          });
        }

        return {
          id: slot.id,
          organization_id: slot.organization_id,
          role: slot.role,
          count: count,
          notes: slot.notes || '',
          assignments: assignments,
        };
      });
      
      reset({ slots: formattedSlots });
    } catch (error: any) {
      console.error('Error loading staff slots:', error);
      toast.error('Failed to load staff slots');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStaffSlot = () => {
    append({
      id: `temp-${Math.random().toString(36).substr(2, 9)}`,
      role: '',
      count: 1,
      notes: '',
      assignments: [],
    });
  };

  const handleCountChange = (index: number, value: number) => {
    const currentCount = watch(`slots.${index}.assignments`).length;
    if (value > currentCount) {
      const currentAssignments = getValues(`slots.${index}.assignments`);
      const newAssignments = [...currentAssignments];
      for (let i = currentCount; i < value; i++) {
        newAssignments.push({
          id: `temp-${Math.random().toString(36).substr(2, 9)}`,
          user_id: '',
          user_name: '',
          status: 'Requested',
          compensation_type: 'rate',
          amount: '',
          notes: '',
        });
      }
      setValue(`slots.${index}.assignments`, newAssignments, { shouldDirty: true });
    } else if (value < currentCount) {
      const currentAssignments = getValues(`slots.${index}.assignments`);
      setValue(`slots.${index}.assignments`, currentAssignments.slice(0, value), { shouldDirty: true });
    }
    setValue(`slots.${index}.count`, value, { shouldDirty: true });
  };

  const handleRemoveStaffSlot = (index: number) => {
    remove(index);
  };

  const handleOpenSlotNotes = (index: number) => {
    const slot = fields[index];
    setCurrentSlotNotes(slot.notes || '');
    setShowSlotNotes(index);
  };

  const handleSaveSlotNotes = () => {
    if (showSlotNotes !== null) {
      setValue(`slots.${showSlotNotes}.notes`, currentSlotNotes, { shouldDirty: true });
      setShowSlotNotes(null);
      setCurrentSlotNotes('');
    }
  };

  const handleOpenAssignmentNotes = (slotIndex: number, assignmentIndex: number) => {
    const assignment = watch(`slots.${slotIndex}.assignments.${assignmentIndex}`);
    if (assignment) {
      setCurrentAssignmentNotes(assignment.notes || '');
      setShowAssignmentNotes({ slotIndex, assignmentIndex });
    }
  };

  const handleSaveAssignmentNotes = () => {
    if (showAssignmentNotes) {
      setValue(`slots.${showAssignmentNotes.slotIndex}.assignments.${showAssignmentNotes.assignmentIndex}.notes`, currentAssignmentNotes, { shouldDirty: true });
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
            {fields.map((slot, slotIndex) => (
              <div key={slot.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Controller
                      name={`slots.${slotIndex}.role`}
                      control={control}
                      render={({ field: roleField }) => (
                        <Select
                          value={roleField.value}
                          onValueChange={roleField.onChange}
                          disabled={isLoadingRoles}
                        >
                          <SelectTrigger className={`max-w-xs bg-white ${errors.slots?.[slotIndex]?.role ? 'border-red-500' : ''}`}>
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
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-gray-600">Required:</Label>
                      <Controller
                        name={`slots.${slotIndex}.count`}
                        control={control}
                        render={({ field: countField }) => (
                          <Input
                            type="number"
                            min="1"
                            value={countField.value}
                            onChange={(e) => handleCountChange(slotIndex, parseInt(e.target.value) || 1)}
                            className={`w-16 bg-white ${errors.slots?.[slotIndex]?.count ? 'border-red-500' : ''}`}
                          />
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenSlotNotes(slotIndex)}
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      Notes
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveStaffSlot(slotIndex)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="p-4">
                  <div className="space-y-2">
                    {watch(`slots.${slotIndex}.assignments`)?.map((assignment: any, assignmentIndex: number) => (
                      <div
                        key={assignment.id}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
                      >
                        <div className="flex-1">
                          <Controller
                            name={`slots.${slotIndex}.assignments.${assignmentIndex}.user_name`}
                            control={control}
                            render={({ field: nameField }) => (
                              <UserSelector
                                onSelect={(selectedUser) => {
                                  const fullName = `${selectedUser.first_name} ${selectedUser.last_name}`.trim();
                                  setValue(`slots.${slotIndex}.assignments.${assignmentIndex}.user_id`, selectedUser.id, { shouldDirty: true });
                                  nameField.onChange(fullName);
                                }}
                                placeholder="Search for user..."
                                value={nameField.value}
                                organizationIds={participantOrganizationIds}
                              />
                            )}
                          />
                        </div>
                        <Controller
                          name={`slots.${slotIndex}.assignments.${assignmentIndex}.status`}
                          control={control}
                          render={({ field: statusField }) => (
                            <Select
                              value={statusField.value}
                              onValueChange={statusField.onChange}
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
                          )}
                        />
                        <Controller
                          name={`slots.${slotIndex}.assignments.${assignmentIndex}.compensation_type`}
                          control={control}
                          render={({ field: compField }) => (
                            <Select
                              value={compField.value}
                              onValueChange={compField.onChange}
                            >
                              <SelectTrigger className="w-24 bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="rate">Rate</SelectItem>
                                <SelectItem value="fee">Fee</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <div className="relative w-24">
                          <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                            $
                          </span>
                          <Controller
                            name={`slots.${slotIndex}.assignments.${assignmentIndex}.amount`}
                            control={control}
                            render={({ field: amountField }) => (
                              <Input
                                {...amountField}
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                className={`pl-5 bg-white ${errors.slots?.[slotIndex]?.assignments?.[assignmentIndex]?.amount ? 'border-red-500' : ''}`}
                              />
                            )}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAssignmentNotes(slotIndex, assignmentIndex)}
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
