/**
 * Validate a new-password + confirmation pair. Returns an error message, or
 * null when valid. Shared by the reset-password and profile-completion flows.
 */
export function validatePassword(password: string, confirmPassword: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
}
