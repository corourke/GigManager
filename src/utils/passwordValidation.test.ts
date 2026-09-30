import { describe, it, expect } from 'vitest';
import { validatePassword, getPasswordStrength } from './passwordValidation';

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

describe('getPasswordStrength', () => {
  it('returns null for an empty password', () => {
    expect(getPasswordStrength('')).toBeNull();
  });

  it('rates short passwords as weak, even with variety', () => {
    expect(getPasswordStrength('aB3!')).toBe('weak');
    expect(getPasswordStrength('aB3!xY7')).toBe('weak');
  });

  it('rates long passwords with a single character class as weak', () => {
    expect(getPasswordStrength('abcdefghijklmnop')).toBe('weak');
  });

  it('rates 8+ characters with two character classes as fair', () => {
    expect(getPasswordStrength('abcdefg1')).toBe('fair');
  });

  it('keeps 12+ characters with only two classes at fair', () => {
    expect(getPasswordStrength('abcdefghijk1')).toBe('fair');
  });

  it('keeps under 12 characters at fair, even with three classes', () => {
    expect(getPasswordStrength('abcDefgh1!')).toBe('fair');
  });

  it('rates 12+ characters with three or more classes as strong', () => {
    expect(getPasswordStrength('abcdefghiJK1')).toBe('strong');
    expect(getPasswordStrength('correct Horse 9')).toBe('strong');
  });
});
