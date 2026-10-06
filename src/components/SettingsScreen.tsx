import React from 'react';
import { Settings, Calendar, Tags } from 'lucide-react';

import AppHeader from './AppHeader';
import { PageHeader } from './ui/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import CalendarIntegrationSettings from './CalendarIntegrationSettings';
import CategoriesSettings from './settings/CategoriesSettings';
import { Organization, User, UserRole } from '../utils/supabase/types';

export type SettingsTab = 'calendar' | 'categories';

interface SettingsScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  /** The open tab (from the URL: /settings/calendar, /settings/categories). */
  tab?: SettingsTab;
  onTabChange?: (tab: SettingsTab) => void;
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
  tab = 'calendar',
  onTabChange,
  onSwitchOrganization,
  onLogout,
  onEditProfile,
}: SettingsScreenProps) {
  // Admins edit the category lists; Managers see them; others don't get the tab.
  const showCategories = userRole === 'Admin' || userRole === 'Manager';
  const active: SettingsTab = tab === 'categories' && showCategories ? 'categories' : 'calendar';

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          icon={Settings}
          title="Settings"
          description="Manage your integrations and your organization's lists"
        />

        <Tabs value={active} onValueChange={v => onTabChange?.(v as SettingsTab)} className="space-y-6">
          <TabsList className="bg-white border border-gray-200 p-1">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Google Calendar
            </TabsTrigger>
            {showCategories && (
              <TabsTrigger value="categories" className="flex items-center gap-2">
                <Tags className="w-4 h-4" />
                Categories
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="calendar" className="max-w-3xl">
            <CalendarIntegrationSettings
              userId={user.id}
              organizationId={organization.id}
              onSettingsChanged={() => {}}
            />
          </TabsContent>
          {showCategories && (
            <TabsContent value="categories">
              <CategoriesSettings organizationId={organization.id} canEdit={userRole === 'Admin'} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
