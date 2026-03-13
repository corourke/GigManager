import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Music,
  Users,
  Phone,
  FileText,
  Tag,
  Package,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  User as UserIcon,
  Navigation,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { getGig, updateGig } from '../../services/gig.service';
import { updateStaffAssignmentStatus } from '../../services/gig.service';
import { GIG_STATUS_CONFIG, ORG_TYPE_CONFIG } from '../../utils/supabase/constants';
import { formatDateTimeDisplay } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '../ui/utils';
import type { GigStatus } from '../../utils/supabase/types';

interface MobileGigDetailProps {
  gigId: string;
  onBack: () => void;
  onViewPackingList: (gigId: string) => void;
}

const ASSIGNMENT_STATUS_CONFIG: Record<string, { label: string; color: string; textColor: string; icon: React.ElementType }> = {
  Open: { label: 'Open', color: 'bg-gray-100 text-gray-700 border-gray-200', textColor: 'text-gray-600', icon: Clock },
  Invited: { label: 'Invited', color: 'bg-blue-100 text-blue-700 border-blue-200', textColor: 'text-blue-600', icon: Clock },
  Requested: { label: 'Requested', color: 'bg-amber-100 text-amber-700 border-amber-200', textColor: 'text-amber-600', icon: Clock },
  Confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700 border-green-200', textColor: 'text-green-600', icon: CheckCircle2 },
  Declined: { label: 'Declined', color: 'bg-red-100 text-red-700 border-red-200', textColor: 'text-red-600', icon: XCircle },
};

export default function MobileGigDetail({ gigId, onBack, onViewPackingList }: MobileGigDetailProps) {
  const { user } = useAuth();
  const [gig, setGig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingAssignment, setUpdatingAssignment] = useState<string | null>(null);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    loadGig();
  }, [gigId]);

  const loadGig = async () => {
    setLoading(true);
    try {
      const data = await getGig(gigId);
      const venue = data.participants?.find((p: any) => p.role === 'Venue')?.organization;
      const act = data.participants?.find((p: any) => p.role === 'Act')?.organization;
      setGig({ ...data, venue, act });
      const allAssignments = (data.staff_slots || []).flatMap((s: any) => s.staff_assignments || []);
      console.log('[MobileGigDetail] user.id:', user?.id, 'user.email:', user?.email);
      console.log('[MobileGigDetail] assignments:', JSON.stringify(allAssignments.map((a: any) => ({
        id: a.id, status: a.status, user_id_raw: a.user_id,
        user: a.user ? { id: a.user.id, email: a.user.email, first_name: a.user.first_name } : null,
        idMatch: a.user?.id === user?.id,
        uidMatch: a.user_id === user?.id,
        emailMatch: !!(user?.email && a.user?.email && a.user.email === user?.email),
      }))));
    } catch (error: any) {
      toast.error(error.message || 'Failed to load gig');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentAction = async (assignmentId: string, status: 'Confirmed' | 'Declined') => {
    setUpdatingAssignment(assignmentId);
    try {
      await updateStaffAssignmentStatus(assignmentId, status);
      toast.success(`Assignment ${status.toLowerCase()}`);
      await loadGig();
    } catch (error: any) {
      toast.error(error.message || `Failed to ${status.toLowerCase()} assignment`);
    } finally {
      setUpdatingAssignment(null);
    }
  };

  const handleStatusChange = async (newStatus: GigStatus) => {
    setUpdatingStatus(true);
    try {
      await updateGig(gigId, { status: newStatus });
      toast.success(`Status updated to ${GIG_STATUS_CONFIG[newStatus].label}`);
      await loadGig();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
      setShowStatusMenu(false);
    }
  };

  const handleDirections = (org?: any) => {
    const target = org || gig?.venue;
    if (!target) return;
    const parts = [target.name, target.address_line1, target.city, target.state].filter(Boolean);
    window.open(`https://maps.apple.com/?q=${encodeURIComponent(parts.join(' '))}`, '_blank');
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_blank');
  };

  const hasLocation = (org: any) => !!(org?.address_line1 || org?.city);

  const extractTextColor = (colorStr?: string) => {
    if (!colorStr) return 'text-muted-foreground';
    const match = colorStr.match(/text-\S+/);
    return match ? match[0] : 'text-muted-foreground';
  };

  const isMyAssignment = (a: any) => {
    if (!user) return false;
    if (a.user?.id === user.id) return true;
    if (a.user_id === user.id) return true;
    if (user.email && a.user?.email && a.user.email === user.email) return true;
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!gig) return null;

  const statusConfig = GIG_STATUS_CONFIG[gig.status as keyof typeof GIG_STATUS_CONFIG];
  const myAssignments = (gig.staff_slots || []).flatMap((slot: any) =>
    (slot.staff_assignments || [])
      .filter((a: any) => isMyAssignment(a))
      .map((a: any) => ({ ...a, roleName: slot.role }))
  );

  const showActionButtons = (status: string) => status === 'Invited' || status === 'Requested';
  const showTimestamp = (status: string) => status === 'Confirmed' || status === 'Declined';

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 -ml-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold truncate">{gig.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <button onClick={() => setShowStatusMenu(!showStatusMenu)}>
                <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 font-medium cursor-pointer', statusConfig?.color)} style={{ fontSize: '11px', lineHeight: '1' }}>
                  {statusConfig?.label || gig.status}
                </span>
              </button>
            </div>
          </div>
        </div>
        {showStatusMenu && (
          <div className="mt-2 flex flex-wrap gap-1">
            {Object.entries(GIG_STATUS_CONFIG).map(([key, conf]) => (
              <button
                key={key}
                disabled={gig.status === key || updatingStatus}
                onClick={() => handleStatusChange(key as GigStatus)}
                className={cn(
                  'px-2 py-0.5 rounded font-medium border transition-colors',
                  gig.status === key ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80',
                  conf.color
                )}
                style={{ fontSize: '11px' }}
              >
                {updatingStatus ? '...' : conf.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 p-4 space-y-3 pb-12">
        {myAssignments.length > 0 && (
          <Card className="border-sky-200 bg-sky-50/50" style={{ gap: 0 }}>
            <CardContent className="px-3 py-2 space-y-1.5" style={{ paddingBottom: '8px' }}>
              <p className="text-[11px] font-semibold flex items-center gap-1.5 text-sky-700">
                <UserIcon className="w-3 h-3" />
                Your Assignments
              </p>
              {myAssignments.map((assignment: any) => {
                const statusConf = ASSIGNMENT_STATUS_CONFIG[assignment.status] || ASSIGNMENT_STATUS_CONFIG.Invited;
                const StatusIcon = statusConf.icon;
                return (
                  <div key={assignment.id}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{assignment.roleName}</span>
                      <span className={cn('inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-medium', statusConf.color)} style={{ fontSize: '11px', lineHeight: '1' }}>
                        <StatusIcon className="w-2 h-2" />
                        {statusConf.label}
                      </span>
                    </div>
                    {showActionButtons(assignment.status) && (
                      <div className="flex gap-2 mt-1">
                        <Button
                          size="sm"
                          className="flex-1 h-8 gap-1 text-[11px]"
                          onClick={() => handleAssignmentAction(assignment.id, 'Confirmed')}
                          disabled={updatingAssignment === assignment.id}
                        >
                          {updatingAssignment === assignment.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3" />
                          )}
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 gap-1 text-[11px] text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleAssignmentAction(assignment.id, 'Declined')}
                          disabled={updatingAssignment === assignment.id}
                        >
                          {updatingAssignment === assignment.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <XCircle className="w-3 h-3" />
                          )}
                          Decline
                        </Button>
                      </div>
                    )}
                    {showTimestamp(assignment.status) && assignment.confirmed_at && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {assignment.status} {format(parseISO(assignment.confirmed_at), 'MMM d, h:mm a')}
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card style={{ gap: 0 }}>
          <CardContent className="p-3 space-y-3" style={{ paddingBottom: '12px' }}>
            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase">Date & Time</p>
                <p className="text-sm font-medium mt-0.5">
                  {formatDateTimeDisplay(gig.start, gig.end, gig.timezone)}
                </p>
                <p className="text-[10px] text-muted-foreground">{gig.timezone}</p>
              </div>
            </div>

            {gig.venue && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">Venue</p>
                  <p className="text-sm font-medium mt-0.5">{gig.venue.name}</p>
                  {(gig.venue.city || gig.venue.state) && (
                    <p className="text-[10px] text-muted-foreground">
                      {[gig.venue.city, gig.venue.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {gig.act && (
              <div className="flex items-start gap-2.5">
                <Music className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase">Act</p>
                  <p className="text-sm font-medium mt-0.5">{gig.act.name}</p>
                </div>
              </div>
            )}

            {gig.tags && gig.tags.length > 0 && (
              <div className="flex items-start gap-2.5">
                <Tag className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex flex-wrap gap-1">
                  {gig.tags.map((tag: string) => (
                    <span key={tag} className="rounded bg-sky-50 text-sky-700 border border-sky-100" style={{ fontSize: '10px', padding: '1px 6px' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {gig.notes && (
              <div className="flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="text-[11px] text-muted-foreground whitespace-pre-wrap bg-muted/30 p-2 rounded flex-1">
                  {gig.notes}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          {gig.venue?.phone_number && (
            <Button
              variant="outline"
              className="flex-1 h-9 gap-1.5 text-xs"
              onClick={() => handleCall(gig.venue.phone_number)}
            >
              <Phone className="w-3.5 h-3.5" />
              Call Venue
            </Button>
          )}
          <Button
            variant="secondary"
            className="flex-1 h-9 gap-1.5 text-xs"
            onClick={() => onViewPackingList(gigId)}
          >
            <Package className="w-3.5 h-3.5" />
            Packing List
          </Button>
        </div>

        {gig.participants && gig.participants.length > 0 && (
          <Card style={{ gap: 0 }}>
            <CardContent className="p-3" style={{ paddingBottom: '12px' }}>
              <p className="text-[11px] font-semibold flex items-center gap-1.5 text-muted-foreground mb-2">
                <Users className="w-3.5 h-3.5" />
                Organizations
              </p>
              <div className="divide-y divide-border/50">
                {gig.participants.map((p: any) => {
                  const orgTypeConf = ORG_TYPE_CONFIG[p.role as keyof typeof ORG_TYPE_CONFIG];
                  const org = p.organization;
                  return (
                    <div key={p.id} className="flex items-center py-1.5 first:pt-0 last:pb-0">
                      <span className={cn('font-semibold w-24 shrink-0 truncate', extractTextColor(orgTypeConf?.color))} style={{ fontSize: '11px' }}>
                        {orgTypeConf?.label || p.role}
                      </span>
                      <span className="text-base font-medium flex-1 truncate px-2">{org?.name || 'Unknown'}</span>
                      <div className="flex gap-0.5 shrink-0 w-12 justify-end">
                        {org?.phone_number && (
                          <button
                            onClick={() => handleCall(org.phone_number)}
                            className="p-1 rounded hover:bg-muted"
                          >
                            <Phone className="w-3 h-3 text-muted-foreground" />
                          </button>
                        )}
                        {hasLocation(org) && (
                          <button
                            onClick={() => handleDirections(org)}
                            className="p-1 rounded hover:bg-muted"
                          >
                            <Navigation className="w-3 h-3 text-muted-foreground" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {gig.staff_slots && gig.staff_slots.length > 0 && (
          <Card style={{ gap: 0 }}>
            <CardContent className="p-3" style={{ paddingBottom: '12px' }}>
              <p className="text-[11px] font-semibold flex items-center gap-1.5 text-muted-foreground mb-2">
                <Users className="w-3.5 h-3.5" />
                Staff
              </p>
              <div className="divide-y divide-border/50">
                {gig.staff_slots.map((slot: any) => (
                  <div key={slot.id} className="py-1.5 first:pt-0 last:pb-0">
                    {slot.staff_assignments && slot.staff_assignments.length > 0 ? (
                      slot.staff_assignments.map((a: any) => {
                        const sConf = ASSIGNMENT_STATUS_CONFIG[a.status] || ASSIGNMENT_STATUS_CONFIG.Invited;
                        const isMe = isMyAssignment(a);
                        const hasTs = isMe && showTimestamp(a.status) && a.confirmed_at;
                        return (
                          <div key={a.id} className="space-y-1">
                            <div className="flex items-center">
                              <span className={cn('font-semibold w-24 shrink-0 truncate', sConf.textColor || 'text-muted-foreground')} style={{ fontSize: '11px' }}>
                                {sConf.label}
                              </span>
                              <span className="text-base font-medium flex-1 truncate px-2">
                                {a.user?.first_name} {a.user?.last_name}
                                {isMe && <span className="ml-1 text-[10px] text-sky-600 font-bold">(You)</span>}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0 w-20 text-right truncate">{slot.role}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex items-center">
                        <span className="font-semibold w-20 shrink-0 truncate text-gray-400" style={{ fontSize: '10px' }}>
                          Open
                        </span>
                        <span className="text-sm text-muted-foreground italic flex-1 truncate px-2">{slot.count || slot.required_count} needed</span>
                        <span className="text-[10px] text-muted-foreground shrink-0 w-16 text-right truncate">{slot.role}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
