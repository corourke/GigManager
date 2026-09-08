import { describe, it, expect } from 'vitest';
import { sanitizeLikeInput, UUID_REGEX, emailDomainMatches } from './validation-utils';

describe('sanitizeLikeInput', () => {
  it('returns plain strings unchanged', () => {
    expect(sanitizeLikeInput('hello')).toBe('hello');
  });

  it('escapes percent characters', () => {
    expect(sanitizeLikeInput('100%')).toBe('100\\%');
  });

  it('escapes underscore characters', () => {
    expect(sanitizeLikeInput('foo_bar')).toBe('foo\\_bar');
  });

  it('escapes backslash characters', () => {
    expect(sanitizeLikeInput('a\\b')).toBe('a\\\\b');
  });

  it('escapes multiple special characters together', () => {
    expect(sanitizeLikeInput('%_\\')).toBe('\\%\\_\\\\');
  });

  it('handles empty string', () => {
    expect(sanitizeLikeInput('')).toBe('');
  });

  it('preserves non-special characters alongside special ones', () => {
    expect(sanitizeLikeInput('test%value_here')).toBe('test\\%value\\_here');
  });
});

describe('UUID_REGEX', () => {
  it('matches a valid lowercase UUID v4', () => {
    expect(UUID_REGEX.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('matches a valid uppercase UUID', () => {
    expect(UUID_REGEX.test('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('matches a mixed-case UUID', () => {
    expect(UUID_REGEX.test('550e8400-E29B-41d4-A716-446655440000')).toBe(true);
  });

  it('rejects a UUID with missing segment', () => {
    expect(UUID_REGEX.test('550e8400-e29b-41d4-a716')).toBe(false);
  });

  it('rejects a UUID with wrong segment lengths', () => {
    expect(UUID_REGEX.test('550e840-e29b-41d4-a716-446655440000')).toBe(false);
  });

  it('rejects a plain string', () => {
    expect(UUID_REGEX.test('not-a-uuid')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(UUID_REGEX.test('')).toBe(false);
  });

  it('rejects a SQL injection attempt', () => {
    expect(UUID_REGEX.test("'; DROP TABLE gigs; --")).toBe(false);
  });

  it('rejects a UUID with extra characters appended', () => {
    expect(UUID_REGEX.test('550e8400-e29b-41d4-a716-446655440000extra')).toBe(false);
  });
});

describe('emailDomainMatches (issue #33 point 7)', () => {
  it('matches a domain in a comma-separated list, case-insensitively', () => {
    expect(emailDomainMatches('user@Example.com', 'example.com, other.org')).toBe(true);
  });
  it('rejects a domain not in the list', () => {
    expect(emailDomainMatches('user@gmail.com', 'example.com,other.org')).toBe(false);
  });
  it('rejects when either input is missing or malformed', () => {
    expect(emailDomainMatches(null, 'example.com')).toBe(false);
    expect(emailDomainMatches('user@example.com', null)).toBe(false);
    expect(emailDomainMatches('not-an-email', 'example.com')).toBe(false);
  });
});
