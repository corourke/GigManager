import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../utils/supabase/client';
import { startAuthentication } from '@simplewebauthn/browser';
import { toast } from 'sonner';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes background inactivity
const SESSION_EXPIRY_MS = 60 * 60 * 1000; // 1 hour session expiry

export function useMobileLock(userEmail: string | undefined, isMobile: boolean) {
  const [isLocked, setIsLocked] = useState(false);
  const [lastActiveTime, setLastActiveTime] = useState(() => Date.now());
  const supabase = createClient();

  const lock = useCallback(() => {
    if (isMobile) {
      setIsLocked(true);
      localStorage.setItem('mobile_locked', 'true');
    }
  }, [isMobile]);

  const unlock = useCallback(async () => {
    if (!userEmail) return false;

    try {
      // 1. Get authentication options
      const { data: options, error: optionsError } = await supabase.functions.invoke(
        'server/webauthn/authenticate/options',
        {
          method: 'POST',
          body: { email: userEmail },
        }
      );

      if (optionsError) throw optionsError;
      if (options.error) throw new Error(options.error);

      // 2. Start WebAuthn authentication
      const authResponse = await startAuthentication({ optionsJSON: options });

      // 3. Verify authentication
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'server/webauthn/authenticate/verify',
        {
          method: 'POST',
          body: {
            authenticationResponse: authResponse,
            email: userEmail,
          },
        }
      );

      if (verifyError) throw verifyError;
      if (verifyData.error) throw new Error(verifyData.error);

      if (verifyData.success) {
        setIsLocked(false);
        localStorage.removeItem('mobile_locked');
        setLastActiveTime(Date.now());
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Unlock error:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Authentication cancelled');
      } else {
        toast.error(error.message || 'Failed to unlock');
      }
      return false;
    }
  }, [userEmail, supabase]);

  useEffect(() => {
    if (!isMobile) return;
    localStorage.removeItem('mobile_locked');
  }, [isMobile]);

  // Inactivity tracking
  useEffect(() => {
    if (!isMobile || isLocked || !userEmail) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const timeSinceLastActive = now - lastActiveTime;
        
        if (timeSinceLastActive > INACTIVITY_TIMEOUT_MS) {
          lock();
        } else {
          setLastActiveTime(now);
        }
      } else {
        setLastActiveTime(Date.now());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isMobile, isLocked, lastActiveTime, lock, userEmail]);

  // Session expiry interval
  useEffect(() => {
    if (!isMobile || isLocked || !userEmail) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActive = now - lastActiveTime;
      if (timeSinceLastActive > SESSION_EXPIRY_MS) {
        lock();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isMobile, isLocked, lastActiveTime, lock, userEmail]);

  return { isLocked, lock, unlock };
}
