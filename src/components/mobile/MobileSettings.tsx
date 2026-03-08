import React from 'react';
import { Card } from '../ui/card';
import { PageHeader } from '../ui/PageHeader';
import { Settings, LogOut } from 'lucide-react';
import { Button } from '../ui/button';

interface MobileSettingsProps {
  onLogout: () => void;
}

export default function MobileSettings({ onLogout }: MobileSettingsProps) {
  return (
    <div className="space-y-4">
      <PageHeader 
        icon={Settings}
        title="Settings"
        description="Mobile preferences and biometric auth"
      />
      
      <Card className="p-4 space-y-4">
        <h3 className="font-medium">Device & Security</h3>
        <p className="text-sm text-muted-foreground">Biometric enrollment coming soon.</p>
        
        <Button 
          variant="destructive" 
          className="w-full justify-start" 
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </Card>

      <p className="text-center text-[10px] text-muted-foreground pt-4">
        Build: {__BUILD_TIMESTAMP__}
      </p>
    </div>
  );
}
