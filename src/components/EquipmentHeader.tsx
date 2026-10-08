import React from 'react';
import { Package } from 'lucide-react';
import { Tabs } from './ui/tabs';
import { PageHeader } from './layout/PageHeader';
import { PageTabsList, PageTabsTrigger } from './layout/PageTabs';
import type { InventoryTab } from '../routes/paths';

export type EquipmentTab = 'assets' | 'kits' | InventoryTab;

interface EquipmentHeaderProps {
  activeTab: EquipmentTab;
  onNavigateToAssets: () => void;
  onNavigateToKits: () => void;
  onNavigateToInventory: (tab: InventoryTab) => void;
  /** Buttons for the open tab, on the title row. */
  actions?: React.ReactNode;
}

/**
 * The Equipment section's page header (#39): the title stays "Equipment" on
 * every tab and the tabs sit below it, one row, no sub-tabs: Items (#162;
 * the route is still /assets), Kits,
 * Out on gigs, Locations, Maintenance. Each tab is its own route, so the
 * tabs only navigate; the page renders its own content.
 */
export default function EquipmentHeader({
  activeTab,
  onNavigateToAssets,
  onNavigateToKits,
  onNavigateToInventory,
  actions,
}: EquipmentHeaderProps) {
  const navigate = (tab: EquipmentTab) => {
    if (tab === 'assets') onNavigateToAssets();
    else if (tab === 'kits') onNavigateToKits();
    else onNavigateToInventory(tab);
  };

  return (
    // Manual activation: with automatic, a click fires onValueChange on mousedown
    // and again on focus, which would push the route twice.
    <Tabs value={activeTab} onValueChange={(v) => navigate(v as EquipmentTab)} activationMode="manual" className="gap-0">
      <PageHeader
        icon={Package}
        iconClassName="bg-violet-50 text-violet-700"
        title="Equipment"
        actions={actions}
        tabs={
          <PageTabsList aria-label="Equipment sections">
            <PageTabsTrigger value="assets">Items</PageTabsTrigger>
            <PageTabsTrigger value="kits">Kits</PageTabsTrigger>
            <PageTabsTrigger value="out-on-gigs">Out on gigs</PageTabsTrigger>
            <PageTabsTrigger value="locations">Locations</PageTabsTrigger>
            <PageTabsTrigger value="maintenance">Maintenance</PageTabsTrigger>
          </PageTabsList>
        }
      />
    </Tabs>
  );
}
