import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import ReviewScannedDataDialog from '../../ReviewScannedDataDialog';
import { scanInvoice } from '../../../services/purchase.service';

type Scanned = { file: File; data: any };

/** Purchases → Scan invoices: pick an invoice, review what the AI read, save. */
export default function ScanInvoiceTab({ organizationId, onSaved }: { organizationId: string; onSaved: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState<string | null>(null);
  const [scanned, setScanned] = useState<Scanned | null>(null);

  const scan = async (file: File) => {
    setScanning(file.name);
    try {
      setScanned({ file, data: await scanInvoice(file, organizationId) });
    } catch (err: any) {
      toast.error(err.message || 'Failed to scan invoice');
    } finally {
      setScanning(null);
    }
  };

  if (scanned) {
    return (
      <ReviewScannedDataDialog
        layout="page"
        open
        cancelLabel="Discard"
        onOpenChange={(open) => { if (!open) setScanned(null); }}
        organizationId={organizationId}
        scannedData={scanned.data}
        file={scanned.file}
        onSuccess={() => { onSaved(); setScanned(null); }}
      />
    );
  }

  return (
    <Card className="p-12 flex flex-col items-center justify-center text-center border-2 border-dashed">
      {scanning ? (
        <>
          <Loader2 className="w-10 h-10 text-sky-700 animate-spin mb-4" aria-hidden />
          <p className="text-lg font-semibold">Scanning {scanning}…</p>
          <p className="text-sm text-muted-foreground">This usually takes 10–30 seconds.</p>
        </>
      ) : (
        <>
          <Upload className="w-10 h-10 text-muted-foreground/60 mb-4" aria-hidden />
          <p className="text-lg font-semibold">Scan an invoice</p>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm">
            Choose a PDF or photo of an invoice or receipt. You review what was read before anything is saved.
          </p>
          <Button className="bg-sky-700 hover:bg-sky-800 text-white" onClick={() => inputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1.5" />
            Choose invoice
          </Button>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        data-testid="scan-invoice-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) scan(file);
        }}
      />
    </Card>
  );
}
