import { useState, useEffect } from 'react';
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
import AssetDetailScreen from './components/AssetDetailScreen';
import KitListScreen from './components/KitListScreen';
import KitScreen from './components/KitScreen';
import KitDetailScreen from './components/KitDetailScreen';
import TeamMemberDetailScreen from './components/TeamMemberDetailScreen';
import ImportScreen from './components/ImportScreen';
import EditUserProfileDialog from './components/EditUserProfileDialog';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { NavigationProvider } from './contexts/NavigationContext';
import { useAuth } from './contexts/AuthContext';
import { 
  User, 
  Organization, 
  OrganizationMembership, 
} from './utils/supabase/types';

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
  | 'team-member-detail'
  | 'asset-list'
  | 'create-asset'
  | 'asset-detail'
  | 'kit-list'
  | 'create-kit'
  | 'kit-detail'
  | 'import';

function App() {
  const { 
    user, 
    organizations, 
    selectedOrganization, 
    isLoading, 
    userRole, 
    login, 
    logout, 
    selectOrganization,
    setOrganizations,
    setUser
  } = useAuth();

  const [currentRoute, setCurrentRoute] = useState<Route>(() => {
    return (localStorage.getItem('currentRoute') as Route) || 'login';
  });
  const [selectedGigId, setSelectedGigId] = useState<string | null>(() => {
    return localStorage.getItem('selectedGigId');
  });
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(() => {
    return localStorage.getItem('selectedAssetId');
  });
  const [selectedKitId, setSelectedKitId] = useState<string | null>(() => {
    return localStorage.getItem('selectedKitId');
  });
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(() => {
    return localStorage.getItem('selectedMemberId');
  });
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null);
  const [showEditProfileDialog, setShowEditProfileDialog] = useState(false);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('currentRoute', currentRoute);
  }, [currentRoute]);

  useEffect(() => {
    if (selectedGigId) localStorage.setItem('selectedGigId', selectedGigId);
    else localStorage.removeItem('selectedGigId');
  }, [selectedGigId]);

  useEffect(() => {
    if (selectedAssetId) localStorage.setItem('selectedAssetId', selectedAssetId);
    else localStorage.removeItem('selectedAssetId');
  }, [selectedAssetId]);

  useEffect(() => {
    if (selectedKitId) localStorage.setItem('selectedKitId', selectedKitId);
    else localStorage.removeItem('selectedKitId');
  }, [selectedKitId]);

  useEffect(() => {
    if (selectedMemberId) localStorage.setItem('selectedMemberId', selectedMemberId);
    else localStorage.removeItem('selectedMemberId');
  }, [selectedMemberId]);

  // Send to login and profile completion if needed, otherwise, attempt to
  // auto-select an organization if user belongs to only one.
  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setCurrentRoute('login');
    } else if (!user.first_name?.trim() || !user.last_name?.trim()) {
      setCurrentRoute('profile-completion'); // Fill out profile if incomplete
    } else if (!selectedOrganization) {
      if (organizations.length === 0) {
        setCurrentRoute('org-selection'); // Choose an org if user belongs to none
      } else if (organizations.length === 1) {
        const membership = organizations[0];
        selectOrganization(membership.organization);  // Auto-select if only one org
      } else {
        setCurrentRoute('org-selection'); // Otherwise user has to select which org to use
      }
    }
  }, [user, selectedOrganization, organizations, isLoading, selectOrganization]);

  // Set landing route based on role after an organization is selected
  useEffect(() => {
    if (isLoading || !user || !selectedOrganization || userRole === undefined) return;

    // Only auto-navigate to landing page if we are on a transitional route
    // This prevents kicking the user back to dashboard on every background profile refresh
    const transitionalRoutes: Route[] = ['login', 'profile-completion', 'org-selection', 'create-org'];
    if (transitionalRoutes.includes(currentRoute)) {
      if (userRole === 'Viewer') {
        setCurrentRoute('gig-list');
      } else {
        setCurrentRoute('dashboard');
      }
    }
  }, [isLoading, user, selectedOrganization, userRole, currentRoute]);

  const handleLogin = (userData: User, userOrgs: OrganizationMembership[]) => {
    console.log("handleLogin()");
    login(userData, userOrgs);
  };

  const handleProfileCompleted = (updatedUser: User) => {
    setUser(updatedUser);
    if (organizations.length === 1) {
      const membership = organizations[0];
      selectOrganization(membership.organization);
    } else {
      setCurrentRoute('org-selection');
    }
  };

  const handleSkipProfile = () => {
    setCurrentRoute('org-selection');
  };

  const handleSelectOrganization = (org: Organization) => {
    console.log("handleSelectOrganization(): " + org.name);
    selectOrganization(org);
    if (userRole === 'Viewer') {
      setCurrentRoute('gig-list');
    } else {
      setCurrentRoute('dashboard');
    }
  };

  const handleCreateOrganization = () => {
    setCurrentRoute('create-org');
  };

  const handleOrganizationCreated = (org: Organization) => {
    const newMembership: OrganizationMembership = {
      organization: org,
      role: 'Admin'
    };
    setOrganizations([...organizations, newMembership]);
    selectOrganization(org);
  };

  const handleBackToSelection = () => {
    selectOrganization(null);
    setCurrentRoute('org-selection');
  };

  const handleLogout = async () => {
    await logout();
    setSelectedGigId(null);
    setSelectedAssetId(null);
    setSelectedKitId(null);
    setSelectedMemberId(null);
    setCurrentRoute('login');
    localStorage.removeItem('currentRoute');
    localStorage.removeItem('selectedGigId');
    localStorage.removeItem('selectedAssetId');
    localStorage.removeItem('selectedKitId');
    localStorage.removeItem('selectedMemberId');
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
    setCurrentRoute('gig-detail');
  };

  const handleEditGig = (gigId: string) => {
    setSelectedGigId(gigId);
    setCurrentRoute('create-gig');
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
    setCurrentRoute('asset-detail');
  };

  const handleEditAsset = (assetId: string) => {
    setSelectedAssetId(assetId);
    setCurrentRoute('create-asset');
  };

  const handleAssetCreated = (assetId: string) => {
    setSelectedAssetId(assetId);
    setCurrentRoute('asset-list');
  };

  const handleBackToAssetList = () => {
    setCurrentRoute('asset-list');
  };

  const handleViewTeamMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    setCurrentRoute('team-member-detail');
  };

  const handleBackToTeam = () => {
    setCurrentRoute('team');
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
    const updatedOrgs = organizations.map(membership => 
      membership.organization.id === updatedOrg.id
        ? { ...membership, organization: updatedOrg }
        : membership
    );
    setOrganizations(updatedOrgs);
    
    // If this is the currently selected organization, update it
    if (selectedOrganization?.id === updatedOrg.id) {
      selectOrganization(updatedOrg);
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
    setUser(updatedUser);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  console.log("currentRoute: " + currentRoute);

  return (
    <NavigationProvider
      onNavigateToDashboard={handleBackToDashboard}
      onNavigateToGigs={handleNavigateToGigs}
      onNavigateToTeam={handleNavigateToTeam}
      onNavigateToAssets={handleNavigateToAssets}
      onEditProfile={handleEditProfile}
    >
      {currentRoute === 'login' && (
        <LoginScreen onLogin={handleLogin} useMockData={USE_MOCK_DATA} />
      )}
      
      {currentRoute === 'profile-completion' && user && (
        <UserProfileCompletionScreen
          user={user}
          onProfileCompleted={handleProfileCompleted}
          onSkip={handleSkipProfile}
          useMockData={USE_MOCK_DATA}
        />
      )}
      
      {currentRoute === 'org-selection' && user && (
        <OrganizationSelectionScreen
          user={user}
          organizations={organizations}
          onSelectOrganization={handleSelectOrganization}
          onCreateOrganization={handleCreateOrganization}
          onAdminViewAll={handleNavigateToAdminOrgs}
        />
      )}
      
      {currentRoute === 'create-org' && user && (
        <OrganizationScreen
          onOrganizationCreated={handleOrganizationCreated}
          onCancel={handleBackToSelection}
          userId={user.id}
          useMockData={USE_MOCK_DATA}
        />
      )}
      
      {currentRoute === 'edit-org' && user && editingOrganization && (
        <OrganizationScreen
          organization={editingOrganization}
          onOrganizationCreated={handleOrganizationCreated}
          onOrganizationUpdated={handleOrganizationUpdated}
          onCancel={handleCancelEditOrganization}
        />
      )}
      
      {/* Org-specific screens */}
      {selectedOrganization && user && (
        <>
          {currentRoute === 'dashboard' && (
            <Dashboard
              organization={selectedOrganization}
              user={user}
              userRole={userRole}
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
              user={user}
              userRole={userRole}
              onBack={handleBackToDashboard}
              onCreateGig={handleCreateGig}
              onViewGig={handleViewGig}
              onEditGig={handleEditGig}
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
              user={user}
              userRole={userRole}
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
              user={user}
              userRole={userRole}
              onBack={handleBackToGigList}
              onSwitchOrganization={handleBackToSelection}
              onLogout={handleLogout}
            />
          )}
          
          {currentRoute === 'team' && (
            <TeamScreen
              organization={selectedOrganization}
              user={user}
              userRole={userRole}
              onNavigateToDashboard={handleBackToDashboard}
              onNavigateToGigs={handleBackToGigList}
              onNavigateToTeam={handleNavigateToTeam}
              onNavigateToAssets={handleNavigateToAssets}
              onViewMember={handleViewTeamMember}
              onSwitchOrganization={handleBackToSelection}
              onEditProfile={handleEditProfile}
              onLogout={handleLogout}
            />
          )}

          {currentRoute === 'team-member-detail' && selectedMemberId && (
            <TeamMemberDetailScreen
              organization={selectedOrganization}
              user={user}
              userRole={userRole}
              memberId={selectedMemberId}
              onBack={handleBackToTeam}
              onEdit={(member) => {
                handleBackToTeam();
              }}
              onSwitchOrganization={handleBackToSelection}
              onLogout={handleLogout}
            />
          )}
          
          {currentRoute === 'asset-list' && (
            <AssetListScreen
              organization={selectedOrganization}
              user={user}
              userRole={userRole}
              onBack={handleBackToDashboard}
              onCreateAsset={handleCreateAsset}
              onViewAsset={handleViewAsset}
              onEditAsset={handleEditAsset}
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

          {currentRoute === 'asset-detail' && selectedAssetId && (
            <AssetDetailScreen
              organization={selectedOrganization}
              user={user}
              userRole={userRole}
              assetId={selectedAssetId}
              onBack={handleBackToAssetList}
              onEdit={handleEditAsset}
              onSwitchOrganization={handleBackToSelection}
              onLogout={handleLogout}
            />
          )}

          {currentRoute === 'create-asset' && (
            <AssetScreen
              organization={selectedOrganization}
              user={user}
              userRole={userRole}
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
              user={user}
              userRole={userRole}
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
              user={user}
              userRole={userRole}
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
              user={user}
              userRole={userRole}
              onBack={handleBackToKitList}
              onEdit={handleEditKit}
              onSwitchOrganization={handleBackToSelection}
              onLogout={handleLogout}
            />
          )}

          {currentRoute === 'import' && (
            <ImportScreen
              organization={selectedOrganization}
              user={user}
              userRole={userRole}
              onCancel={handleBackToDashboard}
              onNavigateToGigs={handleNavigateToGigs}
              onSwitchOrganization={handleBackToSelection}
              onLogout={handleLogout}
            />
          )}
        </>
      )}

      {currentRoute === 'admin-orgs' && user && (
        <AdminOrganizationsScreen
          onEditOrganization={handleAdminEditOrganization}
          onCreateOrganization={handleCreateOrganization}
          onBack={handleBackFromAdmin}
        />
      )}
      
      <Toaster />
      
      {/* Edit Profile Dialog - Available on all screens */}
      {user && (
        <EditUserProfileDialog
          user={user}
          open={showEditProfileDialog}
          onOpenChange={setShowEditProfileDialog}
          onProfileUpdated={handleProfileUpdated}
        />
      )}
    </NavigationProvider>
  );
}

export default App;