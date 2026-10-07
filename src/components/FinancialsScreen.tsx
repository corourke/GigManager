import { useState } from 'react';
import { Banknote, Receipt, TrendingUp } from 'lucide-react';
import { Card } from './ui/card';
import { PageHeader } from './layout/PageHeader';
import { PageTabsList, PageTabsTrigger } from './layout/PageTabs';
import { Tabs, TabsContent } from './ui/tabs';
import AppHeader from './AppHeader';
import TaxYearsCard from './financials/TaxYearsCard';
import GigAccountingTab from './financials/GigAccountingTab';
import PurchasesSection from './financials/purchases/PurchasesSection';
import { Organization, User, UserRole } from '../utils/supabase/types';
import type { FinancialTab, PurchasesView } from '../routes/paths';

interface FinancialsScreenProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  onSwitchOrganization: () => void;
  onLogout: () => void;
  onNavigateToGigs: () => void;
  highlightPurchaseId?: string | null;
  returnGigId?: string | null;
  onNavigateToGigDetail?: (gigId: string) => void;
  onNavigateToAssetDetail?: (assetId: string) => void;
  onEditAsset?: (assetId: string) => void;
  /** The tab and Purchases sub-tab, when the URL decides them (see routes/paths). */
  tab?: FinancialTab;
  purchasesView?: PurchasesView;
  onNavigate?: (tab: FinancialTab, purchasesView?: PurchasesView) => void;
}

export default function FinancialsScreen({
  organization,
  user,
  userRole,
  onSwitchOrganization,
  onLogout,
  onNavigateToGigs,
  highlightPurchaseId,
  returnGigId,
  onNavigateToGigDetail,
  onNavigateToAssetDetail,
  onEditAsset,
  tab,
  purchasesView,
  onNavigate,
}: FinancialsScreenProps) {
  const [localTab, setLocalTab] = useState<FinancialTab>('purchases');
  const activeTab = tab ?? localTab;
  const setActiveTab = (t: FinancialTab) => (onNavigate ? onNavigate(t) : setLocalTab(t));

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        organization={organization}
        user={user}
        userRole={userRole}
        currentRoute="financials"
        onSwitchOrganization={onSwitchOrganization}
        onLogout={onLogout}
      />

      {/* Manual activation: each tab is a route; automatic would navigate twice per click. */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FinancialTab)} activationMode="manual" className="gap-0">
        <PageHeader
          icon={Banknote}
          iconClassName="bg-green-50 text-green-700"
          title="Financials"
          back={returnGigId && onNavigateToGigDetail ? { label: 'Back to Gig', onClick: () => onNavigateToGigDetail(returnGigId) } : undefined}
          tabs={
            <PageTabsList aria-label="Financials sections">
              <PageTabsTrigger value="purchases">
                <Receipt />
                Purchases
              </PageTabsTrigger>
              <PageTabsTrigger value="gig-accounting">
                <Banknote />
                Gig Accounting
              </PageTabsTrigger>
              <PageTabsTrigger value="reporting">
                <TrendingUp />
                Reporting
              </PageTabsTrigger>
            </PageTabsList>
          }
        />

        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
          <TabsContent value="purchases">
            <PurchasesSection
              organization={organization}
              user={user}
              userRole={userRole}
              highlightPurchaseId={highlightPurchaseId}
              returnGigId={returnGigId}
              onNavigateToGigDetail={onNavigateToGigDetail}
              onNavigateToAssetDetail={onNavigateToAssetDetail}
              onEditAsset={onEditAsset}
              view={purchasesView}
              onViewChange={onNavigate ? (v) => onNavigate('purchases', v) : undefined}
            />
          </TabsContent>

          <TabsContent value="gig-accounting">
            <GigAccountingTab
              organization={organization}
              userRole={userRole}
              onNavigateToGigDetail={onNavigateToGigDetail}
            />
          </TabsContent>

          <TabsContent value="reporting" className="space-y-4">
            <TaxYearsCard organizationId={organization.id} userRole={userRole} />
            <Card className="p-12 text-center text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-medium">Reporting Dashboard Coming Soon</p>
              <p className="text-sm">Visual reports on your organization's spending and assets.</p>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
