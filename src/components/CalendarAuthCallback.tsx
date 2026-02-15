import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';

import { exchangeCodeForTokens, saveUserGoogleCalendarSettings } from '../services/googleCalendar.service';

interface CalendarAuthCallbackProps {
  userId: string;
  onAuthComplete: () => void;
  onBack: () => void;
}

export default function CalendarAuthCallback({
  userId,
  onAuthComplete,
  onBack,
}: CalendarAuthCallbackProps) {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Get authorization code from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        throw new Error(`Authorization failed: ${error}`);
      }

      if (!code) {
        throw new Error('No authorization code received');
      }

      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(code);

      // Save initial settings with first available calendar
      // We'll let the user choose the calendar later in the settings
      await saveUserGoogleCalendarSettings(userId, {
        calendar_id: '', // Will be set by user later
        calendar_name: '',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.expires_at.toISOString(),
        is_enabled: false, // User needs to choose calendar and enable
      });

      setStatus('success');

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);

      toast.success('Google Calendar connected successfully!');

      // Auto-redirect after a short delay
      setTimeout(() => {
        onAuthComplete();
      }, 2000);

    } catch (err) {
      console.error('Auth callback error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Authentication failed');
      toast.error('Failed to connect Google Calendar');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
            {status === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
            Google Calendar Setup
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Completing authentication...'}
            {status === 'success' && 'Successfully connected to Google Calendar!'}
            {status === 'error' && 'Authentication failed'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}

          {status === 'success' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your Google Calendar has been connected. You'll be redirected to select
                which calendar to sync with and configure your settings.
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || 'An error occurred during authentication. Please try again.'}
              </AlertDescription>
            </Alert>
          )}

          {(status === 'success' || status === 'error') && (
            <Button onClick={onBack} className="w-full">
              Continue to Settings
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}