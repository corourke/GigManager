import React from 'react';
import { Settings } from 'lucide-react';

import AppHeader from './AppHeader';
import { PageHeader } from './ui/PageHeader';
import CalendarIntegrationSettings from './CalendarIntegrationSettings';
import { Organization, User, UserRole } from '../utils/supabase/types';

interface SettingsScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  onBack: () => void;
  onNavigateToDashboard: () => void;
  onNavigateToGigs: () => void;
  onNavigateToAssets: () => void;
  onSwitchOrganization: () => void;
  onLogout: () => void;
  onEditProfile?: () => void;
}

export default function SettingsScreen({
  organization,
  user,
  userRole,
  onBack,
  onNavigateToDashboard,
  onNavigateToGigs,
  onNavigateToAssets,
  onSwitchOrganization,
  onLogout,
  onEditProfile,
}: SettingsScreenProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        organization={organization}
        user={user}
        userRole={userRole}
        currentRoute="dashboard"
        onSwitchOrganization={onSwitchOrganization}
        onLogout={onLogout}
        onEditProfile={onEditProfile}
      />

      <div className="container mx-auto p-6 max-w-3xl">
        <PageHeader
          icon={Settings}
          title="Settings"
          description="Manage your integrations and preferences"
        />

        <CalendarIntegrationSettings
          userId={user.id}
          onSettingsChanged={() => {}}
        />
      </div>
    </div>
  );
}
