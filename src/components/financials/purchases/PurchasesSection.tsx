import { useState } from 'react';
import { FileText, PencilLine, ScanLine } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import type { Organization, User, UserRole } from '../../../utils/supabase/types';
import PurchasesTab from './PurchasesTab';
import ManualPurchaseTab from './ManualPurchaseTab';
import ScanInvoiceTab from './ScanInvoiceTab';

type PurchasesView = 'report' | 'manual' | 'scan';

interface PurchasesSectionProps {
  organization: Organization;
  user: User;
  userRole?: UserRole;
  highlightPurchaseId?: string | null;
  returnGigId?: string | null;
  onNavigateToGigDetail?: (gigId: string) => void;
  onNavigateToAssetDetail?: (assetId: string) => void;
  onEditAsset?: (assetId: string) => void;
}

/**
 * Financials → Purchases (10-01): the report, and separate tabs for adding
 * purchases by hand or from scanned invoices. The report stays mounted, so its
 * filters survive, and reloads only after a purchase was added elsewhere.
 */
export default function PurchasesSection(props: PurchasesSectionProps) {
  const { organization, userRole } = props;
  const canAdd = userRole === 'Admin' || userRole === 'Manager';
  const [view, setView] = useState<PurchasesView>('report');
  const [reloadToken, setReloadToken] = useState(0);
  const [reportIsStale, setReportIsStale] = useState(false);

  const showView = (next: PurchasesView) => {
    if (next === 'report' && reportIsStale) {
      setReloadToken((n) => n + 1);
      setReportIsStale(false);
    }
    setView(next);
  };
  const purchaseAdded = () => setReportIsStale(true);

  const report = (
    <PurchasesTab
      {...props}
      reloadToken={reloadToken}
      onAddManually={canAdd ? () => showView('manual') : undefined}
      onScanInvoices={canAdd ? () => showView('scan') : undefined}
    />
  );
  if (!canAdd) return report;

  return (
    <Tabs value={view} onValueChange={(v) => showView(v as PurchasesView)} className="space-y-4">
      <TabsList className="bg-transparent p-0 h-auto gap-5 rounded-none border-b w-full justify-start">
        {([
          ['report', 'Report', FileText],
          ['manual', 'Add manually', PencilLine],
          ['scan', 'Scan invoices', ScanLine],
        ] as const).map(([value, label, Icon]) => (
          <TabsTrigger
            key={value}
            value={value}
            className="flex-none px-0 pb-2 rounded-none border-0 border-b-2 border-transparent data-[state=active]:border-sky-700 data-[state=active]:text-sky-700 data-[state=active]:shadow-none bg-transparent data-[state=active]:bg-transparent"
          >
            <Icon className="w-4 h-4 mr-1.5" />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Kept mounted (hidden when inactive) so the report's filters and scroll survive. */}
      <TabsContent value="report" forceMount className="mt-0 data-[state=inactive]:hidden">
        {report}
      </TabsContent>
      <TabsContent value="manual" className="mt-0">
        <ManualPurchaseTab organizationId={organization.id} onSaved={purchaseAdded} />
      </TabsContent>
      <TabsContent value="scan" className="mt-0">
        <ScanInvoiceTab organizationId={organization.id} onSaved={purchaseAdded} />
      </TabsContent>
    </Tabs>
  );
}
