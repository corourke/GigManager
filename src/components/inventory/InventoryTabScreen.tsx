import { useState } from 'react';
import { ScanLine } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import AppHeader from '../AppHeader';
import EquipmentTabs from '../EquipmentTabs';
import { PageHeader } from '../ui/PageHeader';
import { InventorySummaryDashboard } from './InventorySummaryDashboard';
import { LocationExplorer } from './LocationExplorer';
import { InventoryReports } from './InventoryReports';
import { Organization, User, UserRole } from '../../utils/supabase/types';

interface InventoryTabScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  onNavigateToAssets: () => void;
  onNavigateToKits: () => void;
  onNavigateToInventory: () => void;
  onSwitchOrganization?: () => void;
  onLogout?: () => void;
  onEditProfile?: () => void;
}

export default function InventoryTabScreen({
  organization,
  user,
  userRole,
  onNavigateToAssets,
  onNavigateToKits,
  onNavigateToInventory,
  onSwitchOrganization,
  onLogout,
  onEditProfile,
}: InventoryTabScreenProps) {
  const [subTab, setSubTab] = useState<'summary' | 'explorer' | 'reports'>('summary');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="no-print">
        <AppHeader
          organization={organization}
          user={user}
          userRole={userRole}
          currentRoute="inventory"
          onSwitchOrganization={onSwitchOrganization}
          onEditProfile={onEditProfile}
          onLogout={onLogout ?? (() => {})}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="no-print">
          <EquipmentTabs
            activeTab="inventory"
            onNavigateToAssets={onNavigateToAssets}
            onNavigateToKits={onNavigateToKits}
            onNavigateToInventory={onNavigateToInventory}
          />
        </div>

        <div className="no-print">
          <PageHeader
            icon={ScanLine}
            title="Inventory"
            description="Track equipment through Pack-Out, Load, On-Site, and Unload workflows."
          />
        </div>

        <Tabs value={subTab} onValueChange={(v) => setSubTab(v as typeof subTab)}>
          <TabsList className="mb-6 no-print">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="explorer">Location Explorer</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <InventorySummaryDashboard
              organizationId={organization.id}
              userId={user.id}
              userRole={userRole}
            />
          </TabsContent>

          <TabsContent value="explorer">
            <LocationExplorer organizationId={organization.id} />
          </TabsContent>

          <TabsContent value="reports">
            <InventoryReports
              organizationId={organization.id}
              organizationName={organization.name}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
