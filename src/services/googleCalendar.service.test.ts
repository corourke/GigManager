import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '../utils/supabase/client';

// Mock Supabase client
vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('googleCalendar.service', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      upsert: vi.fn().mockReturnThis(),
      functions: {
        invoke: vi.fn(),
      },
    };

    (createClient as any).mockReturnValue(mockSupabase);
  });

  it('should export required functions', async () => {
    const service = await import('./googleCalendar.service');

    expect(typeof service.getGoogleAuthUrl).toBe('function');
    expect(typeof service.getUserGoogleCalendarSettings).toBe('function');
    expect(typeof service.saveUserGoogleCalendarSettings).toBe('function');
    expect(typeof service.deleteUserGoogleCalendarSettings).toBe('function');
    expect(typeof service.getGigSyncStatus).toBe('function');
    expect(typeof service.updateGigSyncStatus).toBe('function');
    expect(typeof service.syncGigToCalendar).toBe('function');
    expect(typeof service.deleteGigFromCalendar).toBe('function');
    expect(typeof service.getUserCalendars).toBe('function');
    expect(typeof service.exchangeCodeForTokens).toBe('function');
    expect(typeof service.refreshAccessToken).toBe('function');
    expect(typeof service.getSyncLogs).toBe('function');
    expect(typeof service.getSyncStatusSummary).toBe('function');
  });

  describe('all-day gig calendar sync bug regression tests', () => {
    it('correctly identifies an all-day gig and formats exclusive end date (+1 day)', async () => {
      const service = await import('./googleCalendar.service');

      // 1. Mock settings query response
      const mockSettings = {
        id: 'settings-1',
        user_id: 'user-123',
        calendar_id: 'cal-123',
        calendar_name: 'Primary',
        access_token: 'token-abc',
        refresh_token: 'refresh-xyz',
        token_expires_at: new Date(Date.now() + 3600000).toISOString(),
        is_enabled: true,
        sync_filters: {},
      };

      // 2. Mock gig sync status query (no existing sync)
      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockSettings, error: null }) // first maybeSingle call for settings
        .mockResolvedValueOnce({ data: null, error: null })          // second maybeSingle call for existing gig sync
        .mockResolvedValueOnce({                                     // third maybeSingle call for update gig sync status return
          data: {
            id: 'sync-status-1',
            gig_id: 'gig-123',
            user_id: 'user-123',
            google_event_id: 'google-event-123',
            sync_status: 'synced',
          },
          error: null
        });

      // 3. Mock edge function invoke success
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { event_id: 'google-event-123' },
        error: null,
      });

      // June 26, 2026 is noon UTC. This represents an all-day event
      const gigData = {
        title: 'All-Day Gig',
        start: '2026-06-26T12:00:00.000Z',
        end: '2026-06-26T12:00:00.000Z',
        timezone: 'America/Los_Angeles',
        description: 'Testing all-day logic',
        location: 'Main Stage',
      };

      const result = await service.syncGigToCalendar('user-123', 'gig-123', gigData);

      expect(result.eventId).toBe('google-event-123');
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'server/integrations/google-calendar/events',
        expect.objectContaining({
          body: expect.objectContaining({
            event_data: expect.objectContaining({
              summary: 'All-Day Gig',
              start: { date: '2026-06-26' },
              end: { date: '2026-06-27' }, // Exclusive end date (inclusive end date + 1 day)
            }),
          }),
        })
      );
    });

    it('correctly formats timed gigs with dateTime and timezone', async () => {
      const service = await import('./googleCalendar.service');

      const mockSettings = {
        id: 'settings-1',
        user_id: 'user-123',
        calendar_id: 'cal-123',
        calendar_name: 'Primary',
        access_token: 'token-abc',
        refresh_token: 'refresh-xyz',
        token_expires_at: new Date(Date.now() + 3600000).toISOString(),
        is_enabled: true,
        sync_filters: {},
      };

      mockSupabase.maybeSingle
        .mockResolvedValueOnce({ data: mockSettings, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: {
            id: 'sync-status-1',
            gig_id: 'gig-123',
            user_id: 'user-123',
            google_event_id: 'google-event-123',
            sync_status: 'synced',
          },
          error: null
        });

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { event_id: 'google-event-123' },
        error: null,
      });

      // Timed gig starting at 8:00 PM (20:00:00) America/Los_Angeles
      const gigData = {
        title: 'Evening Show',
        start: '2026-06-26T20:00:00.000Z',
        end: '2026-06-26T23:00:00.000Z',
        timezone: 'America/Los_Angeles',
        description: '3-hour set',
        location: 'Club Room',
      };

      const result = await service.syncGigToCalendar('user-123', 'gig-123', gigData);

      expect(result.eventId).toBe('google-event-123');
      expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
        'server/integrations/google-calendar/events',
        expect.objectContaining({
          body: expect.objectContaining({
            event_data: expect.objectContaining({
              summary: 'Evening Show',
              start: { dateTime: '2026-06-26T20:00:00.000Z', timeZone: 'America/Los_Angeles' },
              end: { dateTime: '2026-06-26T23:00:00.000Z', timeZone: 'America/Los_Angeles' },
            }),
          }),
        })
      );
    });
  });

  describe('bulkSyncAllGigsServerSide', () => {
    it('successfully queries all gigs and invokes sync-gig-all-users for each', async () => {
      const service = await import('./googleCalendar.service');

      // Mock select query to return gigs
      const mockGigs = [
        { id: 'gig-1', title: 'Gig One' },
        { id: 'gig-2', title: 'Gig Two' },
      ];
      mockSupabase.from.mockReturnThis();
      mockSupabase.select.mockResolvedValue({ data: mockGigs, error: null });

      // Mock invoke success
      mockSupabase.functions.invoke.mockResolvedValue({ data: { success: true }, error: null });

      const progressSpy = vi.fn();
      const result = await service.bulkSyncAllGigsServerSide(progressSpy);

      expect(result.success).toBe(true);
      expect(result.total).toBe(2);
      expect(result.failed).toBe(0);

      expect(mockSupabase.from).toHaveBeenCalledWith('gigs');
      expect(mockSupabase.select).toHaveBeenCalledWith('id, title');
      expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(2);
      expect(mockSupabase.functions.invoke).toHaveBeenNthCalledWith(
        1,
        'server/integrations/google-calendar/sync-gig-all-users',
        expect.objectContaining({
          method: 'POST',
          body: { gig_id: 'gig-1', origin: expect.any(String) },
        })
      );
      expect(mockSupabase.functions.invoke).toHaveBeenNthCalledWith(
        2,
        'server/integrations/google-calendar/sync-gig-all-users',
        expect.objectContaining({
          method: 'POST',
          body: { gig_id: 'gig-2', origin: expect.any(String) },
        })
      );
      expect(progressSpy).toHaveBeenCalledTimes(2);
      expect(progressSpy).toHaveBeenNthCalledWith(1, 1, 2);
      expect(progressSpy).toHaveBeenNthCalledWith(2, 2, 2);
    });
  });
});
