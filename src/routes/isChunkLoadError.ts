const CHUNK_ERROR_MESSAGE =
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading (CSS )?chunk [^ ]+ failed/i;

/**
 * True when `error` is a failed dynamic import: offline before the service
 * worker finished installing, or a deploy replaced the chunk file names.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.name === 'ChunkLoadError' || CHUNK_ERROR_MESSAGE.test(error.message);
}
