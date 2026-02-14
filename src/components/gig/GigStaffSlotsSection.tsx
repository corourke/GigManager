import { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { createClient } from '../../utils/supabase/client';
import { FileText, Loader2, Plus, Trash2, Users, AlertCircle, Eye } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import UserSelector from '../UserSelector';
import { getGig, updateGigStaffSlots } from '../../services/gig.service';
import { useAutoSave } from '../../utils/hooks/useAutoSave';
import SaveStateIndicator from './SaveStateIndicator';
import { SmartDataTable, ColumnDef, RowAction } from '../tables/SmartDataTable';

const staffAssignmentSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  user_name: z.string(),
  status: z.enum(['Open', 'Requested', 'Confirmed', 'Declined']),
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
  status: 'Open' | 'Requested' | 'Confirmed' | 'Declined';
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
          status: (assignment.status as any) || 'Open',
          compensation_type: assignment.rate !== null ? 'rate' : 'fee',
          amount: assignment.rate !== null ? assignment.rate.toString() : (assignment.fee !== null ? assignment.fee.toString() : ''),
          notes: assignment.notes || '',
        }));

        const count = slot.count || 1;
        // Count non-declined assignments
        const activeAssignmentsCount = assignments.filter(a => a.status !== 'Declined').length;
        
        // Pad with 'Open' assignments if active count is less than required count
        if (activeAssignmentsCount < count) {
          for (let i = 0; i < (count - activeAssignmentsCount); i++) {
            assignments.push({
              id: `temp-${Math.random().toString(36).substr(2, 9)}`,
              user_id: '',
              user_name: '',
              status: 'Open',
              compensation_type: 'rate',
              amount: '',
              notes: '',
            });
          }
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
    const assignments = getValues(`slots.${index}.assignments`);
    const activeAssignments = assignments.filter(a => a.status !== 'Declined');
    const declinedAssignments = assignments.filter(a => a.status === 'Declined');
    
    if (value > activeAssignments.length) {
      // Add more 'Open' assignments
      const newAssignments = [...assignments];
      for (let i = activeAssignments.length; i < value; i++) {
        newAssignments.push({
          id: `temp-${Math.random().toString(36).substr(2, 9)}`,
          user_id: '',
          user_name: '',
          status: 'Open',
          compensation_type: 'rate',
          amount: '',
          notes: '',
        });
      }
      setValue(`slots.${index}.assignments`, newAssignments, { shouldDirty: true });
    } else if (value < activeAssignments.length) {
      // Remove 'Open' assignments first, then others if needed, but keep 'Declined'
      const newActiveAssignments = [...activeAssignments];
      // Try to remove 'Open' assignments that don't have a user first
      let removedCount = 0;
      const targetToRemove = activeAssignments.length - value;
      
      const resultActive = [];
      // Keep assignments with users or that are not 'Open' if possible
      // Actually, let's just slice from the end of active ones for simplicity, 
      // but prefer keeping those with data.
      
      const sortedActive = [...activeAssignments].sort((a, b) => {
        // Prefer keeping those with user_id
        if (a.user_id && !b.user_id) return -1;
        if (!a.user_id && b.user_id) return 1;
        return 0;
      });
      
      const keptActive = sortedActive.slice(0, value);
      setValue(`slots.${index}.assignments`, [...declinedAssignments, ...keptActive], { shouldDirty: true });
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

  const assignmentColumns = useMemo<ColumnDef<any>[]>(() => [
    {
      id: 'user_name',
      header: 'Staff Member',
      accessor: 'user_name',
      sortable: true,
      filterable: true,
      readOnly: true, // Editing user is handled via row action or full edit
      type: 'text',
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
            <Users className="w-4 h-4" />
          </div>
          <span className={!val ? 'text-gray-400 italic' : ''}>{val || 'Open Slot'}</span>
        </div>
      )
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      sortable: true,
      filterable: true,
      editable: true,
      type: 'pill',
      pillConfig: {
        'Open': { label: 'Open', color: 'gray' },
        'Requested': { label: 'Requested', color: 'blue' },
        'Confirmed': { label: 'Confirmed', color: 'green' },
        'Declined': { label: 'Declined', color: 'red' },
      }
    },
    {
      id: 'compensation_type',
      header: 'Type',
      accessor: 'compensation_type',
      editable: true,
      type: 'select',
      options: [
        { label: 'Rate', value: 'rate' },
        { label: 'Fee', value: 'fee' },
      ]
    },
    {
      id: 'amount',
      header: 'Amount',
      accessor: 'amount',
      editable: true,
      type: 'number',
    },
    {
      id: 'notes',
      header: 'Notes',
      accessor: 'notes',
      editable: true,
      optional: true,
      type: 'text',
    }
  ], []);

  const getAssignmentRowActions = (slotIndex: number): RowAction<any>[] => [
    {
      id: 'view',
      label: 'Notes',
      icon: <FileText className="w-4 h-4" />,
      onClick: (row) => {
        const assignments = getValues(`slots.${slotIndex}.assignments`);
        const assignmentIndex = assignments.findIndex(a => a.id === row.id);
        if (assignmentIndex !== -1) handleOpenAssignmentNotes(slotIndex, assignmentIndex);
      }
    },
    {
      id: 'delete',
      label: 'Decline',
      onClick: (row) => {
        const assignments = getValues(`slots.${slotIndex}.assignments`);
        const assignmentIndex = assignments.findIndex(a => a.id === row.id);
        if (assignmentIndex !== -1) {
          setValue(`slots.${slotIndex}.assignments.${assignmentIndex}.status`, 'Declined', { shouldDirty: true });
        }
      }
    }
  ];

  const handleAssignmentUpdate = (slotIndex: number, id: string, updates: Partial<any>) => {
    const assignments = getValues(`slots.${slotIndex}.assignments`);
    const assignmentIndex = assignments.findIndex(a => a.id === id);
    if (assignmentIndex !== -1) {
      Object.entries(updates).forEach(([key, value]) => {
        setValue(`slots.${slotIndex}.assignments.${assignmentIndex}.${key}` as any, value, { shouldDirty: true });
      });
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
                            onFocus={(e) => e.target.select()}
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
                  <SmartDataTable
                    tableId={`gig-staff-assignments-${slot.id}`}
                    data={slot.assignments}
                    columns={assignmentColumns}
                    rowActions={getAssignmentRowActions(slotIndex)}
                    onRowUpdate={(id, updates) => handleAssignmentUpdate(slotIndex, id, updates)}
                    emptyMessage="No assignments for this slot"
                  />
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
            onFocus={(e) => {
              const len = e.target.value.length;
              e.target.setSelectionRange(len, len);
            }}
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
            onFocus={(e) => {
              const len = e.target.value.length;
              e.target.setSelectionRange(len, len);
            }}
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
