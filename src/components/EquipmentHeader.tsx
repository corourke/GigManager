import React from 'react';
import { Package } from 'lucide-react';
import { Tabs } from './ui/tabs';
import { PageHeader } from './layout/PageHeader';
import { PageTabsList, PageTabsTrigger } from './layout/PageTabs';

export type EquipmentTab = 'assets' | 'kits' | 'inventory';

interface EquipmentHeaderProps {
  activeTab: EquipmentTab;
  onNavigateToAssets: () => void;
  onNavigateToKits: () => void;
  onNavigateToInventory: () => void;
  /** Buttons for the open tab, on the title row. */
  actions?: React.ReactNode;
}

/**
 * The Equipment section's page header (#39): the title stays "Equipment" on
 * every tab and the tabs sit below it. Each tab is its own route, so the
 * tabs only navigate; the page renders its own content.
 */
export default function EquipmentHeader({
  activeTab,
  onNavigateToAssets,
  onNavigateToKits,
  onNavigateToInventory,
  actions,
}: EquipmentHeaderProps) {
  const navigate: Record<EquipmentTab, () => void> = {
    assets: onNavigateToAssets,
    kits: onNavigateToKits,
    inventory: onNavigateToInventory,
  };

  return (
    // Manual activation: with automatic, a click fires onValueChange on mousedown
    // and again on focus, which would push the route twice.
    <Tabs value={activeTab} onValueChange={(v) => navigate[v as EquipmentTab]?.()} activationMode="manual" className="gap-0">
      <PageHeader
        icon={Package}
        iconClassName="bg-violet-50 text-violet-700"
        title="Equipment"
        actions={actions}
        tabs={
          <PageTabsList aria-label="Equipment sections">
            <PageTabsTrigger value="assets">Assets</PageTabsTrigger>
            <PageTabsTrigger value="kits">Kits</PageTabsTrigger>
            <PageTabsTrigger value="inventory">Inventory</PageTabsTrigger>
          </PageTabsList>
        }
      />
    </Tabs>
  );
}
