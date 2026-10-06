import React from 'react';
import { Settings, Calendar, Tags } from 'lucide-react';

import AppHeader from './AppHeader';
import { PageHeader } from './layout/PageHeader';
import { PageTabsList, PageTabsTrigger } from './layout/PageTabs';
import { Tabs, TabsContent } from './ui/tabs';
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

      <Tabs value={active} onValueChange={v => onTabChange?.(v as SettingsTab)} activationMode="manual" className="gap-0">
        <PageHeader
          icon={Settings}
          iconClassName="bg-gray-100 text-gray-700"
          title="Settings"
          tabs={
            <PageTabsList aria-label="Settings sections">
              <PageTabsTrigger value="calendar">
                <Calendar />
                Google Calendar
              </PageTabsTrigger>
              {showCategories && (
                <PageTabsTrigger value="categories">
                  <Tags />
                  Categories
                </PageTabsTrigger>
              )}
            </PageTabsList>
          }
        />

        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
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
        </div>
      </Tabs>
    </div>
  );
}
