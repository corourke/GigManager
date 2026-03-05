import React from 'react';
import { Card } from '../ui/card';
import { PageHeader } from '../ui/PageHeader';
import { LayoutDashboard } from 'lucide-react';

export default function MobileDashboardPlaceholder() {
  return (
    <div className="space-y-4">
      <PageHeader 
        icon={LayoutDashboard}
        title="Mobile Dashboard"
        description="Coming soon: Upcoming gigs and quick links"
      />
      <Card className="p-4">
        <p className="text-muted-foreground">This is the mobile dashboard placeholder.</p>
      </Card>
    </div>
  );
}
