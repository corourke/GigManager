import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Package, Trash2, Info, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { getGigKits, updateGigKitAssignments } from '../../services/gig.service';
import { getKits, getKitsFlattenedSummary } from '../../services/kit.service';
import { checkEquipmentConflicts, Conflict } from '../../services/conflictDetection.service';
import { ConflictWarning } from '../ConflictWarning';
import { useAutoSave } from '../../utils/hooks/useAutoSave';
import SaveStateIndicator from './SaveStateIndicator';

/**
 * Which currently-assigned kits share a physical asset with another kit
 * also assigned to this same gig — e.g. "Mic Case" and "Vocal Rig" both
 * directly or indirectly contain the same SM58. Distinct from cross-gig
 * equipment conflicts (checkEquipmentConflicts): this never touches the
 * DB beyond the flattened-asset lookup, so it's usable client-side as
 * assignments change, before anything is even saved.
 */
function findSameGigOverlaps(
  kitIds: string[],
  summaries: Map<string, { assetIds: Set<string> }>
): Map<string, Set<string>> {
  const overlaps = new Map<string, Set<string>>();
  for (let i = 0; i < kitIds.length; i++) {
    for (let j = i + 1; j < kitIds.length; j++) {
      const a = kitIds[i];
      const b = kitIds[j];
      const assetsA = summaries.get(a)?.assetIds;
      const assetsB = summaries.get(b)?.assetIds;
      if (!assetsA || !assetsB) continue;
      const shares = [...assetsA].some((assetId) => assetsB.has(assetId));
      if (shares) {
        if (!overlaps.has(a)) overlaps.set(a, new Set());
        if (!overlaps.has(b)) overlaps.set(b, new Set());
        overlaps.get(a)!.add(b);
        overlaps.get(b)!.add(a);
      }
    }
  }
  return overlaps;
}

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
  tag_number?: string | null;
  category?: string | null;
  rental_value?: number | null;
}

interface GigKitAssignmentsSectionProps {
  gigId: string;
  currentOrganizationId: string;
  gigStart?: string;
  gigEnd?: string;
  gigTimezone?: string;
}

export default function GigKitAssignmentsSection({
  gigId,
  currentOrganizationId,
  gigStart,
  gigEnd,
  gigTimezone,
}: GigKitAssignmentsSectionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [availableKits, setAvailableKits] = useState<Kit[]>([]);
  const [showNotesDialog, setShowNotesDialog] = useState<number | null>(null);
  const [currentNotes, setCurrentNotes] = useState('');
  const [sameGigOverlaps, setSameGigOverlaps] = useState<Map<string, Set<string>>>(new Map());
  const [crossGigConflicts, setCrossGigConflicts] = useState<Conflict[]>([]);

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

  const handleSave = useCallback(async (data: KitFormData) => {
    await updateGigKitAssignments(
      gigId,
      currentOrganizationId,
      data.assignments.map(a => ({
        id: a.id.startsWith('temp-') ? undefined : a.id,
        kit_id: a.kit_id,
        notes: a.notes || null,
      }))
    );
  }, [gigId, currentOrganizationId]);

  const checkCrossGigConflicts = useCallback(async () => {
    if (!gigStart || !gigEnd) return;
    try {
      const result = await checkEquipmentConflicts(gigId, gigStart, gigEnd, gigTimezone);
      setCrossGigConflicts([...result.conflicts, ...result.warnings]);
    } catch {
      // Non-critical — leave whatever conflicts were already shown.
    }
  }, [gigId, gigStart, gigEnd, gigTimezone]);

  const handleSaveSuccess = useCallback((data: KitFormData) => {
    reset(data, { keepDirty: false, keepValues: true });
    checkCrossGigConflicts();
  }, [reset, checkCrossGigConflicts]);

  const { saveState, triggerSave } = useAutoSave<KitFormData>({
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
    loadData();
    checkCrossGigConflicts();
  }, [gigId]);

  // Same-gig overlap check — no DB write required, so it reacts to the
  // assignment list as it's edited, not just after an autosave lands.
  const assignedKitIds = (formValues.assignments || []).map((a) => a.kit_id).filter(Boolean);
  useEffect(() => {
    if (assignedKitIds.length < 2) {
      setSameGigOverlaps(new Map());
      return;
    }
    let cancelled = false;
    getKitsFlattenedSummary(assignedKitIds).then((summaries) => {
      if (!cancelled) setSameGigOverlaps(findSameGigOverlaps(assignedKitIds, summaries));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedKitIds.join(',')]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [assignmentsData, kitsData] = await Promise.all([
        getGigKits(gigId),
        getKits(currentOrganizationId),
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
        rental_value: kit.rental_value != null ? String(kit.rental_value) : null,
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
            {crossGigConflicts.length > 0 && (
              <ConflictWarning conflicts={crossGigConflicts} />
            )}
            {sameGigOverlaps.size > 0 && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle>Overlapping equipment</AlertTitle>
                <AlertDescription>
                  {sameGigOverlaps.size} of the kits assigned to this gig share a physical asset with
                  another kit also assigned here — see the flagged rows below.
                </AlertDescription>
              </Alert>
            )}
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
                    {fields.map((field, index) => {
                      const overlapWith = sameGigOverlaps.get(field.kit_id);
                      const overlapNames = overlapWith
                        ? fields.filter((f) => overlapWith.has(f.kit_id)).map((f) => f.kit?.name || 'Unknown Kit')
                        : [];
                      return (
                      <TableRow key={field.id}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {field.kit?.name || 'Unknown Kit'}
                            {overlapNames.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Shares equipment with {overlapNames.join(', ')} — also assigned to this gig
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{field.kit?.tag_number || '-'}</TableCell>
                        <TableCell>{field.kit?.category || '-'}</TableCell>
                        <TableCell className="text-right">
                          {(field.kit?.rental_value !== null && field.kit?.rental_value !== undefined) 
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
                      );
                    })}
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
            onFocus={(e) => {
              const len = e.target.value.length;
              e.target.setSelectionRange(len, len);
            }}
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
