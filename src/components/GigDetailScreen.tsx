import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  User as UserIcon,
  Tag,
  Edit2,
  Trash2,
  Copy,
  Loader2,
  FileText,
  Music,
  Eye,
  Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from './ui/dialog';
import AppHeader from './AppHeader';
import AttachmentManager from './AttachmentManager';
import GigFinancialsSection from './gig/GigFinancialsSection';
import GigStaffSlotsSection from './gig/GigStaffSlotsSection';
import GigScheduleTimeline from './gig/GigScheduleTimeline';
import { Organization, User, UserRole, Gig } from '../utils/supabase/types';
import { detectScheduleConflicts } from '../utils/scheduleConflicts';
import { canManage } from '../utils/permissions';
import { GIG_STATUS_CONFIG, ORG_ROLE_CONFIG } from '../utils/supabase/constants';
import { getGig, deleteGig, duplicateGig } from '../services/gig.service';
import { createClient } from '../utils/supabase/client';
import { checkAllConflicts, Conflict } from '../services/conflictDetection.service';
import { ConflictWarning } from './ConflictWarning';
import { cn } from './ui/utils';
import {formatInTimeZone, formatDateTimeDisplay } from '../utils/dateUtils';

interface GigDetailScreenProps {
  gigId: string;
  organization: Organization;
  user: User;
  userRole?: UserRole;
  onBack: () => void;
  onEdit: (gigId: string) => void;
  onEditOrganization?: (org: Organization) => void;
  backLabel?: string;
  onSwitchOrganization: () => void;
  onLogout: () => void;
}

export default function GigDetailScreen({
  gigId,
  organization,
  user,
  userRole,
  onBack,
  onEdit,
  onEditOrganization,
  backLabel = 'Back to Gigs',
  onSwitchOrganization,
  onLogout,
}: GigDetailScreenProps) {
  const [gig, setGig] = useState<Gig | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingOrganization, setViewingOrganization] = useState<Organization | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  useEffect(() => {
    loadGig();
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

  const loadGig = async () => {
    setIsLoading(true);
    try {
      const data = await getGig(gigId);
      // Process venue and act from participants
      const venue = data.participants?.find((p: any) => p.role === 'Venue')?.organization;
      const act = data.participants?.find((p: any) => p.role === 'Act')?.organization;

      const processedGig = {
        ...data,
        venue,
        act
      };

      setGig(processedGig);

      // Check for conflicts
      const conflictResult = await checkAllConflicts(gigId, data.start, data.end);
        setConflicts(conflictResult.conflicts);
    } catch (error: any) {
      console.error('Error loading gig:', error);
      toast.error(error.message || 'Failed to load gig');
      onBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      await duplicateGig(gigId);
      toast.success('Gig duplicated successfully');
      onBack();
    } catch (error: any) {
      console.error('Error duplicating gig:', error);
      toast.error(error.message || 'Failed to duplicate gig');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${gig?.title}"?`)) return;

    try {
      await deleteGig(gigId);
      toast.success('Gig deleted successfully');
      onBack();
    } catch (error: any) {
      console.error('Error deleting gig:', error);
      toast.error(error.message || 'Failed to delete gig');
    }
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!gig) {
    return null;
  }

  const canEdit = canManage(userRole);
  const canViewFinancials = gig.created_by === user.id || userRole === 'Admin' || userRole === 'Manager';
  const participantOrgIds = [organization.id, ...(gig.participants ?? []).map((p: any) => p.organization_id)];

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        organization={organization}
        user={user}
        userRole={userRole}
        currentRoute="gig-detail"
        onSwitchOrganization={onSwitchOrganization}
        onLogout={onLogout}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Navigation & Actions */}
        <div className="mb-4">
          <Button variant="ghost" onClick={onBack} className="mb-2 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Music className="w-8 h-8 text-sky-500" />
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{gig.title}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
                  {GIG_STATUS_CONFIG[gig.status].label}
                </Badge>
                <span className="text-sm text-gray-500">{organization.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={() => onEdit(gigId)}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={handleDuplicate}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </Button>
              )}
              {(userRole === 'Admin' || userRole === 'Manager') && (
                <Button
                  variant="outline"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>

        {conflicts.length > 0 && (
          <div className="mb-6">
            <ConflictWarning
              conflicts={conflicts}
              showAsCard={true}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Info Columns */}
          <div className="lg:col-span-2 space-y-4">
            {/* Details Card */}
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Gig Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Date & Time</p>
                      <p className="text-gray-900 font-medium">
                        {formatDateTimeDisplay(gig.start, gig.end, gig.timezone)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{gig.timezone}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Venue</p>
                      {gig.venue ? (
                        <div className="space-y-1">
                          <Badge variant="outline" className="font-medium bg-gray-100 text-gray-800 border-gray-200">
                            {gig.venue.name}
                          </Badge>
                          {(gig.venue.city || gig.venue.state) && (
                            <p className="text-sm text-gray-500">
                              {[gig.venue.city, gig.venue.state].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-400 italic">No venue assigned</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <UserIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-1">Act</p>
                      {gig.act ? (
                        <div className="space-y-1">
                          <Badge variant="outline" className="font-medium bg-gray-100 text-gray-800 border-gray-200">
                            {gig.act.name}
                          </Badge>
                          {(gig.act.city || gig.act.state) && (
                            <p className="text-sm text-gray-500">
                              {[gig.act.city, gig.act.state].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-400 italic">No act assigned</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Notes Section */}
            {gig.notes && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Notes</h3>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="whitespace-pre-wrap">{gig.notes}</div>
                </div>
              </Card>
            )}

            {/* Staff Section */}
            <GigStaffSlotsSection
              gigId={gigId}
              currentOrganizationId={organization.id}
              participantOrganizationIds={participantOrgIds}
              canEdit={canEdit}
            />

            {/* Attachments Section */}
            <div className="mt-4">
              <AttachmentManager
                organizationId={organization.id}
                entityType="gig"
                entityId={gigId}
                title="Gig Attachments"
                allowUpload={canEdit}
              />
            </div>

            {/* Financials Section */}
            {canViewFinancials && (
              <GigFinancialsSection 
                gigId={gigId}
                currentOrganizationId={organization.id}
                userRole={userRole}
                gigStartDate={gig?.start?.substring(0, 10)}
              />
            )}
          </div>

          {/* Sidebar Columns */}
          <div className="space-y-4">
            {/* Schedule Card */}
            {gig.schedule_entries && gig.schedule_entries.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    Schedule
                    <span className="ml-1.5 text-xs font-normal text-gray-400">({gig.schedule_entries.length})</span>
                  </h3>
                </div>
                <GigScheduleTimeline
                  entries={gig.schedule_entries}
                  conflicts={detectScheduleConflicts(gig.schedule_entries)}
                  gigDate={gig.start}
                />
              </Card>
            )}

            {/* Participants Card */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <UserIcon className="w-5 h-5 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Participants</h3>
              </div>
              <div className="space-y-3">
                {gig.participants && gig.participants.length > 0 ? (
                  gig.participants.map((participant: any) => (
                    <div key={participant.id} className="flex flex-col gap-1">
                      <p className="text-xs font-medium text-gray-500 uppercase">{participant.role}</p>
                      <div className="flex items-center justify-between">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "font-medium", 
                            participant.role === 'Venue' ? ORG_ROLE_CONFIG.Venue.color : 
                            participant.role === 'Act' ? ORG_ROLE_CONFIG.Act.color : 
                            'bg-gray-100 text-gray-700 border-gray-200'
                          )}
                        >
                          {participant.organization?.name || 'Unknown'}
                        </Badge>
                        {participant.organization && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setViewingOrganization(participant.organization)}
                              title="View Organization"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            {isUserAdmin && onEditOrganization && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onEditOrganization(participant.organization)}
                                title="Edit Organization"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic">No participants</p>
                )}
              </div>
            </Card>

            {/* Tags Card */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-5 h-5 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Tags</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {gig.tags && gig.tags.length > 0 ? (
                  gig.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="bg-sky-50 text-sky-700 border-sky-100">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic">No tags</p>
                )}
              </div>
            </Card>

            {/* Timestamps */}
            <div className="px-2 space-y-1">
              <p className="text-[10px] text-gray-400 uppercase">
                Created: {formatInTimeZone(gig.created_at || '', undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              <p className="text-[10px] text-gray-400 uppercase">
                Last Updated: {formatInTimeZone(gig.updated_at || '', undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}
