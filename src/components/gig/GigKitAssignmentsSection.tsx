import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '../../utils/supabase/client';
import { Info, Loader2, Package, Save, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { getGigKits, assignKitToGig, removeKitFromGig, getKits } from '../../utils/api';

interface Kit {
  id: string;
  name: string;
  tag_number?: string;
  category?: string;
  rental_value?: string;
}

interface KitAssignment {
  id: string;
  kit_id: string;
  kit?: Kit;
  notes: string;
  assigned_at: string;
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
  const [isSaving, setIsSaving] = useState(false);
  const [kitAssignments, setKitAssignments] = useState<KitAssignment[]>([]);
  const [availableKits, setAvailableKits] = useState<Kit[]>([]);
  const [showKitDetails, setShowKitDetails] = useState<KitAssignment | null>(null);

  useEffect(() => {
    loadKitsData();
  }, [gigId]);

  const loadKitsData = async () => {
    setIsLoading(true);
    try {
      const [assignmentsData, kitsData] = await Promise.all([
        getGigKits(gigId),
        getKits(),
      ]);
      
      const organizationAssignments = assignmentsData.filter(
        (a: any) => a.kit?.organization_id === currentOrganizationId
      );
      
      const formattedAssignments = organizationAssignments.map((assignment: any) => ({
        id: assignment.id,
        kit_id: assignment.kit_id,
        kit: assignment.kit,
        notes: assignment.notes || '',
        assigned_at: assignment.assigned_at,
      }));
      
      const organizationKits = kitsData.filter(
        (k: any) => k.organization_id === currentOrganizationId
      );
      
      setKitAssignments(formattedAssignments);
      setAvailableKits(organizationKits);
    } catch (error: any) {
      console.error('Error loading kits:', error);
      toast.error('Failed to load kits');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignKit = async (kitId: string) => {
    if (kitAssignments.find(a => a.kit_id === kitId)) {
      toast.error('Kit already assigned');
      return;
    }
    
    const kit = availableKits.find(k => k.id === kitId);
    if (!kit) {
      toast.error('Kit not found');
      return;
    }
    
    const newAssignment: KitAssignment = {
      id: Math.random().toString(36).substr(2, 9),
      kit_id: kitId,
      kit: kit,
      notes: '',
      assigned_at: new Date().toISOString(),
    };
    setKitAssignments([...kitAssignments, newAssignment]);
  };

  const handleRemoveKit = (assignmentId: string) => {
    setKitAssignments(kitAssignments.filter(a => a.id !== assignmentId));
  };

  const handleOpenKitDetails = (assignment: KitAssignment) => {
    setShowKitDetails(assignment);
  };

  const isDbId = (id: string) => {
    return id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      const { data: existingAssignments } = await supabase
        .from('gig_kits')
        .select('*')
        .eq('gig_id', gigId);

      const organizationAssignments = existingAssignments?.filter(
        (a: any) => a.kit?.organization_id === currentOrganizationId
      ) || [];

      for (const assignment of kitAssignments) {
        if (!isDbId(assignment.id)) {
          await assignKitToGig(gigId, assignment.kit_id, assignment.notes || null);
        }
      }

      const currentKitIds = kitAssignments.map(a => a.kit_id);
      for (const existingAssignment of organizationAssignments) {
        if (!currentKitIds.includes(existingAssignment.kit_id)) {
          await removeKitFromGig(existingAssignment.id);
        }
      }

      toast.success('Kit assignments saved');
      await loadKitsData();
    } catch (error: any) {
      console.error('Error saving kit assignments:', error);
      toast.error('Failed to save kit assignments');
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
              <Package className="w-5 h-5 text-gray-600" />
              <CardTitle>Equipment</CardTitle>
            </div>
            <Select
              onValueChange={handleAssignKit}
              disabled={isSaving || availableKits.length === 0}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select kit to assign..." />
              </SelectTrigger>
              <SelectContent>
                {availableKits
                  .filter(kit => !kitAssignments.some(a => a.kit_id === kit.id))
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
            {kitAssignments.length > 0 ? (
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
                    {kitAssignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>{assignment.kit?.name || 'Unknown Kit'}</TableCell>
                        <TableCell>{assignment.kit?.tag_number || '-'}</TableCell>
                        <TableCell>{assignment.kit?.category || '-'}</TableCell>
                        <TableCell className="text-right">
                          {assignment.kit?.rental_value 
                            ? `$${parseFloat(assignment.kit.rental_value).toFixed(2)}` 
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenKitDetails(assignment)}
                              disabled={isSaving}
                            >
                              <Info className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveKit(assignment.id)}
                              disabled={isSaving}
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
            
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showKitDetails !== null} onOpenChange={(open) => {
        if (!open) {
          setShowKitDetails(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kit Details</DialogTitle>
            <DialogDescription>
              Information about this kit.
            </DialogDescription>
          </DialogHeader>
          {showKitDetails && (
            <div className="space-y-2">
              <div>
                <strong>Name:</strong> {showKitDetails.kit?.name || 'Unknown'}
              </div>
              <div>
                <strong>Tag Number:</strong> {showKitDetails.kit?.tag_number || 'N/A'}
              </div>
              <div>
                <strong>Category:</strong> {showKitDetails.kit?.category || 'N/A'}
              </div>
              <div>
                <strong>Rental Value:</strong>{' '}
                {showKitDetails.kit?.rental_value 
                  ? `$${parseFloat(showKitDetails.kit.rental_value).toFixed(2)}` 
                  : 'N/A'}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowKitDetails(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
