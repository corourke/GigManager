import { useState } from 'react';
import { Barcode, Printer, X } from 'lucide-react';
import AppHeader from '../AppHeader';
import EquipmentHeader from '../EquipmentHeader';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { InventorySummaryDashboard } from './InventorySummaryDashboard';
import { LocationExplorer } from './LocationExplorer';
import { ManifestReport, MaintenanceQueue } from './InventoryReports';
import TrackingTab from './TrackingTab';
import { Organization, User, UserRole } from '../../utils/supabase/types';
import type { InventoryTab } from '../../routes/paths';

interface InventoryTabScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  onNavigateToAssets: () => void;
  onNavigateToKits: () => void;
  onNavigateToInventory: (tab: InventoryTab) => void;
  /** The tab, from the URL (`/equipment/locations`). */
  subTab?: InventoryTab;
  onSwitchOrganization?: () => void;
  onLogout?: () => void;
  onEditProfile?: () => void;
}

/**
 * Equipment's tabs after Assets and Kits (#39): Out on gigs (the old Summary
 * and Tracking), Locations (the Location Explorer, with the Manifest one click
 * away) and Maintenance. One row of tabs, no sub-tabs. The packing list lives
 * on the gig page.
 */
export default function InventoryTabScreen({
  organization,
  user,
  userRole,
  onNavigateToAssets,
  onNavigateToKits,
  onNavigateToInventory,
  subTab = 'out-on-gigs',
  onSwitchOrganization,
  onLogout,
  onEditProfile,
}: InventoryTabScreenProps) {
  // `undefined` = closed; '' = open with no gig picked yet.
  const [trackingGigId, setTrackingGigId] = useState<string | undefined>(undefined);
  const [showManifest, setShowManifest] = useState(false);

  const actions =
    subTab === 'out-on-gigs' ? (
      <Button variant="outline" onClick={() => setTrackingGigId('')}>
        <Barcode className="w-4 h-4 mr-2" />
        Track a gig
      </Button>
    ) : subTab === 'locations' ? (
      showManifest ? (
        <Button variant="outline" onClick={() => setShowManifest(false)}>
          <X className="w-4 h-4 mr-2" />
          Close manifest
        </Button>
      ) : (
        <Button variant="outline" onClick={() => setShowManifest(true)}>
          <Printer className="w-4 h-4 mr-2" />
          Print manifest
        </Button>
      )
    ) : null;

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
        <EquipmentHeader
          activeTab={subTab}
          onNavigateToAssets={onNavigateToAssets}
          onNavigateToKits={onNavigateToKits}
          onNavigateToInventory={onNavigateToInventory}
          actions={actions}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {subTab === 'out-on-gigs' && (
          <InventorySummaryDashboard
            organizationId={organization.id}
            userId={user.id}
            userRole={userRole}
            onTrack={(gigId) => setTrackingGigId(gigId)}
          />
        )}

        {subTab === 'locations' &&
          (showManifest ? (
            <ManifestReport organizationId={organization.id} organizationName={organization.name} />
          ) : (
            <LocationExplorer organizationId={organization.id} userId={user.id} userRole={userRole} />
          ))}

        {subTab === 'maintenance' && (
          <MaintenanceQueue organizationId={organization.id} organizationName={organization.name} />
        )}
      </div>

      <Dialog open={trackingGigId !== undefined} onOpenChange={(open) => { if (!open) setTrackingGigId(undefined); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Track a gig</DialogTitle>
            <DialogDescription>Scan equipment out and back in for a gig.</DialogDescription>
          </DialogHeader>
          {trackingGigId !== undefined && (
            <TrackingTab organizationId={organization.id} initialGigId={trackingGigId || undefined} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
