import { describe, it, expect } from 'vitest';
import { isAlertable, recipientsToNotify, isSentryConfigured } from './healthCheck';

describe('isAlertable', () => {
  it('alerts only on a real failure', () => {
    expect(isAlertable('fail')).toBe(true);
    expect(isAlertable('ok')).toBe(false);
    expect(isAlertable('not_configured')).toBe(false);
  });
});

describe('recipientsToNotify (dedup — one alert per incident)', () => {
  it('notifies every moderator when none has been notified yet', () => {
    expect(recipientsToNotify(['mod-1', 'mod-2'], [])).toEqual(['mod-1', 'mod-2']);
  });
  it('excludes a moderator who already has an unread alert for this check', () => {
    expect(recipientsToNotify(['mod-1', 'mod-2'], ['mod-1'])).toEqual(['mod-2']);
  });
  it('notifies nobody once every moderator already has an unread alert', () => {
    expect(recipientsToNotify(['mod-1', 'mod-2'], ['mod-1', 'mod-2'])).toEqual([]);
  });
  it('handles no moderators', () => {
    expect(recipientsToNotify([], [])).toEqual([]);
  });
});

describe('isSentryConfigured', () => {
  it('requires token, org slug, and project slug all present', () => {
    expect(isSentryConfigured('token', 'org', 'project')).toBe(true);
  });
  it('is false when any piece is missing', () => {
    expect(isSentryConfigured(null, 'org', 'project')).toBe(false);
    expect(isSentryConfigured('token', undefined, 'project')).toBe(false);
    expect(isSentryConfigured('token', 'org', '')).toBe(false);
    expect(isSentryConfigured(undefined, undefined, undefined)).toBe(false);
  });
});
