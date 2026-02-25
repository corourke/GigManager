import { describe, it, expect } from 'vitest';
import { sanitizeLikeInput } from './validation-utils';

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
