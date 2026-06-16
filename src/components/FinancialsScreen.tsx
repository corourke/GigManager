import { useState } from 'react';
import { Banknote, Receipt, TrendingUp, ArrowLeft } from 'lucide-react';
import { Card } from './ui/card';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import AppHeader from './AppHeader';
import GigAccountingTab from './financials/GigAccountingTab';
import PurchasesTab from './financials/purchases/PurchasesTab';
import { Organization, User, UserRole } from '../utils/supabase/types';

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
}

type FinancialTab = 'purchases' | 'gig-accounting' | 'reporting';

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
  onEditAsset
}: FinancialsScreenProps) {
  const [activeTab, setActiveTab] = useState<FinancialTab>('purchases');

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          icon={Banknote}
          iconClassName="w-8 h-8 text-green-600"
          title="Financials"
          description="Manage purchases, gig accounting, and financial reporting."
        />

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FinancialTab)} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-white border border-gray-200 p-1">
              <TabsTrigger value="purchases" className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Purchases
              </TabsTrigger>
              <TabsTrigger value="gig-accounting" className="flex items-center gap-2">
                <Banknote className="w-4 h-4" />
                Gig Accounting
              </TabsTrigger>
              <TabsTrigger value="reporting" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Reporting
              </TabsTrigger>
            </TabsList>

            {returnGigId && onNavigateToGigDetail && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => onNavigateToGigDetail(returnGigId)}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Gig
              </Button>
            )}
          </div>

          <TabsContent value="purchases">
            <PurchasesTab
              organization={organization}
              user={user}
              userRole={userRole}
              highlightPurchaseId={highlightPurchaseId}
              returnGigId={returnGigId}
              onNavigateToGigDetail={onNavigateToGigDetail}
              onNavigateToAssetDetail={onNavigateToAssetDetail}
              onEditAsset={onEditAsset}
            />
          </TabsContent>

          <TabsContent value="gig-accounting">
            <GigAccountingTab
              organization={organization}
              userRole={userRole}
              onNavigateToGigDetail={onNavigateToGigDetail}
            />
          </TabsContent>

          <TabsContent value="reporting">
            <Card className="p-12 text-center text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-medium">Reporting Dashboard Coming Soon</p>
              <p className="text-sm">Visual reports on your organization's spending and assets.</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
