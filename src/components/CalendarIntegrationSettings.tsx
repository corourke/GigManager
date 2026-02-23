import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Clock,
  XCircle,
  Activity,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format as formatDate } from 'date-fns';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

import {
  getUserGoogleCalendarSettings,
  saveUserGoogleCalendarSettings,
  deleteUserGoogleCalendarSettings,
  getUserCalendars,
  getGoogleAuthUrl,
  getSyncLogs,
  getSyncStatusSummary,
  updateUserGoogleCalendarSettings,
  syncAllGigsForUser,
} from '../services/googleCalendar.service';
import { UserGoogleCalendarSettings, GigSyncStatus } from '../utils/supabase/types';

interface CalendarIntegrationSettingsProps {
  userId: string;
  organizationId?: string;
  onSettingsChanged?: () => void;
  onStartAuth?: () => void;
}

interface CalendarOption {
  id: string;
  name: string;
  primary?: boolean;
  accessRole: string;
}

interface SyncSummary {
  total: number;
  synced: number;
  notSynced: number;
  failed: number;
  removed: number;
  lastSyncedAt: string | null;
}

type SyncFrequency = 'realtime' | 'manual';

export default function CalendarIntegrationSettings({
  userId,
  organizationId,
  onSettingsChanged,
  onStartAuth,
}: CalendarIntegrationSettingsProps) {
  const [settings, setSettings] = useState<UserGoogleCalendarSettings | null>(null);
  const [availableCalendars, setAvailableCalendars] = useState<CalendarOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [syncLogs, setSyncLogs] = useState<(GigSyncStatus & { gig_title?: string; gig_start?: string })[]>([]);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);
  const [loadingSyncData, setLoadingSyncData] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string | null>(null);

  const loadSyncData = useCallback(async () => {
    try {
      setLoadingSyncData(true);
      const [logs, summary] = await Promise.all([
        getSyncLogs(userId, 10),
        getSyncStatusSummary(userId),
      ]);
      setSyncLogs(logs);
      setSyncSummary(summary);
    } catch (error) {
      console.error('Error loading sync data:', error);
    } finally {
      setLoadingSyncData(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const userSettings = await getUserGoogleCalendarSettings(userId);
      setSettings(userSettings);

      if (userSettings?.access_token) {
        await loadCalendars();
        if (userSettings.is_enabled) {
          await loadSyncData();
        }
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
      setSyncLogs([]);
      setSyncSummary(null);
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

      if (enabled) {
        await Promise.all([loadCalendars(), loadSyncData()]);
      }

      toast.success(enabled ? 'Google Calendar sync enabled' : 'Google Calendar sync disabled');
      onSettingsChanged?.();
    } catch (error) {
      console.error('Error updating sync settings:', error);
      toast.error('Failed to update sync settings');
    }
  };

  const handleSyncFrequencyChange = async (frequency: SyncFrequency) => {
    if (!settings) return;

    try {
      const updatedSettings = await updateUserGoogleCalendarSettings(userId, {
        sync_filters: {
          ...settings.sync_filters,
          frequency,
        },
      });

      setSettings(updatedSettings);
      toast.success('Sync frequency updated');
      onSettingsChanged?.();
    } catch (error) {
      console.error('Error updating sync frequency:', error);
      toast.error('Failed to update sync frequency');
    }
  };

  const handleSyncFilterToggle = async (filterKey: string, value: boolean) => {
    if (!settings) return;

    try {
      const updatedSettings = await updateUserGoogleCalendarSettings(userId, {
        sync_filters: {
          ...settings.sync_filters,
          [filterKey]: value,
        },
      });

      setSettings(updatedSettings);
      toast.success('Sync filter updated');
      onSettingsChanged?.();
    } catch (error) {
      console.error('Error updating sync filter:', error);
      toast.error('Failed to update sync filter');
    }
  };

  const handleSyncNow = async () => {
    if (!organizationId || !settings?.calendar_id) return;

    try {
      setSyncing(true);
      setSyncProgress('Starting...');

      const result = await syncAllGigsForUser(
        userId,
        organizationId,
        (done, total) => setSyncProgress(`${done} / ${total}`)
      );

      setSyncProgress(null);
      await loadSyncData();

      if (result.failed > 0) {
        toast.warning(`Synced ${result.synced} gigs, ${result.failed} failed`);
      } else {
        toast.success(`Successfully synced ${result.synced} gigs`);
      }
    } catch (error) {
      console.error('Error syncing gigs:', error);
      toast.error('Failed to sync gigs');
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  const getSyncFrequency = (): SyncFrequency => {
    return (settings?.sync_filters?.frequency as SyncFrequency) || 'realtime';
  };

  const getSyncFilter = (key: string, defaultValue: boolean = true): boolean => {
    return settings?.sync_filters?.[key] ?? defaultValue;
  };

  const getSyncStatusBadge = (status: string) => {
    switch (status) {
      case 'synced':
        return <Badge variant="default" className="bg-green-100 text-green-800 text-xs">Synced</Badge>;
      case 'updated':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 text-xs">Updated</Badge>;
      case 'removed':
        return <Badge variant="default" className="bg-orange-100 text-orange-800 text-xs">Removed</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Failed</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
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

  const isConnected = !!(settings?.access_token);
  const displayedLogs = showAllLogs ? syncLogs : syncLogs.slice(0, 5);

  return (
    <div className="space-y-6">
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
                    <Label>Enable Synchronization</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically sync gigs to Google Calendar
                    </p>
                  </div>
                  <Button
                    variant={settings.is_enabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleToggleEnabled(!settings.is_enabled)}
                  >
                    {settings.is_enabled ? 'Enabled' : 'Disabled'}
                  </Button>
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

      {isConnected && settings?.is_enabled && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                Sync Settings
              </CardTitle>
              <CardDescription>
                Configure how gigs are synchronized to Google Calendar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sync Frequency</Label>
                <Select
                  value={getSyncFrequency()}
                  onValueChange={(v) => handleSyncFrequencyChange(v as SyncFrequency)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time (on every change)</SelectItem>
                    <SelectItem value="manual">Manual (use Sync All Gigs)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  How often gig changes are pushed to Google Calendar
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Sync Filters</Label>
                <p className="text-sm text-muted-foreground">
                  Choose which gig statuses to sync
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-normal">Confirmed gigs</Label>
                      <p className="text-xs text-muted-foreground">Booked, Completed, Settled</p>
                    </div>
                    <Button
                      variant={getSyncFilter('sync_confirmed') ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSyncFilterToggle('sync_confirmed', !getSyncFilter('sync_confirmed'))}
                    >
                      {getSyncFilter('sync_confirmed') ? 'On' : 'Off'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-normal">Tentative gigs</Label>
                      <p className="text-xs text-muted-foreground">Date Hold, Proposed</p>
                    </div>
                    <Button
                      variant={getSyncFilter('sync_tentative') ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSyncFilterToggle('sync_tentative', !getSyncFilter('sync_tentative'))}
                    >
                      {getSyncFilter('sync_tentative') ? 'On' : 'Off'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-normal">Cancelled gigs</Label>
                      <p className="text-xs text-muted-foreground">Cancelled</p>
                    </div>
                    <Button
                      variant={getSyncFilter('sync_cancelled', false) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSyncFilterToggle('sync_cancelled', !getSyncFilter('sync_cancelled', false))}
                    >
                      {getSyncFilter('sync_cancelled', false) ? 'On' : 'Off'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Play className="h-4 w-4" />
                Sync Now
              </CardTitle>
              <CardDescription>
                Sync all existing gigs to Google Calendar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Button
                  onClick={handleSyncNow}
                  disabled={syncing || !settings?.calendar_id || !organizationId}
                >
                  {syncing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {syncProgress || 'Syncing...'}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync All Gigs
                    </>
                  )}
                </Button>
                {!settings?.calendar_id && (
                  <p className="text-sm text-muted-foreground">
                    Select a calendar first
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4" />
                    Sync Status
                  </CardTitle>
                  <CardDescription>
                    Overview of synchronization activity
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadSyncData}
                  disabled={loadingSyncData}
                >
                  {loadingSyncData ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {syncSummary ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-2xl font-bold">{syncSummary.total}</p>
                      <p className="text-xs text-muted-foreground">Total Events</p>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{syncSummary.synced}</p>
                      <p className="text-xs text-muted-foreground">Synced</p>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-2xl font-bold text-gray-500">{syncSummary.notSynced}</p>
                      <p className="text-xs text-muted-foreground">Not Synced</p>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">{syncSummary.removed}</p>
                      <p className="text-xs text-muted-foreground">Removed</p>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{syncSummary.failed}</p>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </div>
                  </div>

                  {syncSummary.lastSyncedAt && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Last synced {formatDistanceToNow(new Date(syncSummary.lastSyncedAt), { addSuffix: true })}
                    </div>
                  )}

                  {syncSummary.failed > 0 && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>
                        {syncSummary.failed} event{syncSummary.failed > 1 ? 's' : ''} failed to sync.
                        Check the sync log below for details.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No sync data available yet
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Sync Log
              </CardTitle>
              <CardDescription>
                Recent synchronization activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {syncLogs.length > 0 ? (
                <div className="space-y-2">
                  {displayedLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 border rounded-lg text-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {log.sync_status === 'synced' && (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        )}
                        {log.sync_status === 'updated' && (
                          <RefreshCw className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        )}
                        {log.sync_status === 'removed' && (
                          <XCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                        )}
                        {log.sync_status === 'failed' && (
                          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {log.gig_title || `Gig ${log.gig_id.slice(0, 8)}...`}
                            {log.gig_start && (
                              <span className="text-muted-foreground font-normal ml-2">
                                {formatDate(new Date(log.gig_start), 'MMM d, yyyy')}
                              </span>
                            )}
                          </p>
                          {log.sync_error && (
                            <p className="text-xs text-red-600 truncate">
                              {log.sync_error}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getSyncStatusBadge(log.sync_status)}
                        {log.last_synced_at && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(log.last_synced_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {syncLogs.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowAllLogs(!showAllLogs)}
                    >
                      {showAllLogs ? 'Show less' : `Show all (${syncLogs.length})`}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No sync activity yet
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
