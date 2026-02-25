export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sanitizeLikeInput(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}
