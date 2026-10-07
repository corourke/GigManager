import { useCallback, useEffect, useState } from 'react';
import { Copy, Loader2, MoreVertical, Pencil, Printer, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import AppHeader from '../AppHeader';
import AttachmentManager from '../AttachmentManager';
import ActivityFeed from '../ActivityFeed';
import { ConflictWarning } from '../ConflictWarning';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Tabs, TabsContent } from '../ui/tabs';
import { PageHeader } from '../layout/PageHeader';
import { PageTabsList, PageTabsTrigger } from '../layout/PageTabs';
import GigFinancialsSection from './GigFinancialsSection';
import GigKitAssignmentsSection from './GigKitAssignmentsSection';
import GigParticipantsSection from './GigParticipantsSection';
import GigStaffSlotsSection from './GigStaffSlotsSection';
import GigEquipmentTable from './view/GigEquipmentTable';
import GigParticipantsTable from './view/GigParticipantsTable';
import GigScheduleView from './view/GigScheduleView';
import GigSection from './view/GigSection';
import GigStaffingTable from './view/GigStaffingTable';
import GigVenueCard from './view/GigVenueCard';
import OrganizationDetailsDialog from './view/OrganizationDetailsDialog';
import GigPrintSheet from './print/GigPrintSheet';
import { GigStatusField, GigTagsField, GigTitleField } from './basicInfo/GigBasicInfoFields';
import { EditSaveStatus, GigEditForm, NotesCard, WhenAndScheduleCard } from './edit/GigEditParts';
import { useEditSession } from '../../utils/hooks/editSession';
import { EditSessionProvider } from '../../utils/hooks/EditSessionProvider';
import { deleteGig, duplicateGig, getGig } from '../../services/gig.service';
import { getGigActivity } from '../../services/activityLog.service';
import { checkAllConflicts, type Conflict } from '../../services/conflictDetection.service';
import { canManage } from '../../utils/permissions';
import { GIG_STATUS_CONFIG } from '../../utils/supabase/constants';
import { formatDateTimeDisplay } from '../../utils/dateUtils';
import type { ActivityLogEntry, Gig, Organization, User, UserRole } from '../../utils/supabase/types';
import type { GigTab } from '../../routes/paths';

interface GigPageProps {
  gigId: string;
  organization: Organization;
  user: User;
  userRole?: UserRole;
  /** Open in edit mode (the `/gigs/:id/edit` route). Ignored for roles that can't edit. */
  initialEditing?: boolean;
  /** The open tab, when the URL decides it (`/gigs/:id/financials`). */
  tab?: GigTab;
  onTabChange?: (tab: GigTab) => void;
  onBack: () => void;
  backLabel?: string;
  onGigDeleted: () => void;
  onEditOrganization?: (org: Organization) => void;
  onSwitchOrganization: () => void;
  onLogout: () => void;
}

/**
 * The one gig page (#12): view mode for everyone, and a single page-wide edit
 * mode for Admins and Managers. Replaces GigDetailScreen and the separate
 * `/gigs/:id/edit` screen.
 */
export default function GigPage({
  gigId,
  organization,
  user,
  userRole,
  initialEditing = false,
  tab: tabProp,
  onTabChange,
  onBack,
  backLabel = 'Gigs',
  onGigDeleted,
  onEditOrganization,
  onSwitchOrganization,
  onLogout,
}: GigPageProps) {
  const canEdit = canManage(userRole);
  const [gig, setGig] = useState<Gig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(initialEditing && canEdit);
  const [localTab, setLocalTab] = useState<GigTab>('overview');
  const tab = tabProp ?? localTab;
  const setTab = (t: string) => (onTabChange ? onTabChange(t as GigTab) : setLocalTab(t as GigTab));
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [viewingOrg, setViewingOrg] = useState<Partial<Organization> | null>(null);
  // Every autosaving section in edit mode reports here: one save state, one flush (#12).
  const session = useEditSession();
  // Printing (#12): the sheet is rendered on request, and prints once its data has loaded.
  const [printRequest, setPrintRequest] = useState<{ financials: boolean; n: number } | null>(null);
  const startPrint = (financials: boolean) => setPrintRequest((r) => ({ financials, n: (r?.n ?? 0) + 1 }));
  const printWhenReady = useCallback(() => window.print(), []);
  const [finishing, setFinishing] = useState(false);

  const loadGig = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await getGig(gigId);
      setGig(data);
      checkAllConflicts(gigId, data.start, data.end).then((r) => setConflicts(r.conflicts)).catch(() => {});
    } catch (error: any) {
      setLoadError(error.message || 'Failed to load this gig.');
    }
  }, [gigId]);

  useEffect(() => { loadGig(); }, [loadGig]);

  useEffect(() => {
    if (tab !== 'history') return;
    setActivityLoading(true);
    getGigActivity(gigId).then(setActivity).catch(() => setActivity([])).finally(() => setActivityLoading(false));
  }, [tab, gigId]);

  // Staff and Viewers never see financials (#12); keep them off that tab.
  useEffect(() => { if (!canEdit && tab === 'financials') setTab('overview'); }, [canEdit, tab]);

  // Done waits for every pending save, so nothing typed just before is lost.
  const finishEditing = async () => {
    setFinishing(true);
    await session.flushAll();
    setFinishing(false);
    setEditing(false);
    loadGig();
  };

  const handleDuplicate = async () => {
    try {
      await duplicateGig(gigId);
      toast.success('Gig duplicated');
      onBack();
    } catch (error: any) {
      toast.error(error.message || 'Failed to duplicate gig');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${gig?.title}"? This can't be undone.`)) return;
    try {
      await deleteGig(gigId);
      toast.success('Gig deleted');
      onGigDeleted();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete gig');
    }
  };

  const shell = (children: React.ReactNode, printSheet?: React.ReactNode) => (
    <div className="min-h-screen bg-gray-50">
      <div className="no-print">
        <AppHeader
          organization={organization}
          user={user}
          userRole={userRole}
          currentRoute="gig-detail"
          onSwitchOrganization={onSwitchOrganization}
          onLogout={onLogout}
        />
        {children}
      </div>
      {printSheet}
    </div>
  );

  const back = { label: `Back to ${backLabel}`, onClick: onBack };

  if (loadError) {
    return shell(
      <>
        <PageHeader back={back} title="Gig" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
        <Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert>
        <Button variant="outline" onClick={loadGig}>Retry</Button>
        </div>
      </>,
    );
  }

  if (!gig) {
    return shell(
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" aria-label="Loading gig" />
      </div>,
    );
  }

  const participants = (gig.participants ?? []) as any[];
  const venue = participants.find((p) => p.role === 'Venue')?.organization ?? null;
  const acts = participants.filter((p) => p.role === 'Act');
  const actNames = Object.fromEntries(acts.map((p) => [p.id, p.organization?.name ?? '']));
  const ownSlots = (gig.staff_slots ?? []).filter((s) => s.organization_id === organization.id);
  const participantOrgIds = [organization.id, ...participants.map((p) => p.organization_id)];
  const status = GIG_STATUS_CONFIG[gig.status];

  const page = (
    <Tabs value={tab} onValueChange={setTab} activationMode="manual" className="gap-0">
      {/* #39: one header for view and edit; edit mode recolours the band. */}
      <PageHeader
        className={editing ? 'bg-sky-50 border-b-2 border-sky-700' : undefined}
        back={back}
        title={gig.title}
        badge={status && <Badge className={`${status.color} border`}>{status.label}</Badge>}
        meta={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              {formatDateTimeDisplay(gig.start, gig.end, gig.timezone)}
              {venue?.name ? ` · ${venue.name}` : ''}
            </span>
            {gig.tags.map((t) => <Badge key={t} variant="secondary" className="font-medium">{t}</Badge>)}
          </span>
        }
        heading={editing ? (
          <div className="flex flex-col gap-2 min-w-0" data-gig-header>
            <div className="flex items-center gap-2.5 flex-wrap">
              <GigTitleField variant="header" />
              <GigStatusField variant="header" />
            </div>
            <GigTagsField variant="header" />
          </div>
        ) : undefined}
        actions={(canEdit || !editing) ? (
          <>
            {!editing && (canEdit ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline"><Printer className="w-4 h-4 mr-1.5" />Print</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => startPrint(false)}>Gig sheet</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => startPrint(true)}>Gig sheet with financials</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" onClick={() => startPrint(false)}><Printer className="w-4 h-4 mr-1.5" />Print</Button>
            ))}
            {!canEdit ? null : editing ? (
              <>
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-sky-800">Editing</span>
                <EditSaveStatus state={session.state} />
                <Button onClick={finishEditing} disabled={finishing} className="bg-sky-700 hover:bg-sky-800 text-white">Done</Button>
              </>
            ) : (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="More actions"><MoreVertical className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDuplicate}><Copy className="w-4 h-4 mr-2" />Duplicate Gig</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                      <Trash2 className="w-4 h-4 mr-2" />Delete Gig
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button onClick={() => setEditing(true)} className="bg-sky-700 hover:bg-sky-800 text-white">
                  <Pencil className="w-4 h-4 mr-1.5" />Edit
                </Button>
              </>
            )}
          </>
        ) : undefined}
        tabs={
          <PageTabsList aria-label="Gig sections">
            {[
              ['overview', 'Overview'],
              ['equipment', 'Equipment'],
              ...(canEdit ? [['financials', 'Financials']] : []),
              ['history', 'History'],
            ].map(([value, label]) => (
              <PageTabsTrigger key={value} value={value}>{label}</PageTabsTrigger>
            ))}
          </PageTabsList>
        }
      />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {conflicts.length > 0 && <div className="mb-4"><ConflictWarning conflicts={conflicts} showAsCard /></div>}

          <TabsContent value="overview" className="mt-0">
            {editing ? (
              <div className="space-y-4">
                <WhenAndScheduleCard
                  gigId={gigId}
                  gigStart={gig.start}
                  actParticipants={acts.map((p) => ({ id: p.id, organization: p.organization }))}
                />
                <GigParticipantsSection
                  gigId={gigId}
                  currentOrganizationId={organization.id}
                  currentOrganizationName={organization.name}
                  currentOrganizationRole={organization.roles?.[0] || 'Production'}
                  currentOrganizationRoles={organization.roles}
                  onEditOrganization={onEditOrganization}
                  userRole={userRole}
                />
                <GigStaffSlotsSection gigId={gigId} currentOrganizationId={organization.id} participantOrganizationIds={participantOrgIds} />
                <NotesCard organizationId={organization.id} gigId={gigId} />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                <div className="lg:col-span-2">
                  <GigScheduleView entries={gig.schedule_entries ?? []} timeZone={gig.timezone} actNames={actNames} />
                </div>
                <GigVenueCard gigId={gigId} venue={venue} />
                <GigSection title="Notes & attachments" className="lg:col-span-3">
                  {gig.notes ? (
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{gig.notes}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No notes</p>
                  )}
                  <AttachmentManager organizationId={organization.id} entityType="gig" entityId={gigId} title="" allowUpload={false} />
                </GigSection>
                <div className="lg:col-span-3">
                  <GigParticipantsTable
                    gigId={gigId}
                    participants={participants}
                    currentOrganizationId={organization.id}
                    onViewOrganization={setViewingOrg}
                  />
                </div>
                <div className="lg:col-span-3">
                  <GigStaffingTable slots={ownSlots} showAmounts={canEdit} />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="equipment" className="mt-0">
            {editing ? (
              <GigKitAssignmentsSection
                gigId={gigId}
                currentOrganizationId={organization.id}
                gigStart={gig.start}
                gigEnd={gig.end}
                gigTimezone={gig.timezone}
              />
            ) : (
              <GigEquipmentTable gigId={gigId} organizationId={organization.id} showAmounts={canEdit} />
            )}
          </TabsContent>

          {canEdit && (
            <TabsContent value="financials" className="mt-0">
              <GigFinancialsSection
                gigId={gigId}
                currentOrganizationId={organization.id}
                userRole={userRole}
                gigStartDate={gig.start?.substring(0, 10)}
                gigEnd={gig.end}
                editing={editing}
              />
            </TabsContent>
          )}

          <TabsContent value="history" className="mt-0">
            <GigSection title="History">
              <ActivityFeed entries={activity} isLoading={activityLoading} />
            </GigSection>
          </TabsContent>
      </main>

      <OrganizationDetailsDialog organization={viewingOrg} onClose={() => setViewingOrg(null)} />
    </Tabs>
  );

  const printSheet = printRequest && (
    <div className="print-only hidden">
      <GigPrintSheet
        key={printRequest.n}
        gig={gig}
        organization={organization}
        slots={ownSlots}
        includeFinancials={canEdit && printRequest.financials}
        onReady={printWhenReady}
      />
    </div>
  );

  return shell(
    editing ? (
      <EditSessionProvider session={session}>
        <GigEditForm gigId={gigId} gig={gig}>{page}</GigEditForm>
      </EditSessionProvider>
    ) : page,
    printSheet,
  );
}
