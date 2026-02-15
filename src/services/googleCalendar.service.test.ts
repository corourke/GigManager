import { describe, it, expect } from 'vitest';

// Basic smoke tests to verify the service module can be imported and functions exist
describe('googleCalendar.service', () => {
  it('should export required functions', async () => {
    // Dynamically import to avoid mocking issues
    const service = await import('./googleCalendar.service');

    expect(typeof service.getGoogleAuthUrl).toBe('function');
    expect(typeof service.getUserGoogleCalendarSettings).toBe('function');
    expect(typeof service.saveUserGoogleCalendarSettings).toBe('function');
    expect(typeof service.deleteUserGoogleCalendarSettings).toBe('function');
    expect(typeof service.getGigSyncStatus).toBe('function');
    expect(typeof service.updateGigSyncStatus).toBe('function');
    expect(typeof service.syncGigToCalendar).toBe('function');
    expect(typeof service.deleteGigFromCalendar).toBe('function');
    expect(typeof service.getCalendarClient).toBe('function');
    expect(typeof service.getUserCalendars).toBe('function');
    expect(typeof service.exchangeCodeForTokens).toBe('function');
    expect(typeof service.refreshAccessToken).toBe('function');
  });

  it('should generate OAuth URL without throwing', async () => {
    const service = await import('./googleCalendar.service');

    // This should not throw, even if environment variables are not set
    await expect(service.getGoogleAuthUrl()).resolves.toBeDefined();
  });
});