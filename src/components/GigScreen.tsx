import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  Loader2, 
  AlertCircle,
  ArrowLeft,
  Plus
} from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import AppHeader from './AppHeader';
import { User, Organization, UserRole, Gig } from '../utils/supabase/types';
import { getGig, deleteGig, duplicateGig, createGig } from '../services/gig.service';
import GigHeader from './gig/GigHeader';
import GigBasicInfoSection from './gig/GigBasicInfoSection';
import GigParticipantsSection from './gig/GigParticipantsSection';
import GigStaffSlotsSection from './gig/GigStaffSlotsSection';
import GigFinancialsSection from './gig/GigFinancialsSection';
import GigKitAssignmentsSection from './gig/GigKitAssignmentsSection';

interface GigScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  gigId?: string | null;
  onCancel: () => void;
  onGigCreated: (gigId: string) => void;
  onGigUpdated?: () => void;
  onGigDeleted?: () => void;
  onSwitchOrganization: () => void;
  onEditProfile?: () => void;
  onLogout: () => void;
}

export default function GigScreen({
  organization,
  user,
  userRole,
  gigId,
  onCancel,
  onGigCreated,
  onGigUpdated,
  onGigDeleted,
  onSwitchOrganization,
  onEditProfile,
  onLogout,
}: GigScreenProps) {
  const [isLoading, setIsLoading] = useState(!!gigId);
  const [gig, setGig] = useState<Gig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string>('');
  const isEditMode = !!gigId;

  // Load gig data in edit mode
  useEffect(() => {
    if (gigId) {
      loadGigData();
    } else {
      setGig(null);
      setIsLoading(false);
    }
  }, [gigId]);

  const loadGigData = async () => {
    if (!gigId) return;

    setIsLoading(true);
    try {
      const gigData = await getGig(gigId);
      setGig(gigData);
    } catch (error: any) {
      console.error('Error loading gig data:', error);
      setGeneralError(error.message || 'Failed to load gig data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGig = async (data: any) => {
    setIsSubmitting(true);
    setGeneralError('');
    try {
      const gigData = {
        title: data.title,
        start: data.start_time.toISOString(),
        end: data.end_time.toISOString(),
        timezone: data.timezone,
        status: data.status,
        tags: data.tags,
        notes: data.notes,
        primary_organization_id: organization.id,
        participants: [
          {
            organization_id: organization.id,
            role: organization.type,
          }
        ]
      };

      const newGig = await createGig(gigData);
      toast.success('Gig created successfully!');
      onGigCreated(newGig.id);
    } catch (err: any) {
      console.error('Error creating gig:', err);
      setGeneralError(err.message || 'Failed to create gig. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!gigId) return;

    try {
      await deleteGig(gigId);
      toast.success('Gig deleted successfully!');
      if (onGigDeleted) {
        onGigDeleted();
      }
    } catch (err: any) {
      console.error('Error deleting gig:', err);
      toast.error(err.message || 'Failed to delete gig');
    }
  };

  const handleDuplicate = async (currentGigId: string) => {
    try {
      const newGig = await duplicateGig(currentGigId);
      toast.success('Gig duplicated successfully!');
      onGigCreated(newGig.id);
    } catch (err: any) {
      console.error('Error duplicating gig:', err);
      toast.error(err.message || 'Failed to duplicate gig');
    }
  };

  const participantOrgIds = gig?.participants 
    ? gig.participants.map((p: any) => p.organization_id)
    : [organization.id];

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        organization={organization}
        user={user}
        userRole={userRole}
        currentRoute="create-gig"
        onSwitchOrganization={onSwitchOrganization}
        onEditProfile={onEditProfile}
        onLogout={onLogout}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {generalError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="py-24">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-sky-500 mb-4" />
              <p className="text-gray-600">Loading gig...</p>
            </div>
          </div>
        ) : isEditMode ? (
          <>
            <GigHeader
              gigId={gigId}
              onBack={onCancel}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
            
            <div className="space-y-6">
              <GigBasicInfoSection gigId={gigId} />
              <GigParticipantsSection
                gigId={gigId}
                currentOrganizationId={organization.id}
                currentOrganizationName={organization.name}
                currentOrganizationType={organization.type}
              />
              <GigStaffSlotsSection
                gigId={gigId}
                currentOrganizationId={organization.id}
                participantOrganizationIds={participantOrgIds}
              />
              <GigFinancialsSection
                gigId={gigId}
                currentOrganizationId={organization.id}
                userRole={userRole}
              />
              <GigKitAssignmentsSection
                gigId={gigId}
                currentOrganizationId={organization.id}
              />
            </div>

            <div className="mt-8 flex justify-center pb-12">
              <Button variant="ghost" onClick={onCancel}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Gigs
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <GigBasicInfoSection 
              onCreate={handleCreateGig} 
              isSubmitting={isSubmitting}
            />
            <div className="mt-8 flex items-center justify-end gap-4 pb-12">
              <Button 
                onClick={onCancel}
                variant="outline"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Cancel and Go Back
              </Button>
              <Button 
                type="submit" 
                form="gig-basic-info-form"
                className="bg-sky-500 hover:bg-sky-600 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Gig
              </Button>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
