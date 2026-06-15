import { ReactNode } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useParams,
  useSearchParams,
  useLocation,
  useNavigate,
} from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { useNav } from './useNav';
import { useAppShell } from './appShell';
import {
  RequireAuth,
  RequireOrg,
  LandingRedirect,
  ResetPasswordRoute,
  AcceptInvitationRoute,
  CalendarCallbackRoute,
  LoadingSpinner,
} from './guards';
import type { Organization, OrganizationMembership } from '../utils/supabase/types';

// Desktop screens
import Dashboard from '../components/Dashboard';
import GigListScreen from '../components/GigListScreen';
import GigScreen from '../components/GigScreen';
import GigDetailScreen from '../components/GigDetailScreen';
import TeamScreen from '../components/TeamScreen';
import TeamMemberDetailScreen from '../components/TeamMemberDetailScreen';
import AssetListScreen from '../components/AssetListScreen';
import AssetScreen from '../components/AssetScreen';
import AssetDetailScreen from '../components/AssetDetailScreen';
import KitListScreen from '../components/KitListScreen';
import KitScreen from '../components/KitScreen';
import KitDetailScreen from '../components/KitDetailScreen';
import InventoryTabScreen from '../components/inventory/InventoryTabScreen';
import SettingsScreen from '../components/SettingsScreen';
import ImportScreen from '../components/ImportScreen';
import FinancialsScreen from '../components/FinancialsScreen';
import OrganizationSelectionScreen from '../components/OrganizationSelectionScreen';
import OrganizationScreen from '../components/OrganizationScreen';
import AdminOrganizationsScreen from '../components/AdminOrganizationsScreen';
import DevTableDemoScreen from '../components/dev/DevTableDemoScreen';

// Mobile screens
import MobileLayout from '../components/mobile/MobileLayout';
import MobileGigList from '../components/mobile/MobileGigList';
import MobileGigDetail from '../components/mobile/MobileGigDetail';
import MobileInventoryMode from '../components/mobile/MobileInventoryMode';
import MobileSettings from '../components/mobile/MobileSettings';

/** Narrow the (nullable) auth values for org-scoped screens. */
function useOrgScope() {
  const { user, selectedOrganization, userRole } = useAuth();
  return { user, organization: selectedOrganization, userRole };
}

/** Mobile chrome (header + bottom nav) wrapping the active mobile screen. */
function MobileShell({ active, children }: { active: string; children: ReactNode }) {
  const { organizations } = useAuth();
  const nav = useNav();
  const navigate = useNavigate();
  const onNavigate = (route: string) => {
    if (route === 'mobile-gig-list') navigate('/gigs');
    else if (route === 'mobile-inventory') navigate('/inventory');
    else if (route === 'mobile-settings') navigate('/settings');
  };
  return (
    <MobileLayout
      currentRoute={active}
      onNavigate={onNavigate}
      onSwitchOrganization={organizations.length > 1 ? nav.switchOrganization : undefined}
    >
      {children}
    </MobileLayout>
  );
}

// ---------------------------------------------------------------------------
// Organization-management routes (require auth, not a selected org)
// ---------------------------------------------------------------------------

function OrgSelectionRoute() {
  const { user, organizations, selectOrganization } = useAuth();
  const nav = useNav();
  const { openEditProfile } = useAppShell();
  if (!user) return <LoadingSpinner />;
  return (
    <OrganizationSelectionScreen
      user={user}
      organizations={organizations}
      onSelectOrganization={(org) => {
        selectOrganization(org);
        nav.navigate('/'); // role/device-aware landing
      }}
      onCreateOrganization={nav.toCreateOrg}
      onAdminViewAll={nav.toAdminOrgs}
      onLogout={nav.logoutAndHome}
      onEditProfile={openEditProfile}
    />
  );
}

function CreateOrgRoute() {
  const { user, organizations, setOrganizations, selectOrganization } = useAuth();
  const nav = useNav();
  if (!user) return <LoadingSpinner />;
  return (
    <OrganizationScreen
      userId={user.id}
      onCancel={nav.switchOrganization}
      onOrganizationCreated={(org: Organization) => {
        const newMembership: OrganizationMembership = { organization: org, role: 'Admin' };
        setOrganizations([...organizations, newMembership]);
        selectOrganization(org);
        nav.navigate('/');
      }}
    />
  );
}

function AdminOrgsRoute() {
  const { user } = useAuth();
  const nav = useNav();
  const { openEditProfile } = useAppShell();
  if (!user) return <LoadingSpinner />;
  return (
    <AdminOrganizationsScreen
      user={user}
      onEditOrganization={nav.editOrg}
      onCreateOrganization={nav.toCreateOrg}
      onBack={nav.toOrgSelection}
      onLogout={nav.logoutAndHome}
      onEditProfile={openEditProfile}
    />
  );
}

function EditOrgRoute() {
  const { orgId } = useParams();
  const location = useLocation();
  const { organizations, selectedOrganization, setOrganizations, selectOrganization } = useAuth();
  const nav = useNav();

  // Prefer the org passed via router state (covers admins editing orgs they
  // aren't a member of); fall back to the user's memberships on refresh.
  const stateOrg = (location.state as { org?: Organization } | null)?.org;
  const editingOrganization =
    stateOrg ?? organizations.find((m) => m.organization.id === orgId)?.organization;

  if (!editingOrganization) return <Navigate to="/admin/orgs" replace />;

  return (
    <OrganizationScreen
      organization={editingOrganization}
      onCancel={nav.toAdminOrgs}
      onOrganizationCreated={nav.toAdminOrgs}
      onOrganizationUpdated={(updatedOrg: Organization) => {
        setOrganizations(
          organizations.map((m) =>
            m.organization.id === updatedOrg.id ? { ...m, organization: updatedOrg } : m,
          ),
        );
        if (selectedOrganization?.id === updatedOrg.id) selectOrganization(updatedOrg);
        nav.toAdminOrgs();
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// App routes (require a selected org)
// ---------------------------------------------------------------------------

function DashboardRoute() {
  const { user, organization, userRole } = useOrgScope();
  const { isMobile, openEditProfile } = useAppShell();
  const nav = useNav();
  if (!user || !organization) return <LoadingSpinner />;
  if (isMobile) return <Navigate to="/gigs" replace />;
  // Viewers can't access the dashboard (endpoint excludes them) — send to gigs.
  if (userRole === 'Viewer') return <Navigate to="/gigs" replace />;
  return (
    <Dashboard
      organization={organization}
      user={user}
      userRole={userRole}
      onBackToSelection={nav.switchOrganization}
      onLogout={nav.logoutAndHome}
      onNavigateToGigs={nav.toGigs}
      onNavigateToTeam={nav.toTeam}
      onNavigateToDashboard={nav.toDashboard}
      onNavigateToAssets={nav.toAssets}
      onNavigateToKits={nav.toKits}
      onEditProfile={openEditProfile}
      onNavigateToGigEdit={(id) => nav.viewGig(id)}
    />
  );
}

function GigListRoute({ view = 'list' }: { view?: 'list' | 'calendar' }) {
  const { user, organization, userRole } = useOrgScope();
  const { isMobile, openEditProfile, mobileGigListScrollTop } = useAppShell();
  const nav = useNav();
  if (!user || !organization) return <LoadingSpinner />;
  if (isMobile) {
    return (
      <MobileShell active="mobile-gig-list">
        <MobileGigList
          onViewGig={(id) => nav.viewGig(id)}
          initialScrollTop={mobileGigListScrollTop.current}
          onScrollPositionChange={(pos) => {
            mobileGigListScrollTop.current = pos;
          }}
        />
      </MobileShell>
    );
  }
  return (
    <GigListScreen
      organization={organization}
      user={user}
      userRole={userRole}
      initialViewMode={view}
      onBack={nav.toDashboard}
      onCreateGig={nav.createGig}
      onViewGig={(id, fromCalendar) => nav.viewGig(id, fromCalendar)}
      onEditGig={nav.editGig}
      onNavigateToDashboard={nav.toDashboard}
      onNavigateToGigs={nav.toGigs}
      onNavigateToAssets={nav.toAssets}
      onNavigateToImport={nav.toImport}
      onSwitchOrganization={nav.switchOrganization}
      onEditProfile={openEditProfile}
      onLogout={nav.logoutAndHome}
    />
  );
}

function GigEditorRoute({ create }: { create: boolean }) {
  const { user, organization, userRole } = useOrgScope();
  const { isMobile, openEditProfile } = useAppShell();
  const nav = useNav();
  const { gigId } = useParams();
  if (!user || !organization) return <LoadingSpinner />;
  if (isMobile) return <Navigate to="/gigs" replace />;
  return (
    <GigScreen
      organization={organization}
      user={user}
      userRole={userRole}
      gigId={create ? null : (gigId ?? null)}
      onCancel={nav.toGigs}
      onGigCreated={(id) => nav.editGig(id)}
      onGigUpdated={nav.toGigs}
      onGigDeleted={nav.toGigs}
      onSwitchOrganization={nav.switchOrganization}
      onEditProfile={openEditProfile}
      onLogout={nav.logoutAndHome}
      onEditOrganization={(org) => nav.editOrg(org)}
    />
  );
}

function GigDetailRoute() {
  const { user, organization, userRole } = useOrgScope();
  const { isMobile } = useAppShell();
  const nav = useNav();
  const { gigId } = useParams();
  const [params] = useSearchParams();
  if (!user || !organization || !gigId) return <LoadingSpinner />;
  if (isMobile) {
    return (
      <MobileShell active="mobile-gig-detail">
        <MobileGigDetail
          gigId={gigId}
          onBack={() => nav.navigate('/gigs')}
          onViewPackingList={(id) => nav.navigate(`/inventory?gig=${id}`)}
        />
      </MobileShell>
    );
  }
  const fromCalendar = params.get('from') === 'calendar';
  return (
    <GigDetailScreen
      gigId={gigId}
      organization={organization}
      user={user}
      userRole={userRole}
      onBack={() => (fromCalendar ? nav.toCalendar() : nav.toGigs())}
      backLabel={fromCalendar ? 'Back to Calendar' : 'Back to Gigs'}
      onEdit={nav.editGig}
      onSwitchOrganization={nav.switchOrganization}
      onLogout={nav.logoutAndHome}
      onEditOrganization={(org) => nav.editOrg(org)}
    />
  );
}

function TeamRoute() {
  const { user, organization, userRole } = useOrgScope();
  const { isMobile, openEditProfile } = useAppShell();
  const nav = useNav();
  if (!user || !organization) return <LoadingSpinner />;
  if (isMobile) return <Navigate to="/gigs" replace />;
  return (
    <TeamScreen
      organization={organization}
      user={user}
      userRole={userRole}
      onNavigateToDashboard={nav.toDashboard}
      onNavigateToGigs={nav.toGigs}
      onNavigateToTeam={nav.toTeam}
      onNavigateToAssets={nav.toAssets}
      onViewMember={nav.viewMember}
      onSwitchOrganization={nav.switchOrganization}
      onEditProfile={openEditProfile}
      onLogout={nav.logoutAndHome}
    />
  );
}

function TeamMemberDetailRoute() {
  const { user, organization, userRole } = useOrgScope();
  const { isMobile } = useAppShell();
  const nav = useNav();
  const { memberId } = useParams();
  if (!user || !organization || !memberId) return <LoadingSpinner />;
  if (isMobile) return <Navigate to="/gigs" replace />;
  return (
    <TeamMemberDetailScreen
      organization={organization}
      user={user}
      userRole={userRole}
      memberId={memberId}
      onBack={nav.toTeam}
      onEdit={() => nav.toTeam()}
      onSwitchOrganization={nav.switchOrganization}
      onLogout={nav.logoutAndHome}
    />
  );
}

function AssetListRoute() {
  const { user, organization, userRole } = useOrgScope();
  const { isMobile, openEditProfile } = useAppShell();
  const nav = useNav();
  if (!user || !organization) return <LoadingSpinner />;
  if (isMobile) return <Navigate to="/gigs" replace />;
  return (
    <AssetListScreen
      organization={organization}
      user={user}
      userRole={userRole}
      onBack={nav.toDashboard}
      onCreateAsset={nav.createAsset}
      onViewAsset={nav.viewAsset}
      onNavigateToDashboard={nav.toDashboard}
      onNavigateToGigs={nav.toGigs}
      onNavigateToAssets={nav.toAssets}
      onNavigateToKits={nav.toKits}
      onNavigateToInventory={nav.toInventory}
      onNavigateToImport={nav.toImport}
      onSwitchOrganization={nav.switchOrganization}
      onEditProfile={openEditProfile}
      onLogout={nav.logoutAndHome}
    />
  );
}

function AssetDetailRoute() {
  const { user, organization, userRole } = useOrgScope();
  const { isMobile, openEditProfile } = useAppShell();
  const nav = useNav();
  const { assetId } = useParams();
  if (!user || !organization || !assetId) return <LoadingSpinner />;
  if (isMobile) return <Navigate to="/gigs" replace />;
  return (
    <AssetDetailScreen
      organization={organization}
      user={user}
      userRole={userRole}
      assetId={assetId}
      onBack={nav.toAssets}
      onEdit={nav.editAsset}
      onSwitchOrganization={nav.switchOrganization}
      onEditProfile={openEditProfile}
      onLogout={nav.logoutAndHome}
      onNavigateToPurchases={(purchaseId) =>
        nav.toFinancials({ highlightPurchaseId: purchaseId || null })
      }
    />
  );
}

function AssetEditorRoute({ create }: { create: boolean }) {
  const { user, organization, userRole } = useOrgScope();
  const { isMobile, openEditProfile } = useAppShell();
  const nav = useNav();
  const { assetId } = useParams();
  if (!user || !organization) return <LoadingSpinner />;
  if (isMobile) return <Navigate to="/gigs" replace />;
  return (
    <AssetScreen
      organization={organization}
      user={user}
      userRole={userRole}
      assetId={create ? null : (assetId ?? null)}
      onCancel={nav.toAssets}
      onAssetCreated={() => nav.toAssets()}
      onAssetUpdated={nav.toAssets}
      onNavigateToPurchases={(purchaseId) =>
        nav.toFinancials({ highlightPurchaseId: purchaseId || null })
      }
      onSwitchOrganization={nav.switchOrganization}
      onEditProfile={openEditProfile}
      onLogout={nav.logoutAndHome}
    />
  );
}

function KitListRoute() {
  const { user, organization, userRole } = useOrgScope();
  const { isMobile } = useAppShell();
  const nav = useNav();
  if (!user || !organization) return <LoadingSpinner />;
  if (isMobile) return <Navigate to="/gigs" replace />;
  return (
    <KitListScreen
      organization={organization}
      user={user}
      userRole={userRole}
      onBack={nav.toDashboard}
      onCreateKit={nav.createKit}
      onViewKit={nav.viewKit}
      onEditKit={nav.editKit}
      onNavigateToDashboard={nav.toDashboard}
      onNavigateToGigs={nav.toGigs}
      onNavigateToAssets={nav.toAssets}
      onNavigateToKits={nav.toKits}
      onNavigateToInventory={nav.toInventory}
      onSwitchOrganization={nav.switchOrganization}
      onLogout={nav.logoutAndHome}
    />
  );
}

function KitEditorRoute({ create }: { create: boolean }) {
  const { user, organization, userRole } = useOrgScope();
  const { isMobile } = useAppShell();
  const nav = useNav();
  const { kitId } = useParams();
  if (!user || !organization) return <LoadingSpinner />;
  if (isMobile) return <Navigate to="/gigs" replace />;
  return (
    <KitScreen
      organization={organization}
      user={user}
      userRole={userRole}
      kitId={create ? null : (kitId ?? null)}
      onCancel={nav.toKits}
      onKitCreated={() => nav.toKits()}
      onKitUpdated={nav.toKits}
      onSwitchOrganization={nav.switchOrganization}
      onLogout={nav.logoutAndHome}
    />
  );
}

function KitDetailRoute() {
  const { user, organization, userRole } = useOrgScope();
  const { isMobile } = useAppShell();
  const nav = useNav();
  const { kitId } = useParams();
  if (!user || !organization || !kitId) return <LoadingSpinner />;
  if (isMobile) return <Navigate to="/gigs" replace />;
  return (
    <KitDetailScreen
      kitId={kitId}
      organization={organization}
      user={user}
      userRole={userRole}
      onBack={nav.toKits}
      onEdit={nav.editKit}
      onSwitchOrganization={nav.switchOrganization}
      onLogout={nav.logoutAndHome}
    />
  );
}

function InventoryRoute() {
  const { user, organization, userRole } = useOrgScope();
  const { isMobile } = useAppShell();
  const nav = useNav();
  const [params] = useSearchParams();
  if (!user || !organization) return <LoadingSpinner />;
  if (isMobile) {
    return (
      <MobileShell active="mobile-inventory">
        <MobileInventoryMode
          gigId={params.get('gig')}
          onSelectGig={(id) => nav.navigate(`/inventory?gig=${id}`)}
        />
      </MobileShell>
    );
  }
  return (
    <InventoryTabScreen
      organization={organization}
      user={user}
      userRole={userRole}
      onNavigateToAssets={nav.toAssets}
      onNavigateToKits={nav.toKits}
      onNavigateToInventory={nav.toInventory}
    />
  );
}

function SettingsRoute() {
  const { user, organization, userRole } = useOrgScope();
  const { isMobile, openEditProfile, lockMobile } = useAppShell();
  const nav = useNav();
  if (!user || !organization) return <LoadingSpinner />;
  if (isMobile) {
    return (
      <MobileShell active="mobile-settings">
        <MobileSettings onLogout={nav.logoutAndHome} onLock={lockMobile} />
      </MobileShell>
    );
  }
  return (
    <SettingsScreen
      organization={organization}
      user={user}
      userRole={userRole}
      onBack={nav.toDashboard}
      onNavigateToDashboard={nav.toDashboard}
      onNavigateToGigs={nav.toGigs}
      onNavigateToAssets={nav.toAssets}
      onSwitchOrganization={nav.switchOrganization}
      onLogout={nav.logoutAndHome}
      onEditProfile={openEditProfile}
    />
  );
}

function ImportRoute() {
  const { user, organization, userRole } = useOrgScope();
  const { isMobile } = useAppShell();
  const nav = useNav();
  if (!user || !organization) return <LoadingSpinner />;
  if (isMobile) return <Navigate to="/gigs" replace />;
  return (
    <ImportScreen
      organization={organization}
      user={user}
      userRole={userRole}
      onCancel={nav.toDashboard}
      onNavigateToGigs={nav.toGigs}
      onSwitchOrganization={nav.switchOrganization}
      onLogout={nav.logoutAndHome}
    />
  );
}

function FinancialsRoute() {
  const { user, organization, userRole } = useOrgScope();
  const { isMobile } = useAppShell();
  const nav = useNav();
  const [params] = useSearchParams();
  if (!user || !organization) return <LoadingSpinner />;
  if (isMobile) return <Navigate to="/gigs" replace />;
  return (
    <FinancialsScreen
      organization={organization}
      user={user}
      userRole={userRole}
      onSwitchOrganization={nav.switchOrganization}
      onLogout={nav.logoutAndHome}
      onNavigateToGigs={nav.toGigs}
      onNavigateToAssets={nav.toAssets}
      highlightPurchaseId={params.get('highlight')}
      returnGigId={params.get('returnGig')}
      onNavigateToGigDetail={(id) => nav.viewGig(id)}
    />
  );
}

function DevDemoRoute() {
  const navigate = useNavigate();
  return <DevTableDemoScreen onBack={() => navigate('/dashboard')} />;
}

/** The full route table. Rendered inside <BrowserRouter> by App. */
export function AppRoutes() {
  return (
    <Routes>
      {/* Special flows — available regardless of the normal auth landing */}
      <Route path="/reset-password" element={<ResetPasswordRoute />} />
      <Route path="/accept-invitation" element={<AcceptInvitationRoute />} />
      <Route path="/auth/google-calendar/callback" element={<CalendarCallbackRoute />} />
      {import.meta.env.DEV && <Route path="/dev-demo" element={<DevDemoRoute />} />}

      {/* Authenticated area */}
      <Route element={<RequireAuth />}>
        <Route path="/org-selection" element={<OrgSelectionRoute />} />
        <Route path="/create-org" element={<CreateOrgRoute />} />
        <Route path="/admin/orgs" element={<AdminOrgsRoute />} />
        <Route path="/admin/orgs/:orgId/edit" element={<EditOrgRoute />} />

        {/* Org-scoped app */}
        <Route element={<RequireOrg />}>
          <Route path="/" element={<LandingRedirect />} />
          <Route path="/dashboard" element={<DashboardRoute />} />
          <Route path="/gigs" element={<GigListRoute />} />
          <Route path="/calendar" element={<GigListRoute view="calendar" />} />
          <Route path="/gigs/new" element={<GigEditorRoute create />} />
          <Route path="/gigs/:gigId" element={<GigDetailRoute />} />
          <Route path="/gigs/:gigId/edit" element={<GigEditorRoute create={false} />} />
          <Route path="/team" element={<TeamRoute />} />
          <Route path="/team/:memberId" element={<TeamMemberDetailRoute />} />
          <Route path="/assets" element={<AssetListRoute />} />
          <Route path="/assets/new" element={<AssetEditorRoute create />} />
          <Route path="/assets/:assetId" element={<AssetDetailRoute />} />
          <Route path="/assets/:assetId/edit" element={<AssetEditorRoute create={false} />} />
          <Route path="/kits" element={<KitListRoute />} />
          <Route path="/kits/new" element={<KitEditorRoute create />} />
          <Route path="/kits/:kitId" element={<KitDetailRoute />} />
          <Route path="/kits/:kitId/edit" element={<KitEditorRoute create={false} />} />
          <Route path="/inventory" element={<InventoryRoute />} />
          <Route path="/settings" element={<SettingsRoute />} />
          <Route path="/import" element={<ImportRoute />} />
          <Route path="/financials" element={<FinancialsRoute />} />
        </Route>
      </Route>

      {/* Unknown paths → role/device-aware landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
