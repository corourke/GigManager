import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Fingerprint, Lock, Loader2, LogOut } from 'lucide-react';
import { Button } from '../ui/button';

interface MobileLockScreenProps {
  onUnlock: () => Promise<boolean>;
  onLogout: () => void;
}

export default function MobileLockScreen({ onUnlock, onLogout }: MobileLockScreenProps) {
  const [unlocking, setUnlocking] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handleUnlock = async () => {
    setUnlocking(true);
    const success = await onUnlock();
    if (!success) {
      setAttempts(prev => prev + 1);
    }
    setUnlocking(false);
  };

  // If failed 3 times, show a stronger fallback (this is just for UI, standard login is always an option)
  const tooManyAttempts = attempts >= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/95 backdrop-blur-sm">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>App Locked</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-center text-sm text-muted-foreground">
            {tooManyAttempts 
              ? "Multiple failed attempts. Please use your biometric ID or log out to reset."
              : "Use your biometric ID to unlock the app and continue your session."}
          </p>

          <div className="space-y-3">
            <Button 
              className="w-full h-12 text-lg" 
              onClick={handleUnlock} 
              disabled={unlocking}
            >
              {unlocking ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Fingerprint className="w-6 h-6 mr-2" />
                  Unlock
                </>
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground" 
              onClick={onLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </div>

          {attempts > 0 && !tooManyAttempts && (
            <p className="text-center text-xs text-destructive">
              Unlock failed. Attempt {attempts}/3
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
