import { useState } from 'react';
import ReviewScannedDataDialog from '../../ReviewScannedDataDialog';

/** Purchases → Add manually: the purchase form in place; saving clears it for the next one. */
export default function ManualPurchaseTab({ organizationId, onSaved }: { organizationId: string; onSaved: () => void }) {
  const [formKey, setFormKey] = useState(0);
  const startOver = () => setFormKey((k) => k + 1);
  return (
    <ReviewScannedDataDialog
      key={formKey}
      layout="page"
      open
      cancelLabel="Clear"
      onOpenChange={(open) => { if (!open) startOver(); }}
      organizationId={organizationId}
      scannedData={null}
      file={null}
      onSuccess={() => { onSaved(); startOver(); }}
    />
  );
}
