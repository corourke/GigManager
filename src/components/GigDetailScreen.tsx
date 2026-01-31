import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  User as UserIcon, 
  Tag, 
  Edit2, 
  Trash2, 
  Copy, 
  Loader2,
  DollarSign,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import AppHeader from './AppHeader';
import { Organization, User, UserRole, Gig } from '../utils/supabase/types';
import { GIG_STATUS_CONFIG } from '../utils/supabase/constants';
import { getGig, deleteGig, duplicateGig } from '../services/gig.service';

interface GigDetailScreenProps {
  gigId: string;
  organization: Organization;
  user: User;
  userRole?: UserRole;
  onBack: () => void;
  onEdit: (gigId: string) => void;
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
  onSwitchOrganization,
  onLogout,
}: GigDetailScreenProps) {
  const [gig, setGig] = useState<Gig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGig();
  }, [gigId]);

  const loadGig = async () => {
    setIsLoading(true);
    try {
      const data = await getGig(gigId);
      // Process venue and act from participants
      const venue = data.participants?.find((p: any) => p.role === 'Venue')?.organization;
      const act = data.participants?.find((p: any) => p.role === 'Act')?.organization;
      
      setGig({
        ...data,
        venue,
        act
      });
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

  const startDate = new Date(gig.start);
  const endDate = new Date(gig.end);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation & Actions */}
        <div className="mb-8">
          <Button variant="ghost" onClick={onBack} className="mb-4 -ml-2">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Gigs
          </Button>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-gray-900 leading-tight">{gig.title}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={GIG_STATUS_CONFIG[gig.status].color}>
                  {GIG_STATUS_CONFIG[gig.status].label}
                </Badge>
                <span className="text-sm text-gray-500">{organization.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => onEdit(gigId)}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={handleDuplicate}
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </Button>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Details Card */}
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-6">Gig Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Date</p>
                      <p className="text-gray-900 font-medium">
                        {startDate.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Time</p>
                      <p className="text-gray-900 font-medium">
                        {formatTime(startDate)} - {formatTime(endDate)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{gig.timezone}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Venue</p>
                      {gig.venue ? (
                        <>
                          <p className="text-gray-900 font-medium">{gig.venue.name}</p>
                          {(gig.venue.city || gig.venue.state) && (
                            <p className="text-sm text-gray-500">
                              {[gig.venue.city, gig.venue.state].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-400 italic">No venue assigned</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <UserIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Act</p>
                      {gig.act ? (
                        <>
                          <p className="text-gray-900 font-medium">{gig.act.name}</p>
                          {(gig.act.city || gig.act.state) && (
                            <p className="text-sm text-gray-500">
                              {[gig.act.city, gig.act.state].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </>
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
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Notes</h3>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div className="whitespace-pre-wrap">{gig.notes}</div>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar Columns */}
          <div className="space-y-6">
            {/* Financial Card */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Financials</h3>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Amount Paid</p>
                {gig.amount_paid ? (
                  <p className="text-2xl font-bold text-gray-900">
                    ${gig.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                ) : (
                  <p className="text-gray-400 italic">Not specified</p>
                )}
              </div>
            </Card>

            {/* Tags Card */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
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
                Created: {new Date(gig.created_at || '').toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-400 uppercase">
                Last Updated: {new Date(gig.updated_at || '').toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
