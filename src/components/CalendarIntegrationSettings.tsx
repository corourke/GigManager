import React, { useState, useEffect } from 'react';
import { Calendar, Settings, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';

import {
  getUserGoogleCalendarSettings,
  saveUserGoogleCalendarSettings,
  deleteUserGoogleCalendarSettings,
  getUserCalendars,
  getGoogleAuthUrl,
} from '../services/googleCalendar.service';
import { UserGoogleCalendarSettings } from '../utils/supabase/types';

interface CalendarIntegrationSettingsProps {
  userId: string;
  onSettingsChanged?: () => void;
  onStartAuth?: () => void;
}

interface CalendarOption {
  id: string;
  name: string;
  primary?: boolean;
  accessRole: string;
}

export default function CalendarIntegrationSettings({
  userId,
  onSettingsChanged,
  onStartAuth,
}: CalendarIntegrationSettingsProps) {
  const [settings, setSettings] = useState<UserGoogleCalendarSettings | null>(null);
  const [availableCalendars, setAvailableCalendars] = useState<CalendarOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [loadingCalendars, setLoadingCalendars] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const userSettings = await getUserGoogleCalendarSettings(userId);
      setSettings(userSettings);

      // If connected, load available calendars
      if (userSettings?.is_enabled) {
        await loadCalendars();
      }
    } catch (error) {
      console.error('Error loading calendar settings:', error);
      toast.error('Failed to load calendar settings');
    } finally {
      setLoading(false);
    }
  };

  const loadCalendars = async () => {
    try {
      setLoadingCalendars(true);
      const calendars = await getUserCalendars(userId);
      setAvailableCalendars(calendars);
    } catch (error) {
      console.error('Error loading calendars:', error);
      toast.error('Failed to load available calendars');
    } finally {
      setLoadingCalendars(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const authUrl = await getGoogleAuthUrl();

      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error initiating Google auth:', error);
      toast.error('Failed to connect to Google Calendar');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);
      await deleteUserGoogleCalendarSettings(userId);
      setSettings(null);
      setAvailableCalendars([]);
      toast.success('Google Calendar integration disconnected');
      onSettingsChanged?.();
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast.error('Failed to disconnect Google Calendar');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleCalendarChange = async (calendarId: string) => {
    if (!settings) return;

    try {
      const selectedCalendar = availableCalendars.find(cal => cal.id === calendarId);
      if (!selectedCalendar) return;

      const updatedSettings = await saveUserGoogleCalendarSettings(userId, {
        ...settings,
        calendar_id: calendarId,
        calendar_name: selectedCalendar.name,
      });

      setSettings(updatedSettings);
      toast.success('Calendar selection updated');
      onSettingsChanged?.();
    } catch (error) {
      console.error('Error updating calendar selection:', error);
      toast.error('Failed to update calendar selection');
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    if (!settings) return;

    try {
      const updatedSettings = await saveUserGoogleCalendarSettings(userId, {
        ...settings,
        is_enabled: enabled,
      });

      setSettings(updatedSettings);
      toast.success(enabled ? 'Google Calendar sync enabled' : 'Google Calendar sync disabled');
      onSettingsChanged?.();
    } catch (error) {
      console.error('Error updating sync settings:', error);
      toast.error('Failed to update sync settings');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading calendar settings...
        </CardContent>
      </Card>
    );
  }

  const isConnected = settings?.is_enabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Integration
        </CardTitle>
        <CardDescription>
          Connect your Google Calendar to automatically sync gigs and events
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {!isConnected ? (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Connect your Google Calendar to enable automatic synchronization of gigs.
                Your calendar events will be kept in sync with your GigManager schedule.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Connect Google Calendar
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 dark:bg-green-950">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Connected to Google Calendar
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {settings.calendar_name || 'Calendar selected'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Disconnect'
                )}
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sync-enabled">Enable Synchronization</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync gigs to Google Calendar
                  </p>
                </div>
                <Switch
                  id="sync-enabled"
                  checked={settings.is_enabled}
                  onCheckedChange={handleToggleEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label>Calendar Selection</Label>
                <Select
                  value={settings.calendar_id}
                  onValueChange={handleCalendarChange}
                  disabled={loadingCalendars}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a calendar" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCalendars.map((calendar) => (
                      <SelectItem key={calendar.id} value={calendar.id}>
                        <div className="flex items-center gap-2">
                          {calendar.name}
                          {calendar.primary && (
                            <Badge variant="secondary" className="text-xs">
                              Primary
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {loadingCalendars && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading calendars...
                  </p>
                )}
              </div>

              <Alert>
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  <strong>One-way sync:</strong> Changes in GigManager will update Google Calendar,
                  but changes in Google Calendar will be overwritten on the next sync.
                  <br />
                  <strong>Links:</strong> Calendar events include links back to the corresponding gig in GigManager.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}