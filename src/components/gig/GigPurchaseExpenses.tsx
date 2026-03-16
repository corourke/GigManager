import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Loader2, 
  AlertCircle,
  FileText,
  ExternalLink,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { getPurchases, updatePurchase, scanInvoice } from '../../services/purchase.service';
import { DbPurchase, UserRole } from '../../utils/supabase/types';
import ReviewScannedDataDialog from '../ReviewScannedDataDialog';
import AttachmentManager from '../AttachmentManager';

interface GigPurchaseExpensesProps {
  gigId: string;
  currentOrganizationId: string;
  userRole?: UserRole;
}

export default function GigPurchaseExpenses({
  gigId,
  currentOrganizationId,
  userRole,
}: GigPurchaseExpensesProps) {
  const [purchases, setPurchases] = useState<DbPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

  const isAdmin = userRole === 'Admin';

  useEffect(() => {
    loadPurchases();
  }, [gigId]);

  const loadPurchases = async () => {
    setIsLoading(true);
    try {
      const data = await getPurchases(currentOrganizationId, { gig_id: gigId, row_type: 'header' });
      setPurchases(data);
    } catch (err: any) {
      console.error('Error loading purchases:', err);
      toast.error('Failed to load purchases');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadReceipt = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const data = await scanInvoice(file);
      setScannedData(data);
      setShowReviewDialog(true);
    } catch (err: any) {
      console.error('Error scanning receipt:', err);
      toast.error(err.message || 'Failed to scan receipt');
    } finally {
      setIsScanning(false);
      event.target.value = ''; // Reset input
    }
  };

  const handleUnlink = async (purchaseId: string) => {
    if (!confirm('Are you sure you want to unlink this purchase from this gig?')) return;

    try {
      await updatePurchase(purchaseId, { gig_id: null as any });
      toast.success('Purchase unlinked');
      loadPurchases();
    } catch (err: any) {
      console.error('Error unlinking purchase:', err);
      toast.error('Failed to unlink purchase');
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (!isAdmin) return null;

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-gray-600" />
              <CardTitle>Purchase Expenses</CardTitle>
            </div>
            <div className="relative">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleUploadReceipt}
                disabled={isScanning}
                accept=".pdf,image/*"
              />
              <Button variant="outline" size="sm" disabled={isScanning}>
                {isScanning ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-1" />
                )}
                Upload Receipt
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
            </div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No purchase expenses linked to this gig</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((purchase) => (
                      <TableRow key={purchase.id} className={selectedPurchaseId === purchase.id ? 'bg-sky-50' : ''}>
                        <TableCell className="text-sm">
                          {purchase.purchase_date ? new Date(purchase.purchase_date).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm font-medium">{purchase.vendor}</TableCell>
                        <TableCell className="text-sm text-gray-600">{purchase.description || 'N/A'}</TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(purchase.total_inv_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50"
                              onClick={() => setSelectedPurchaseId(selectedPurchaseId === purchase.id ? null : purchase.id)}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-400 hover:text-red-600"
                              onClick={() => handleUnlink(purchase.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedPurchaseId && (
                <div className="pt-6 border-t border-gray-100">
                  <AttachmentManager
                    organizationId={currentOrganizationId}
                    entityType="purchase"
                    entityId={selectedPurchaseId}
                    title="Purchase Attachments"
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ReviewScannedDataDialog
        open={showReviewDialog}
        onOpenChange={setShowReviewDialog}
        organizationId={currentOrganizationId}
        scannedData={scannedData}
        gigId={gigId}
        onSuccess={(id) => {
          loadPurchases();
          setSelectedPurchaseId(id);
        }}
      />
    </>
  );
}
