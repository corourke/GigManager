import { describe, it, expect } from 'vitest';
import { validatePassword } from './passwordValidation';

describe('validatePassword', () => {
  it('returns null for a valid, matching password', () => {
    expect(validatePassword('hunter2', 'hunter2')).toBeNull();
  });

  it('requires a password', () => {
    expect(validatePassword('', '')).toBe('Password is required');
  });

  it('enforces a 6-character minimum', () => {
    expect(validatePassword('abc', 'abc')).toBe('Password must be at least 6 characters');
  });

  it('requires the confirmation to match', () => {
    expect(validatePassword('hunter2', 'hunter3')).toBe('Passwords do not match');
  });
});
