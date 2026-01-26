import { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import UserProfileCompletionScreen from './components/UserProfileCompletionScreen';
import OrganizationSelectionScreen from './components/OrganizationSelectionScreen';
import OrganizationScreen from './components/OrganizationScreen';
import AdminOrganizationsScreen from './components/AdminOrganizationsScreen';
import Dashboard from './components/Dashboard';
import GigListScreen from './components/GigListScreen';
import GigScreen from './components/GigScreen';
import GigDetailScreen from './components/GigDetailScreen';
import TeamScreen from './components/TeamScreen';
import AssetListScreen from './components/AssetListScreen';
import AssetScreen from './components/AssetScreen';
import KitListScreen from './components/KitListScreen';
import KitScreen from './components/KitScreen';
import KitDetailScreen from './components/KitDetailScreen';
import ImportScreen from './components/ImportScreen';
import EditUserProfileDialog from './components/EditUserProfileDialog';
import { Toaster } from './components/ui/sonner';
import { createClient } from './utils/supabase/client';
import { toast } from 'sonner';
import { NavigationProvider } from './contexts/NavigationContext';

export type OrganizationType = 
  | 'Production'
  | 'Sound'
  | 'Lighting'
  | 'Staging'
  | 'Rentals'
  | 'Venue'
  | 'Act'
  | 'Agency';

export type UserRole = 'Admin' | 'Manager' | 'Staff' | 'Viewer';

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  url?: string;
  phone_number?: string;
  description?: string;
  notes?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  allowed_domains?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMembership {
  organization: Organization;
  role: UserRole;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

// Set to true to use mock data instead of real Supabase
const USE_MOCK_DATA = false;

type Route = 
  | 'login' 
  | 'profile-completion'
  | 'org-selection' 
  | 'create-org'
  | 'edit-org'
  | 'admin-orgs'
  | 'dashboard' 
  | 'gig-list'
  | 'create-gig'
  | 'gig-detail'
  | 'team'
  | 'asset-list'
  | 'create-asset'
  | 'kit-list'
  | 'create-kit'
  | 'kit-detail'
  | 'import';

function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<OrganizationMembership[]>([]);
  const [selectedGigId, setSelectedGigId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedKitId, setSelectedKitId] = useState<string | null>(null);
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);

  // Get user's role in the current organization
  const getCurrentUserRole = (): UserRole | undefined => {
    if (!selectedOrganization) return undefined;
    const membership = userOrganizations.find(
      (m) => m.organization.id === selectedOrganization.id
    );
    return membership?.role;
  };

  const handleLogin = (user: User, organizations: OrganizationMembership[]) => {
    setCurrentUser(user);
    setUserOrganizations(organizations);
    
    // Check if user needs to complete their profile
    // Profile is considered incomplete if both first_name and last_name are empty
    if (!user.first_name?.trim() && !user.last_name?.trim()) {
      setCurrentRoute('profile-completion');
    } else if (organizations.length === 1) {
      // Auto-select if user is only a member of one organization
      setSelectedOrganization(organizations[0].organization);
      setCurrentRoute('dashboard');
    } else {
      setCurrentRoute('org-selection');
    }
  };

  const handleProfileCompleted = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    // After profile completion, check if user has only one org
    if (userOrganizations.length === 1) {
      setSelectedOrganization(userOrganizations[0].organization);
      setCurrentRoute('dashboard');
    } else {
      setCurrentRoute('org-selection');
    }
  };

  const handleSkipProfile = () => {
    setCurrentRoute('org-selection');
  };

  const handleSelectOrganization = (org: Organization) => {
    setSelectedOrganization(org);
    setCurrentRoute('dashboard');
  };

  const handleCreateOrganization = () => {
    setCurrentRoute('create-org');
  };

  const handleOrganizationCreated = (org: Organization) => {
    // Add new organization to user's list with Admin role
    const newMembership: OrganizationMembership = {
      organization: org,
      role: 'Admin'
    };
    const updatedOrgs = [...userOrganizations, newMembership];
    setUserOrganizations(updatedOrgs);
    setSelectedOrganization(org);
    setCurrentRoute('dashboard');
  };

  const handleBackToSelection = () => {
    setCurrentRoute('org-selection');
  };

  const handleLogout = async () => {
    try {
      if (!USE_MOCK_DATA) {
        const supabase = createClient();
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Error signing out from Supabase:', error);
      // Continue with logout even if Supabase signOut fails
    }
    
    // Always update UI state to ensure user is logged out locally
    setCurrentUser(null);
    setSelectedOrganization(null);
    setUserOrganizations([]);
    setSelectedGigId(null);
    setSelectedAssetId(null);
    setSelectedKitId(null);
    setCurrentRoute('login');
  };

  const handleNavigateToGigs = () => {
    setCurrentRoute('gig-list');
  };

  const handleNavigateToTeam = () => {
    setCurrentRoute('team');
  };

  const handleCreateGig = () => {
    setSelectedGigId(null); // Clear selected gig when creating new
    setCurrentRoute('create-gig');
  };

  const handleViewGig = (gigId: string) => {
    setSelectedGigId(gigId);
    setCurrentRoute('create-gig'); // Use create-gig route for editing too
  };

  const handleGigCreated = (gigId: string) => {
    setSelectedGigId(gigId);
    // Stay on the same route, which will now render in Edit mode because gigId is set
    setCurrentRoute('create-gig');
  };

  const handleBackToDashboard = () => {
    setCurrentRoute('dashboard');
  };

  const handleBackToGigList = () => {
    setCurrentRoute('gig-list');
  };

  const handleNavigateToAssets = () => {
    setCurrentRoute('asset-list');
  };

  const handleCreateAsset = () => {
    setSelectedAssetId(null); // Clear selected asset when creating new
    setCurrentRoute('create-asset');
  };

  const handleViewAsset = (assetId: string) => {
    setSelectedAssetId(assetId);
    setCurrentRoute('create-asset'); // Use create-asset route for editing too
  };

  const handleAssetCreated = (assetId: string) => {
    setSelectedAssetId(assetId);
    setCurrentRoute('asset-list'); // Navigate back to asset list instead of asset detail
  };

  const handleBackToAssetList = () => {
    setCurrentRoute('asset-list');
  };

  const handleNavigateToKits = () => {
    setCurrentRoute('kit-list');
  };

  const handleCreateKit = () => {
    setSelectedKitId(null); // Clear selected kit when creating new
    setCurrentRoute('create-kit');
  };

  const handleViewKit = (kitId: string) => {
    setSelectedKitId(kitId);
    setCurrentRoute('kit-detail'); // Use kit-detail route for viewing
  };

  const handleEditKit = (kitId: string) => {
    setSelectedKitId(kitId);
    setCurrentRoute('create-kit'); // Use create-kit route for editing
  };

  const handleKitCreated = (kitId: string) => {
    setSelectedKitId(kitId);
    setCurrentRoute('kit-list'); // Navigate back to kit list instead of kit detail
  };

  const handleBackToKitList = () => {
    setCurrentRoute('kit-list');
  };

  const handleNavigateToAdminOrgs = () => {
    setCurrentRoute('admin-orgs');
  };

  const handleAdminEditOrganization = (org: Organization) => {
    setEditingOrganization(org);
    setCurrentRoute('edit-org');
  };

  const handleOrganizationUpdated = (updatedOrg: Organization) => {
    // Update the organization in the user's organizations list
    const updatedOrgs = userOrganizations.map(membership => 
      membership.organization.id === updatedOrg.id
        ? { ...membership, organization: updatedOrg }
        : membership
    );
    setUserOrganizations(updatedOrgs);
    
    // If this is the currently selected organization, update it
    if (selectedOrganization?.id === updatedOrg.id) {
      setSelectedOrganization(updatedOrg);
    }
    
    // Navigate back to admin orgs list
    setEditingOrganization(null);
    setCurrentRoute('admin-orgs');
  };

  const handleCancelEditOrganization = () => {
    setEditingOrganization(null);
    setCurrentRoute('admin-orgs');
  };

  const handleBackFromAdmin = () => {
    setCurrentRoute('org-selection');
  };

  const handleNavigateToImport = () => {
    setCurrentRoute('import');
  };

  const handleEditProfile = () => {
    setShowEditProfileDialog(true);
  };

  const handleProfileUpdated = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  return (
    <>
      {currentRoute === 'login' && (
        <LoginScreen onLogin={handleLogin} useMockData={USE_MOCK_DATA} />
      )}
      
      {currentRoute === 'profile-completion' && currentUser && (
        <UserProfileCompletionScreen
          user={currentUser}
          onProfileCompleted={handleProfileCompleted}
          onSkip={handleSkipProfile}
          useMockData={USE_MOCK_DATA}
        />
      )}
      
      {currentRoute === 'org-selection' && currentUser && (
        <OrganizationSelectionScreen
          user={currentUser}
          organizations={userOrganizations}
          onSelectOrganization={handleSelectOrganization}
          onCreateOrganization={handleCreateOrganization}
          onAdminViewAll={handleNavigateToAdminOrgs}
        />
      )}
      
      {currentRoute === 'create-org' && currentUser && (
        <OrganizationScreen
          onOrganizationCreated={handleOrganizationCreated}
          onCancel={handleBackToSelection}
          userId={currentUser.id}
          useMockData={USE_MOCK_DATA}
        />
      )}
      
      {currentRoute === 'edit-org' && currentUser && editingOrganization && (
        <OrganizationScreen
          organization={editingOrganization}
          onOrganizationCreated={handleOrganizationCreated}
          onOrganizationUpdated={handleOrganizationUpdated}
          onCancel={handleCancelEditOrganization}
        />
      )}
      
      {/* Wrap all screens that use AppHeader with NavigationProvider */}
      {selectedOrganization && currentUser && (
        <NavigationProvider
          onNavigateToDashboard={handleBackToDashboard}
          onNavigateToGigs={handleNavigateToGigs}
          onNavigateToTeam={handleNavigateToTeam}
          onNavigateToAssets={handleNavigateToAssets}
        >
              {currentRoute === 'dashboard' && (
            <Dashboard
              organization={selectedOrganization}
              user={currentUser}
              userRole={getCurrentUserRole()}
              onBackToSelection={handleBackToSelection}
              onLogout={handleLogout}
              onNavigateToGigs={handleNavigateToGigs}
              onNavigateToTeam={handleNavigateToTeam}
              onNavigateToDashboard={handleBackToDashboard}
              onNavigateToAssets={handleNavigateToAssets}
              onNavigateToKits={handleNavigateToKits}
              onEditProfile={handleEditProfile}
              onNavigateToGigEdit={handleViewGig}
            />
          )}

          {currentRoute === 'gig-list' && (
            <GigListScreen
              organization={selectedOrganization}
              user={currentUser}
              userRole={getCurrentUserRole()}
              onBack={handleBackToDashboard}
              onCreateGig={handleCreateGig}
              onViewGig={handleViewGig}
              onNavigateToDashboard={handleBackToDashboard}
              onNavigateToGigs={handleBackToGigList}
              onNavigateToAssets={handleNavigateToAssets}
              onNavigateToImport={handleNavigateToImport}
              onSwitchOrganization={handleBackToSelection}
              onEditProfile={handleEditProfile}
              onLogout={handleLogout}
              useMockData={USE_MOCK_DATA}
            />
          )}

          {currentRoute === 'create-gig' && (
            <GigScreen
              organization={selectedOrganization}
              user={currentUser}
              userRole={getCurrentUserRole()}
              gigId={selectedGigId} // Pass gigId for edit mode
              onCancel={handleBackToGigList}
              onGigCreated={handleGigCreated}
              onGigUpdated={handleBackToGigList} // After updating, go back to list
              onGigDeleted={handleBackToGigList} // After deleting, go back to list
              onSwitchOrganization={handleBackToSelection}
              onLogout={handleLogout}
            />
          )}

          {currentRoute === 'gig-detail' && selectedGigId && (
            <GigDetailScreen
              gigId={selectedGigId}
              organization={selectedOrganization}
              user={currentUser}
              userRole={getCurrentUserRole()}
              onBack={handleBackToGigList}
              onSwitchOrganization={handleBackToSelection}
              onLogout={handleLogout}
            />
          )}
          
          {currentRoute === 'team' && (
            <TeamScreen
              organization={selectedOrganization}
              user={currentUser}
              userRole={getCurrentUserRole()}
              onNavigateToDashboard={handleBackToDashboard}
              onNavigateToGigs={handleBackToGigList}
              onNavigateToTeam={handleNavigateToTeam}
              onNavigateToAssets={handleNavigateToAssets}
              onSwitchOrganization={handleBackToSelection}
              onEditProfile={handleEditProfile}
              onLogout={handleLogout}
            />
          )}
          
          {currentRoute === 'asset-list' && (
            <AssetListScreen
              organization={selectedOrganization}
              user={currentUser}
              userRole={getCurrentUserRole()}
              onBack={handleBackToDashboard}
              onCreateAsset={handleCreateAsset}
              onViewAsset={handleViewAsset}
              onNavigateToDashboard={handleBackToDashboard}
              onNavigateToGigs={handleBackToGigList}
              onNavigateToAssets={handleNavigateToAssets}
              onNavigateToKits={handleNavigateToKits}
              onNavigateToImport={handleNavigateToImport}
              onSwitchOrganization={handleBackToSelection}
              onLogout={handleLogout}
              useMockData={USE_MOCK_DATA}
            />
          )}

          {currentRoute === 'create-asset' && (
            <AssetScreen
              organization={selectedOrganization}
              user={currentUser}
              userRole={getCurrentUserRole()}
              assetId={selectedAssetId} // Pass assetId for edit mode
              onCancel={handleBackToAssetList}
              onAssetCreated={handleAssetCreated}
              onAssetUpdated={handleBackToAssetList} // After updating, go back to list
              onAssetDeleted={handleBackToAssetList} // After deleting, go back to list
              onSwitchOrganization={handleBackToSelection}
              onLogout={handleLogout}
            />
          )}
          
          {currentRoute === 'kit-list' && (
            <KitListScreen
              organization={selectedOrganization}
              user={currentUser}
              userRole={getCurrentUserRole()}
              onBack={handleBackToDashboard}
              onCreateKit={handleCreateKit}
              onViewKit={handleViewKit}
              onEditKit={handleEditKit}
              onNavigateToDashboard={handleBackToDashboard}
              onNavigateToGigs={handleBackToGigList}
              onNavigateToAssets={handleNavigateToAssets}
              onNavigateToKits={handleNavigateToKits}
              onSwitchOrganization={handleBackToSelection}
              onLogout={handleLogout}
            />
          )}

          {currentRoute === 'create-kit' && (
            <KitScreen
              organization={selectedOrganization}
              user={currentUser}
              userRole={getCurrentUserRole()}
              kitId={selectedKitId} // Pass kitId for edit mode
              onCancel={handleBackToKitList}
              onKitCreated={handleKitCreated}
              onKitUpdated={handleBackToKitList} // After updating, go back to list
              onKitDeleted={handleBackToKitList} // After deleting, go back to list
              onSwitchOrganization={handleBackToSelection}
              onLogout={handleLogout}
            />
          )}
          
          {currentRoute === 'kit-detail' && selectedKitId && (
            <KitDetailScreen
              kitId={selectedKitId}
              organization={selectedOrganization}
              user={currentUser}
              userRole={getCurrentUserRole()}
              onBack={handleBackToKitList}
              onEdit={handleEditKit}
              onSwitchOrganization={handleBackToSelection}
              onLogout={handleLogout}
            />
          )}

          {currentRoute === 'import' && (
            <ImportScreen
              organization={selectedOrganization}
              user={currentUser}
              userRole={getCurrentUserRole()}
              onCancel={handleBackToDashboard}
              onSwitchOrganization={handleBackToSelection}
              onLogout={handleLogout}
            />
          )}
        </NavigationProvider>
      )}

      {currentRoute === 'admin-orgs' && currentUser && (
        <AdminOrganizationsScreen
          onEditOrganization={handleAdminEditOrganization}
          onCreateOrganization={handleCreateOrganization}
          onBack={handleBackFromAdmin}
        />
      )}
      
      <Toaster />
      
      {/* Edit Profile Dialog - Available on all screens */}
      {currentUser && (
        <EditUserProfileDialog
          user={currentUser}
          open={showEditProfileDialog}
          onOpenChange={setShowEditProfileDialog}
          onProfileUpdated={handleProfileUpdated}
        />
      )}
    </>
  );
}

export default App;