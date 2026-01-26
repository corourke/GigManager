import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Package, Trash2, Info, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { getGigKits, getKits, updateGigKitAssignments } from '../../utils/api';
import { useAutoSave } from '../../utils/hooks/useAutoSave';
import SaveStateIndicator from './SaveStateIndicator';

const kitAssignmentSchema = z.object({
  id: z.string(),
  kit_id: z.string(),
  notes: z.string().optional(),
  kit: z.object({
    name: z.string(),
    tag_number: z.string().optional().nullable(),
    category: z.string().optional().nullable(),
    rental_value: z.string().optional().nullable(),
  }).optional(),
});

const kitFormSchema = z.object({
  assignments: z.array(kitAssignmentSchema),
});

type KitFormData = z.infer<typeof kitFormSchema>;

interface Kit {
  id: string;
  name: string;
  tag_number?: string;
  category?: string;
  rental_value?: string;
}

interface GigKitAssignmentsSectionProps {
  gigId: string;
  currentOrganizationId: string;
}

export default function GigKitAssignmentsSection({
  gigId,
  currentOrganizationId,
}: GigKitAssignmentsSectionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [availableKits, setAvailableKits] = useState<Kit[]>([]);
  const [showNotesDialog, setShowNotesDialog] = useState<number | null>(null);
  const [currentNotes, setCurrentNotes] = useState('');

  const { control, reset, watch, setValue, formState: { isDirty, errors } } = useForm<KitFormData>({
    resolver: zodResolver(kitFormSchema),
    mode: 'onChange',
    defaultValues: {
      assignments: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'assignments',
  });

  const { saveState, triggerSave } = useAutoSave<KitFormData>({
    gigId,
    onSave: async (data) => {
      await updateGigKitAssignments(
        gigId,
        currentOrganizationId,
        data.assignments.map(a => ({
          id: a.id.startsWith('temp-') ? undefined : a.id,
          kit_id: a.kit_id,
          notes: a.notes || null,
        }))
      );
    }
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
    loadData();
  }, [gigId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [assignmentsData, kitsData] = await Promise.all([
        getGigKits(gigId),
        getKits(),
      ]);

      const organizationAssignments = assignmentsData.filter(
        (a: any) => a.kit?.organization_id === currentOrganizationId
      );

      const formattedAssignments = organizationAssignments.map((a: any) => ({
        id: a.id,
        kit_id: a.kit_id,
        notes: a.notes || '',
        kit: a.kit,
      }));

      const organizationKits = kitsData.filter(
        (k: any) => k.organization_id === currentOrganizationId
      );

      reset({ assignments: formattedAssignments });
      setAvailableKits(organizationKits);
    } catch (error: any) {
      console.error('Error loading kits:', error);
      toast.error('Failed to load kits');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignKit = (kitId: string) => {
    const kit = availableKits.find(k => k.id === kitId);
    if (!kit) return;

    append({
      id: `temp-${Math.random().toString(36).substr(2, 9)}`,
      kit_id: kitId,
      notes: '',
      kit: {
        name: kit.name,
        tag_number: kit.tag_number,
        category: kit.category,
        rental_value: kit.rental_value,
      },
    });
  };

  const handleOpenNotes = (index: number) => {
    const assignment = fields[index];
    setCurrentNotes(assignment.notes || '');
    setShowNotesDialog(index);
  };

  const handleSaveNotes = () => {
    if (showNotesDialog !== null) {
      setValue(`assignments.${showNotesDialog}.notes`, currentNotes, { shouldDirty: true });
      setShowNotesDialog(null);
      setCurrentNotes('');
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
              <Package className="w-5 h-5 text-gray-600" />
              <CardTitle>Equipment</CardTitle>
              <SaveStateIndicator state={saveState} />
            </div>
            <Select
              onValueChange={handleAssignKit}
              disabled={saveState === 'saving' || availableKits.length === 0}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select kit to assign..." />
              </SelectTrigger>
              <SelectContent>
                {availableKits
                  .filter(kit => !fields.some(a => a.kit_id === kit.id))
                  .map((kit) => (
                    <SelectItem key={kit.id} value={kit.id}>
                      {kit.name} {kit.tag_number && `(${kit.tag_number})`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fields.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Tag #</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Rental Value</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell>{field.kit?.name || 'Unknown Kit'}</TableCell>
                        <TableCell>{field.kit?.tag_number || '-'}</TableCell>
                        <TableCell>{field.kit?.category || '-'}</TableCell>
                        <TableCell className="text-right">
                          {field.kit?.rental_value 
                            ? `$${parseFloat(field.kit.rental_value).toFixed(2)}` 
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenNotes(index)}
                              disabled={saveState === 'saving'}
                            >
                              <Info className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              disabled={saveState === 'saving'}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No equipment assigned yet</p>
            )}
            
            {availableKits.length === 0 && (
              <p className="text-sm text-gray-500">No kits available to assign</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showNotesDialog !== null} onOpenChange={(open) => {
        if (!open) {
          setShowNotesDialog(null);
          setCurrentNotes('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Equipment Notes</DialogTitle>
            <DialogDescription>
              Add notes about this kit assignment.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={currentNotes}
            onChange={(e) => setCurrentNotes(e.target.value)}
            placeholder="Enter notes..."
            rows={6}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNotesDialog(null);
              setCurrentNotes('');
            }}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes}>
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
