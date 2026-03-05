import React from 'react';
import { Card } from '../ui/card';
import { PageHeader } from '../ui/PageHeader';
import { Barcode } from 'lucide-react';

export default function MobileInventoryModePlaceholder() {
  return (
    <div className="space-y-4">
      <PageHeader 
        icon={Barcode}
        title="Inventory Mode"
        description="Coming soon: Scanning and packing lists"
      />
      <Card className="p-4">
        <p className="text-muted-foreground">This is the mobile inventory mode placeholder.</p>
      </Card>
    </div>
  );
}
